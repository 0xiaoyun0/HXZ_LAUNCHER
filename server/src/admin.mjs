import {normalizeSources} from "./update-logs.mjs";
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
export function createAdmin({data,db,issue,admin,send,body,limit,clients,broadcast,adminIDs,updateSources}){
 const credentials=join(data,'admin.json'),configFile=join(data,'community-settings.json');
 if(!existsSync(credentials)){const password=process.env.HXZ_ADMIN_PASSWORD||randomBytes(18).toString('base64url'),salt=randomBytes(16).toString('hex');writeFileSync(credentials,JSON.stringify({salt,hash:scryptSync(password,salt,64).toString('hex')}),{mode:0o600,flag:'wx'});if(!process.env.HXZ_ADMIN_PASSWORD)writeFileSync(join(data,'初始管理员密码.txt'),'管理员账号：admin\n初始密码：'+password+'\n请登录网页后台后修改密码。\n',{mode:0o600,flag:'wx'});}
 let config=existsSync(configFile)?JSON.parse(readFileSync(configFile,'utf8')):{};
 const apply=()=>{Object.assign(updateSources,normalizeSources(config.hxzSources||{}));for(const id of config.adminIDs||[])adminIDs.add(id);for(const key of ['HXZ_TURN_URL','HXZ_TURN_SECRET'])if(config[key])process.env[key]=config[key];};apply();
 const save=(file,value)=>{writeFileSync(file+'.tmp',JSON.stringify(value,null,2),{mode:0o600});renameSync(file+'.tmp',file);};
 const assets=new Map([['/admin/',['index.html','text/html; charset=utf-8']],['/admin/app.js',['app.js','text/javascript; charset=utf-8']],['/admin/style.css',['style.css','text/css; charset=utf-8']]]);
 return async(req,res,url)=>{
  if(url.pathname==='/'||url.pathname==='/admin'){res.writeHead(302,{Location:'/admin/'});res.end();return true;}
  const asset=assets.get(url.pathname);if(asset){res.writeHead(200,{'Content-Type':asset[1],'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(readFileSync(join(fileURLToPath(new URL('../public/',import.meta.url)),asset[0])));return true;}
  if(!url.pathname.startsWith('/api/admin/'))return false;
  if(url.pathname==='/api/admin/login'&&req.method==='POST'){limit('admin-login:'+req.socket.remoteAddress,6);const input=await body(req),saved=JSON.parse(readFileSync(credentials,'utf8'));if(input.username!=='admin'||typeof input.password!=='string'||input.password.length>512||!timingSafeEqual(scryptSync(input.password,saved.salt,64),Buffer.from(saved.hash,'hex')))throw Error('账号或密码错误');send(res,200,{token:issue({uid:'@console',name:'管理员',consoleAdmin:true})});return true;}
  admin(req);
  if(url.pathname==='/api/admin/overview'){send(res,200,{version:'0.2.2',online:[...clients.values()].map(c=>({id:c.id,uid:c.user.uid,name:c.user.name,room:c.room})),messages:db.prepare('SELECT id,uid,name,body,created FROM messages ORDER BY id DESC LIMIT 100').all(),banned:db.prepare('SELECT uid FROM banned').all(),adminIDs:[...adminIDs],turnUrl:process.env.HXZ_TURN_URL||'',turnConfigured:!!process.env.HXZ_TURN_SECRET,hxzSources:updateSources});return true;}
  if(url.pathname==='/api/admin/settings'&&req.method==='POST'){const input=await body(req);if(!Array.isArray(input.adminIDs)||input.adminIDs.length>100||input.adminIDs.some(v=>typeof v!=='string'||!/^[-\w]{1,64}$/.test(v)))throw Error('管理员角色 UUID 格式错误');if(input.turnUrl&&(!/^turns?:/.test(input.turnUrl)||input.turnUrl.length>2000))throw Error('TURN 地址无效');const hxzSources=input.hxzSources===undefined?updateSources:normalizeSources(input.hxzSources);config={...config,hxzSources,adminIDs:input.adminIDs,HXZ_TURN_URL:String(input.turnUrl||'')};if(input.turnSecret)config.HXZ_TURN_SECRET=String(input.turnSecret).slice(0,512);adminIDs.clear();for(const id of (process.env.HXZ_ADMIN_IDS||'').split(',').filter(Boolean))adminIDs.add(id);process.env.HXZ_TURN_URL=config.HXZ_TURN_URL;save(configFile,config);apply();send(res,200,{ok:true});return true;}
  if(url.pathname==='/api/admin/password'&&req.method==='POST'){const input=await body(req);if(typeof input.password!=='string'||input.password.length<12||input.password.length>512)throw Error('密码至少 12 个字符');const salt=randomBytes(16).toString('hex');save(credentials,{salt,hash:scryptSync(input.password,salt,64).toString('hex')});if(existsSync(join(data,'初始管理员密码.txt')))unlinkSync(join(data,'初始管理员密码.txt'));send(res,200,{ok:true});return true;}
  if(url.pathname==='/api/admin/messages/delete'&&req.method==='POST'){const input=await body(req);if(!Number.isInteger(input.id))throw Error('消息编号无效');db.prepare('DELETE FROM messages WHERE id=?').run(input.id);broadcast({type:'message-deleted',id:input.id});send(res,200,{ok:true});return true;}
  send(res,404,{error:'管理接口不存在'});return true;
 };
}
