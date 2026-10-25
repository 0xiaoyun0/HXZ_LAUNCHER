import {dialRoom,publicAddress,portNumber,parseInvitation,validFingerprint} from './direct-wire.mjs';

export function createDirectLobby({db,auth,admin,adminIDs,body,send,limit,inventory}){
 const rooms=new Map();
 db.exec(`CREATE TABLE IF NOT EXISTS direct_lobby_hosts(uid TEXT PRIMARY KEY,granted_by TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS direct_lobby_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,target TEXT NOT NULL,action TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS direct_lobby_settings(id INTEGER PRIMARY KEY CHECK(id=1),open_for_all INTEGER NOT NULL DEFAULT 0,max_rooms INTEGER NOT NULL DEFAULT 100,max_connections INTEGER NOT NULL DEFAULT 32,probe_timeout_ms INTEGER NOT NULL DEFAULT 4500,signal_timeout_ms INTEGER NOT NULL DEFAULT 40000,updated INTEGER NOT NULL,actor TEXT NOT NULL);`);
 db.prepare("INSERT OR IGNORE INTO direct_lobby_settings VALUES(1,0,100,32,4500,40000,?,'system')").run(Date.now());
 const settings=()=>{const row=db.prepare('SELECT * FROM direct_lobby_settings WHERE id=1').get()||{};return {openForAll:!!row.open_for_all,maxRooms:Math.max(10,Math.min(1000,Number(row.max_rooms)||100)),maxConnections:Math.max(1,Math.min(64,Number(row.max_connections)||32)),probeTimeoutMs:Math.max(1500,Math.min(10000,Number(row.probe_timeout_ms)||4500)),signalTimeoutMs:Math.max(10000,Math.min(60000,Number(row.signal_timeout_ms)||40000)),updated:Number(row.updated)||0};};
 const managerFor=user=>!!user?.consoleAdmin||!!adminIDs?.has(user?.uid);
 const canHost=user=>{const cfg=settings();return !!user&&(managerFor(user)||cfg.openForAll||!!db.prepare('SELECT 1 FROM direct_lobby_hosts WHERE uid=?').get(user.uid)||!!inventory?.has(user.uid,'lobby.host'));};
 const access=req=>{const user=auth(req),cfg=settings(),manager=managerFor(user),permanent=manager||!!db.prepare('SELECT 1 FROM direct_lobby_hosts WHERE uid=?').get(user.uid);return {user,manager,permanent,globalOpen:cfg.openForAll,canHost:canHost(user),settings:cfg,cfg};};
 const route=async(req,res,url)=>{
  const p=url.pathname;if(!p.startsWith('/api/lobby/')&&!p.startsWith('/api/admin/lobby/'))return false;
  const {user,manager,permanent,globalOpen,canHost,cfg}=access(req);limit('lobby:'+user.uid,30);
  if(p==='/api/lobby/access'&&req.method==='GET'){send(res,200,{version:1,uid:user.uid,name:user.name,admin:manager,canHost,globalOpen,settings:{maxRooms:cfg.maxRooms,maxConnections:cfg.maxConnections,probeTimeoutMs:cfg.probeTimeoutMs,signalTimeoutMs:cfg.signalTimeoutMs},expiresAt:permanent||globalOpen?null:inventory?.expires(user.uid,'lobby.host')||0});return true;}
  if(p==='/api/lobby/rooms'&&req.method==='GET'){
   for(const [id,room] of rooms)if(room.seen<Date.now()-90000||room.permissionExpires&&room.permissionExpires<=Date.now())rooms.delete(id);
   send(res,200,{items:[...rooms.values()].map(({seen,...room})=>room).sort((a,b)=>Number(b.ready)-Number(a.ready)||b.created-a.created).slice(0,cfg.maxRooms)});return true;
  }
  if(p==='/api/lobby/rooms'&&req.method==='DELETE'){
   const input=await body(req);if(rooms.get(input.id)?.uid===user.uid||manager)rooms.delete(input.id);send(res,200,{ok:true});return true;
  }
  if(p==='/api/admin/lobby/settings'){
   admin(req);
   if(req.method==='GET'){send(res,200,{settings:settings()});return true;}
   if(req.method==='PUT'){const input=await body(req);if(typeof input.openForAll!=='boolean')throw Error('请选择是否允许全员联机');const maxRooms=Math.max(10,Math.min(1000,Number(input.maxRooms)||100)),maxConnections=Math.max(1,Math.min(64,Number(input.maxConnections)||32)),probeTimeoutMs=Math.max(1500,Math.min(10000,Number(input.probeTimeoutMs)||4500)),signalTimeoutMs=Math.max(10000,Math.min(60000,Number(input.signalTimeoutMs)||40000));db.prepare('UPDATE direct_lobby_settings SET open_for_all=?,max_rooms=?,max_connections=?,probe_timeout_ms=?,signal_timeout_ms=?,updated=?,actor=? WHERE id=1').run(input.openForAll?1:0,maxRooms,maxConnections,probeTimeoutMs,signalTimeoutMs,Date.now(),user.uid);send(res,200,{ok:true,settings:settings()});return true;}
  }
  if(p==='/api/admin/lobby/grants'){
   admin(req);
   if(req.method==='GET'){send(res,200,{items:db.prepare('SELECT h.uid,COALESCE(m.name,h.uid) AS name,h.created FROM direct_lobby_hosts h LEFT JOIN members m ON m.uid=h.uid ORDER BY h.created DESC LIMIT 500').all(),members:db.prepare('SELECT uid,name FROM members ORDER BY seen DESC LIMIT 500').all()});return true;}
   if(req.method==='POST'){
    const input=await body(req);if(typeof input.uid!=='string'||!/^[-\w]{1,64}$/.test(input.uid)||typeof input.enabled!=='boolean')throw Error('请选择有效的社区成员');
    if(input.enabled){if(!db.prepare('SELECT 1 FROM members WHERE uid=?').get(input.uid))throw Error('此角色需要先登录一次社区');db.prepare('INSERT INTO direct_lobby_hosts VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET granted_by=excluded.granted_by,created=excluded.created').run(input.uid,user.uid,Date.now());}
    else {db.prepare('DELETE FROM direct_lobby_hosts WHERE uid=?').run(input.uid);for(const [id,room] of rooms)if(room.uid===input.uid)rooms.delete(id);}
    db.prepare('INSERT INTO direct_lobby_audit(actor,target,action,created) VALUES(?,?,?,?)').run(user.uid,input.uid,input.enabled?'grant':'revoke',Date.now());send(res,200,{ok:true});return true;
   }
  }
  if(!canHost){send(res,403,{error:'开房权限未开通或已到期，可在背包使用联机开房凭证，或联系管理员'});return true;}
  if(p==='/api/lobby/rooms'&&req.method==='POST'){
   const input=await body(req,8192),value=parseInvitation(input.invite);
   if(value.expires>Date.now()+13*3600000)throw Error('房间有效期过长');
   for(const [id,room] of rooms)if(room.seen<Date.now()-90000||room.uid===user.uid&&id!==value.id)rooms.delete(id);
   if(rooms.has(value.id)&&rooms.get(value.id).uid!==user.uid)throw Error('房间不属于当前用户');
   if(rooms.size>=cfg.maxRooms&&!rooms.has(value.id))throw Error('当前房间列表已满，请使用邀请加入');
   rooms.set(value.id,{id:value.id,uid:user.uid,owner:user.name,name:value.name,invite:input.invite,ready:input.ready===true,version:String(input.version||'').slice(0,50),loader:String(input.loader||'').slice(0,30),scope:input.scope==='lan'?'lan':input.scope==='virtual'?'virtual':'internet',connections:Math.max(0,Math.min(cfg.maxConnections,Number(input.connections)||0)),created:rooms.get(value.id)?.created||Date.now(),seen:Date.now(),permissionExpires:permanent||globalOpen?0:inventory.expires(user.uid,'lobby.host')});send(res,200,{ok:true});return true;
  }
  if(p==='/api/lobby/lease'&&req.method==='POST'){send(res,200,{allowed:true,uid:user.uid,expiresAt:permanent||globalOpen?Date.now()+600000:Math.min(Date.now()+600000,inventory.expires(user.uid,'lobby.host'))});return true;}
  if(p==='/api/lobby/probe'&&req.method==='POST'){
   limit('lobby-probe:'+user.uid,8);const input=await body(req,8192);
   if(typeof input.host!=='string'||!publicAddress(input.host)||!/^[-\w]{16,80}$/.test(input.id)||!/^[-\w]{43}$/.test(input.key)||!validFingerprint(input.fingerprint))throw Error('只能检查有效的公网直连地址');
   portNumber(input.port);const start=Date.now();
   try{const {socket,info}=await dialRoom(input,input.host,'probe',cfg.probeTimeoutMs);socket.destroy();send(res,200,{reachable:true,latency:Date.now()-start,room:info.name});}
   catch{send(res,200,{reachable:false,reason:'公网探测无法到达房主。请检查 IPv6 入站防火墙、路由器自动映射或运营商 NAT。'});}return true;
  }
  send(res,404,{error:'未知联机权限接口'});return true;
 };
 route.canHost=canHost;route.settings=settings;
 return route;
}
