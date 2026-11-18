import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {generateKeyPair,sign,verify,randomBytes,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {remoteJSON,download,writeJSON,json,exists} from './io.mjs';
const SKIN='https://skin.hxzmc.top/api/yggdrasil';
const uuidOf=a=>{if(!/^[a-f0-9]{32}$/i.test(a.uuid))throw Error('缓存角色无效');return a.uuid;};
export async function cacheSkin(data,account){
 const id=uuidOf(account),dir=path.join(data,'skin-cache',id);
 const signal=AbortSignal.timeout(12000);
 const [metadata,profile]=await Promise.all([remoteJSON(SKIN,{signal}),remoteJSON(SKIN+'/sessionserver/session/minecraft/profile/'+id+'?unsigned=false',{signal})]);
 if(profile.id!==id||profile.name!==account.name)throw Error('皮肤角色不匹配');
 const textures=profile.properties?.find(p=>p.name==='textures'),files={};
 if(textures){
  if(!textures.signature||!metadata.signaturePublickey||!verify('RSA-SHA1',Buffer.from(textures.value),metadata.signaturePublickey,Buffer.from(textures.signature,'base64')))throw Error('皮肤签名不匹配');
  const parsed=JSON.parse(Buffer.from(textures.value,'base64').toString('utf8'));
  if(parsed.profileId!==id)throw Error('皮肤归属不匹配');
  for(const kind of ['SKIN','CAPE'])if(parsed.textures?.[kind]){
   const texture=parsed.textures[kind],url=new URL(texture.url),domains=[...(metadata.skinDomains||[]),'.minecraft.net','.mojang.com'];
   if(url.protocol!=='https:'||url.username||url.password||!domains.some(d=>d.startsWith('.')?url.hostname.endsWith(d):url.hostname===d))continue;
   const filename=createHash('sha256').update(url.href).digest('hex')+'.png',file=path.join(dir,filename);
   await download(url.href,file,{signal,maxSize:2*1024*1024,retryBudgetMs:0});
   const buffer=await fs.readFile(file);if(!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('皮肤不是 PNG');
   files[kind]={file:filename,metadata:texture.metadata?.model==='slim'?{model:'slim'}:undefined};
  }
 }
 await writeJSON(path.join(dir,'profile.json'),{id,name:profile.name,textures:files,verifiedAt:Date.now()});
}
export async function cachedSkin(data,account){const file=path.join(data,'skin-cache',uuidOf(account),'profile.json');if(!await exists(file))return null;const profile=await json(file);return profile.id===account.uuid&&profile.name===account.name?profile:null;}
export async function startOfflineSkin(data,account){
 const profile=await cachedSkin(data,account);if(!profile)throw Error('没有此角色的已验证离线缓存');
 const {privateKey,publicKey}=await promisify(generateKeyPair)('rsa',{modulusLength:2048}),secret=randomBytes(24).toString('hex');let base;
 const metadata={meta:{serverName:'HXZ 本机离线皮肤','feature.no_mojang_namespace':true,'feature.enable_profile_key':false},skinDomains:['127.0.0.1'],signaturePublickey:publicKey.export({type:'spki',format:'pem'})};
 const textures={};
 const cached=new Map();for(const [kind,texture] of Object.entries(profile.textures||{})){
  if(!/^[a-f0-9]{64}\.png$/.test(texture.file))continue;try{const buffer=await fs.readFile(path.join(data,'skin-cache',account.uuid,texture.file));if(buffer.length<=2*1024*1024)cached.set(texture.file,buffer);}catch{}
 }
 const server=http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(value===undefined?'':JSON.stringify(value));};
  try{
   const u=new URL(req.url,'http://127.0.0.1');if(!u.pathname.startsWith('/'+secret+'/')){send(404);return;}const route=u.pathname.slice(secret.length+2);
   if(req.method==='GET'&&!route){send(200,metadata);return;}
   if(req.method==='GET'&&route==='sessionserver/session/minecraft/profile/'+account.uuid){
    const value=Buffer.from(JSON.stringify({timestamp:Date.now(),profileId:account.uuid,profileName:account.name,textures})).toString('base64');
    send(200,{id:account.uuid,name:account.name,properties:[{name:'textures',value,signature:sign('RSA-SHA1',Buffer.from(value),privateKey).toString('base64')}]});return;
   }
   if(req.method==='GET'&&route==='users/profiles/minecraft/'+account.name){send(200,{id:account.uuid,name:account.name});return;}
   if(req.method==='GET'&&route.startsWith('textures/')&&cached.has(route.slice(9))){res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=3600'});res.end(cached.get(route.slice(9)));return;}
   // No authentication or multiplayer join endpoint is implemented by this cache.
   if(route.endsWith('/hasJoined')){send(204);return;}send(503,{error:'OfflineMode',errorMessage:'离线缓存不提供账号验证或联机验证'});
  }catch{send(500,{error:'OfflineCacheError'});}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 base='http://127.0.0.1:'+server.address().port+'/'+secret+'/';
 for(const [kind,texture] of Object.entries(profile.textures||{}))if(cached.has(texture.file))textures[kind]={url:base+'textures/'+texture.file,...(texture.metadata?{metadata:texture.metadata}:{})};
 return {base,metadata,close(){server.closeAllConnections?.();server.close();cached.clear();}};
}
