import {createHash,randomUUID} from 'node:crypto';
import {sanitizeReport} from '../shared/report-sanitize.mjs';

const failure=(message,status=400)=>Object.assign(Error(message),{status});
const text=(v,max)=>sanitizeReport(v,max).trim();
export function createErrorReports({db,auth,admin,body,send,limit}){
 db.exec(`CREATE TABLE IF NOT EXISTS error_reports(id TEXT PRIMARY KEY,fingerprint TEXT UNIQUE NOT NULL,category TEXT NOT NULL,message TEXT NOT NULL,detail TEXT NOT NULL,version TEXT NOT NULL,platform TEXT NOT NULL,context TEXT NOT NULL,uid TEXT NOT NULL,name TEXT NOT NULL,status TEXT NOT NULL,assignee TEXT NOT NULL,note TEXT NOT NULL,occurrences INTEGER NOT NULL,first_seen INTEGER NOT NULL,last_seen INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS error_report_events(id TEXT PRIMARY KEY,report TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS error_report_history(id TEXT PRIMARY KEY,report TEXT NOT NULL,actor TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS error_reports_order ON error_reports(last_seen DESC);`);
 return async(req,res,url)=>{
  const p=url.pathname;
  if(p==='/api/error-reports'&&req.method==='POST'){
   limit('error-report:'+req.socket.remoteAddress,40);
   const input=await body(req,96000);if(!/^[\w-]{16,80}$/.test(input.eventId||''))throw failure('错误事件编号无效');
   const previous=db.prepare('SELECT report FROM error_report_events WHERE id=?').get(input.eventId);
   if(previous){send(res,200,{id:previous.report,duplicate:true});return true;}
   const user=req.headers.authorization?auth(req):{uid:'',name:'未登录用户'};
   const message=text(input.message,1000),category=text(input.category||'launcher',40),version=text(input.version,40),platform=text(input.platform,80);
   if(!message)throw failure('错误内容不能为空');
   const context={};for(const key of ['os','arch','java','instance','action','memoryMB','plugin','clientTime'])if(input.context?.[key]!=null)context[key]=text(input.context[key],300);
   const detail=text(input.detail,32000),fingerprint=createHash('sha256').update([category,version,platform,message].join('\n')).digest('hex');
   const now=Date.now(),existing=db.prepare('SELECT id,status FROM error_reports WHERE fingerprint=?').get(fingerprint),id=existing?.id||randomUUID();
   db.exec('BEGIN IMMEDIATE');try{
    if(existing)db.prepare("UPDATE error_reports SET occurrences=occurrences+1,last_seen=?,detail=?,context=?,uid=?,name=?,status=CASE WHEN status='resolved' THEN 'open' ELSE status END,updated=? WHERE id=?").run(now,detail,JSON.stringify(context),user.uid,user.name,now,id);
    else db.prepare("INSERT INTO error_reports VALUES(?,?,?,?,?,?,?,?,?,?,'open','','',1,?,?,?)").run(id,fingerprint,category,message,detail,version,platform,JSON.stringify(context),user.uid,user.name,now,now,now);
    db.prepare('INSERT INTO error_report_events VALUES(?,?,?)').run(input.eventId,id,now);
    db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   db.prepare('DELETE FROM error_report_events WHERE created<?').run(now-90*86400000);
   send(res,201,{id});return true;
  }
  if(!/^\/api\/admin\/error-reports(?:\/|$)/.test(p))return false;
  const actor=admin(req),id=p.split('/')[4];
  if(!id&&req.method==='GET'){
   const status=url.searchParams.get('status')||'',q=text(url.searchParams.get('q'),100),offset=Math.min(100000,Math.max(0,Number(url.searchParams.get('offset'))||0));
   const where="WHERE (?='' OR status=?) AND (?='' OR instr(message,?)>0 OR instr(version,?)>0 OR instr(name,?)>0)";
   const args=[status,status,q,q,q,q];
   send(res,200,{items:db.prepare('SELECT * FROM error_reports '+where+' ORDER BY last_seen DESC LIMIT 30 OFFSET ?').all(...args,offset).map(v=>({...v,context:JSON.parse(v.context)})),total:db.prepare('SELECT count(*) n FROM error_reports '+where).get(...args).n});return true;
  }
  const item=db.prepare('SELECT * FROM error_reports WHERE id=?').get(id||'');if(!item)throw failure('错误记录不存在',404);
  if(req.method==='GET'){send(res,200,{item:{...item,context:JSON.parse(item.context)},history:db.prepare('SELECT * FROM error_report_history WHERE report=? ORDER BY created DESC LIMIT 100').all(id)});return true;}
  if(req.method!=='PUT')throw failure('不支持此操作',405);
  const input=await body(req);if(!['open','working','resolved','ignored'].includes(input.status))throw failure('处理状态无效');
  const note=text(input.note,4000),assignee=text(input.assignee,80),now=Math.max(Date.now(),item.updated+1);
  if(input.updated!==item.updated)throw failure('记录已变化，请刷新后处理',409);
  db.exec('BEGIN IMMEDIATE');try{
   db.prepare('UPDATE error_reports SET status=?,assignee=?,note=?,updated=? WHERE id=?').run(input.status,assignee,note,now,id);
   db.prepare('INSERT INTO error_report_history VALUES(?,?,?,?,?,?)').run(randomUUID(),id,actor.name,input.status,note,now);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  send(res,200,{ok:true});return true;
 };
}
