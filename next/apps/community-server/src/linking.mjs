import {randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
import {initialChapter} from './linking-seed.mjs';

const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const string=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail(`文本不能为空或超过 ${max} 字`);return value.trim();};
const identifier=value=>{if(typeof value!=='string'||! /^[a-z0-9][a-z0-9-]{0,63}$/.test(value))fail('标识只能包含小写字母、数字及短横线，最多 64 位');return value;};
const list=(value,max)=>{if(!Array.isArray(value)||value.length>max)fail(`列表最多 ${max} 项`);return value;};
const normalizeCode=value=>String(value).normalize('NFKC').trim().toLocaleLowerCase('en-US');
const hashAnswer=answer=>{const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(normalizeCode(answer),salt,32).toString('hex');};
const checkAnswer=(answer,stored)=>{const [salt,hash]=stored.split(':');return timingSafeEqual(scryptSync(normalizeCode(answer),salt,32),Buffer.from(hash,'hex'));};
const date=value=>{if(!value)return '';if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail('开放或结束时间无效');return new Date(value).toISOString();};

export function validateChapter(input,previous){
  const c={id:identifier(input.id),title:string(input.title,100,true),subtitle:string(input.subtitle||'',1000),locale:'zh-CN',order:Number(input.order)||0,opensAt:date(input.opensAt),closesAt:date(input.closesAt)};
  if(!Number.isSafeInteger(c.order)||Math.abs(c.order)>100000)fail('排序值无效');
  if(c.opensAt&&c.closesAt&&c.opensAt>=c.closesAt)fail('结束时间必须晚于开放时间');
  const requirements=value=>[...new Set(list(value||[],100).map(identifier))];
  c.archives=list(input.archives,200).map(a=>({id:identifier(a.id),title:string(a.title,120,true),en:string(a.en||'',120),category:string(a.category||'未分类',40,true),department:string(a.department||'',100),date:string(a.date||'',100),lead:string(a.lead||'',100),summary:string(a.summary||'',2000),body:string(a.body||'',50000,true),notes:list(a.notes||[],50).map(v=>string(v,4000)),requires:requirements(a.requires)}));
  c.tasks=list(input.tasks||[],100).map(t=>{
    if(!['read','code','manual','guild','stat'].includes(t.type))fail('任务类型无效');
    const task={id:identifier(t.id),title:string(t.title,120,true),description:string(t.description||'',4000),type:t.type,requires:requirements(t.requires)};
    if(t.type==='read')task.archiveId=identifier(t.archiveId);
    if(t.type==='guild')task.guildId=identifier(t.guildId);
    if(t.type==='stat'){
      if(!['survival','mod-1','mod-2'].includes(t.server)||!/^[-a-z0-9_:./]{1,160}$/.test(t.metric)||!Number.isSafeInteger(t.value)||t.value<1)fail('请填写服务器、统计项与正整数目标');
      Object.assign(task,{server:t.server,metric:t.metric,value:t.value});
    }
    if(t.type==='code'){
      // Answers never round-trip through either the player or admin API.
      const old=previous?.tasks.find(v=>v.id===t.id&&v.type==='code');
      task.answerHash=t.answer?hashAnswer(string(t.answer,200,true)):old?.answerHash;
      if(!task.answerHash)fail(`请设置「${task.title}」的答案`);
    }
    return task;
  });
  if(!c.archives.length)fail('每章至少需要一份档案');
  const archives=new Map(c.archives.map(v=>[v.id,v])),tasks=new Map(c.tasks.map(v=>[v.id,v]));
  if(archives.size!==c.archives.length||tasks.size!==c.tasks.length)fail('同一章节中的档案或任务标识不能重复');
  if(new Set(c.archives.map(a=>a.category)).size>12)fail('每章最多 12 个档案分类');
  const edges=new Map();
  for(const a of c.archives)edges.set('a:'+a.id,a.requires.map(id=>'t:'+id));
  for(const t of c.tasks)edges.set('t:'+t.id,[...t.requires.map(id=>'t:'+id),...(t.type==='read'?['a:'+t.archiveId]:[])]);
  const done=new Set(),visiting=new Set();
  function visit(key){if(done.has(key))return;if(!edges.has(key))fail('解锁条件引用了不存在的任务或档案：'+key.slice(2));if(visiting.has(key))fail('解锁条件存在循环，玩家将无法完成');visiting.add(key);for(const dep of edges.get(key))visit(dep);visiting.delete(key);done.add(key);}
  for(const key of edges.keys())visit(key);
  return c;
}

const adminDocument=c=>({...c,tasks:c.tasks.map(({answerHash,...t})=>({...t,...(answerHash?{answerConfigured:true}:{})}))});

export function createLinking({db,auth,admin,body,send,limit,guild,gameTelemetry}){
  db.exec(`CREATE TABLE IF NOT EXISTS linking_chapters(id TEXT PRIMARY KEY,draft TEXT NOT NULL,live TEXT,revision INTEGER NOT NULL,live_revision INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS linking_config(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL,revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS linking_progress(uid TEXT NOT NULL,chapter TEXT NOT NULL,kind TEXT NOT NULL,item TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(uid,chapter,kind,item));
    CREATE TABLE IF NOT EXISTS linking_submissions(id INTEGER PRIMARY KEY AUTOINCREMENT,uid TEXT NOT NULL,name TEXT NOT NULL,chapter TEXT NOT NULL,task TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL,UNIQUE(uid,chapter,task));
    CREATE INDEX IF NOT EXISTS linking_review_queue ON linking_submissions(status,updated);
    CREATE TABLE IF NOT EXISTS linking_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,chapter TEXT NOT NULL,created INTEGER NOT NULL);`);
  if(!db.prepare('SELECT 1 FROM linking_config').get()){
    // A single self-contained introduction makes a fresh installation usable.
    const now=Date.now(),seed=JSON.stringify(validateChapter(initialChapter));
    db.exec('BEGIN IMMEDIATE');try{
      db.prepare('INSERT INTO linking_config VALUES(1,?,1)').run(JSON.stringify({enabled:true,title:'LINKING',intro:'档案探索 · 任务解锁',locale:'zh-CN'}));
      db.prepare('INSERT OR IGNORE INTO linking_chapters VALUES(?,?,?,1,1,0,?)').run(initialChapter.id,seed,seed,now);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  const config=()=>{const r=db.prepare('SELECT * FROM linking_config WHERE id=1').get();return {...JSON.parse(r.value),revision:r.revision};};
  const audit=(user,action,chapter='')=>db.prepare('INSERT INTO linking_audit(actor,action,chapter,created) VALUES(?,?,?,?)').run(user.uid,action,chapter,Date.now());
  const progress=(uid,id)=>db.prepare('SELECT kind,item,created FROM linking_progress WHERE uid=? AND chapter=?').all(uid,id);
  const putProgress=(uid,chapter,kind,item)=>db.prepare('INSERT OR IGNORE INTO linking_progress VALUES(?,?,?,?,?)').run(uid,chapter,kind,item,Date.now());
  function completed(c,entries,uid){
    const result=new Set(entries.filter(v=>v.kind==='task').map(v=>v.item));
    for(let i=0;i<c.tasks.length;i++)for(const t of c.tasks)if(!result.has(t.id)&&t.requires.every(id=>result.has(id))){
      const fulfilled=t.type==='read'?entries.some(v=>v.kind==='read'&&v.item===t.archiveId):t.type==='guild'?uid&&guild?.completed(uid,t.guildId):t.type==='stat'?uid&&gameTelemetry?.reached(uid,t):false;
      if(fulfilled){result.add(t.id);if(uid&&t.type!=='read')putProgress(uid,c.id,'task',t.id);}
    }
    return result;
  }
  function published(id){
    const row=db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(id);
    if(!row?.live||row.archived)fail('章节尚未发布或已归档',404);
    const c=JSON.parse(row.live),now=Date.now();
    if(c.opensAt&&Date.parse(c.opensAt)>now)fail('章节尚未开放',403);
    if(c.closesAt&&Date.parse(c.closesAt)<=now)fail('本章节活动已结束',403);
    return {row,c};
  }
  function view(c,row,user,manager){
    const entries=progress(user.uid,c.id),done=completed(c,entries,user.uid);
    const submissions=db.prepare('SELECT id,task,status,note,updated FROM linking_submissions WHERE uid=? AND chapter=?').all(user.uid,c.id);
    return {...c,revision:row.live_revision,manager,user:{uid:user.uid,name:user.name},
      archives:c.archives.map(a=>{const unlocked=a.requires.every(id=>done.has(id));return {...a,body:unlocked?a.body:undefined,notes:unlocked?a.notes:[],unlocked,readAt:entries.find(v=>v.kind==='read'&&v.item===a.id)?.created||null,bookmarked:entries.some(v=>v.kind==='bookmark'&&v.item===a.id)};}),
      tasks:c.tasks.map(({answerHash,...t})=>({...t,completed:done.has(t.id),available:t.requires.every(id=>done.has(id)),submission:submissions.find(s=>s.task===t.id)||null})),
      progress:{read:c.archives.filter(a=>entries.some(v=>v.kind==='read'&&v.item===a.id)).length,total:c.archives.length,completed:c.tasks.filter(t=>done.has(t.id)).length,tasks:c.tasks.length}};
  }
  return async(req,res,url)=>{
    const path=url.pathname;
    // Old activity is deliberately retired; its database is left intact as an archive.
    if(/^\/api\/(?:admin\/)?arcana(?:\/|$)/.test(path)){send(res,410,{error:'旧活动已停用，请更新客户端后进入新的 LINKING 档案馆'});return true;}
    if(!/^\/api\/(?:admin\/)?linking(?:\/|$)/.test(path))return false;
    let user;try{user=auth(req);}catch{fail('请先登录社区后进入 LINKING',401);}
    let manager=false;try{admin(req);manager=true;}catch{}
    const isAdmin=path.startsWith('/api/admin/');if(isAdmin&&!manager)fail('需要社区管理员权限',403);
    limit('linking:'+user.uid,90);
    const reply=(value,status=200)=>{send(res,status,value);return true;};
    if(isAdmin){
      if(path==='/api/admin/linking'&&req.method==='GET')return reply({config:config(),chapters:db.prepare('SELECT * FROM linking_chapters ORDER BY updated DESC').all().map(r=>({id:r.id,title:JSON.parse(r.draft).title,revision:r.revision,liveRevision:r.live_revision,published:!!r.live,archived:!!r.archived,updated:r.updated}))});
      if(path==='/api/admin/linking/config'&&req.method==='PUT'){
        const input=await body(req),value={enabled:input.enabled===true,title:string(input.title,80,true),intro:string(input.intro||'',1000),locale:'zh-CN'};
        const changed=db.prepare('UPDATE linking_config SET value=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(value),input.revision);
        if(!changed.changes)fail('配置已被其他管理员修改，请刷新后再保存',409);audit(user,'settings');return reply(config());
      }
      if(path==='/api/admin/linking/submissions'&&req.method==='GET'){
        const offset=Math.max(0,Math.min(1000000,Number(url.searchParams.get('offset'))||0));if(!Number.isSafeInteger(offset))fail('页码无效');
        return reply({items:db.prepare("SELECT * FROM linking_submissions WHERE status='pending' ORDER BY updated,id LIMIT 50 OFFSET ?").all(offset),total:db.prepare("SELECT COUNT(*) AS n FROM linking_submissions WHERE status='pending'").get().n});
      }
      const review=path.match(/^\/api\/admin\/linking\/submissions\/(\d+)$/);
      if(review&&req.method==='POST'){
        const input=await body(req),item=db.prepare('SELECT * FROM linking_submissions WHERE id=?').get(Number(review[1]));
        if(!item)fail('提交不存在',404);if(!['approved','rejected'].includes(input.status))fail('审核状态无效');
        const note=string(input.note||'',2000);if(input.status==='rejected'&&!note)fail('请填写未通过原因');
        const chapter=db.prepare('SELECT live FROM linking_chapters WHERE id=?').get(item.chapter);
        if(!chapter?.live||!JSON.parse(chapter.live).tasks.some(t=>t.id===item.task&&t.type==='manual'))fail('任务已被移除，请先恢复或调整章节');
        db.exec('BEGIN IMMEDIATE');try{
          const r=db.prepare("UPDATE linking_submissions SET status=?,note=?,updated=? WHERE id=? AND status='pending' AND updated=?").run(input.status,note,Date.now(),item.id,input.updated);
          if(!r.changes)fail('这份提交已更新或已审核，请刷新',409);
          if(input.status==='approved')putProgress(item.uid,item.chapter,'task',item.task);
          audit(user,'review:'+input.status,item.chapter);db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e;}return reply({ok:true});
      }
      const route=path.match(/^\/api\/admin\/linking\/chapters\/([a-z0-9-]+)(?:\/(publish|archive))?$/);
      if(route){
        const id=identifier(route[1]),row=db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(id);
        if(req.method==='GET'&&!route[2]){if(!row)fail('章节不存在',404);return reply({chapter:adminDocument(JSON.parse(row.draft)),revision:row.revision,liveRevision:row.live_revision,published:!!row.live,archived:!!row.archived});}
        const input=await body(req,1024*1024);
        if(req.method==='PUT'&&!route[2]){
          if(input.chapter?.id!==id)fail('章节标识不一致');if((row?.revision||0)!==input.revision)fail('章节已有更新，请刷新后编辑',409);
          const c=validateChapter(input.chapter,row?JSON.parse(row.draft):undefined),next=(row?.revision||0)+1;
          if(!row&&db.prepare('SELECT COUNT(*) AS n FROM linking_chapters').get().n>=1000)fail('章节数量已达上限，请联系管理员归档导出');
          db.prepare('INSERT INTO linking_chapters(id,draft,revision,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET draft=excluded.draft,revision=excluded.revision,updated=excluded.updated').run(id,JSON.stringify(c),next,Date.now());
          audit(user,'save-draft',id);return reply({revision:next,chapter:adminDocument(c)});
        }
        if(req.method==='POST'&&route[2]){
          if(!row)fail('章节不存在',404);if(row.revision!==input.revision)fail('章节已有更新，请刷新后发布',409);
          if(route[2]==='publish')db.prepare('UPDATE linking_chapters SET live=draft,live_revision=revision,archived=0,updated=? WHERE id=?').run(Date.now(),id);
          else db.prepare('UPDATE linking_chapters SET archived=1,revision=revision+1,updated=? WHERE id=?').run(Date.now(),id);
          audit(user,route[2],id);return reply({ok:true});
        }
      }
      fail('没有这个管理接口',404);
    }
    const settings=config();
    if(path==='/api/linking/catalog'&&req.method==='GET'){
      const now=Date.now();
      return reply({config:settings,manager,user:{uid:user.uid,name:user.name},chapters:settings.enabled?db.prepare('SELECT * FROM linking_chapters WHERE live IS NOT NULL AND archived=0').all().map(row=>{
        const c=JSON.parse(row.live),entries=progress(user.uid,c.id),done=completed(c,entries,user.uid);
        return {id:c.id,title:c.title,subtitle:c.subtitle,order:c.order,revision:row.live_revision,opensAt:c.opensAt,closesAt:c.closesAt,status:c.opensAt&&Date.parse(c.opensAt)>now?'scheduled':c.closesAt&&Date.parse(c.closesAt)<=now?'ended':'open',total:c.archives.length,read:c.archives.filter(a=>entries.some(e=>e.kind==='read'&&e.item===a.id)).length,tasks:c.tasks.length,completed:c.tasks.filter(t=>done.has(t.id)).length};
      }).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)):[]});
    }
    if(!settings.enabled)fail('活动暂未开放，请稍后再来',403);
    const route=path.match(/^\/api\/linking\/chapters\/([a-z0-9-]+)(?:\/(action))?$/);
    if(route){
      const {row,c}=published(identifier(route[1]));
      if(!route[2]&&req.method==='GET')return reply(view(c,row,user,manager));
      if(route[2]&&req.method==='POST'){
        const input=await body(req,16384),id=identifier(input.id),entries=progress(user.uid,c.id),done=completed(c,entries,user.uid);
        if(input.kind==='read'||input.kind==='bookmark'){
          const a=c.archives.find(a=>a.id===id);if(!a)fail('档案不存在',404);if(!a.requires.every(t=>done.has(t)))fail('请先完成档案的解锁任务',403);
          if(input.kind==='read')putProgress(user.uid,c.id,'read',id);
          else if(input.value===true)putProgress(user.uid,c.id,'bookmark',id);
          else db.prepare("DELETE FROM linking_progress WHERE uid=? AND chapter=? AND kind='bookmark' AND item=?").run(user.uid,c.id,id);
        }else if(input.kind==='submit'){
          const task=c.tasks.find(t=>t.id===id);if(!task)fail('任务不存在',404);if(!task.requires.every(t=>done.has(t)))fail('请先完成前置任务',403);
          if(!done.has(id)){
            if(task.type==='code'){limit('linking-answer:'+user.uid+':'+c.id,12);if(!checkAnswer(string(input.answer||'',200,true),task.answerHash))fail('口令不匹配，请再看看相关档案');putProgress(user.uid,c.id,'task',id);}
            else if(task.type==='manual'){
              limit('linking-submit:'+user.uid,10);const content=string(input.submission||'',8000,true),now=Date.now();
              const existing=db.prepare('SELECT status FROM linking_submissions WHERE uid=? AND chapter=? AND task=?').get(user.uid,c.id,id);if(existing?.status==='pending')fail('已经提交，请等待管理员审核');
              db.prepare("INSERT INTO linking_submissions(uid,name,chapter,task,body,status,created,updated) VALUES(?,?,?,?,?,'pending',?,?) ON CONFLICT(uid,chapter,task) DO UPDATE SET body=excluded.body,status='pending',note='',updated=excluded.updated").run(user.uid,user.name,c.id,id,content,now,now);
            }else fail('此任务根据阅读、公会或服务器记录自动完成，请刷新进度');
          }
        }else fail('不支持的活动操作');
        return reply(view(c,row,user,manager));
      }
    }
    fail('没有这个活动接口',404);
  };
}
