import {randomInt,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {fail,string,integer,choice,identifier} from './common.mjs';

// Activity mechanics are independent from the record's editorial revision.
export function createEventActivities(ctx,{read,visible,editor,membership,media}) {
 const {db,transaction,now,notify,audit,id,limit}=ctx;
 db.exec(`CREATE TABLE IF NOT EXISTS hub_tournaments(record TEXT PRIMARY KEY,value TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS hub_checkpoints(id TEXT PRIMARY KEY,record TEXT NOT NULL,title TEXT NOT NULL,hint TEXT NOT NULL,kind TEXT NOT NULL,server TEXT NOT NULL,metric TEXT NOT NULL,threshold INTEGER NOT NULL,secret TEXT NOT NULL,prerequisite TEXT NOT NULL,position INTEGER NOT NULL,revision INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS hub_checkpoints_record ON hub_checkpoints(record,position,id);
 CREATE TABLE IF NOT EXISTS hub_stamps(record TEXT NOT NULL,checkpoint TEXT NOT NULL,uid TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL,images TEXT NOT NULL,reason TEXT NOT NULL,attempt INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(record,checkpoint,uid));
 CREATE INDEX IF NOT EXISTS hub_stamps_user ON hub_stamps(uid,status,updated DESC);`);
 const tournament=record=>{const row=db.prepare('SELECT * FROM hub_tournaments WHERE record=?').get(record);return row?{...JSON.parse(row.value),revision:row.revision,updated:row.updated}:null;};
 const locked=record=>!!db.prepare('SELECT 1 FROM hub_tournaments WHERE record=?').get(record);
 const checkpoints=record=>db.prepare('SELECT * FROM hub_checkpoints WHERE record=? ORDER BY position,id').all(record);
 const requireEditor=(row,user)=>{if(!editor(row,user))fail('需要活动负责人权限',403);};
 const names=users=>new Map(users.map(uid=>[uid,db.prepare('SELECT name FROM members WHERE uid=?').get(uid)?.name||'已离开的成员']));
 function details(row,user){
  const t=tournament(row.id),people=t?names(t.entrants):new Map();
  if(t)t.players=t.entrants.map(uid=>({uid,name:people.get(uid)}));
  const stamps=db.prepare('SELECT * FROM hub_stamps WHERE record=? AND uid=?').all(row.id,user.uid);
  return {tournament:t,checkpoints:checkpoints(row.id).map(({secret,...point})=>({...point,hasCode:!!secret,progress:stamps.find(s=>s.checkpoint===point.id)||null})),pending:editor(row,user)?db.prepare("SELECT s.*,m.name,c.title FROM hub_stamps s JOIN members m ON m.uid=s.uid JOIN hub_checkpoints c ON c.id=s.checkpoint WHERE s.record=? AND s.status='review' ORDER BY s.updated LIMIT 100").all(row.id).map(s=>({...s,images:JSON.parse(s.images)})):[]};
 }
 function assertRecordChange(row,data){
  if(locked(row.id)&&data.format!=='tournament')fail('赛程已经生成，不能更改活动类型',409);
  if(checkpoints(row.id).length&&data.format!=='hunt')fail('已有寻宝检查点，不能更改活动类型',409);
 }
 function advance(value){
  for(let round=0;round<value.rounds;round++)for(const match of value.matches.filter(m=>m.round===round)){
   if(round>0){const previous=value.matches.filter(m=>m.round===round-1&&Math.floor(m.slot/2)===match.slot).sort((a,b)=>a.slot-b.slot);match.a=previous[0].winner;match.b=previous[1].winner;if(previous.some(m=>m.status!=='done'))continue;}
   if(match.status==='done')continue;
   if(match.a&&match.b)match.status='ready';
   else {match.status='done';match.winner=match.a||match.b;match.bye=true;}
  }
  const final=value.matches.at(-1);value.status=final.status==='done'?'complete':'active';value.champion=value.status==='complete'?final.winner:null;
 }
 function saveTournament(row,value,revision,user){
  db.prepare('INSERT INTO hub_tournaments VALUES(?,?,?,?) ON CONFLICT(record) DO UPDATE SET value=excluded.value,revision=excluded.revision,updated=excluded.updated').run(row.id,JSON.stringify(value),revision,now());
  for(const uid of value.entrants){const wins=value.matches.filter(m=>!m.bye&&m.winner===uid).length;db.prepare('INSERT INTO hub_event_results VALUES(?,?,?,?,?,?) ON CONFLICT(record,uid) DO UPDATE SET score=excluded.score,note=excluded.note,actor=excluded.actor,updated=excluded.updated').run(row.id,uid,wins,value.champion===uid?'冠军':wins?'获胜 '+wins+' 场':'参赛',user.uid,now());}
 }
 function active(row,user){const data=JSON.parse(row.data);if(row.status!=='published'||now()<data.starts||now()>=data.ends)fail('当前不在活动开放时间内',409);if(!membership(row.id,user.uid))fail('请先报名活动',403);}
 function recordStamp(row,point,user,status,input={}){
  const old=db.prepare('SELECT * FROM hub_stamps WHERE record=? AND checkpoint=? AND uid=?').get(row.id,point.id,user.uid);
  if(old?.status==='accepted'||old?.status==='review')return;
  if((old?.attempt||0)>=20)fail('这个检查点提交次数已达上限，请联系活动负责人');
  db.prepare('INSERT INTO hub_stamps VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(record,checkpoint,uid) DO UPDATE SET status=excluded.status,note=excluded.note,images=excluded.images,reason=excluded.reason,attempt=excluded.attempt,updated=excluded.updated').run(row.id,point.id,user.uid,status,input.note||'',JSON.stringify(input.images||[]),'',(old?.attempt||0)+1,old?.created||now(),now());
 }
 function action(row,user,action,input){
  if(!action?.startsWith('event-')||row.kind!=='event')return undefined;
  return transaction(()=>{
   const data=JSON.parse(row.data);
   if(action==='event-bracket'){
    requireEditor(row,user);if(data.format!=='tournament'||row.status!=='published'||now()>=data.ends)fail('当前活动不能生成赛程',409);
    if(locked(row.id))fail('赛程已经生成，请刷新查看',409);
    const entrants=db.prepare("SELECT uid FROM hub_members WHERE record=? AND state='active' ORDER BY created,uid").all(row.id).map(v=>v.uid);if(entrants.length<2||entrants.length>64)fail('单淘汰赛需要 2–64 名已报名成员');
    for(let i=entrants.length-1;i>0;i--){const j=randomInt(i+1);[entrants[i],entrants[j]]=[entrants[j],entrants[i]];}
    let seeds=[1,2],size=2;while(size<entrants.length){size*=2;seeds=seeds.flatMap(n=>[n,size+1-n]);}
    const rounds=Math.log2(size),value={entrants,rounds,status:'active',champion:null,matches:[]};
    for(let round=0;round<rounds;round++)for(let slot=0;slot<size/2**(round+1);slot++)value.matches.push({id:`${round}-${slot}`,round,slot,a:round?null:entrants[seeds[slot*2]-1]||null,b:round?null:entrants[seeds[slot*2+1]-1]||null,winner:null,status:round?'waiting':'ready',bye:false,note:''});
    advance(value);saveTournament(row,value,1,user);audit(user,'event:bracket',row.id,entrants.length+' 人单淘汰');notify(user,entrants,'赛程已生成：'+row.title,'/community/hub?section=event&item='+row.id,'bracket:'+row.id);return {ok:true};
   }
   if(action==='event-match'){
    requireEditor(row,user);if(row.status!=='published'||now()<data.starts)fail('当前活动尚未开始或已关闭，不能登记赛果',409);
    const value=tournament(row.id);if(!value||value.revision!==input.revision)fail('赛程已更新，请刷新',409);
    const match=value.matches.find(m=>m.id===input.match);if(!match||match.bye||!(match.status==='ready'||match.status==='done'&&input.correct===true))fail('这场对局尚未就绪或已经结束',409);
    if(match.status==='done'){const next=value.matches.find(m=>m.round===match.round+1&&m.slot===Math.floor(match.slot/2));if(next?.status==='done')fail('后续对局已产生赛果，不能改变晋级选手；请由负责人另行处理争议',409);string(input.note,1000,'更正原因');}
    if(![match.a,match.b].includes(input.winner))fail('胜者必须来自当前对局');
    match.winner=input.winner;match.status='done';match.note=string(input.note||'',1000,'赛果说明',true);advance(value);const revision=value.revision+1;delete value.revision;delete value.updated;saveTournament(row,value,revision,user);audit(user,'event:match',row.id,match.id+' '+match.winner);
    notify(user,[match.a,match.b],'赛果已登记：'+row.title,'/community/hub?section=event&item='+row.id,'match:'+row.id+':'+match.id,match.note);return {ok:true};
   }
   if(action==='event-checkpoint'){
    requireEditor(row,user);if(data.format!=='hunt')fail('只有寻宝活动可以设置检查点');
    const key=input.id?identifier(input.id):id(),old=db.prepare('SELECT * FROM hub_checkpoints WHERE id=? AND record=?').get(key,row.id),points=checkpoints(row.id);
    if(!old&&db.prepare('SELECT 1 FROM hub_checkpoints WHERE id=?').get(key))fail('检查点标识已被使用',409);
    if((old?.revision||0)!==input.revision)fail('检查点已更新，请刷新',409);
    if(db.prepare('SELECT 1 FROM hub_stamps WHERE record=? LIMIT 1').get(row.id))fail('已有玩家提交进度，请另建活动以更改检查点规则',409);
    if(input.remove){if(points.some(p=>p.prerequisite===key))fail('后续检查点依赖此处，请先移除依赖');db.prepare('DELETE FROM hub_checkpoints WHERE id=? AND record=?').run(key,row.id);return {ok:true};}
    if(!old&&points.length>=40)fail('每个活动最多 40 个检查点');
    const title=string(input.title,100,'检查点名称'),hint=string(input.hint||'',2000,'提示',true),kind=choice(input.kind,['code','metric','manual'],'验证方式'),server=choice(input.server||'',['','survival','mod-1','mod-2'],'服务器'),prerequisite=input.prerequisite?identifier(input.prerequisite):'';
    const metric=kind==='metric'?string(input.metric,160,'统计项'):'',threshold=kind==='metric'?integer(input.threshold,1,1000000000,'目标值'):0;
    if(kind==='metric'&&(!server||!/^[-\w:./]+$/.test(metric)))fail('服务器统计需要选择服务器并填写有效统计项');
    if(prerequisite){let at=points.find(p=>p.id===prerequisite);if(!at)fail('前置检查点不存在');const visited=new Set([key]);while(at){if(visited.has(at.id))fail('检查点前置关系不能循环');visited.add(at.id);at=points.find(p=>p.id===at.prerequisite);}}
    let secret=kind==='code'&&old?.kind==='code'?old.secret:'';
    if(kind==='code'&&input.code){const code=string(input.code,100,'口令'),salt=randomBytes(16).toString('hex');secret=salt+':'+scryptSync(code,salt,32).toString('hex');}
    if(kind==='code'&&!secret)fail('请设置口令');
    db.prepare('INSERT INTO hub_checkpoints VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,hint=excluded.hint,kind=excluded.kind,server=excluded.server,metric=excluded.metric,threshold=excluded.threshold,secret=excluded.secret,prerequisite=excluded.prerequisite,revision=excluded.revision').run(key,row.id,title,hint,kind,server,metric,threshold,secret,prerequisite,old?.position??points.length,(old?.revision||0)+1);audit(user,'event:checkpoint',row.id,title);return {ok:true};
   }
   if(action==='event-claim'){
    active(row,user);if(data.format!=='hunt')fail('该活动不是寻宝');const point=db.prepare('SELECT * FROM hub_checkpoints WHERE record=? AND id=?').get(row.id,input.checkpoint);if(!point)fail('检查点不存在',404);
    const previous=db.prepare('SELECT status FROM hub_stamps WHERE record=? AND checkpoint=? AND uid=?').get(row.id,point.id,user.uid);if(['accepted','review'].includes(previous?.status))return {ok:true};
    if(point.prerequisite&&!db.prepare("SELECT 1 FROM hub_stamps WHERE record=? AND checkpoint=? AND uid=? AND status='accepted'").get(row.id,point.prerequisite,user.uid))fail('请先完成前置检查点',409);
    if(point.kind==='code'){limit('hunt-code:'+row.id+':'+user.uid,10);const code=string(input.code,100,'口令'),[salt,digest]=point.secret.split(':');if(!timingSafeEqual(scryptSync(code,salt,32),Buffer.from(digest,'hex')))fail('口令不正确');recordStamp(row,point,user,'accepted');}
    if(point.kind==='metric'){
     const bridge=db.prepare('SELECT enabled FROM game_bridges WHERE server=?').get(point.server);if(!bridge?.enabled)fail('该服务器的可信统计尚未接通，请联系管理员',409);
     const stat=db.prepare('SELECT value,observed FROM game_stats WHERE server=? AND uid=? AND metric=?').get(point.server,user.uid.replaceAll('-','').toLowerCase(),point.metric);
     if(!stat||stat.observed<data.starts)fail('尚未收到活动开始后的服务器统计，请进入对应服务器后再同步',409);
     if(stat.value<point.threshold)fail('当前进度 '+stat.value+' / '+point.threshold,409);recordStamp(row,point,user,'accepted');
    }
    if(point.kind==='manual'){
     const note=string(input.note,2000,'完成说明'),images=input.images||[];if(!Array.isArray(images)||images.length>2)fail('最多两张凭证图片');images.forEach(url=>media.validate(url,user,'hub'));recordStamp(row,point,user,'review',{note,images});notify(user,[row.owner],'寻宝凭证待审核：'+row.title,'/community/hub?section=event&item='+row.id,'hunt:'+row.id+':'+point.id+':'+user.uid+':'+now());
    }
    audit(user,'event:claim',row.id,point.title);return {ok:true};
   }
   if(action==='event-review'){
    requireEditor(row,user);const stamp=db.prepare("SELECT * FROM hub_stamps WHERE record=? AND checkpoint=? AND uid=? AND status='review'").get(row.id,input.checkpoint,input.uid);if(!stamp||stamp.attempt!==input.attempt)fail('凭证已处理或重新提交，请刷新',409);
    const reason=string(input.reason||'',1000,'审核说明',input.accept===true);db.prepare('UPDATE hub_stamps SET status=?,reason=?,updated=? WHERE record=? AND checkpoint=? AND uid=?').run(input.accept===true?'accepted':'rejected',reason,now(),row.id,input.checkpoint,input.uid);audit(user,'event:review',row.id,input.uid+' '+(input.accept===true?'通过':'退回'));notify(user,[input.uid],row.title+' · 凭证'+(input.accept===true?'通过':'需补充'),'/community/hub?section=event&item='+row.id,'hunt-review:'+row.id+':'+input.checkpoint+':'+input.uid+':'+stamp.attempt,reason);return {ok:true};
   }
   return undefined;
  });
 }
 function passport(user,search){const offset=integer(Number(search.get('offset')||0),0,100000,'页码');const rows=db.prepare("SELECT c.title,c.server,r.id,r.title event,r.status,s.updated FROM hub_stamps s JOIN hub_checkpoints c ON c.id=s.checkpoint JOIN hub_records r ON r.id=s.record WHERE s.uid=? AND s.status='accepted' ORDER BY s.updated DESC,c.id LIMIT 25 OFFSET ?").all(user.uid,offset);return {items:rows.slice(0,24),hasMore:rows.length>24};}
 return {details,action,locked,assertRecordChange,passport};
}
