import {dialRoom,publicAddress,portNumber,parseInvitation,validFingerprint} from './direct-wire.mjs';

export function createDirectLobby({db,auth,admin,body,send,limit}){
 const rooms=new Map();
 db.exec(`CREATE TABLE IF NOT EXISTS direct_lobby_hosts(uid TEXT PRIMARY KEY,granted_by TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS direct_lobby_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,target TEXT NOT NULL,action TEXT NOT NULL,created INTEGER NOT NULL);`);
 const access=req=>{const user=auth(req);let manager=false;try{admin(req);manager=true;}catch{}return {user,manager,canHost:manager||!!db.prepare('SELECT 1 FROM direct_lobby_hosts WHERE uid=?').get(user.uid)};};
 return async(req,res,url)=>{
  const p=url.pathname;if(!p.startsWith('/api/lobby/')&&!p.startsWith('/api/admin/lobby/'))return false;
  const {user,manager,canHost}=access(req);limit('lobby:'+user.uid,30);
  if(p==='/api/lobby/access'&&req.method==='GET'){send(res,200,{version:1,uid:user.uid,name:user.name,admin:manager,canHost});return true;}
  if(p==='/api/lobby/rooms'&&req.method==='GET'){
   for(const [id,room] of rooms)if(room.seen<Date.now()-90000)rooms.delete(id);
   send(res,200,{items:[...rooms.values()].map(({seen,...room})=>room).sort((a,b)=>Number(b.ready)-Number(a.ready)||b.created-a.created).slice(0,100)});return true;
  }
  if(p==='/api/lobby/rooms'&&req.method==='DELETE'){
   const input=await body(req);if(rooms.get(input.id)?.uid===user.uid||manager)rooms.delete(input.id);send(res,200,{ok:true});return true;
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
  if(!canHost){send(res,403,{error:'需要社区管理员授予创建房间权限'});return true;}
  if(p==='/api/lobby/rooms'&&req.method==='POST'){
   const input=await body(req,8192),value=parseInvitation(input.invite);
   if(value.expires>Date.now()+13*3600000)throw Error('房间有效期过长');
   for(const [id,room] of rooms)if(room.seen<Date.now()-90000||room.uid===user.uid&&id!==value.id)rooms.delete(id);
   if(rooms.has(value.id)&&rooms.get(value.id).uid!==user.uid)throw Error('房间不属于当前用户');
   if(rooms.size>=100&&!rooms.has(value.id))throw Error('当前房间列表已满，请使用邀请加入');
   rooms.set(value.id,{id:value.id,uid:user.uid,owner:user.name,name:value.name,invite:input.invite,ready:input.ready===true,version:String(input.version||'').slice(0,50),loader:String(input.loader||'').slice(0,30),scope:input.scope==='lan'?'lan':'internet',connections:Math.max(0,Math.min(32,Number(input.connections)||0)),created:rooms.get(value.id)?.created||Date.now(),seen:Date.now()});send(res,200,{ok:true});return true;
  }
  if(p==='/api/lobby/lease'&&req.method==='POST'){send(res,200,{allowed:true,uid:user.uid,expiresAt:Date.now()+600000});return true;}
  if(p==='/api/lobby/probe'&&req.method==='POST'){
   limit('lobby-probe:'+user.uid,8);const input=await body(req,8192);
   if(typeof input.host!=='string'||!publicAddress(input.host)||!/^[-\w]{16,80}$/.test(input.id)||!/^[-\w]{43}$/.test(input.key)||!validFingerprint(input.fingerprint))throw Error('只能检查有效的公网直连地址');
   portNumber(input.port);const start=Date.now();
   try{const {socket,info}=await dialRoom(input,input.host,'probe',4500);socket.destroy();send(res,200,{reachable:true,latency:Date.now()-start,room:info.name});}
   catch{send(res,200,{reachable:false,reason:'公网探测无法到达房主。请检查 IPv6 入站防火墙、路由器自动映射或运营商 NAT。'});}return true;
  }
  send(res,404,{error:'未知联机权限接口'});return true;
 };
}
