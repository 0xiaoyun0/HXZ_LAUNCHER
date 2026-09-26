import {randomUUID} from 'node:crypto';
export function createFeedback({db,auth,admin,body,send,limit}){
 db.exec(`CREATE TABLE IF NOT EXISTS feedback(id TEXT PRIMARY KEY,uid TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,report TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS feedback_owner ON feedback(uid,updated DESC);
 CREATE TABLE IF NOT EXISTS feedback_replies(id INTEGER PRIMARY KEY AUTOINCREMENT,feedback TEXT NOT NULL,uid TEXT NOT NULL,name TEXT NOT NULL,manager INTEGER NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);`);
 const text=(value,min,max)=>{if(typeof value!=='string'||value.trim().length<min||value.length>max)throw Error(`内容长度应为 ${min}–${max} 字`);return value.trim();};
 return async(req,res,url)=>{
  if(!/^\/api\/feedback(?:\/|$)/.test(url.pathname))return false;
  const user=auth(req);let manager=false;try{admin(req);manager=true;}catch{}
  const id=url.pathname.split('/')[3],offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0));
  if(!Number.isSafeInteger(offset))throw Error('页码无效');
  if(!id&&req.method==='GET'){
   const all=url.searchParams.get('scope')==='all';if(all&&!manager)throw Error('需要管理员权限');
   const where=all?'':'WHERE uid=?',args=all?[]:[user.uid];
   send(res,200,{manager,items:db.prepare(`SELECT id,name,category,title,status,created,updated FROM feedback ${where} ORDER BY updated DESC LIMIT 20 OFFSET ?`).all(...args,offset),total:db.prepare(`SELECT COUNT(*) AS n FROM feedback ${where}`).get(...args).n});return true;
  }
  if(!id&&req.method==='POST'){
   limit('feedback-create:'+user.uid,5);const input=await body(req,256*1024);
   if(!['community','launcher','server','crash'].includes(input.category))throw Error('请选择反馈分类');
   const id=randomUUID(),now=Date.now();
   db.prepare('INSERT INTO feedback VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,user.uid,user.name,input.category,text(input.title,2,100),text(input.body,5,8000),text(input.report||'',0,64000),'open',now,now);
   send(res,201,{id});return true;
  }
  const item=db.prepare('SELECT * FROM feedback WHERE id=?').get(id);if(!item||item.uid!==user.uid&&!manager)throw Error('反馈不存在或没有访问权限');
  if(req.method==='GET'){send(res,200,{item,replies:db.prepare('SELECT name,manager,body,created FROM feedback_replies WHERE feedback=? ORDER BY id DESC LIMIT 100').all(id).reverse(),manager});return true;}
  if(req.method==='POST'){
   limit('feedback-reply:'+user.uid,20);const input=await body(req);
   if(input.body)input.body=text(input.body,1,8000);
   if(input.status!==undefined){if(!manager||!['open','working','resolved'].includes(input.status))throw Error('只有管理员可以修改处理状态');db.prepare('UPDATE feedback SET status=?,updated=? WHERE id=?').run(input.status,Date.now(),id);}
   if(input.body){db.prepare('INSERT INTO feedback_replies(feedback,uid,name,manager,body,created) VALUES(?,?,?,?,?,?)').run(id,user.uid,user.name,manager?1:0,text(input.body,1,8000),Date.now());db.prepare('UPDATE feedback SET updated=? WHERE id=?').run(Date.now(),id);}
   send(res,200,{ok:true});return true;
  }
  throw Error('不支持的反馈操作');
 };
}
