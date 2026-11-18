import path from 'node:path';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {randomBytes,scrypt as derive,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import sharp from 'sharp';
const scrypt=promisify(derive), root=path.resolve(process.env.HXZ_NEXT_WEB_DATA||path.join(import.meta.dirname,'../data'));
const key=Symbol.for('hxz.next.website.cms');
const memory=globalThis[key] ||= {sessions:new Map(),attempts:new Map(),queue:Promise.resolve()};
const defaultsPath=()=>path.join(import.meta.dirname,'content-defaults.json');
async function atomic(file,value){const target=path.join(root,file),tmp=target+'.'+randomBytes(6).toString('hex')+'.tmp';await writeFile(tmp,JSON.stringify(value,null,2),{mode:0o600});try{await rename(tmp,target);}catch(error){await unlink(tmp).catch(()=>{});throw error;}}
async function passwordHash(password,salt){return (await scrypt(password,salt,64,{N:16384,r:8,p:1})).toString('hex');}
async function init(){if(memory.ready)return memory.ready;memory.ready=(async()=>{await mkdir(root,{recursive:true});await mkdir(path.join(root,'uploads'),{recursive:true});memory.defaults=JSON.parse(await readFile(defaultsPath(),'utf8'));
 try{memory.auth=JSON.parse(await readFile(path.join(root,'admin.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;const password=randomBytes(18).toString('base64url'),salt=randomBytes(16).toString('hex');memory.auth={salt,hash:await passwordHash(password,salt)};await atomic('admin.json',memory.auth);await writeFile(path.join(root,'首次登录.txt'),`幻想镇官网内容后台\n地址：http://127.0.0.1:4332/admin/\n账号：admin\n初始密码：${password}\n登录后请在后台更改密码。此文件不要上传或公开。\n`,{mode:0o600});}
 try{memory.db=JSON.parse(await readFile(path.join(root,'content.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;const initial=structuredClone(memory.defaults);memory.db={revision:1,publishedAt:null,draft:initial,published:initial,history:[]};await atomic('content.json',memory.db);}
})();return memory.ready;}
export async function initializeCMS(){await init();}
function cookieSession(cookie=''){const token=cookie.match(/(?:^|;\s*)hxz_admin=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;const session=memory.sessions.get(token);if(!session||session.expires<Date.now()){memory.sessions.delete(token);return null;}return {token,...session};}
export async function readContent(request){await init();const preview=new URL(request.url).searchParams.get('preview')==='1'&&cookieSession(request.headers.get('cookie')||'');return {...structuredClone(preview?memory.db.draft:memory.db.published),preview:!!preview};}
const fail=(message,status=400)=>Object.assign(Error(message),{status});
function text(value,label,max=2000){if(typeof value!=='string'||value.length>max)throw fail(label+'格式无效或过长');return value.trim();}
function url(value,label){const v=text(value,label,2048);let parsed;try{parsed=new URL(v);}catch{throw fail(label+'必须填写完整的 http(s) 地址');}if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw fail(label+'地址无效');return parsed.href;}
function media(value){const v=text(value,'图片',200);if(!/^\/(?:media\/[a-z0-9-]+\.webp|uploads\/[a-f0-9]{32}\.webp)$/.test(v))throw fail('请选择内置图片或上传一张新图片');return v;}
function validate(input){if(!input||typeof input!=='object')throw fail('内容格式无效');const out=structuredClone(memory.defaults);
 for(const key of Object.keys(out.site)){const value=input.site?.[key];out.site[key]=['origin','skin','rules','faq','otherLauncher','video','adminVideo','ownerVideo','oopz','github'].includes(key)?url(value,key):text(value,key,key==='description'?1000:120);}
 for(const key of Object.keys(out.home)){const value=input.home?.[key];out.home[key]=key==='heroImage'?media(value):typeof out.home[key]==='boolean'?(value===true):text(value,key,1500);}
 if(!Array.isArray(input.servers)||input.servers.length!==out.servers.length)throw fail('必须保留三个服务器');
 out.servers=out.servers.map((original,index)=>{const s=input.servers[index];if(s?.id!==original.id)throw fail('服务器标识不能修改');const result={...original};for(const key of ['name','short','english','headline','intro','address','version','platform','cycle','status','fit','note','imageCaption'])result[key]=text(s[key],key,key==='note'||key==='intro'?3000:500);result.testing=s.testing===true;result.image=media(s.image);if(!Array.isArray(s.tags)||s.tags.length>8)throw fail('每个服务器最多8个玩法标签');result.tags=s.tags.map(v=>text(v,'玩法标签',60));if(!Array.isArray(s.features)||s.features.length<1||s.features.length>6)throw fail('每个服务器需要1–6项特色');result.features=s.features.map(f=>({title:text(f.title,'特色标题',100),body:text(f.body,'特色内容',2000)}));return result;});
 return out;
}
async function bytes(req,max=300000){let size=0;const chunks=[];for await(const part of req){size+=part.length;if(size>max)throw fail('提交内容过大',413);chunks.push(part);}return Buffer.concat(chunks);}
async function json(req){try{return JSON.parse((await bytes(req)).toString());}catch(error){if(error.status)throw error;throw fail('JSON 格式无效');}}
function respond(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function mutate(fn){const next=memory.queue.then(fn);memory.queue=next.catch(()=>{});return next;}
function sameOrigin(req){const origin=req.headers.origin;if(!origin)return;const expected=process.env.PUBLIC_ORIGIN||`${req.socket.encrypted?'https':'http'}://${req.headers.host}`;if(origin!==expected)throw fail('请求来源不匹配',403);}
export async function handleCMS(req,res){await init();const pathname=new URL(req.url,'http://localhost').pathname;
 try{
  const session=cookieSession(req.headers.cookie||'');
  if(req.method!=='GET')sameOrigin(req);
  if(pathname==='/api/admin/session'&&req.method==='POST'){
   const ip=req.socket.remoteAddress||'local',now=Date.now();for(const [key,v] of memory.attempts)if(v.until<now)memory.attempts.delete(key);
   if(memory.attempts.size>=1024&&!memory.attempts.has(ip))throw fail('登录服务繁忙，请稍后重试',429);
   let limit=memory.attempts.get(ip)||{count:0,until:now+600000};if(limit.count>=10)throw fail('登录尝试过多，请十分钟后再试',429);limit.count++;memory.attempts.set(ip,limit);
   const body=await json(req),password=text(body.password,'密码',256);const hash=await passwordHash(password,memory.auth.salt);
   if(body.username!=='admin'||!timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(memory.auth.hash,'hex')))throw fail('账号或密码错误',401);
   memory.attempts.delete(ip);for(const [key,v] of memory.sessions)if(v.expires<now)memory.sessions.delete(key);if(memory.sessions.size>=64)memory.sessions.delete(memory.sessions.keys().next().value);
   const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');memory.sessions.set(token,{csrf,expires:now+8*3600000});
   res.setHeader('Set-Cookie',`hxz_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.PUBLIC_ORIGIN?.startsWith('https:')||req.socket.encrypted?'; Secure':''}`);return respond(res,200,{csrf});
  }
  if(!session)throw fail('请先登录管理后台',401);
  if(req.method!=='GET'&&req.headers['x-csrf-token']!==session.csrf)throw fail('会话验证失败，请刷新后台',403);
  if(pathname==='/api/admin/session'&&req.method==='GET')return respond(res,200,{csrf:session.csrf});
  if(pathname==='/api/admin/session'&&req.method==='DELETE'){memory.sessions.delete(session.token);res.setHeader('Set-Cookie','hxz_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return respond(res,200,{ok:true});}
  if(pathname==='/api/admin/content'&&req.method==='GET')return respond(res,200,{...memory.db,history:memory.db.history.map(({revision,at})=>({revision,at}))});
  if(pathname==='/api/admin/content'&&req.method==='PUT'){const body=await json(req);const content=validate(body.content);return await mutate(async()=>{if(body.revision!==memory.db.revision)throw fail('另一窗口已修改内容，请刷新后重新编辑',409);const db={...memory.db,draft:content,revision:memory.db.revision+1};await atomic('content.json',db);memory.db=db;respond(res,200,{revision:db.revision});});}
  if(pathname==='/api/admin/publish'&&req.method==='POST'){const body=await json(req);return await mutate(async()=>{if(body.revision!==memory.db.revision)throw fail('草稿已变更，请重新保存后发布',409);const now=new Date().toISOString();const db={...memory.db,published:structuredClone(memory.db.draft),publishedAt:now,revision:memory.db.revision+1,history:[{revision:memory.db.revision,at:now,content:memory.db.published},...memory.db.history].slice(0,20)};await atomic('content.json',db);memory.db=db;respond(res,200,{revision:db.revision,publishedAt:now});});}
  if(pathname==='/api/admin/restore'&&req.method==='POST'){const body=await json(req);return await mutate(async()=>{if(body.revision!==memory.db.revision)throw fail('内容已变更，请刷新后台',409);const prior=memory.db.history.find(h=>h.revision===body.target);if(!prior)throw fail('未找到历史内容');const db={...memory.db,draft:structuredClone(prior.content),revision:memory.db.revision+1};await atomic('content.json',db);memory.db=db;respond(res,200,{revision:db.revision});});}
  if(pathname==='/api/admin/password'&&req.method==='POST'){const body=await json(req);const password=text(body.password,'新密码',256);if(password.length<12)throw fail('新密码至少12位');const old=await passwordHash(text(body.current,'当前密码',256),memory.auth.salt);if(!timingSafeEqual(Buffer.from(old,'hex'),Buffer.from(memory.auth.hash,'hex')))throw fail('当前密码错误',403);const salt=randomBytes(16).toString('hex'),auth={salt,hash:await passwordHash(password,salt)};await atomic('admin.json',auth);memory.auth=auth;memory.sessions.clear();await unlink(path.join(root,'首次登录.txt')).catch(()=>{});return respond(res,200,{ok:true});}
  if(pathname==='/api/admin/media'&&req.method==='POST'){if(!['image/png','image/jpeg','image/webp'].includes(req.headers['content-type']))throw fail('只支持 PNG、JPEG、WebP 图片');const input=await bytes(req,8*1024*1024);let buffer;try{buffer=await sharp(input,{limitInputPixels:24000000,animated:false}).rotate().resize(2400,1600,{fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();}catch{throw fail('无法读取图片，或图片像素过大');}const name=createHash('sha256').update(buffer).digest('hex').slice(0,32)+'.webp';await writeFile(path.join(root,'uploads',name),buffer);return respond(res,200,{url:'/uploads/'+name});}
  throw fail('接口不存在',404);
 }catch(error){if(!res.headersSent)respond(res,error.status||500,{error:error.status?error.message:'保存失败，请检查数据目录权限后重试'});}
}
export const uploadsDirectory=path.join(root,'uploads');
