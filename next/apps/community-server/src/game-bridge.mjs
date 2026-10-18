import {randomUUID} from 'node:crypto';
import {fail,string,integer,choice} from './hub/common.mjs';

const SERVERS=['survival','mod-1','mod-2'];
const CAPABILITIES=['status','statistics','chat','whitelist','recipes','machines'];
const uid=value=>{const id=String(value||'').replaceAll('-','').toLowerCase();if(!/^[a-f0-9]{32}$/.test(id))fail('游戏 UUID 无效');return id;};
const name=value=>{if(typeof value!=='string'||!/^\w{1,16}$/.test(value))fail('游戏角色名无效');return value;};
const resource=value=>{if(typeof value!=='string'||!/^[a-z0-9_.-]+:[a-z0-9_/.-]{1,180}$/.test(value))fail('资源标识无效');return value;};

// Only typed actions cross this boundary. It deliberately has no console-command API.
export function createGameBridge({db,auth,admin,body,send,limit,gameTelemetry,inbox,broadcast}){
 db.exec(`
  CREATE TABLE IF NOT EXISTS game_bridge_state(server TEXT PRIMARY KEY,value TEXT NOT NULL,observed INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS game_bridge_access(server TEXT PRIMARY KEY,chat INTEGER NOT NULL DEFAULT 0,whitelist INTEGER NOT NULL DEFAULT 0,updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS game_bridge_actions(id TEXT PRIMARY KEY,server TEXT NOT NULL,kind TEXT NOT NULL,value TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL,updated INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS game_bridge_actions_pending ON game_bridge_actions(server,status,created);
  CREATE TABLE IF NOT EXISTS game_bridge_chat(id TEXT PRIMARY KEY,server TEXT NOT NULL,uid TEXT NOT NULL,name TEXT NOT NULL,body TEXT NOT NULL,origin TEXT NOT NULL,created INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS game_bridge_chat_server ON game_bridge_chat(server,created DESC);
  CREATE TABLE IF NOT EXISTS game_bridge_watch(server TEXT NOT NULL,uid TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(server,uid));
  CREATE TABLE IF NOT EXISTS game_bridge_recipes(server TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,observed INTEGER NOT NULL,PRIMARY KEY(server,id));
  CREATE TABLE IF NOT EXISTS game_bridge_machines(server TEXT NOT NULL,uid TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,observed INTEGER NOT NULL,PRIMARY KEY(server,uid,id));
 `);
 const access=server=>db.prepare('SELECT * FROM game_bridge_access WHERE server=?').get(server)||{server,chat:0,whitelist:0};
 const state=server=>{const row=db.prepare('SELECT * FROM game_bridge_state WHERE server=?').get(server);return {server,...row?JSON.parse(row.value):{},observed:row?.observed||0,connected:!!row&&Date.now()-row.observed<90000};};
 function enqueue(server,kind,value,id=randomUUID()){
  const expires=Date.now()+(kind==='chat'?120000:86400000*7);
  if(db.prepare("SELECT COUNT(*) n FROM game_bridge_actions WHERE server=? AND status='pending' AND expires>?").get(server,Date.now()).n>=500)fail('服务器待处理操作过多，请稍后再试',429);
  db.prepare("INSERT OR IGNORE INTO game_bridge_actions VALUES(?,?,?,?,'pending','',?,?,?)").run(id,server,kind,JSON.stringify(value),Date.now(),expires,Date.now());
  return db.prepare('SELECT id,status,note FROM game_bridge_actions WHERE id=?').get(id);
 }
 function approvedWhitelist(record,actor){
  const data=JSON.parse(record.data),config=access(data.server),current=state(data.server);
  if(!config.whitelist||!current.capabilities?.includes('whitelist'))fail('该服尚未开启白名单自动同步，请先配置游戏桥',409);
  const member=db.prepare('SELECT uid,name FROM members WHERE uid=?').get(record.owner);if(!member||member.name!==data.player)fail('申请角色必须与皮肤站当前角色一致',409);
  return enqueue(data.server,'whitelist',{uid:uid(member.uid),name:name(member.name),enabled:true,record:record.id,actor:actor.uid},'whitelist-'+record.id+'-'+record.revision);
 }
 async function route(req,res,url){
  const p=url.pathname,method=req.method;
  if(p.startsWith('/api/game-bridge/')){
   const server=gameTelemetry.authorize(req);limit('game-bridge:'+server,90);
   const input=await body(req,1000000),stamp=Date.now();
   if(p==='/api/game-bridge/poll'&&method==='POST'){
    const s=input.status||{},players=s.players||[],caps=s.capabilities||[];
    if(!Array.isArray(players)||players.length>1000||!Array.isArray(caps)||caps.length>CAPABILITIES.length)fail('在线状态格式无效');
    const value={version:string(s.version,80,'游戏版本'),loader:string(s.loader,80,'加载器'),online:integer(s.online,0,100000,'在线人数'),max:integer(s.max,1,100000,'人数上限'),capabilities:[...new Set(caps.map(c=>choice(c,CAPABILITIES,'能力')))],players:players.map(v=>({uid:uid(v.uid),name:name(v.name)}))};
    db.prepare('INSERT INTO game_bridge_state VALUES(?,?,?) ON CONFLICT(server) DO UPDATE SET value=excluded.value,observed=excluded.observed').run(server,JSON.stringify(value),stamp);
    if(value.online<value.max){
     const watchers=db.prepare('SELECT uid FROM game_bridge_watch WHERE server=? LIMIT 500').all(server);
     if(watchers.length){inbox.notify({actor:{uid:'game-bridge',name:'服务器'},recipients:watchers.map(v=>v.uid),kind:'community',title:'服务器已有空位',body:server+' 当前 '+value.online+'/'+value.max+' 人，空位不代表预留名额。',target:'/community/hub?section=servers',dedupe:'vacancy:'+server+':'+stamp,includeSelf:true});db.prepare('DELETE FROM game_bridge_watch WHERE server=?').run(server);}
    }
    db.prepare("UPDATE game_bridge_actions SET status='expired',updated=? WHERE server=? AND status='pending' AND expires<=?").run(stamp,server,stamp);
    const config=access(server),actions=db.prepare("SELECT * FROM game_bridge_actions WHERE server=? AND status='pending' AND expires>? ORDER BY created,id LIMIT 20").all(server,stamp).filter(v=>config[v.kind]&&value.capabilities.includes(v.kind)).map(v=>({id:v.id,kind:v.kind,value:JSON.parse(v.value),expires:v.expires}));
    send(res,200,{actions,access:{chat:!!config.chat,whitelist:!!config.whitelist},time:stamp});return true;
   }
   if(p==='/api/game-bridge/ack'&&method==='POST'){
    const action=db.prepare('SELECT * FROM game_bridge_actions WHERE server=? AND id=?').get(server,string(input.id,100,'操作标识'));if(!action)fail('操作不存在',404);
    const status=choice(input.status,['done','failed'],'操作结果');
    if(action.status==='pending'){
     db.prepare('UPDATE game_bridge_actions SET status=?,note=?,updated=? WHERE id=?').run(status,string(input.note||'',500,'处理说明',true),stamp,action.id);
     if(action.kind==='whitelist'){const v=JSON.parse(action.value);inbox.notify({actor:{uid:'game-bridge',name:'服务器'},recipients:[v.uid],kind:'community',title:status==='done'?'白名单已同步到游戏服':'白名单同步未完成',body:status==='done'?'可以从对应服务器实例进入游戏。':(input.note||'请联系管理员检查游戏桥'),target:'/community/hub?section=whitelist&item='+v.record,dedupe:'bridge-ack:'+action.id,includeSelf:true});}
    }
    send(res,200,{ok:true});return true;
   }
   if(p==='/api/game-bridge/chat'&&method==='POST'){
    if(!access(server).chat)fail('该服未开启社区聊天桥',403);
    const id=string(input.id,100,'消息标识');if(!/^[\w-]{16,100}$/.test(id))fail('消息标识无效');
    const v={id,uid:uid(input.uid),name:name(input.name),body:string(input.body,500,'消息')};
    const inserted=db.prepare('INSERT OR IGNORE INTO game_bridge_chat VALUES(?,?,?,?,?,?,?)').run(v.id,server,v.uid,v.name,v.body,'game',stamp).changes;
    if(inserted)broadcast({type:'game-chat',server,message:{...v,origin:'game',created:stamp}});
    send(res,200,{ok:true});return true;
   }
   if(p==='/api/game-bridge/recipes'&&method==='POST'){
    if(!Array.isArray(input.items)||input.items.length>100)fail('每批最多同步 100 个配方');
    const rows=input.items.map(item=>{
     if(!Array.isArray(item.ingredients)||item.ingredients.length>100)fail('配方材料无效');
     return {id:resource(item.id),type:resource(item.type),output:resource(item.output),quantity:integer(item.quantity,1,1000000,'产物数量'),ingredients:item.ingredients.map(v=>{if(!Array.isArray(v.options)||v.options.length>128)fail('材料选项无效');return {quantity:integer(v.quantity||1,1,1000000,'材料数量'),options:v.options.map(resource)};}),approximate:!!item.approximate};
    });
    db.exec('BEGIN IMMEDIATE');try{for(const row of rows)db.prepare('INSERT INTO game_bridge_recipes VALUES(?,?,?,?) ON CONFLICT(server,id) DO UPDATE SET value=excluded.value,observed=excluded.observed').run(server,row.id,JSON.stringify(row),stamp);if(db.prepare('SELECT COUNT(*) n FROM game_bridge_recipes WHERE server=?').get(server).n>100000)fail('配方数量超过上限');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    send(res,200,{ok:true,received:rows.length});return true;
   }
   if(p==='/api/game-bridge/machines'&&method==='POST'){
    if(!Array.isArray(input.items)||input.items.length>100)fail('每批最多同步 100 台授权设备');
    const rows=input.items.map(v=>({uid:uid(v.uid),id:string(v.id,100,'设备标识'),name:string(v.name,120,'设备名称'),metric:string(v.metric,80,'指标'),value:integer(v.value,0,Number.MAX_SAFE_INTEGER,'指标值'),unit:string(v.unit||'',24,'单位',true)}));
    db.exec('BEGIN IMMEDIATE');try{for(const row of rows)db.prepare('INSERT INTO game_bridge_machines VALUES(?,?,?,?,?) ON CONFLICT(server,uid,id) DO UPDATE SET value=excluded.value,observed=excluded.observed').run(server,row.uid,row.id,JSON.stringify(row),stamp);if(db.prepare('SELECT COUNT(*) n FROM game_bridge_machines WHERE server=?').get(server).n>20000)fail('设备数量超过上限');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    send(res,200,{ok:true});return true;
   }
   fail('游戏桥接口不存在',404);
  }
  if(p==='/api/admin/game-access'){
   const actor=admin(req);
   if(method==='GET'){send(res,200,{items:SERVERS.map(server=>({...access(server),...state(server)}))});return true;}
   if(method==='PUT'){const input=await body(req),server=choice(input.server,SERVERS,'服务器');db.prepare('INSERT INTO game_bridge_access VALUES(?,?,?,?) ON CONFLICT(server) DO UPDATE SET chat=excluded.chat,whitelist=excluded.whitelist,updated=excluded.updated').run(server,input.chat===true?1:0,input.whitelist===true?1:0,Date.now());send(res,200,{ok:true});return true;}
   fail('不支持此操作',405);
  }
  if(p==='/api/hub/game-servers'&&method==='GET'){auth(req);send(res,200,{items:SERVERS.map(server=>({...state(server),access:{chat:!!access(server).chat,whitelist:!!access(server).whitelist}}))});return true;}
  const match=p.match(/^\/api\/hub\/game\/(survival|mod-1|mod-2)\/(chat|watch|recipes|machines)$/);
  if(!match)return false;
  const user=auth(req),[,server,action]=match,current=state(server);
  if(action==='watch'&&method==='POST'){db.prepare('INSERT OR REPLACE INTO game_bridge_watch VALUES(?,?,?)').run(server,user.uid,Date.now());send(res,200,{ok:true});return true;}
  if(action==='watch'&&method==='DELETE'){db.prepare('DELETE FROM game_bridge_watch WHERE server=? AND uid=?').run(server,user.uid);send(res,200,{ok:true});return true;}
  if(action==='chat'){
   if(!access(server).chat)fail('管理员尚未开启此服的社区聊天桥',409);
   if(method==='GET'){send(res,200,{items:db.prepare('SELECT * FROM game_bridge_chat WHERE server=? AND created>? ORDER BY created DESC,id DESC LIMIT 100').all(server,Date.now()-30*86400000).reverse(),connected:current.connected});return true;}
   if(method==='POST'){
    limit('game-chat:'+user.uid,10);const input=await body(req),id='community-'+string(input.requestId,70,'操作编号');if(!/^[\w-]{16,100}$/.test(id))fail('操作编号无效');
    if(!current.connected||!current.capabilities?.includes('chat'))fail('游戏服暂未连接，请稍后再发',409);
    const value={uid:uid(user.uid),name:name(user.name),body:string(input.body,500,'消息')};
    const old=db.prepare('SELECT * FROM game_bridge_chat WHERE id=?').get(id);if(old&&(old.uid!==value.uid||old.body!==value.body||old.server!==server))fail('操作编号已被使用',409);
    db.exec('BEGIN IMMEDIATE');try{const result=enqueue(server,'chat',value,id);db.prepare('INSERT OR IGNORE INTO game_bridge_chat VALUES(?,?,?,?,?,?,?)').run(id,server,value.uid,value.name,value.body,'community',Date.now());db.exec('COMMIT');send(res,200,result);}catch(e){db.exec('ROLLBACK');throw e;}return true;
   }
  }
  if(action==='recipes'&&method==='GET'){const q=string(url.searchParams.get('q')||'',100,'查询',true),offset=integer(Number(url.searchParams.get('offset')||0),0,100000,'页码');send(res,200,{items:db.prepare('SELECT value,observed FROM game_bridge_recipes WHERE server=? AND (instr(id,?)>0 OR instr(value,?)>0) ORDER BY id LIMIT 30 OFFSET ?').all(server,q,q,offset).map(v=>({...JSON.parse(v.value),observed:v.observed})),connected:current.connected});return true;}
  if(action==='machines'&&method==='GET'){send(res,200,{items:db.prepare('SELECT value,observed FROM game_bridge_machines WHERE server=? AND uid=? ORDER BY observed DESC LIMIT 100').all(server,user.uid.replaceAll('-','').toLowerCase()).map(v=>({...JSON.parse(v.value),observed:v.observed})),connected:current.connected});return true;}
  fail('不支持此操作',405);
 }
 const timer=setInterval(()=>{db.prepare('DELETE FROM game_bridge_chat WHERE created<?').run(Date.now()-30*86400000);db.prepare("DELETE FROM game_bridge_actions WHERE status!='pending' AND updated<?").run(Date.now()-30*86400000);db.prepare('DELETE FROM game_bridge_watch WHERE created<?').run(Date.now()-7*86400000);},3600000);timer.unref();
 return {route,approvedWhitelist,state,close:()=>clearInterval(timer)};
}
