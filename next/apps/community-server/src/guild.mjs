import {randomUUID} from 'node:crypto';
const text=(v,n,required=true)=>{if(typeof v!=='string'||v.length>n||required&&!v.trim())throw Error('请完整填写任务内容，且不要超过长度限制');return v.trim();};
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function createGuild({db,auth,admin,body,send,limit,points,media,inbox}){
  db.exec(`CREATE TABLE IF NOT EXISTS guild_tasks(id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,images TEXT NOT NULL,reward_type TEXT NOT NULL,reward TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS guild_listing ON guild_tasks(status,created);
  CREATE TABLE IF NOT EXISTS guild_claims(id TEXT PRIMARY KEY,task TEXT NOT NULL REFERENCES guild_tasks(id),uid TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL,body TEXT NOT NULL DEFAULT '',images TEXT NOT NULL DEFAULT '[]',note TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL,UNIQUE(task,uid));
  CREATE INDEX IF NOT EXISTS guild_claim_user ON guild_claims(uid,status);
  CREATE TABLE IF NOT EXISTS guild_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,task TEXT NOT NULL,action TEXT NOT NULL,created INTEGER NOT NULL);`);
  const manager=req=>{try{admin(req);return true;}catch{return false;}};
  const images=(value,user)=>{if(!Array.isArray(value)||value.length>3)throw Error('每次最多上传三张图片');return JSON.stringify(value.map(v=>media.validate(v,user,'guild')));};
  const task=id=>db.prepare('SELECT * FROM guild_tasks WHERE id=?').get(id)||fail('任务不存在',404);
  const audit=(user,id,action)=>db.prepare('INSERT INTO guild_audit(actor,task,action,created) VALUES(?,?,?,?)').run(user.uid,id,action,Date.now());
  const notify=(user,recipients,t,kind)=>inbox?.notify({recipients,actor:user,kind:'guild',title:kind+' · '+t.title,target:'/guild?task='+t.id,dedupe:'guild:'+t.id+':'+kind+':'+Date.now()});
  function view(t,user,isAdmin,offset=0,summary=false){
    const where='task=?'+(isAdmin||t.owner===user.uid?'':' AND uid=?'),args=isAdmin||t.owner===user.uid?[t.id]:[t.id,user.uid];
    const claims=summary?[]:db.prepare('SELECT * FROM guild_claims WHERE '+where+' ORDER BY created DESC,id LIMIT 30 OFFSET ?').all(...args,offset);
    const ownClaim=db.prepare('SELECT id,status,body,images,note FROM guild_claims WHERE task=? AND uid=?').get(t.id,user.uid);
    if(ownClaim)ownClaim.images=JSON.parse(ownClaim.images);
    return {...t,images:JSON.parse(t.images),claims:claims.map(c=>({...c,images:JSON.parse(c.images)})),ownClaim,claimTotal:summary?0:db.prepare('SELECT COUNT(*) AS n FROM guild_claims WHERE '+where).get(...args).n,claimOffset:offset,mine:t.owner===user.uid};
  }
  function refund(t,actor){if(t.kind==='request'&&t.reward_type==='points')points.credit({id:'guild-refund:'+t.id,user:{uid:t.owner,name:t.name},amount:BigInt(t.reward),earned:0n,weekly:false,reason:'委托撤销退还 · '+t.title,actor:actor.uid});}
  async function route(req,res,url){
    const p=url.pathname;if(!/^\/api\/(?:admin\/)?guild(?:\/|$)/.test(p))return false;
    const user=auth(req),isAdmin=manager(req);if(p.startsWith('/api/admin/')&&!isAdmin)fail('需要管理员权限',403);limit('guild:'+user.uid,90);
    if(req.method==='GET'&&(p==='/api/guild'||p==='/api/admin/guild')){
      const scope=url.searchParams.get('scope')||'public',offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)fail('页码无效');
      const args=[],where=scope==='mine'?(args.push(user.uid,user.uid),"(owner=? OR id IN (SELECT task FROM guild_claims WHERE uid=?))"):scope==='review'&&isAdmin?"status='review'":scope==='main'?"kind='main' AND status='open'":"status IN ('open','active','submitted','completed')";
      const rows=db.prepare('SELECT * FROM guild_tasks WHERE '+where+' ORDER BY created DESC,id LIMIT 24 OFFSET ?').all(...args,offset);
      send(res,200,{items:rows.map(t=>view(t,user,isAdmin,0,true)),total:db.prepare('SELECT COUNT(*) AS n FROM guild_tasks WHERE '+where).get(...args).n,manager:isAdmin,consoleAdmin:!!user.consoleAdmin,wallet:points.wallet(user)});return true;
    }
    const match=p.match(/^\/api\/(?:admin\/)?guild\/([\w-]+)(?:\/(review|accept|submit|resolve|cancel|withdraw))?$/);
    if(match&&req.method==='GET'){const t=task(match[1]);if(!['open','active','submitted','completed'].includes(t.status)&&t.owner!==user.uid&&!isAdmin)fail('任务尚未公开',403);const offset=Number(url.searchParams.get('claimsOffset')||0);if(!Number.isSafeInteger(offset)||offset<0)fail('页码无效');send(res,200,{...view(t,user,isAdmin,offset),manager:isAdmin,consoleAdmin:!!user.consoleAdmin});return true;}
    if(req.method!=='POST')fail('不支持的操作');const input=await body(req,40000);
    if(p==='/api/guild'){
      limit('guild-create:'+user.uid,8,3600000);
      if(user.consoleAdmin&&input.kind!=='main')fail('后台账号只能发布主线任务');
      const kind=input.kind==='main'?'main':'request';if(kind==='main'&&!isAdmin)fail('主线任务由管理员发布',403);
      const title=text(input.title,100),description=text(input.description,12000),pictures=images(input.images||[],user);
      if(!['points','items','none'].includes(input.rewardType))fail('奖励类型无效');
      let reward=text(input.reward||'',2000,input.rewardType!=='none');if(input.rewardType==='points'){if(!/^\d{1,1000}$/.test(reward)||BigInt(reward)<=0n)fail('积分奖励必须为正整数');reward=String(BigInt(reward));}
      const requestKey=text(input.requestId||'',80);if(!/^[\w-]{16,80}$/.test(requestKey))fail('操作编号无效');const id=requestKey;
      points.settle();points.transaction(()=>{
        const old=db.prepare('SELECT * FROM guild_tasks WHERE id=?').get(id);if(old){if(old.owner!==user.uid)fail('操作编号冲突');return;}
        if(db.prepare("SELECT COUNT(*) AS n FROM guild_tasks WHERE owner=? AND status IN ('review','open','active','submitted')").get(user.uid).n>=30)fail('同时进行的任务最多 30 个');
        if(kind==='request'&&input.rewardType==='points')points.credit({id:'guild-escrow:'+id,user,amount:-BigInt(reward),earned:0n,weekly:false,reason:'委托积分托管 · '+title});
        const time=Date.now();db.prepare("INSERT INTO guild_tasks VALUES(?,?,?,?,?,?,?,?,?,'review','',?,?)").run(id,user.uid,user.name,kind,title,description,pictures,input.rewardType,reward,time,time);audit(user,id,'create');
      });send(res,201,{id});return true;
    }
    if(!match)fail('任务接口不存在',404);
    const id=match[1],op=match[2];let recipients=[],notice='';points.settle();
    points.transaction(()=>{
      const t=task(id),time=Date.now();
      if(op==='review'){
        if(!isAdmin)fail('需要管理员审核',403);if(t.status!=='review')fail('任务已审核，请刷新',409);
        if(!['approved','rejected'].includes(input.status))fail('审核结果无效');const note=text(input.note||'',2000,false);if(input.status==='rejected'&&!note)fail('请说明未通过原因');
        if(input.status==='rejected')refund(t,user);
        db.prepare('UPDATE guild_tasks SET status=?,note=?,updated=? WHERE id=?').run(input.status==='approved'?'open':'rejected',note,time,id);recipients=[t.owner];notice=input.status==='approved'?'委托已发布':'委托审核未通过';
      }else if(op==='accept'){
        if(user.consoleAdmin||t.owner===user.uid)fail('不能认领自己发布的委托');if(t.status!=='open')fail('任务当前不能认领');
        const previous=db.prepare('SELECT * FROM guild_claims WHERE task=? AND uid=?').get(id,user.uid);
        if(previous&&previous.status!=='withdrawn')fail('你已认领过此任务');
        if(db.prepare("SELECT COUNT(*) AS n FROM guild_claims WHERE uid=? AND status IN ('active','submitted')").get(user.uid).n>=10)fail('请先完成正在进行的任务（最多 10 个）');
        if(previous)db.prepare("UPDATE guild_claims SET status='active',body='',images='[]',note='',updated=? WHERE id=?").run(time,previous.id);
        else db.prepare("INSERT INTO guild_claims VALUES(?,?,?,?,'active','','[]','',?,?)").run(randomUUID(),id,user.uid,user.name,time,time);
        if(t.kind==='request')db.prepare("UPDATE guild_tasks SET status='active',updated=? WHERE id=?").run(time,id);recipients=[t.owner];notice='有旅人认领了委托';
      }else if(op==='withdraw'){
        const c=db.prepare('SELECT * FROM guild_claims WHERE task=? AND uid=?').get(id,user.uid);
        if(c?.status==='withdrawn')return;
        if(!c||c.status!=='active'||!['open','active'].includes(t.status))fail('只能放弃进行中的委托，已提交的凭证请先联系委托人退回');
        const note=text(input.note,2000);
        db.prepare("UPDATE guild_claims SET status='withdrawn',note=?,updated=? WHERE id=?").run(note,time,c.id);
        if(t.kind==='request')db.prepare("UPDATE guild_tasks SET status='open',updated=? WHERE id=?").run(time,id);
        recipients=[t.owner];notice='旅人已放弃委托，任务重新开放';
      }else if(op==='submit'){
        const c=db.prepare('SELECT * FROM guild_claims WHERE task=? AND uid=?').get(id,user.uid);if(!c||c.status!=='active'||!['open','active'].includes(t.status))fail('任务当前不能提交');
        db.prepare("UPDATE guild_claims SET status='submitted',body=?,images=?,updated=? WHERE id=?").run(text(input.body,8000),images(input.images||[],user),time,c.id);
        if(t.kind==='request')db.prepare("UPDATE guild_tasks SET status='submitted',updated=? WHERE id=?").run(time,id);recipients=[t.owner];notice='委托凭证待确认';
      }else if(op==='resolve'){
        if(!isAdmin&&(t.kind==='main'||t.owner!==user.uid))fail('只有委托人或管理员可以确认',403);
        if(typeof input.approved!=='boolean')fail('请选择通过或要求补充');
        const c=db.prepare('SELECT * FROM guild_claims WHERE task=? AND id=?').get(id,input.claim);if(!c)fail('认领不存在');
        if(c.status==='completed'&&input.approved===true)return;
        if(c.status!=='submitted'||!['open','submitted'].includes(t.status))fail('凭证已处理，请刷新',409);
        if(input.approved&&t.reward_type==='items'&&input.delivered!==true)fail('请确认已交付承诺的游戏内道具，再完成委托');
        const note=text(input.note||'',2000,false);if(input.approved!==true&&!note)fail('请说明需要补充的内容');
        if(input.approved===true&&t.reward_type==='points')points.credit({id:'guild-reward:'+c.id,user:{uid:c.uid,name:c.name},amount:BigInt(t.reward),earned:t.kind==='main'?BigInt(t.reward):0n,weekly:t.kind==='main',reason:(t.kind==='main'?'主线奖励 · ':'委托结算 · ')+t.title,actor:user.uid});
        db.prepare('UPDATE guild_claims SET status=?,note=?,updated=? WHERE id=?').run(input.approved===true?'completed':'active',note,time,c.id);
        if(t.kind==='request')db.prepare('UPDATE guild_tasks SET status=?,updated=? WHERE id=?').run(input.approved===true?'completed':'active',time,id);recipients=[c.uid];notice=input.approved===true?'委托已完成':'需要补充委托凭证';
      }else if(op==='cancel'){
        if(!isAdmin&&t.owner!==user.uid)fail('不能撤销他人的委托',403);
        if(t.status==='cancelled')return;
        if(!['review','open','active','submitted'].includes(t.status))fail('任务已经结束');
        const active=db.prepare("SELECT 1 FROM guild_claims WHERE task=? AND status IN ('active','submitted')").get(id);if(active&&!isAdmin)fail('已有玩家认领，请联系管理员协商撤销');
        refund(t,user);db.prepare("UPDATE guild_tasks SET status='cancelled',note=?,updated=? WHERE id=?").run(text(input.note||'委托已撤销',2000),time,id);
        recipients=db.prepare('SELECT uid FROM guild_claims WHERE task=?').all(id).map(c=>c.uid);db.prepare("UPDATE guild_claims SET status='cancelled',updated=? WHERE task=? AND status IN ('active','submitted')").run(time,id);notice='委托已撤销';
      }else fail('任务操作不存在',404);
      audit(user,id,op);
    });
    if(notice)notify(user,recipients,task(id),notice);send(res,200,{task:view(task(id),user,isAdmin),wallet:points.wallet(user)});return true;
  }
  const completed=(uid,id)=>!!db.prepare("SELECT 1 FROM guild_claims c JOIN guild_tasks t ON t.id=c.task WHERE c.uid=? AND c.task=? AND c.status='completed' AND t.kind='main'").get(uid,id);
  return {route,completed};
}
