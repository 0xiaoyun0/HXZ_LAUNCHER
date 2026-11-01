import {randomUUID} from 'node:crypto';
import {validatePluginPackage,PLUGIN_LIMIT} from '../shared/plugin-package.mjs';
const failure=(message,status=400)=>Object.assign(Error(message),{status});
export function createPluginMarket({db,auth,admin,body,send,limit}){
 db.exec(`CREATE TABLE IF NOT EXISTS launcher_plugins(id TEXT PRIMARY KEY,plugin_id TEXT NOT NULL,version TEXT NOT NULL,owner TEXT NOT NULL,owner_name TEXT NOT NULL,manifest TEXT NOT NULL,bundle TEXT NOT NULL,sha256 TEXT NOT NULL,status TEXT NOT NULL,reason TEXT NOT NULL,downloads INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,reviewer TEXT NOT NULL,UNIQUE(plugin_id,version));
 CREATE INDEX IF NOT EXISTS launcher_plugins_status ON launcher_plugins(status,updated DESC);`);
 const publicRow=v=>({id:v.id,...JSON.parse(v.manifest),publisher:v.owner_name,sha256:v.sha256,status:v.status,reason:v.reason,downloads:v.downloads,created:v.created,updated:v.updated,reviewer:v.reviewer});
 return async(req,res,url)=>{
  const p=url.pathname,isAdmin=p.startsWith('/api/admin/plugins');
  if(!/^\/api\/(?:admin\/)?plugins(?:\/|$)/.test(p))return false;
  const user=isAdmin?admin(req):req.method==='POST'||url.searchParams.get('mine')==='1'?auth(req):null;
  const parts=p.split('/'),id=parts[isAdmin?4:3],action=parts[isAdmin?5:4];
  if(!id&&req.method==='GET'){
   const mine=url.searchParams.get('mine')==='1',q=String(url.searchParams.get('q')||'').slice(0,100),offset=Math.max(0,Math.min(100000,Number(url.searchParams.get('offset'))||0));
   const where=isAdmin?'1=1':mine?'owner=?':"status='approved'",args=mine&&!isAdmin?[user.uid]:[];
   const clause=' WHERE '+where+' AND (?=\'\' OR instr(manifest,?)>0)';args.push(q,q);
   send(res,200,{items:db.prepare('SELECT * FROM launcher_plugins'+clause+' ORDER BY updated DESC LIMIT 30 OFFSET ?').all(...args,offset).map(publicRow),total:db.prepare('SELECT count(*) n FROM launcher_plugins'+clause).get(...args).n,apiVersion:1});return true;
  }
  if(!id&&req.method==='POST'&&!isAdmin){
   limit('plugin-submit:'+user.uid,4,3600000);const input=await body(req,PLUGIN_LIMIT+65536),value=validatePluginPackage(input.package);
   const owner=db.prepare('SELECT owner FROM launcher_plugins WHERE plugin_id=? LIMIT 1').get(value.manifest.id);
   if(owner&&owner.owner!==user.uid)throw failure('此插件标识属于其他作者',403);
   if(db.prepare('SELECT 1 FROM launcher_plugins WHERE plugin_id=? AND version=?').get(value.manifest.id,value.manifest.version))throw failure('该版本已经提交，请增加版本号',409);
   const id=randomUUID(),now=Date.now();db.prepare("INSERT INTO launcher_plugins VALUES(?,?,?,?,?,?,?,?,'pending','',0,?,?,'')").run(id,value.manifest.id,value.manifest.version,user.uid,user.name,JSON.stringify(value.manifest),value.serialized,value.sha256,now,now);
   send(res,201,{id,status:'pending',sha256:value.sha256});return true;
  }
  const item=db.prepare('SELECT * FROM launcher_plugins WHERE id=?').get(id||'');
  if(!item||!isAdmin&&item.status!=='approved')throw failure('插件尚未发布或已下架',404);
  if(req.method==='GET'&&action==='package'){
   if(!isAdmin)db.prepare('UPDATE launcher_plugins SET downloads=downloads+1 WHERE id=?').run(id);
   send(res,200,{package:JSON.parse(item.bundle),sha256:item.sha256});return true;
  }
  if(req.method==='GET'){send(res,200,publicRow(item));return true;}
  if(isAdmin&&req.method==='PUT'){
   const input=await body(req);if(!['approved','rejected','withdrawn'].includes(input.status))throw failure('审核状态无效');
   if(input.updated!==item.updated)throw failure('插件已被其他管理员处理，请刷新',409);
   const reason=String(input.reason||'').trim();if(reason.length>2000||input.status!=='approved'&&!reason)throw failure('请填写有效的审核说明');
   db.prepare('UPDATE launcher_plugins SET status=?,reason=?,reviewer=?,updated=? WHERE id=?').run(input.status,reason,user.name,Math.max(Date.now(),item.updated+1),id);send(res,200,{ok:true});return true;
  }
  throw failure('不支持的插件操作',405);
 };
}
