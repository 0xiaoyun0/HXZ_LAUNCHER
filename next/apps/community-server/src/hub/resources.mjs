import {fail,string,integer,choice,tags,identifier,page,url} from './common.mjs';
import {HUB_KINDS,HUB_SERVERS} from './catalog.mjs';
import {createEventActivities} from './events.mjs';
import {productionPlan} from '../../shared/production-plan.mjs';
import {bilibiliVideo} from '../../shared/bilibili.mjs';

export function createResources(ctx,{social,media,gameTelemetry,gameBridge}) {
 const {db,manager,member,transaction,notify,audit,once,now,id}=ctx;
 db.exec(`
  CREATE TABLE IF NOT EXISTS hub_records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,owner TEXT NOT NULL,title TEXT NOT NULL,summary TEXT NOT NULL,body TEXT NOT NULL,data TEXT NOT NULL,tags TEXT NOT NULL,images TEXT NOT NULL,visibility TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS hub_records_kind ON hub_records(kind,status,visibility,updated DESC);
  CREATE INDEX IF NOT EXISTS hub_records_owner ON hub_records(owner,updated DESC);
  CREATE TABLE IF NOT EXISTS hub_revisions(record TEXT NOT NULL,revision INTEGER NOT NULL,actor TEXT NOT NULL,value TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(record,revision));
  CREATE TABLE IF NOT EXISTS hub_members(record TEXT NOT NULL,uid TEXT NOT NULL,role TEXT NOT NULL,state TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(record,uid));
  CREATE INDEX IF NOT EXISTS hub_members_user ON hub_members(uid,state);
  CREATE TABLE IF NOT EXISTS hub_tasks(id TEXT PRIMARY KEY,record TEXT NOT NULL,title TEXT NOT NULL,assignee TEXT NOT NULL,status TEXT NOT NULL,quantity INTEGER NOT NULL,done INTEGER NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS hub_tasks_record ON hub_tasks(record,updated);
  CREATE TABLE IF NOT EXISTS hub_canvas(record TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(record,id));
  CREATE TABLE IF NOT EXISTS hub_votes(record TEXT NOT NULL,uid TEXT NOT NULL,choice INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(record,uid));
  CREATE TABLE IF NOT EXISTS hub_event_results(record TEXT NOT NULL,uid TEXT NOT NULL,score INTEGER NOT NULL,note TEXT NOT NULL,actor TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(record,uid));
  CREATE TABLE IF NOT EXISTS hub_story_progress(record TEXT NOT NULL,uid TEXT NOT NULL,revision INTEGER NOT NULL,node TEXT NOT NULL,visited TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(record,uid));
  CREATE TABLE IF NOT EXISTS hub_world_leases(record TEXT PRIMARY KEY,uid TEXT NOT NULL,expires INTEGER NOT NULL,revision INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS hub_world_snapshots(id TEXT PRIMARY KEY,record TEXT NOT NULL,uid TEXT NOT NULL,base INTEGER NOT NULL,source TEXT NOT NULL,sha256 TEXT NOT NULL,mapVersion TEXT NOT NULL,note TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,UNIQUE(record,uid,base,sha256));
  CREATE INDEX IF NOT EXISTS hub_world_snapshot_record ON hub_world_snapshots(record,created DESC);
  CREATE TABLE IF NOT EXISTS hub_project_outcomes(id TEXT PRIMARY KEY,record TEXT NOT NULL,work TEXT NOT NULL,title TEXT NOT NULL,note TEXT NOT NULL,work_revision INTEGER NOT NULL,actor TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS hub_project_outcomes_record ON hub_project_outcomes(record,created DESC);
  CREATE TABLE IF NOT EXISTS hub_work_discussions(record TEXT PRIMARY KEY,post TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS hub_appeal_messages(id TEXT PRIMARY KEY,record TEXT NOT NULL,uid TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS hub_appeal_messages_record ON hub_appeal_messages(record,created);
 `);
 const read=key=>db.prepare('SELECT * FROM hub_records WHERE id=?').get(key)||fail('内容不存在',404);
 const membership=(record,uid)=>db.prepare("SELECT * FROM hub_members WHERE record=? AND uid=? AND state='active'").get(record,uid);
 function canRead(row,user) {return row.owner===user.uid||manager(user)||(!HUB_KINDS[row.kind]?.private&&(!!membership(row.id,user.uid)||row.visibility==='community'&&['published','closed'].includes(row.status)));}
 function visible(row,user){if(!canRead(row,user))fail('内容未公开或没有访问权限',404);return row;}
 const editor=(row,user)=>row.owner===user.uid||manager(user)||membership(row.id,user.uid)?.role==='editor';
 const events=createEventActivities(ctx,{read,visible,editor,membership,media});
 function requireEditor(row,user){if(!editor(row,user))fail('没有编辑权限',403);}
 const decode=row=>({...row,data:JSON.parse(row.data),tags:JSON.parse(row.tags),images:JSON.parse(row.images)});
 function fields(kind,raw={}) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('配置无效');const out={};
  for(const [key,label,type,options] of HUB_KINDS[kind].fields) {
   const value=raw[key];
   if(type==='select')out[key]=choice(value??options.split(',')[0].split(':')[0],options.split(',').map(v=>v.split(':')[0]),label);
   else if(type==='server')out[key]=choice(value||'',HUB_SERVERS.map(v=>v[0]),label);
   else if(type==='boolean')out[key]=value===true;
   else if(type==='number') {const n=Number(value??(key==='capacity'?20:key==='quantity'?1:0));if(!Number.isFinite(n)||Math.abs(n)>30000000)fail(label+'无效');out[key]=n;}
   else if(type==='time')out[key]=integer(Number(value)||0,0,8640000000000000,label);
   else if(type==='url')out[key]=kind==='program'&&raw.format==='bilibili'?string(value,1500,label):url(value||'');
   else out[key]=string(value||'',type==='multiline'?30000:200,label,true);
  }
  if(kind==='event'){integer(out.capacity,1,500,'人数');if(!out.starts||out.ends<=out.starts)fail('活动结束时间必须晚于开始时间');}
  if(kind==='proposal'){out.choices=string(raw.choices,2000,'投票选项').split('\n').map(v=>v.trim()).filter(Boolean);if(out.choices.length<2||out.choices.length>12||new Set(out.choices).size!==out.choices.length)fail('请填写 2–12 个不同选项');}
  if(kind==='world'){if(!/^[\w.+-]{1,80}$/.test(out.version)||!/^[a-f0-9]{64}$/i.test(out.sha256)||!/^https?:\/\//.test(out.source))fail('世界需要版本、完整下载地址及 SHA-256');if(out.loader&&!/^[\w.+-]{1,80}$/.test(out.loaderVersion))fail('请填写加载器的准确版本');out.sha256=out.sha256.toLowerCase();}
  if(kind==='program'){if(out.format==='bilibili')out.source=bilibiliVideo(out.source).source;else if(!/^https?:\/\//.test(out.source))fail('请填写节目媒体的完整 HTTP/HTTPS 直链');}
  if(kind==='landmark'){if(!out.server||!out.dimension)fail('请选择服务器并填写维度');}
  if(kind==='recipe'){
   if(!/^[\w.-]+:[\w/.-]+$/.test(out.output)||out.quantity<=0||out.seconds<0)fail('产物、数量或制作时间无效');
   out.ingredients=out.ingredients.split('\n').filter(v=>v.trim()).map(line=>{const match=line.trim().match(/^([\w.-]+:[\w/.-]+)\s*=\s*([\d.]+)$/);if(!match||!Number.isFinite(+match[2])||+match[2]<=0||+match[2]>1000000)fail('材料格式为 minecraft:stone=2');return {item:match[1],quantity:+match[2]};});if(!out.ingredients.length||out.ingredients.length>100)fail('请填写 1–100 种材料');
  }
  if(kind==='story') {
   let nodes;try{nodes=JSON.parse(out.nodes);}catch{fail('剧情节点不是有效 JSON');}
   if(!Array.isArray(nodes)||!nodes.length||nodes.length>100)fail('剧情需包含 1–100 个节点');
   const keys=new Set();for(const n of nodes){identifier(n.id,'节点标识');if(keys.has(n.id))fail('剧情节点重复');keys.add(n.id);string(n.text,8000,'剧情正文');if(!Array.isArray(n.choices)||n.choices.length>8)fail('节点最多 8 个选项');for(const c of n.choices){string(c.label,80,'选项');identifier(c.to,'目标节点');}}
   if(nodes.some(n=>n.choices.some(c=>!keys.has(c.to))))fail('剧情引用了不存在的节点');
   const reachable=new Set(),queue=[nodes[0].id];while(queue.length){const key=queue.pop();if(reachable.has(key))continue;reachable.add(key);queue.push(...nodes.find(n=>n.id===key).choices.map(c=>c.to));}if(reachable.size!==nodes.length||!nodes.some(n=>!n.choices.length))fail('剧情包含不可到达节点或没有结局');out.nodes=nodes.map(n=>({id:n.id,text:n.text,choices:n.choices.map(c=>({label:c.label,to:c.to}))}));
  }
  if(kind==='ledger'&&!/^-?\d{1,10}(\.\d{1,2})?$/.test(out.amount))fail('金额格式无效');
  if(kind==='whitelist'&&(!out.server||!/^\w{1,16}$/.test(out.player)))fail('请选择服务器并填写有效游戏角色名');
  return out;
 }
 function detail(row,user) {
  if(!canRead(row,user)&&row.kind==='project'&&row.status==='published'&&db.prepare("SELECT 1 FROM hub_members WHERE record=? AND uid=? AND state='invited'").get(row.id,user.uid))return {id:row.id,kind:row.kind,title:row.title,invitation:true};
  visible(row,user);const result=decode(row);result.editable=editor(row,user);result.manage=manager(user);result.mine=row.owner===user.uid;
  result.members=db.prepare('SELECT p.uid,m.name,p.role,p.state FROM hub_members p JOIN members m ON m.uid=p.uid WHERE p.record=? AND p.state=? ORDER BY p.created LIMIT 500').all(row.id,'active');
  if(result.editable)result.invited=db.prepare("SELECT p.uid,m.name,p.role FROM hub_members p JOIN members m ON m.uid=p.uid WHERE p.record=? AND p.state='invited'").all(row.id);
  result.joined=!!membership(row.id,user.uid);
  if(row.kind==='work')result.discussion=db.prepare('SELECT p.id,p.hidden FROM hub_work_discussions d JOIN forum_posts p ON p.id=d.post WHERE d.record=?').get(row.id)||null;
  if(row.kind==='appeal')result.messages=db.prepare('SELECT a.id,a.uid,a.body,a.created,COALESCE(m.name,?) name FROM hub_appeal_messages a LEFT JOIN members m ON m.uid=a.uid WHERE a.record=? ORDER BY a.created DESC,a.rowid DESC LIMIT 100').all('社区管理员',row.id).reverse();
  if(row.kind==='project'){result.tasks=db.prepare("SELECT * FROM hub_tasks WHERE record=? AND status!='archived' ORDER BY updated,id LIMIT 300").all(row.id);result.canvas=db.prepare("SELECT * FROM hub_canvas WHERE record=? AND COALESCE(json_extract(value,'$.deleted'),0)=0 ORDER BY updated,id LIMIT 300").all(row.id).map(v=>({...v,value:JSON.parse(v.value)}));}
  if(row.kind==='project')result.outcomes=db.prepare("SELECT o.*,m.name,CASE WHEN w.status='published' AND w.visibility='community' THEN 1 ELSE 0 END available FROM hub_project_outcomes o LEFT JOIN members m ON m.uid=o.actor LEFT JOIN hub_records w ON w.id=o.work WHERE o.record=? AND o.archived=0 ORDER BY o.created DESC,o.id LIMIT 100").all(row.id);
  if(row.kind==='event'){result.results=db.prepare('SELECT r.*,m.name FROM hub_event_results r JOIN members m ON m.uid=r.uid WHERE r.record=? ORDER BY r.score DESC,r.updated LIMIT 500').all(row.id);result.activity=events.details(row,user);}
  if(row.kind==='proposal'){result.votes=db.prepare('SELECT choice,COUNT(*) count FROM hub_votes WHERE record=? GROUP BY choice').all(row.id);result.voted=db.prepare('SELECT choice FROM hub_votes WHERE record=? AND uid=?').get(row.id,user.uid)?.choice??null;}
  if(row.kind==='story'){
   const progress=db.prepare('SELECT * FROM hub_story_progress WHERE record=? AND uid=?').get(row.id,user.uid),current=progress?.revision===row.revision?progress.node:result.data.nodes[0].id;
   result.progress={node:current,visited:progress?.revision===row.revision?JSON.parse(progress.visited):[]};
   if(!result.editable)result.data.nodes=result.data.nodes.filter(n=>n.id===current);
  }
  if(row.kind==='world'){result.lease=db.prepare('SELECT l.uid,m.name,l.expires,l.revision FROM hub_world_leases l JOIN members m ON m.uid=l.uid WHERE record=? AND expires>?').get(row.id,now())||null;result.snapshots=db.prepare("SELECT s.*,m.name FROM hub_world_snapshots s JOIN members m ON m.uid=s.uid WHERE s.record=? AND (s.status='accepted' OR s.uid=? OR ?=1) ORDER BY s.created DESC LIMIT 50").all(row.id,user.uid,result.editable?1:0);}
  return result;
 }
 function save(user,key,input) {
  const old=key?read(key):null,kind=old?.kind||choice(input.kind,Object.keys(HUB_KINDS),'内容类型'),spec=HUB_KINDS[kind];
  if(old)requireEditor(old,user);if(spec.admin&&!manager(user))fail('该内容需要管理员维护',403);
  const data=fields(kind,input.data),images=input.images||[];if(!Array.isArray(images)||images.length>6)fail('最多上传 6 张图片');const retained=new Set(old?JSON.parse(old.images):[]);images.forEach(v=>{if(!retained.has(v))media.validate(v,user,'hub');});
  if(kind==='whitelist'&&data.player!==member(old?.owner||user.uid).name)fail('只能为当前登录的皮肤站角色申请白名单');
  const title=string(input.title,120,'标题'),summary=string(input.summary||'',300,'摘要',true),body=string(input.body||'',30000,'正文',true),labels=tags(input.tags),visibility=spec.private?'private':choice(input.visibility||'community',['private','community'],'可见范围');
  const status=choice(input.status||'draft',['draft','review'],'保存状态');
  const commit=()=>{
   const fresh=key?read(key):null;if((fresh?.revision||0)!==input.revision)fail('内容已被修改，请刷新后合并你的更改',409);
   if(fresh?.kind==='event')events.assertRecordChange(fresh,data);
   if(!fresh&&db.prepare('SELECT COUNT(*) AS n FROM hub_records WHERE owner=?').get(user.uid).n>=2000)fail('个人内容数量已达上限');
   const record=key||id(),revision=(fresh?.revision||0)+1;
   const nextStatus=status==='review'&&(!spec.moderated&&!spec.private||manager(user))?'published':status;
   if(fresh?.kind==='proposal'&&db.prepare('SELECT 1 FROM hub_votes WHERE record=? LIMIT 1').get(record)&&JSON.stringify(data.choices)!==JSON.stringify(JSON.parse(fresh.data).choices))fail('已经有人投票，不能更改选项含义',409);
   db.prepare('INSERT INTO hub_records VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,body=excluded.body,data=excluded.data,tags=excluded.tags,images=excluded.images,visibility=excluded.visibility,status=excluded.status,revision=excluded.revision,updated=excluded.updated').run(record,kind,fresh?.owner||user.uid,title,summary,body,JSON.stringify(data),JSON.stringify(labels),JSON.stringify(images),visibility,nextStatus,revision,fresh?.created||now(),now());
   db.prepare('INSERT INTO hub_revisions VALUES(?,?,?,?,?)').run(record,revision,user.uid,JSON.stringify(read(record)),now());
   db.prepare('DELETE FROM hub_revisions WHERE record=? AND revision<?').run(record,Math.max(1,revision-99));audit(user,fresh?'edit':'create',record);
   if(kind==='whitelist'&&nextStatus==='published')gameBridge.approvedWhitelist(read(record),user);
   if(nextStatus==='published')published(read(record),user);
   return detail(read(record),user);
  };
  return !key&&input.requestId?once(user,input.requestId,'record:'+kind,commit):transaction(commit);
 }
 function published(row,user){
  const recipients=db.prepare('SELECT f.uid FROM hub_follows f LEFT JOIN hub_preferences p ON p.uid=f.uid WHERE f.target=? AND COALESCE(json_extract(p.value,\'$.subscriptions\'),1)!=0 LIMIT 500').all(row.owner).map(v=>v.uid).filter(uid=>!social.blocked(uid,row.owner));
  if(row.visibility==='community'&&!HUB_KINDS[row.kind]?.private)notify(user,recipients,'新内容：'+row.title,'/community/hub?section='+row.kind+'&item='+row.id,'publish:'+row.id+':'+row.revision,row.summary);
 }
 async function route(user,p,method,input,search) {
  if(p==='production'&&method==='POST'){
   const target=visible(read(input.record),user);if(target.kind!=='recipe'||target.status!=='published'||target.visibility!=='community')fail('请使用已公开的配方进行生产规划',409);
   const data=JSON.parse(target.data),items=db.prepare("SELECT id,title,data FROM hub_records WHERE kind='recipe' AND status='published' AND visibility='community' AND json_extract(data,'$.server')=? AND json_extract(data,'$.version')=? ORDER BY id LIMIT 2001").all(data.server,data.version);
   return {...productionPlan(items.map(r=>({id:r.id,title:r.title,...JSON.parse(r.data)})),target.id,input.quantity,{stock:input.stock,choices:input.choices}),server:data.server,version:data.version};
  }
  if(p==='events/passport'&&method==='GET')return events.passport(user,search);
  if(p==='catalog'&&method==='GET')return {kinds:HUB_KINDS,manager:manager(user),servers:HUB_SERVERS};
  if(p==='records'&&method==='GET') {
   const kind=choice(search.get('kind')||'event',Object.keys(HUB_KINDS),'内容类型'),scope=choice(search.get('scope')||'public',['public','mine','review'],'内容范围'),{query,offset}=page(search);
   if(scope==='review'&&!manager(user))fail('需要管理员权限',403);
   const clause=scope==='mine'?`(r.owner=? OR EXISTS(SELECT 1 FROM hub_members p WHERE p.record=r.id AND p.uid=? AND p.state='active'))`:scope==='review'?`r.status='review'`:`r.visibility='community' AND r.status IN ('published','closed') AND r.kind NOT IN ('whitelist','appeal')`;
   const server=choice(search.get('server')||'',HUB_SERVERS.map(v=>v[0]),'服务器'),version=string(search.get('version')||'',100,'版本',true),category=string(search.get('category')||'',32,'分类',true);
   const args=[kind,...(scope==='mine'?[user.uid,user.uid]:[]),query,query,...kind==='article'?[query]:[],server,server,version,version,...kind==='work'?[category,category]:[]],where=`r.kind=? AND ${clause} AND (instr(lower(r.title),lower(?))>0 OR instr(lower(r.tags),lower(?))>0 ${kind==='article'?'OR instr(lower(r.body),lower(?))>0':''}) AND (?='' OR json_extract(r.data,'$.server')=?) AND (?='' OR instr(lower(json_extract(r.data,'$.version')),lower(?))>0) ${kind==='work'?"AND (?='' OR json_extract(r.data,'$.category')=?)":''}`;
   return {items:db.prepare(`SELECT r.*,m.name FROM hub_records r JOIN members m ON m.uid=r.owner WHERE ${where} ORDER BY r.updated DESC,r.id LIMIT 24 OFFSET ?`).all(...args,offset).map(row=>{const v=decode(row);delete v.body;if(v.kind==='story')delete v.data.nodes;return v;}),total:db.prepare('SELECT COUNT(*) AS n FROM hub_records r WHERE '+where).get(...args).n,manager:manager(user)};
  }
  if(p==='records'&&method==='POST')return save(user,null,input);
  if(p==='invitations'&&method==='GET')return {items:db.prepare("SELECT r.id,r.kind,r.title,r.owner FROM hub_records r JOIN hub_members m ON m.record=r.id WHERE m.uid=? AND m.state='invited' AND r.status='published' LIMIT 100").all(user.uid)};
  const match=p.match(/^records\/([\w-]+)(?:\/([\w-]+))?$/);
  if(match) {
   const row=read(match[1]),action=match[2];
   if(!action&&method==='GET')return detail(row,user);
   if(!action&&method==='PUT')return save(user,row.id,input);
   const invitedJoin=action==='join'&&method==='POST'&&row.kind==='project'&&db.prepare("SELECT 1 FROM hub_members WHERE record=? AND uid=? AND state='invited'").get(row.id,user.uid);
   if(!invitedJoin)visible(row,user);
   if(row.kind==='event'&&action?.startsWith('event-')&&method==='POST'){const result=events.action(row,user,action,input);if(result!==undefined)return detail(read(row.id),user);}
   if(action==='history'&&method==='GET'){requireEditor(row,user);return {items:db.prepare('SELECT revision,actor,created,value FROM hub_revisions WHERE record=? ORDER BY revision DESC LIMIT 100').all(row.id).map(v=>({...v,value:decode(JSON.parse(v.value))}))};}
   if(action==='reply'&&method==='POST'&&row.kind==='appeal')return once(user,input.requestId,'appeal:'+row.id,()=>{
    const current=read(row.id);if(current.status==='archived')fail('申诉已归档，请新建申诉',409);if(current.revision!==input.revision)fail('申诉有新的处理进度，请刷新后回复',409);
    const text=string(input.body,5000,'回复内容');let status=current.status;
    if(manager(user))status=choice(input.status||'published',['published','closed','rejected'],'处理状态');else {if(input.status)fail('只有管理员可以设置处理状态',403);status='review';}
    if(db.prepare('SELECT COUNT(*) n FROM hub_appeal_messages WHERE record=?').get(row.id).n>=200)fail('此申诉已达到 200 条回复，请新建申诉并引用原编号');
    db.prepare('INSERT INTO hub_appeal_messages VALUES(?,?,?,?,?)').run(id(),row.id,user.uid,text,now());db.prepare('UPDATE hub_records SET status=?,revision=revision+1,updated=? WHERE id=?').run(status,now(),row.id);audit(user,'appeal:reply',row.id,status);
    if(manager(user))notify(user,[row.owner],'申诉有新的处理结果：'+row.title,'/community/hub?section=appeal&item='+row.id,'appeal:'+input.requestId,text);
    return detail(read(row.id),user);
   });
   if(action==='discussion'&&method==='POST'&&row.kind==='work')return transaction(()=>{
    if(row.status!=='published'||row.visibility!=='community')fail('作品公开通过审核后才可以建立讨论',409);const old=db.prepare('SELECT p.id,p.hidden FROM hub_work_discussions d JOIN forum_posts p ON p.id=d.post WHERE d.record=?').get(row.id);if(old){if(old.hidden)fail('讨论已由管理员处理，请联系管理员',409);return {post:old.id};}
    requireEditor(row,user);const post=id(),author=member(user.uid),created=now();db.prepare('INSERT INTO forum_posts(id,uid,name,title,body,category,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(post,user.uid,author.name,('作品讨论 · '+row.title).slice(0,100),'在这里交流作品的设计、制作与游玩体验。请尊重作者，围绕作品本身讨论。','作品分享',created,created);db.prepare('INSERT INTO hub_work_discussions VALUES(?,?)').run(row.id,post);audit(user,'work:discussion',row.id,post);return {post};
   });
   if(action==='outcome'&&method==='POST'&&row.kind==='project')return transaction(()=>{
    requireEditor(row,user);const key=identifier(input.id),old=db.prepare('SELECT * FROM hub_project_outcomes WHERE id=?').get(key);if(old&&old.record!==row.id)fail('成果不属于该项目',403);
    if(input.remove){if(!old)fail('成果不存在',404);db.prepare('UPDATE hub_project_outcomes SET archived=1 WHERE id=?').run(key);audit(user,'project:remove-outcome',row.id,old.title);return detail(row,user);}
    if(old){if(old.archived)fail('成果已移除，请刷新',409);return detail(row,user);}
    if(db.prepare('SELECT COUNT(*) n FROM hub_project_outcomes WHERE record=?').get(row.id).n>=100)fail('项目最多记录 100 个阶段成果');
    const work=visible(read(input.work),user);if(work.kind!=='work'||work.status!=='published'||work.visibility!=='community')fail('请引用作品展厅中已经公开的作品',409);
    const title=string(input.title,120,'阶段标题'),note=string(input.note||'',2000,'阶段说明',true);db.prepare('INSERT INTO hub_project_outcomes VALUES(?,?,?,?,?,?,?,0,?)').run(key,row.id,work.id,title,note,work.revision,user.uid,now());audit(user,'project:outcome',row.id,title);
    notify(user,db.prepare("SELECT uid FROM hub_members WHERE record=? AND state='active'").all(row.id).map(m=>m.uid),'项目有了阶段成果：'+row.title,'/community/hub?section=project&item='+row.id,'outcome:'+key,title);return detail(row,user);
   });
   if(action==='project-history'&&method==='GET'&&row.kind==='project'){requireEditor(row,user);return {items:db.prepare("SELECT a.id,a.action,a.detail,a.created,m.name FROM hub_audit a JOIN members m ON m.uid=a.uid WHERE a.target=? AND a.action LIKE 'project:%' ORDER BY a.id DESC LIMIT 100").all(row.id).map(v=>({...v,description:({'project:task':'更新任务','project:remove-task':'移除任务','project:note':'更新便签','project:remove-note':'移除便签'}[v.action]||'修改项目')+' · '+v.detail}))};}
   if(action==='review'&&method==='POST') {
    if(!manager(user))fail('需要管理员权限',403);
    return transaction(()=>{if(row.revision!==input.revision||row.status!=='review')fail('审核内容已变化，请刷新',409);const state=choice(input.status,['published','rejected'],'审核结果');if(state==='published'&&row.kind==='whitelist')gameBridge.approvedWhitelist(row,user);db.prepare('UPDATE hub_records SET status=?,updated=? WHERE id=?').run(state,now(),row.id);audit(user,'review:'+state,row.id,string(input.note||'',1000,'审核说明',true));notify(user,[row.owner],row.title+' · '+(state==='published'?'审核通过':'需要修改'),'/community/hub?section='+row.kind+'&item='+row.id,'review:'+row.id+':'+row.revision,input.note||'');if(state==='published')published(read(row.id),user);return detail(read(row.id),user);});
   }
   if(action==='close'&&method==='POST'){requireEditor(row,user);if(row.revision!==input.revision)fail('内容已变化',409);db.prepare("UPDATE hub_records SET status='closed',updated=? WHERE id=?").run(now(),row.id);audit(user,'close',row.id);return detail(read(row.id),user);}
   if(!action&&method==='DELETE'){requireEditor(row,user);db.prepare("UPDATE hub_records SET status='archived',visibility='private',updated=? WHERE id=?").run(now(),row.id);audit(user,'archive',row.id);return {ok:true};}
   if(action==='join'&&method==='POST'&&['event','project'].includes(row.kind))return transaction(()=>{
    const data=JSON.parse(row.data);if(row.status!=='published')fail('当前内容未开放参与',409);
    if(row.kind==='event'&&(now()>=data.ends))fail('活动已结束',409);
    if(!membership(row.id,user.uid)){
     if(row.kind==='event'&&events.locked(row.id))fail('赛程已生成，参赛名单已锁定',409);
     if(row.kind==='project'){const invited=db.prepare("SELECT 1 FROM hub_members WHERE record=? AND uid=? AND state='invited'").get(row.id,user.uid);if(!invited&&row.owner!==user.uid)fail('需要项目成员邀请',403);if(social.blocked(user.uid,row.owner))fail('无法接受该项目的邀请',403);}
     const capacity=row.kind==='event'?data.capacity:100;if(db.prepare("SELECT COUNT(*) AS n FROM hub_members WHERE record=? AND state='active'").get(row.id).n>=capacity)fail('参与人数已满',409);
     db.prepare("INSERT INTO hub_members VALUES(?,?,'member','active',?) ON CONFLICT(record,uid) DO UPDATE SET state='active'").run(row.id,user.uid,now());
    }return detail(row,user);
   });
   if(action==='leave'&&method==='POST'){if(row.kind==='event'&&events.locked(row.id))fail('赛程已生成，如需退赛请联系负责人登记弃权赛果',409);db.prepare('DELETE FROM hub_members WHERE record=? AND uid=?').run(row.id,user.uid);return {ok:true};}
   if(action==='members'&&method==='POST') {
    if(HUB_KINDS[row.kind]?.private)fail('私人申请仅本人和管理员可查看',403);
    if(row.kind==='event'&&events.locked(row.id))fail('赛程已生成，不能变更参赛名单',409);
    if(row.owner!==user.uid&&!manager(user))fail('仅负责人可以管理成员',403);const target=member(input.uid);if(target.uid===row.owner)fail('负责人无需重复加入');
    if(input.action==='remove')db.prepare('DELETE FROM hub_members WHERE record=? AND uid=?').run(row.id,target.uid);
    else {if(social.blocked(user.uid,target.uid))fail('无法邀请该成员',403);if(db.prepare('SELECT COUNT(*) AS n FROM hub_members WHERE record=?').get(row.id).n>=100)fail('成员人数已达上限');db.prepare('INSERT INTO hub_members VALUES(?,?,?,?,?) ON CONFLICT(record,uid) DO UPDATE SET role=excluded.role').run(row.id,target.uid,choice(input.role||'member',['member','editor'],'成员角色'),'invited',now());notify(user,[target.uid],'邀请参与：'+row.title,'/community/hub?section='+row.kind+'&item='+row.id,'invite:'+row.id+':'+target.uid+':'+now());}
    return detail(row,user);
   }
   if(action==='tasks'&&method==='POST'&&row.kind==='project')return transaction(()=>{
    const key=input.id?identifier(input.id):id(),old=db.prepare('SELECT * FROM hub_tasks WHERE id=?').get(key),editing=editor(row,user);if(old?.record&&old.record!==row.id)fail('任务不属于该项目',403);
    if(!editing&&(!old||old.assignee!==user.uid||!membership(row.id,user.uid)))fail('只能更新分配给自己的任务进度',403);
    if((old?.revision||0)!==input.revision||old?.status==='archived')fail('任务已被修改或移除，请刷新后重试',409);
    if(input.deleted){requireEditor(row,user);if(!old)fail('任务不存在',404);db.prepare("UPDATE hub_tasks SET status='archived',revision=revision+1,updated=? WHERE id=?").run(now(),key);audit(user,'project:remove-task',row.id,old.title);return detail(row,user);}
    if(!old&&db.prepare("SELECT COUNT(*) AS n FROM hub_tasks WHERE record=? AND status!='archived'").get(row.id).n>=300)fail('项目最多 300 个任务');
    if(!old&&db.prepare('SELECT COUNT(*) AS n FROM hub_tasks WHERE record=?').get(row.id).n>=3000)fail('项目任务历史已满，请新建下一阶段项目');
    const assignee=editing?(input.assignee?member(input.assignee).uid:''):old.assignee;if(assignee&&assignee!==row.owner&&!membership(row.id,assignee))fail('负责人不在项目内');
    const quantity=editing?integer(Number(input.quantity??1),1,1000000,'所需数量'):old.quantity,done=integer(Number(input.done??0),0,quantity,'完成数量'),title=editing?string(input.title,120,'任务标题'):old.title;
    db.prepare('INSERT INTO hub_tasks VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,assignee=excluded.assignee,status=excluded.status,quantity=excluded.quantity,done=excluded.done,revision=excluded.revision,updated=excluded.updated').run(key,row.id,title,assignee,done===quantity?'done':'open',quantity,done,(old?.revision||0)+1,now());audit(user,'project:task',row.id,title+' · '+done+'/'+quantity);return detail(row,user);
   });
   if(action==='canvas'&&method==='POST'&&row.kind==='project')return transaction(()=>{
    requireEditor(row,user);const key=identifier(input.id),old=db.prepare('SELECT * FROM hub_canvas WHERE record=? AND id=?').get(row.id,key);if((old?.revision||0)!==input.revision||old&&JSON.parse(old.value).deleted)fail('便签已被修改或删除，请刷新后重试',409);
    if(!old&&db.prepare("SELECT COUNT(*) AS n FROM hub_canvas WHERE record=? AND COALESCE(json_extract(value,'$.deleted'),0)=0").get(row.id).n>=300)fail('画布最多 300 个便签');if(!old&&db.prepare('SELECT COUNT(*) AS n FROM hub_canvas WHERE record=?').get(row.id).n>=3000)fail('该项目便签历史已满，请新建下一阶段项目');
    if(input.deleted){if(!old)fail('便签不存在',404);db.prepare("UPDATE hub_canvas SET value='{\"deleted\":true}',revision=revision+1,updated=? WHERE record=? AND id=?").run(now(),row.id,key);audit(user,'project:remove-note',row.id,key);return detail(row,user);}
    const v=input.value||{},value={text:string(v.text,1000,'便签内容'),x:integer(v.x,0,5000,'横坐标'),y:integer(v.y,0,5000,'纵坐标'),color:choice(v.color||'blue',['blue','rose','green','yellow'],'颜色')};
    db.prepare('INSERT INTO hub_canvas VALUES(?,?,?,?,?) ON CONFLICT(record,id) DO UPDATE SET value=excluded.value,revision=excluded.revision,updated=excluded.updated').run(row.id,key,JSON.stringify(value),(old?.revision||0)+1,now());audit(user,'project:note',row.id,value.text.slice(0,80));return detail(row,user);
   });
   if(action==='vote'&&method==='POST'&&row.kind==='proposal')return transaction(()=>{const data=JSON.parse(row.data);if(row.status!=='published'||!data.ends||now()>=data.ends)fail('投票已结束或未开放',409);const selected=integer(input.choice,0,data.choices.length-1,'选项');db.prepare('INSERT INTO hub_votes VALUES(?,?,?,?) ON CONFLICT(record,uid) DO UPDATE SET choice=excluded.choice,created=excluded.created').run(row.id,user.uid,selected,now());return detail(row,user);});
   if(action==='result'&&method==='POST'&&row.kind==='event'){
    if(events.locked(row.id))fail('比赛成绩由赛程生成，请在对局中登记结果',409);
    requireEditor(row,user);const target=member(input.uid);if(!membership(row.id,target.uid))fail('该成员没有报名');
    db.prepare('INSERT INTO hub_event_results VALUES(?,?,?,?,?,?) ON CONFLICT(record,uid) DO UPDATE SET score=excluded.score,note=excluded.note,actor=excluded.actor,updated=excluded.updated').run(row.id,target.uid,integer(input.score,0,1000000000,'成绩'),string(input.note||'',2000,'结果说明',true),user.uid,now());audit(user,'event-result',row.id,target.uid);return detail(row,user);
   }
   if(action==='play'&&method==='POST'&&row.kind==='story')return transaction(()=>{
    if(row.status!=='published')fail('作品尚未发布');const nodes=JSON.parse(row.data).nodes,progress=db.prepare('SELECT * FROM hub_story_progress WHERE record=? AND uid=?').get(row.id,user.uid),previous=progress?.revision===row.revision?nodes.find(n=>n.id===progress.node):nodes[0];
    const current=input.restart===true?nodes[0]:nodes.find(n=>n.id===previous.choices[integer(input.choice,0,previous.choices.length-1,'剧情选择')].to),visited=input.restart===true?[]:progress?.revision===row.revision?JSON.parse(progress.visited):[];
    if(!visited.includes(previous.id))visited.push(previous.id);db.prepare('INSERT INTO hub_story_progress VALUES(?,?,?,?,?,?) ON CONFLICT(record,uid) DO UPDATE SET revision=excluded.revision,node=excluded.node,visited=excluded.visited,updated=excluded.updated').run(row.id,user.uid,row.revision,current.id,JSON.stringify(visited),now());return detail(row,user);
   });
   if(action==='lease'&&method==='POST'&&row.kind==='world')return transaction(()=>{
    if(row.status!=='published'||!JSON.parse(row.data).relay)fail('该世界未开放接力');const lease=db.prepare('SELECT * FROM hub_world_leases WHERE record=?').get(row.id);if(lease&&lease.expires>now()&&lease.uid!==user.uid)fail('另一位玩家正在接力，请等待交接',409);
    if(input.release){if(lease?.uid!==user.uid&&!editor(row,user))fail('无权结束他人的接力',403);db.prepare('DELETE FROM hub_world_leases WHERE record=?').run(row.id);}else db.prepare('INSERT INTO hub_world_leases VALUES(?,?,?,?) ON CONFLICT(record) DO UPDATE SET uid=excluded.uid,expires=excluded.expires,revision=excluded.revision').run(row.id,user.uid,now()+24*3600000,row.revision);return detail(row,user);
   });
   if(action==='world-snapshot'&&method==='POST'&&row.kind==='world')return transaction(()=>{
    const lease=db.prepare('SELECT * FROM hub_world_leases WHERE record=? AND expires>?').get(row.id,now());
    if(!editor(row,user)&&lease?.uid!==user.uid)fail('只有正在接力的玩家或负责人可以提交快照',403);
    if(row.status!=='published'||row.revision!==input.revision)fail('世界版本已变化，请重新获取后再提交',409);
    if(lease&&lease.uid===user.uid&&lease.revision!==row.revision)fail('接力期间地图已更新，请先与负责人确认版本',409);
    const source=url(input.source,{local:false,empty:false}),sha256=string(input.sha256,64,'SHA-256').toLowerCase(),mapVersion=string(input.mapVersion,80,'地图版本'),note=string(input.note||'',3000,'修改说明',true);
    if(!/^[a-f0-9]{64}$/.test(sha256))fail('请填写完整 SHA-256');
    const old=db.prepare('SELECT * FROM hub_world_snapshots WHERE record=? AND uid=? AND base=? AND sha256=?').get(row.id,user.uid,row.revision,sha256);
    if(old&&old.status!=='rejected')return detail(row,user);
    if(!old&&db.prepare('SELECT COUNT(*) n FROM hub_world_snapshots WHERE record=?').get(row.id).n>=1000)fail('快照记录已达上限，请建立新的世界条目');
    if(old)db.prepare("UPDATE hub_world_snapshots SET source=?,mapVersion=?,note=?,status='review',created=? WHERE id=?").run(source,mapVersion,note,now(),old.id);
    else db.prepare("INSERT INTO hub_world_snapshots VALUES(?,?,?,?,?,?,?,?,'review',?)").run(id(),row.id,user.uid,row.revision,source,sha256,mapVersion,note,now());
    audit(user,'world:submit',row.id,mapVersion);notify(user,[row.owner],'世界快照等待审核：'+row.title,'/community/hub?section=world&item='+row.id,'snapshot:'+row.id+':'+user.uid+':'+sha256,note);return detail(row,user);
   });
   if(action==='world-review'&&method==='POST'&&row.kind==='world')return transaction(()=>{
    requireEditor(row,user);if(row.revision!==input.revision||row.status!=='published')fail('世界版本已变化，请刷新',409);
    const snapshot=db.prepare("SELECT * FROM hub_world_snapshots WHERE record=? AND id=? AND status='review'").get(row.id,input.snapshot);if(!snapshot)fail('快照已经处理',409);
    if(input.accept===true){
     const lease=db.prepare('SELECT * FROM hub_world_leases WHERE record=? AND expires>?').get(row.id,now());if(lease&&lease.uid!==snapshot.uid)fail('另一位玩家正在接力，请先完成交接',409);
     if(snapshot.base!==row.revision)fail('快照基于旧版本，请退回并由作者合并更新',409);
     const data={...JSON.parse(row.data),source:snapshot.source,sha256:snapshot.sha256,mapVersion:snapshot.mapVersion};
     db.prepare('UPDATE hub_records SET data=?,revision=revision+1,updated=? WHERE id=?').run(JSON.stringify(data),now(),row.id);
     db.prepare('INSERT INTO hub_revisions VALUES(?,?,?,?,?)').run(row.id,row.revision+1,user.uid,JSON.stringify(read(row.id)),now());
     db.prepare('DELETE FROM hub_revisions WHERE record=? AND revision<?').run(row.id,Math.max(1,row.revision-98));
     db.prepare('DELETE FROM hub_world_leases WHERE record=? AND uid=?').run(row.id,snapshot.uid);published(read(row.id),user);
    }
    db.prepare('UPDATE hub_world_snapshots SET status=? WHERE id=?').run(input.accept===true?'accepted':'rejected',snapshot.id);audit(user,'world:review',row.id,input.accept===true?'采用快照':'退回快照');notify(user,[snapshot.uid],'世界快照'+(input.accept===true?'已采用':'需要修改'),'/community/hub?section=world&item='+row.id,'snapshot-review:'+snapshot.id+':'+now());return detail(read(row.id),user);
   });
  }
  if(p==='knowledge'&&method==='GET') {
   const {query}=page(search),rows=db.prepare("SELECT id,title,body,summary,revision,updated,data FROM hub_records WHERE kind='article' AND status='published' AND visibility='community' AND (instr(lower(title),lower(?))>0 OR instr(lower(body),lower(?))>0) ORDER BY updated DESC LIMIT 20").all(query,query);
   return {query,answer:rows.length?'找到以下资料，请按适用版本查看原文。':'没有找到可靠资料，可以向管理员提问或提交百科文章。',sources:rows.map(row=>({...row,body:row.body.slice(0,1200),data:JSON.parse(row.data),url:'/community/hub?section=article&item='+row.id}))};
  }
  if(p==='knowledge/export'&&method==='GET') {
   const server=choice(search.get('server')||'',HUB_SERVERS.map(v=>v[0]),'服务器'),offset=integer(Number(search.get('offset'))||0,0,2000,'页码');
   const where="kind='article' AND status='published' AND visibility='community' AND (?='' OR json_extract(data,'$.server')=?)";
   const rows=db.prepare('SELECT id,title,summary,body,data,revision,updated FROM hub_records WHERE '+where+' ORDER BY updated DESC,id LIMIT 40 OFFSET ?').all(server,server,offset),total=db.prepare('SELECT COUNT(*) n FROM hub_records WHERE '+where).get(server,server).n;
   return {format:'hxz-knowledge-1',generated:now(),items:rows,total,hasMore:offset+rows.length<total};
  }
  return undefined;
 }
 return {route,read,visible,editor,detail};
}
