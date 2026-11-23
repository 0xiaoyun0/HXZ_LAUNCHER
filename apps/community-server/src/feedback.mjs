import {randomUUID} from 'node:crypto';
const statuses=['open','working','resolved','archived'];
const failure=(message,status=400)=>Object.assign(Error(message),{status});
export function createFeedback({db,auth,admin,body,send,limit,inbox,adminIDs=new Set()}){
 db.exec(`CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,uid TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,report TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS feedback_owner ON feedback(uid,updated DESC);
 CREATE TABLE IF NOT EXISTS feedback_replies(id INTEGER PRIMARY KEY AUTOINCREMENT,feedback TEXT NOT NULL,uid TEXT NOT NULL,name TEXT NOT NULL,manager INTEGER NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS feedback_reply_owner ON feedback_replies(feedback,id);
 CREATE TABLE IF NOT EXISTS feedback_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,feedback TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,created INTEGER NOT NULL);`);
 const fields=db.prepare('PRAGMA table_info(feedback)').all().map(v=>v.name);
 for(const name of ['version','platform'])if(!fields.includes(name))db.exec(`ALTER TABLE feedback ADD COLUMN ${name} TEXT NOT NULL DEFAULT ''`);
 const text=(v,min,max)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)throw failure(`内容长度应为 ${min}–${max} 字`);return v.trim();};
 const redact=value=>value.replace(/(Bearer\s+)[\w.\-]+/gi,'$1[已隐藏]').replace(/(accessToken|refreshToken|clientToken|password|authorization)(["'\s:=]+)[^\s,"'}]+/gi,'$1$2[已隐藏]').replace(/hxz-?room:\/\/[^\s]+/gi,'[房间邀请已隐藏]');
 const get=id=>db.prepare('SELECT * FROM feedback WHERE id=?').get(id),target=id=>'/settings?feedback='+id;
 return async(req,res,url)=>{
  if(!/^\/api\/feedback(?:\/|$)/.test(url.pathname))return false;
  const user=auth(req);let manager=false;try{admin(req);manager=true;}catch{}
  const parts=url.pathname.split('/'),id=parts[3];if(parts.length>4)throw failure('反馈路径无效',404);
  if(!id&&req.method==='GET'){
   const all=url.searchParams.get('scope')==='all';if(all&&!manager)throw failure('需要管理员权限',403);
   const offset=Number(url.searchParams.get('offset')||0),status=url.searchParams.get('status')||'active',query=(url.searchParams.get('q')||'').trim().slice(0,100);
   if(!Number.isSafeInteger(offset)||offset<0||offset>100000||!['all','active',...statuses].includes(status))throw failure('筛选条件无效');
   const args=[],where=[];if(!all){where.push('uid=?');args.push(user.uid);}if(status==='active')where.push("status!='archived'");else if(status!=='all'){where.push('status=?');args.push(status);}if(query){where.push('(instr(lower(title),lower(?))>0 OR instr(lower(name),lower(?))>0)');args.push(query,query);}
   const clause=where.length?'WHERE '+where.join(' AND '):'';
   send(res,200,{manager,items:db.prepare(`SELECT id,name,category,title,status,created,updated,version,platform FROM feedback ${clause} ORDER BY updated DESC,id LIMIT 20 OFFSET ?`).all(...args,offset),total:db.prepare(`SELECT COUNT(*) n FROM feedback ${clause}`).get(...args).n});return true;
  }
  if(!id&&req.method==='POST'){
   limit('feedback-create:'+user.uid,5);const input=await body(req,256*1024),now=Date.now(),id=input.requestId||randomUUID();
   if(!/^[\w-]{16,80}$/.test(id)||!['community','launcher','server','crash'].includes(input.category))throw failure('请选择反馈分类');
   const old=get(id);if(old){if(old.uid!==user.uid)throw failure('提交编号冲突',409);send(res,200,{id});return true;}
   db.prepare('INSERT INTO feedback(id,uid,name,category,title,body,report,status,created,updated,version,platform) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user.uid,user.name,input.category,text(input.title,2,100),text(input.body,5,8000),redact(text(input.report||'',0,64000)),'open',now,now,text(input.version||'',0,80),text(input.platform||'',0,80));
   inbox?.notify({recipients:[...adminIDs],actor:user,kind:'feedback',title:'新反馈 · '+input.title,body:input.body,target:target(id),dedupe:'feedback-new:'+id});send(res,201,{id});return true;
  }
  if(!id||!/^[\w-]{16,80}$/.test(id))throw failure('反馈不存在',404);
  let item=get(id);if(!item||item.uid!==user.uid&&!manager)throw failure('反馈不存在或没有访问权限',404);
  if(req.method==='GET'){send(res,200,{item,replies:db.prepare('SELECT id,name,manager,body,created FROM feedback_replies WHERE feedback=? ORDER BY id DESC LIMIT 100').all(id).reverse(),manager});return true;}
  if(!['POST','DELETE'].includes(req.method))throw failure('不支持的反馈操作',405);
  limit('feedback-reply:'+user.uid,20);const input=await body(req,256*1024),reply=text(input.body||'',0,8000);
  if(input.status!==undefined&&(!manager||!statuses.includes(input.status)))throw failure('只有管理员可以修改处理状态',403);
  if(req.method==='DELETE'&&!manager)throw failure('只有管理员可以删除反馈',403);
  db.exec('BEGIN IMMEDIATE');let action,status;
  try{
   item=get(id);if(!item)throw failure('反馈已删除',404);
   if(input.updated!==undefined&&input.updated!==item.updated)throw failure('反馈已被更新，请刷新后重试',409);
   if(req.method==='DELETE'){
    if(!['resolved','archived'].includes(item.status))throw failure('请先解决或归档反馈，再删除',409);
    db.prepare('DELETE FROM feedback_replies WHERE feedback=?').run(id);db.prepare('DELETE FROM feedback WHERE id=?').run(id);inbox?.redact(target(id));action='delete';
   }else{
    if(!reply&&input.status===undefined&&input.action!=='reopen')throw failure('请输入回复或选择操作');
    status=input.action==='reopen'?'open':input.status||item.status;
    if(item.status==='archived'&&reply&&status==='archived')throw failure('反馈已归档，请先重新打开');
    if(!manager&&reply&&status==='resolved')status='open';
    const now=Math.max(Date.now(),item.updated+1);db.prepare('UPDATE feedback SET status=?,updated=? WHERE id=?').run(status,now,id);
    if(reply)db.prepare('INSERT INTO feedback_replies(feedback,uid,name,manager,body,created) VALUES(?,?,?,?,?,?)').run(id,user.uid,user.name,Number(manager),reply,now);
    action=status!==item.status?status:'reply';
   }
   db.prepare('INSERT INTO feedback_audit(feedback,actor,action,created) VALUES(?,?,?,?)').run(id,user.uid,action,Date.now());db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  if(action!=='delete')inbox?.notify({recipients:manager?[item.uid]:[...adminIDs],actor:user,kind:'feedback',title:(manager?'管理员更新了反馈 · ':'反馈有新补充 · ')+item.title,body:reply||({open:'已重新打开',working:'正在处理',resolved:'已解决',archived:'已归档'}[status]),target:target(id),dedupe:'feedback:'+id+':'+get(id).updated});
  send(res,200,{ok:true});return true;
 };
}
