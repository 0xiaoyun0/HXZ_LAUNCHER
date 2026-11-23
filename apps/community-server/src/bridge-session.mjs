import {createHash} from 'node:crypto';
export function bridgeSessions(db){
 db.exec(`CREATE TABLE IF NOT EXISTS game_bridge_transport(server TEXT PRIMARY KEY,session TEXT NOT NULL,sequence INTEGER NOT NULL,digest TEXT NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS game_bridge_retired(server TEXT NOT NULL,session TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(server,session));`);
 return (server,input,status)=>{
  if(input.protocol===undefined)return {accept:true,protocol:1};
  const fail=message=>{throw Object.assign(Error(message),{status:409});};
  if(input.protocol!==2||!/^[\w-]{16,80}$/.test(input.session||'')||!Number.isSafeInteger(input.sequence)||input.sequence<1)fail('游戏桥协议或序列无效');
  const digest=createHash('sha256').update(JSON.stringify(status)).digest('hex'),old=db.prepare('SELECT * FROM game_bridge_transport WHERE server=?').get(server);
  if(db.prepare('SELECT 1 FROM game_bridge_retired WHERE server=? AND session=?').get(server,input.session))fail('游戏桥会话已被更新的启动会话替代');
  if(old?.session===input.session){
   if(input.sequence<old.sequence||input.sequence===old.sequence&&old.digest!==digest)fail('过期或冲突的游戏桥序列');
   if(input.sequence===old.sequence)return {accept:false,protocol:2,session:input.session,sequence:input.sequence};
  }
  return {accept:true,protocol:2,session:input.session,sequence:input.sequence,commit(){
   if(old&&old.session!==input.session)db.prepare('INSERT OR IGNORE INTO game_bridge_retired VALUES(?,?,?)').run(server,old.session,Date.now());
   db.prepare('INSERT INTO game_bridge_transport VALUES(?,?,?,?,?) ON CONFLICT(server) DO UPDATE SET session=excluded.session,sequence=excluded.sequence,digest=excluded.digest,updated=excluded.updated').run(server,input.session,input.sequence,digest,Date.now());
   db.prepare('DELETE FROM game_bridge_retired WHERE created<?').run(Date.now()-30*86400000);
  }};
 };
}
