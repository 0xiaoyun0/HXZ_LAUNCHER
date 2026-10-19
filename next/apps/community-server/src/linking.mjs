import {randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';
import {initialChapter} from './linking-seed.mjs';
import {expandStory081,expandMusicArchive081,expandArchiveSignal081,story081Items,story081Expansions} from './linking-story081.mjs';
import {createStoryVolumes081,volume081Items,volume081Info} from './linking-volumes081.mjs';

const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const string=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail(`文本不能为空或超过 ${max} 字`);return value.trim();};
const identifier=value=>{if(typeof value!=='string'||! /^[a-z0-9][a-z0-9-]{0,63}$/.test(value))fail('标识只能包含小写字母、数字及短横线，最多 64 位');return value;};
const list=(value,max)=>{if(!Array.isArray(value)||value.length>max)fail(`列表最多 ${max} 项`);return value;};
const normalizeCode=value=>String(value).normalize('NFKC').trim().toLocaleLowerCase('en-US');
const hashAnswer=answer=>{const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(normalizeCode(answer),salt,32).toString('hex');};
const checkAnswer=(answer,stored)=>{const [salt,hash]=stored.split(':');return timingSafeEqual(scryptSync(normalizeCode(answer),salt,32),Buffer.from(hash,'hex'));};
const date=value=>{if(!value)return '';if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))fail('开放或结束时间无效');return new Date(value).toISOString();};
const appearanceEffects=new Set(['music-archive','archive-signal']);

export function validateChapter(input,previous){
  const c={id:identifier(input.id),title:string(input.title,100,true),subtitle:string(input.subtitle||'',1000),locale:'zh-CN',order:Number(input.order)||0,opensAt:date(input.opensAt),closesAt:date(input.closesAt)};
  if(!Number.isSafeInteger(c.order)||Math.abs(c.order)>100000)fail('排序值无效');
  if(c.opensAt&&c.closesAt&&c.opensAt>=c.closesAt)fail('结束时间必须晚于开放时间');
  if(input.prerequisites!==undefined){
    c.prerequisites=list(input.prerequisites,16).map(p=>({chapter:identifier(p?.chapter),task:identifier(p?.task)}));
    if(c.prerequisites.some(p=>p.chapter===c.id))fail('章节前置必须引用其他章节');
    if(new Set(c.prerequisites.map(p=>p.chapter+':'+p.task)).size!==c.prerequisites.length)fail('章节前置不能重复');
  }
  const requirements=value=>[...new Set(list(value||[],100).map(identifier))];
  c.archives=list(input.archives,200).map(a=>({id:identifier(a.id),title:string(a.title,120,true),en:string(a.en||'',120),category:string(a.category||'未分类',40,true),department:string(a.department||'',100),date:string(a.date||'',100),lead:string(a.lead||'',100),summary:string(a.summary||'',2000),body:string(a.body||'',50000,true),notes:list(a.notes||[],50).map(v=>string(v,4000)),requires:requirements(a.requires)}));
  c.tasks=list(input.tasks||[],100).map(t=>{
    if(!['read','code','manual','guild','stat'].includes(t.type))fail('任务类型无效');
    const task={id:identifier(t.id),title:string(t.title,120,true),description:string(t.description||'',4000),type:t.type,requires:requirements(t.requires)};
    if(t.effect){if(!appearanceEffects.has(t.effect))fail('不支持的外观解锁效果');task.effect=t.effect;}
    if(t.reward){if(!/^[-\w]{1,80}$/.test(t.reward.item)||!Number.isSafeInteger(t.reward.quantity)||t.reward.quantity<1||t.reward.quantity>99)fail('任务奖励或数量无效');task.reward={item:t.reward.item,quantity:t.reward.quantity};}
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

export function createLinking({db,auth,admin,body,send,limit,guild,gameTelemetry,inventory,points}){
  db.exec(`CREATE TABLE IF NOT EXISTS linking_chapters(id TEXT PRIMARY KEY,draft TEXT NOT NULL,live TEXT,revision INTEGER NOT NULL,live_revision INTEGER NOT NULL DEFAULT 0,archived INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS linking_config(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL,revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS linking_progress(uid TEXT NOT NULL,chapter TEXT NOT NULL,kind TEXT NOT NULL,item TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(uid,chapter,kind,item));
    CREATE TABLE IF NOT EXISTS linking_submissions(id INTEGER PRIMARY KEY AUTOINCREMENT,uid TEXT NOT NULL,name TEXT NOT NULL,chapter TEXT NOT NULL,task TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL,UNIQUE(uid,chapter,task));
    CREATE INDEX IF NOT EXISTS linking_review_queue ON linking_submissions(status,updated);
    CREATE TABLE IF NOT EXISTS linking_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,chapter TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS linking_rewards(uid TEXT NOT NULL,chapter TEXT NOT NULL,task TEXT NOT NULL,item TEXT NOT NULL,quantity INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(uid,chapter,task));
    CREATE TABLE IF NOT EXISTS linking_effects(uid TEXT NOT NULL,effect TEXT NOT NULL,chapter TEXT NOT NULL,task TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(uid,effect));`);
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
  function rewardView(t,uid,chapter){if(!t.reward)return undefined;const item=inventory?.definition(t.reward.item);return {...t.reward,title:item?.title||'活动纪念物',available:!!item?.enabled,claimed:!!db.prepare('SELECT 1 FROM linking_rewards WHERE uid=? AND chapter=? AND task=?').get(uid,chapter,t.id)};}
  function rewardItem(task){
    const item=inventory?.definition(task.reward.item);
    if(!item?.enabled)fail('任务「'+task.title+'」的奖励不存在或已停用');
    if(volume081Items.some(v=>v.id===item.id)&&(item.kind!=='collectible'||item.permission))fail('两卷纪念物标识与现有权限道具冲突，请管理员检查：'+item.id,409);
    return item;
  }
  function checkRewards(c){for(const t of c.tasks)if(t.reward)rewardItem(t);}
  function completed(c,entries,uid,persist=true){
    const result=new Set(entries.filter(v=>v.kind==='task').map(v=>v.item));
    for(let i=0;i<c.tasks.length;i++)for(const t of c.tasks)if(!result.has(t.id)&&t.requires.every(id=>result.has(id))){
      const fulfilled=t.type==='read'?entries.some(v=>v.kind==='read'&&v.item===t.archiveId):t.type==='guild'?uid&&guild?.completed(uid,t.guildId):t.type==='stat'?uid&&gameTelemetry?.reached(uid,t):false;
      if(fulfilled){result.add(t.id);if(persist&&uid&&t.type!=='read')putProgress(uid,c.id,'task',t.id);}
    }
    return result;
  }
  const openNow=(c,row)=>!row.archived&&!!row.live&&(!c.opensAt||Date.parse(c.opensAt)<=Date.now())&&(!c.closesAt||Date.parse(c.closesAt)>Date.now());
  // Dependencies are evaluated from published documents on every request. Reading
  // this graph never persists inferred completion or grants an appearance.
  function prerequisites(c,uid,visiting=new Set(),memo=new Map()){
    if(memo.has(c.id))return memo.get(c.id);
    if(visiting.has(c.id))return (c.prerequisites||[]).map(p=>({...p,completed:false}));
    const next=new Set(visiting).add(c.id);
    const result=(c.prerequisites||[]).map(p=>{
      const row=db.prepare('SELECT live FROM linking_chapters WHERE id=?').get(p.chapter),dependency=row?.live&&JSON.parse(row.live);
      const ready=dependency&&prerequisites(dependency,uid,next,memo).every(v=>v.completed);
      return {...p,completed:!!(ready&&dependency.tasks.some(t=>t.id===p.task)&&completed(dependency,progress(uid,p.chapter),uid,false).has(p.task))};
    });memo.set(c.id,result);return result;
  }
  function requirePrerequisites(c,uid){if(prerequisites(c,uid).some(p=>!p.completed))fail('章节尚未解锁，请先完成前置章节任务',403);}
  const dependencyKey=c=>JSON.stringify((c.prerequisites||[]).map(p=>p.chapter+':'+p.task).sort());
  function checkPublishedGraph(candidate,archiving=false){
    const rows=db.prepare('SELECT * FROM linking_chapters WHERE live IS NOT NULL').all();
    const documents=new Map(rows.map(row=>[row.id,{c:JSON.parse(row.live),archived:!!row.archived}]));
    const previous=documents.get(candidate.id);
    if(previous&&dependencyKey(previous.c)!==dependencyKey(candidate))fail('已发布章节的前置不可删除或更改；请创建新章节以调整路线',409);
    documents.set(candidate.id,{c:candidate,archived:archiving});
    if(archiving)for(const {c,archived} of documents.values())if(!archived&&(c.prerequisites||[]).some(p=>p.chapter===candidate.id))fail('仍被已发布章节「'+c.title+'」作为前置引用，请先归档后续章节',409);
    const done=new Set(),visiting=new Set();
    function visit(id){
      if(done.has(id))return;if(visiting.has(id))fail('章节前置存在跨章循环，玩家将无法完成');
      visiting.add(id);const {c}=documents.get(id);
      for(const p of c.prerequisites||[]){
        const target=documents.get(p.chapter);
        if(!target||target.archived)fail('前置章节尚未发布或已归档：'+p.chapter,409);
        if(!target.c.tasks.some(t=>t.id===p.task))fail('前置任务不存在或仍被已发布章节引用：'+p.chapter+'/'+p.task,409);
        visit(p.chapter);
      }
      visiting.delete(id);done.add(id);
    }
    for(const [id,value] of documents)if(!value.archived)visit(id);
  }
  function earnEffects(c,done,uid){
    // Cosmetic grants are separate from paid permissions and never read a draft.
    for(const task of c.tasks)if(appearanceEffects.has(task.effect)&&done.has(task.id))db.prepare('INSERT OR IGNORE INTO linking_effects VALUES(?,?,?,?,?)').run(uid,task.effect,c.id,task.id,Date.now());
  }
  function reconcileEffects(user,enabled){
    if(!enabled||user.consoleAdmin)return;
    // Recover interrupted grants and earlier completion records without scanning every chapter.
    const rows=db.prepare('SELECT * FROM linking_chapters WHERE live IS NOT NULL AND archived=0 AND id IN (SELECT chapter FROM linking_progress WHERE uid=?)').all(user.uid);
    for(const row of rows){const c=JSON.parse(row.live);if(openNow(c,row)&&prerequisites(c,user.uid).every(p=>p.completed))earnEffects(c,completed(c,progress(user.uid,c.id),user.uid),user.uid);}
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
    const entries=progress(user.uid,c.id),done=completed(c,entries,user.consoleAdmin?undefined:user.uid);
    if(!user.consoleAdmin)earnEffects(c,done,user.uid);
    const submissions=db.prepare('SELECT id,task,status,note,updated FROM linking_submissions WHERE uid=? AND chapter=?').all(user.uid,c.id);
    return {...c,revision:row.live_revision,manager,user:{uid:user.uid,name:user.name},
      archives:c.archives.map(a=>{const unlocked=a.requires.every(id=>done.has(id));return {...a,body:unlocked?a.body:undefined,notes:unlocked?a.notes:[],unlocked,readAt:entries.find(v=>v.kind==='read'&&v.item===a.id)?.created||null,bookmarked:entries.some(v=>v.kind==='bookmark'&&v.item===a.id)};}),
      tasks:c.tasks.map(({answerHash,...t})=>({...t,reward:rewardView(t,user.uid,c.id),completed:done.has(t.id),available:t.requires.every(id=>done.has(id)),submission:submissions.find(s=>s.task===t.id)||null})),
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
      if(path==='/api/admin/linking'&&req.method==='GET')return reply({config:config(),storyExpansions:story081Expansions,volumeExpansion:{...volume081Info,available:true},rewardItems:inventory?db.prepare('SELECT id,title FROM inventory_items WHERE enabled=1 ORDER BY title LIMIT 500').all():[],chapters:db.prepare('SELECT * FROM linking_chapters ORDER BY updated DESC').all().map(r=>({id:r.id,title:JSON.parse(r.draft).title,revision:r.revision,liveRevision:r.live_revision,published:!!r.live,archived:!!r.archived,updated:r.updated}))});
      if(path==='/api/admin/linking/volumes-expansion'&&req.method==='POST'){
        const input=await body(req),id=identifier(input.chapter);
        if(!inventory||!points)fail('请先更新社区服务端以启用活动物品',503);
        let documents,openingRevision;
        points.transaction(()=>{
          const row=db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(id);
          if(!row)fail('章节不存在',404);if(row.revision!==input.revision)fail('开头草稿已改变，请刷新后重试',409);
          const opening=JSON.parse(row.draft);
          if(!opening.tasks.some(t=>t.id==='snow-ash-light-signal'))fail('请先为现有开头加入归途灯标续篇（snow-ash-light-signal），再创建两卷草稿；原文不会被自动修改');
          documents=createStoryVolumes081({openingChapter:id}).map(c=>validateChapter(c));
          for(const c of documents)if(db.prepare('SELECT 1 FROM linking_chapters WHERE id=?').get(c.id))fail('章节 '+c.id+' 已存在；不会覆盖或重复导入',409);
          if(db.prepare('SELECT COUNT(*) AS n FROM linking_chapters').get().n+documents.length>1000)fail('章节数量已达上限');
          const now=Date.now();
          for(const item of volume081Items)db.prepare("INSERT OR IGNORE INTO inventory_items VALUES(?,?,?,'','collectible','','days',0,0,1,?,?)").run(item.id,item.title,item.description,now,now);
          for(const c of documents){checkRewards(c);db.prepare('INSERT INTO linking_chapters(id,draft,revision,updated) VALUES(?,?,1,?)').run(c.id,JSON.stringify(c),now);audit(user,'create-story-volumes-081',c.id);}
          // Reserve this source revision too, so a concurrent edit/import loses CAS.
          const changed=db.prepare('UPDATE linking_chapters SET revision=revision+1,updated=? WHERE id=? AND revision=?').run(now,id,input.revision);
          if(!changed.changes)fail('开头草稿已改变，请刷新后重试',409);openingRevision=row.revision+1;
        });
        return reply({chapter:documents[0].id,chapterIds:documents.map(c=>c.id),openingChapter:id,openingRevision,chapters:documents.map(c=>({id:c.id,title:c.title,chapter:adminDocument(c),revision:1,liveRevision:0,published:false,archived:false}))},201);
      }
      if(['/api/admin/linking/story-expansion','/api/admin/linking/music-expansion','/api/admin/linking/signal-expansion'].includes(path)&&req.method==='POST'){
        const input=await body(req),id=identifier(input.chapter),row=db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(id);
        if(!row)fail('章节不存在',404);if(row.revision!==input.revision)fail('草稿已改变，请刷新后重试',409);
        if(!inventory||!points)fail('请先更新社区服务端以启用活动物品',503);
        const expand=path.endsWith('/music-expansion')?expandMusicArchive081:path.endsWith('/signal-expansion')?expandArchiveSignal081:expandStory081;
        const c=validateChapter(expand(JSON.parse(row.draft)),JSON.parse(row.draft)),now=Date.now();
        points.transaction(()=>{for(const item of story081Items)db.prepare("INSERT OR IGNORE INTO inventory_items VALUES(?,?,?,'','collectible','','days',0,0,1,?,?)").run(item.id,item.title,item.description,now,now);checkRewards(c);const changed=db.prepare('UPDATE linking_chapters SET draft=?,revision=revision+1,updated=? WHERE id=? AND revision=?').run(JSON.stringify(c),now,id,row.revision);if(!changed.changes)fail('草稿已改变，请刷新后重试',409);audit(user,expand===expandStory081?'append-snow-ash-081':expand===expandMusicArchive081?'append-music-archive-081':'append-archive-signal-081',id);});
        return reply({chapter:adminDocument(c),revision:row.revision+1,liveRevision:row.live_revision,published:!!row.live,archived:!!row.archived});
      }
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
        const chapter=db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(item.chapter);
        if(!chapter?.live||!JSON.parse(chapter.live).tasks.some(t=>t.id===item.task&&t.type==='manual'))fail('任务已被移除，请先恢复或调整章节');
        db.exec('BEGIN IMMEDIATE');try{
          const r=db.prepare("UPDATE linking_submissions SET status=?,note=?,updated=? WHERE id=? AND status='pending' AND updated=?").run(input.status,note,Date.now(),item.id,input.updated);
          if(!r.changes)fail('这份提交已更新或已审核，请刷新',409);
          if(input.status==='approved'){
            putProgress(item.uid,item.chapter,'task',item.task);
            const c=JSON.parse(chapter.live);if(config().enabled&&openNow(c,chapter)&&prerequisites(c,item.uid).every(p=>p.completed))earnEffects(c,completed(c,progress(item.uid,c.id),item.uid),item.uid);
          }
          audit(user,'review:'+input.status,item.chapter);db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e;}return reply({ok:true});
      }
      const route=path.match(/^\/api\/admin\/linking\/chapters\/([a-z0-9-]+)(?:\/(publish|archive))?$/);
      if(route){
        const id=identifier(route[1]),row=db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(id);
        if(req.method==='GET'&&!route[2]){if(!row)fail('章节不存在',404);const live=row.live&&JSON.parse(row.live);return reply({chapter:adminDocument(JSON.parse(row.draft)),revision:row.revision,liveRevision:row.live_revision,published:!!row.live,archived:!!row.archived,liveSummary:live?{archiveIds:live.archives.map(a=>a.id),taskIds:live.tasks.map(t=>t.id)}:null});}
        const input=await body(req,1024*1024);
        if(req.method==='PUT'&&!route[2]){
          if(input.chapter?.id!==id)fail('章节标识不一致');if((row?.revision||0)!==input.revision)fail('章节已有更新，请刷新后编辑',409);
          const c=validateChapter(input.chapter,row?JSON.parse(row.draft):undefined),next=(row?.revision||0)+1;
          if(row?.live&&dependencyKey(JSON.parse(row.live))!==dependencyKey(c))fail('已发布章节的前置不可删除或更改；请创建新章节以调整路线',409);
          checkRewards(c);
          if(!row&&db.prepare('SELECT COUNT(*) AS n FROM linking_chapters').get().n>=1000)fail('章节数量已达上限，请联系管理员归档导出');
          if(row){const changed=db.prepare('UPDATE linking_chapters SET draft=?,revision=?,updated=? WHERE id=? AND revision=?').run(JSON.stringify(c),next,Date.now(),id,input.revision);if(!changed.changes)fail('章节已有更新，请刷新后编辑',409);}
          else {try{db.prepare('INSERT INTO linking_chapters(id,draft,revision,updated) VALUES(?,?,?,?)').run(id,JSON.stringify(c),next,Date.now());}catch(e){if(db.prepare('SELECT 1 FROM linking_chapters WHERE id=?').get(id))fail('章节已有更新，请刷新后编辑',409);throw e;}}
          audit(user,'save-draft',id);return reply({revision:next,chapter:adminDocument(c)});
        }
        if(req.method==='POST'&&route[2]){
          if(!row)fail('章节不存在',404);if(row.revision!==input.revision)fail('章节已有更新，请刷新后发布',409);
          db.exec('BEGIN IMMEDIATE');try{
            const latest=db.prepare('SELECT * FROM linking_chapters WHERE id=?').get(id);if(latest.revision!==input.revision)fail('章节已有更新，请刷新后发布',409);
            const c=JSON.parse(route[2]==='publish'?latest.draft:latest.live||latest.draft);
            checkPublishedGraph(c,route[2]==='archive');
            if(route[2]==='publish'){checkRewards(c);db.prepare('UPDATE linking_chapters SET live=draft,live_revision=revision,archived=0,updated=? WHERE id=?').run(Date.now(),id);}
            else db.prepare('UPDATE linking_chapters SET archived=1,revision=revision+1,updated=? WHERE id=?').run(Date.now(),id);
            audit(user,route[2],id);db.exec('COMMIT');
          }catch(e){db.exec('ROLLBACK');throw e;}return reply({ok:true});
        }
      }
      fail('没有这个管理接口',404);
    }
    const settings=config();
    if(path==='/api/linking/features'&&req.method==='GET'){
      reconcileEffects(user,settings.enabled);
      return reply({effects:user.consoleAdmin?[]:db.prepare('SELECT effect FROM linking_effects WHERE uid=? ORDER BY effect').all(user.uid).map(r=>r.effect).filter(effect=>appearanceEffects.has(effect))});
    }
    if(path==='/api/linking/catalog'&&req.method==='GET'){
      const now=Date.now();
      return reply({config:settings,manager,user:{uid:user.uid,name:user.name},chapters:settings.enabled?db.prepare('SELECT * FROM linking_chapters WHERE live IS NOT NULL AND archived=0').all().map(row=>{
        const c=JSON.parse(row.live),dependencies=prerequisites(c,user.uid),locked=dependencies.some(p=>!p.completed),entries=locked?[]:progress(user.uid,c.id),done=locked?new Set():completed(c,entries,user.consoleAdmin?undefined:user.uid,false);
        return {id:c.id,title:c.title,subtitle:c.subtitle,order:c.order,revision:row.live_revision,opensAt:c.opensAt,closesAt:c.closesAt,locked,lockReason:locked?'请先完成前置章节任务':'',prerequisites:dependencies,status:c.opensAt&&Date.parse(c.opensAt)>now?'scheduled':c.closesAt&&Date.parse(c.closesAt)<=now?'ended':'open',total:c.archives.length,read:c.archives.filter(a=>entries.some(e=>e.kind==='read'&&e.item===a.id)).length,tasks:c.tasks.length,completed:c.tasks.filter(t=>done.has(t.id)).length};
      }).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)):[]});
    }
    if(!settings.enabled)fail('活动暂未开放，请稍后再来',403);
    const route=path.match(/^\/api\/linking\/chapters\/([a-z0-9-]+)(?:\/(action))?$/);
    if(route){
      let {row,c}=published(identifier(route[1]));
      requirePrerequisites(c,user.uid);
      if(!route[2]&&req.method==='GET')return reply(view(c,row,user,manager));
      if(route[2]&&req.method==='POST'){
        if(user.consoleAdmin)fail('管理员预览不会写入玩家进度，请使用玩家角色体验',403);
        const input=await body(req,16384);({row,c}=published(identifier(route[1])));requirePrerequisites(c,user.uid);
        const id=identifier(input.id),entries=progress(user.uid,c.id),done=completed(c,entries,user.uid);
        if(input.kind==='claim'){
          const task=c.tasks.find(t=>t.id===id);if(!task?.reward)fail('此任务没有物品奖励');if(!done.has(id))fail('完成任务后才能领取奖励',403);
          if(!inventory||!points)fail('活动奖励服务暂不可用',503);
          points.transaction(()=>{if(db.prepare('SELECT 1 FROM linking_rewards WHERE uid=? AND chapter=? AND task=?').get(user.uid,c.id,id))return;const item=rewardItem(task);inventory.mail(user.uid,item,task.reward.quantity,'LINKING · '+task.title,'linking','linking:'+user.uid+':'+c.id+':'+id);db.prepare('INSERT INTO linking_rewards VALUES(?,?,?,?,?,?)').run(user.uid,c.id,id,item.id,task.reward.quantity,Date.now());});
        }else if(input.kind==='read'||input.kind==='bookmark'){
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
