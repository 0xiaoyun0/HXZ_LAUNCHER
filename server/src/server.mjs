import {createContent} from "./content.mjs";
import {VERSION} from "./version.mjs";
import {relayVoice} from "./voice-relay.mjs";
import {createUpdateLogs} from "./update-logs.mjs";
import {avatarData} from "./avatars.mjs";
import http from 'node:http';
import {createAdmin} from './admin.mjs';
import { isIP } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { pathToFileURL } from 'node:url';

export const GROUPS = [{id:'survival',name:'原版生存群组'},{id:'mod-1',name:'模组一服'},{id:'mod-2',name:'模组二服'}];
const ROOMS = ['lobby',...GROUPS.map(g=>g.id)];
export function createCommunity(options={}) {
  const data=resolve(options.data || process.env.HXZ_DATA || './data');mkdirSync(data,{recursive:true});
  const keyPath=join(data,'session.key');if(!existsSync(keyPath))writeFileSync(keyPath,randomBytes(48),{mode:0o600,flag:'wx'});
  const key=readFileSync(keyPath), db=new DatabaseSync(join(data,'community.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,channel TEXT NOT NULL,uid TEXT NOT NULL,name TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS messages_channel ON messages(channel,id);
    CREATE TABLE IF NOT EXISTS notices(id TEXT PRIMARY KEY,group_id TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,author TEXT NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS banned(uid TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS profiles(uid TEXT PRIMARY KEY,avatar TEXT NOT NULL,version TEXT NOT NULL);`);
  const skin=(options.skin || process.env.HXZ_SKIN_API || 'https://skin.hxzmc.top/api/yggdrasil').replace(/\/$/,'');
  const adminIDs=new Set(options.adminIDs || (process.env.HXZ_ADMIN_IDS || '').split(',').filter(Boolean));
  const origins=new Set((options.origins || (process.env.HXZ_ORIGINS || 'null,file://,http://localhost:9000,http://127.0.0.1:9000').split(',')).map(v=>v.trim()).filter(Boolean));
  // Packaged Electron WebSockets use file://; opaque browser origins use null.
  // Preserve compatibility with existing .env files that already trust desktop clients.
  if(origins.has('null'))origins.add('file://');
  const roomLimit=20, clients=new Map(), attempts=new Map();
  function issue(identity) {const payload=Buffer.from(JSON.stringify({...identity,exp:Date.now()+12*3600000})).toString('base64url');return payload+'.'+createHmac('sha256',key).update(payload).digest('base64url');}
  function verify(token) {
    if(typeof token!=='string'||token.length>8192)throw Error('请先登录');
    const [payload,sig]=token.split('.');const expected=createHmac('sha256',key).update(payload||'').digest();let actual=Buffer.from(sig||'','base64url');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('登录已失效');
    const user=JSON.parse(Buffer.from(payload,'base64url').toString());
    if(user.exp<Date.now()||typeof user.uid!=='string'||db.prepare('SELECT 1 FROM banned WHERE uid=?').get(user.uid))throw Error('登录已失效或账号已被禁用');return user;
  }
  function auth(req) {return verify((req.headers.authorization||'').replace(/^Bearer /,''));}
  function admin(req) {const user=auth(req);if(!adminIDs.has(user.uid)&&!user.consoleAdmin)throw Error('需要管理员权限');return user;}
  function clientIP(req) {const remote=req.socket.remoteAddress;const forwarded=req.headers['x-real-ip'];if(process.env.HXZ_TRUST_PROXY==='loopback'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote)&&typeof forwarded==='string'&&isIP(forwarded))return forwarded;return remote;}
  function limit(id,max=30,window=60000) {if(attempts.size>=20000&&!attempts.has(id))throw Error('服务繁忙，请稍后重试');const now=Date.now();let value=attempts.get(id);if(!value||now-value.time>window)attempts.set(id,value={time:now,count:0});if(++value.count>max)throw Error('操作过于频繁，请稍后再试');}
  function send(res,status,value) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
  async function body(req,max=32768) {let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('请求过大');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
  function text(value,max) {if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('内容为空或超过长度限制');return value.trim();}
  function history(channel) {return db.prepare('SELECT m.id,m.channel,m.uid,m.name,m.body,m.created,p.version AS avatarVersion FROM messages m LEFT JOIN profiles p ON p.uid=m.uid WHERE m.channel=? ORDER BY m.id DESC LIMIT 100').all(channel).reverse();}
  function packet(ws,value){if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>256*1024)ws.close(1013,'连接太慢');else ws.send(JSON.stringify(value));}}
  function broadcast(value,filter=()=>true) {for(const [ws,c] of clients)if(filter(c))packet(ws,value);}
  function avatarVersion(uid){return db.prepare("SELECT version FROM profiles WHERE uid=?").get(uid)?.version||"";}
  function presence(){broadcast({type:'presence',users:[...clients.values()].map(c=>({id:c.id,uid:c.user.uid,name:c.user.name,avatarVersion:avatarVersion(c.user.uid),room:c.room,muted:c.muted}))});}
  async function exchange(input) {
    let response;
    if(options.exchange)response=await options.exchange(input);
    else {
      if(typeof input.accessToken!=='string'||typeof input.clientToken!=='string')throw Error('缺少皮肤站登录凭据');
      const upstream=await fetch(skin+'/authserver/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:input.accessToken,clientToken:input.clientToken,requestUser:true}),signal:AbortSignal.timeout(15000),redirect:'error'});
      if(!upstream.ok)throw Error('皮肤站登录已过期，请重新登录');let bytes=0;const chunks=[];for await(const chunk of upstream.body){bytes+=chunk.length;if(bytes>262144)throw Error('皮肤站响应过大');chunks.push(chunk);}response=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    const p=response.selectedProfile;if(!p||!/^\w{1,64}$/.test(p.id)||typeof p.name!=='string')throw Error('请先在皮肤站选择游戏角色');
    // Identity comes from the authenticated upstream response, never the caller's claimed UUID.
    const identity={uid:p.id,name:p.name};content.recordMember(identity);return {token:issue(identity),user:{...identity,admin:adminIDs.has(identity.uid)},credentials:response};
  }
  const updateSources={};
  const updateLogs=createUpdateLogs(()=>updateSources);
  const content=createContent({data,db,auth,admin,adminIDs,body,send,limit});
  const adminRoute=createAdmin({updateSources,data,db,issue,admin,send,body,limit,clients,broadcast,adminIDs});
  const server=http.createServer(async(req,res)=>{
    const origin=req.headers.origin;if(origin&&!origins.has(origin)&&!['http://','https://'].some(protocol=>origin===protocol+req.headers.host)){send(res,403,{error:'来源不允许'});return;}
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    try {
      const url=new URL(req.url,'http://localhost'),path=url.pathname;limit('http:'+clientIP(req),240);
      if(await content.route(req,res,url))return;
      if(await adminRoute(req,res,url))return;
      if(path==='/api/update-logs'&&req.method==='GET')return send(res,200,await updateLogs());
      if(path==='/api/profile/avatar'&&req.method==='POST'){
        const user=auth(req);limit('avatar:'+user.uid,12);const input=await body(req),value=avatarData(input.avatar);
        db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET avatar=excluded.avatar,version=excluded.version').run(user.uid,input.avatar,value.version);
        broadcast({type:'avatar-changed',uid:user.uid,avatarVersion:value.version});presence();return send(res,200,{version:value.version});
      }
      if(path.startsWith('/api/avatars/')&&req.method==='GET'){
        const uid=decodeURIComponent(path.slice(13));if(!/^\w{1,64}$/.test(uid))throw Error('角色标识无效');
        const profile=db.prepare('SELECT avatar,version FROM profiles WHERE uid=?').get(uid);if(!profile?.avatar)return send(res,404,{error:'尚未设置头像'});
        res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff','ETag':'"'+profile.version+'"'});res.end(Buffer.from(profile.avatar.slice(22),'base64'));return;
      }
      if(path==='/health')return send(res,200,{ok:true,version:VERSION,service:'hxz-community'});
      if(path==='/api/config')return send(res,200,{groups:GROUPS,skinSite:'https://skin.hxzmc.top/user',roomLimit,version:VERSION,voiceTransport:'ws-opus-v1',features:['blueprints','forum']});
      if(path==='/api/session'&&req.method==='POST'){limit('login:'+clientIP(req),12);return send(res,200,await exchange(await body(req)));}
      if(path==='/api/notices'&&req.method==='GET')return send(res,200,db.prepare('SELECT id,group_id AS groupId,title,body,author,updated FROM notices ORDER BY updated DESC LIMIT 100').all());
      if(path==='/api/notices'&&req.method==='POST') {
        const user=admin(req),input=await body(req);if(!GROUPS.some(g=>g.id===input.groupId))throw Error('未知公告分组');
        const id=randomUUID();db.prepare('INSERT INTO notices VALUES(?,?,?,?,?,?)').run(id,input.groupId,text(input.title,100),text(input.body,12000),user.name,Date.now());
        broadcast({type:'notices-changed'});return send(res,201,{id});
      }
      if(path.startsWith('/api/notices/')&&req.method==='DELETE'){admin(req);db.prepare('DELETE FROM notices WHERE id=?').run(path.split('/').pop());broadcast({type:'notices-changed'});return send(res,200,{ok:true});}
      if(path==='/api/moderation'&&req.method==='POST') {admin(req);const input=await body(req);if(typeof input.uid!=='string')throw Error('无效角色');
        if(input.banned)db.prepare('INSERT OR IGNORE INTO banned VALUES(?)').run(input.uid);else db.prepare('DELETE FROM banned WHERE uid=?').run(input.uid);
        for(const [ws,c] of clients)if(c.user.uid===input.uid&&input.banned)ws.close(1008,'账号已禁用');return send(res,200,{ok:true});}
      if(path==='/api/voice-config') {auth(req);return send(res,200,{transport:'ws-opus-v1',roomLimit,codec:'opus',sampleRate:48000});}
      send(res,404,{error:'接口不存在'});
    }catch(error){if(!res.headersSent&&!res.destroyed)send(res,error.status||400,{error:error.message||'请求失败'});}
  });
  server.requestTimeout=30000;server.headersTimeout=15000;server.maxConnections=1000;
  const wss=new WebSocketServer({noServer:true,maxPayload:32768,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/ws'||(req.headers.origin&&!origins.has(req.headers.origin))){socket.destroy();return;}
    try{limit('ws:'+clientIP(req),30);if(wss.clients.size>=500)throw Error('服务已满');wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));}catch{socket.destroy();}
  });
  wss.on('connection',ws=>{
    const timer=setTimeout(()=>ws.close(1008,'请登录'),5000);ws.alive=true;ws.on('pong',()=>{ws.alive=true;});
    ws.on('message',(raw,isBinary)=>{try{
      if(isBinary){relayVoice(ws,raw,clients);return;}
      const message=JSON.parse(raw.toString());let c=clients.get(ws);
      if(!c){if(message.type!=='auth')throw Error('请先登录');const user=verify(message.token);content.recordMember(user);if([...clients.values()].filter(x=>x.user.uid===user.uid).length>=2)throw Error('此账号已打开过多连接');
        c={id:randomUUID(),user,room:null,muted:false,token:message.token};clients.set(ws,c);clearTimeout(timer);packet(ws,{type:'ready',heartbeatInterval:15000,voiceTransport:'ws-opus-v1',roomLimit,id:c.id,user:{...user,avatarVersion:avatarVersion(user.uid),admin:adminIDs.has(user.uid)},messages:history('lobby')});presence();return;}
      verify(c.token);limit('client:'+c.id,120,10000);
      if(message.type==='ping'){ws.alive=true;packet(ws,{type:'pong'});}
      else if(message.type==='chat'){limit('chat:'+c.user.uid,8,10000);const value=text(message.body,1000);const created=Date.now();const inserted=db.prepare('INSERT INTO messages(channel,uid,name,body,created) VALUES(?,?,?,?,?)').run('lobby',c.user.uid,c.user.name,value,created);
        db.prepare('DELETE FROM messages WHERE id < (SELECT MAX(id)-3000 FROM messages)').run();broadcast({type:'chat',message:{id:Number(inserted.lastInsertRowid),channel:'lobby',uid:c.user.uid,name:c.user.name,avatarVersion:avatarVersion(c.user.uid),body:value,created}});}
      else if(message.type==='voice-join'){if(!ROOMS.includes(message.room))throw Error('房间不存在');if([...clients.values()].filter(p=>p.room===message.room&&p.id!==c.id).length>=roomLimit)throw Error('语音房间已满');if(message.transport!=='ws-opus-v1')throw Error('请更新启动器到 0.4.0 后使用语音');c.voiceTransport=message.transport;c.muted=false;c.deafened=false;c.audioEpoch=null;c.audioSeq=-1;c.room=message.room;presence();}
      else if(message.type==='voice-leave'){c.room=null;c.muted=false;c.deafened=false;presence();}
      else if(message.type==='voice-mute'){c.muted=!!message.muted;presence();}
      else if(message.type==='voice-deafen'){c.deafened=!!message.deafened;}
      else if(message.type==='signal'){const peer=[...clients.entries()].find(([,p])=>p.id===message.to);if(!peer||!c.room||peer[1].room!==c.room)throw Error('语音目标不在同一房间');packet(peer[0],{type:'signal',from:c.id,data:message.data});}
      else throw Error('未知消息');
    }catch(error){packet(ws,{type:'error',error:error.message});}});
    ws.on('error',()=>{});ws.on('close',()=>{clearTimeout(timer);clients.delete(ws);presence();});
  });
  const sweep=setInterval(()=>{for(const [id,v] of attempts)if(Date.now()-v.time>60000)attempts.delete(id);for(const ws of wss.clients){const c=clients.get(ws);if(c&&c.user.exp<Date.now()){ws.close(1008,'登录已过期');continue;}if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);sweep.unref();
  return {server,db,async close(){clearInterval(sweep);for(const ws of wss.clients)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));db.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const service=createCommunity();const port=Number(process.env.PORT||8787),host=process.env.HOST||'127.0.0.1';service.server.listen(port,host,()=>console.log(`幻想镇社区服务 http://${host}:${port}\n网页管理：http://127.0.0.1:${port}/admin/\n初始密码见数据目录的 初始管理员密码.txt`));for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>service.close().then(()=>process.exit()));}
