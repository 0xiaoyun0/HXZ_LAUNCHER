import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
const servers=['survival','mod-1','mod-2'];
const digest=v=>createHash('sha256').update(v).digest('hex');
export function createGameTelemetry({db,auth,admin,body,send,limit}){
  db.exec(`CREATE TABLE IF NOT EXISTS game_bridges(server TEXT PRIMARY KEY,token_hash TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS game_stats(server TEXT NOT NULL,uid TEXT NOT NULL,metric TEXT NOT NULL,value REAL NOT NULL,observed INTEGER NOT NULL,PRIMARY KEY(server,uid,metric));
  CREATE TABLE IF NOT EXISTS game_stat_events(server TEXT NOT NULL,id TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(server,id));`);
  function authorize(req){
    const token=String(req.headers.authorization||'').replace(/^Bearer /,''),server=String(req.headers['x-hxz-server']||'');
    const config=db.prepare('SELECT * FROM game_bridges WHERE server=?').get(server),hash=digest(token);
    if(!config?.enabled||token.length!==64||!timingSafeEqual(Buffer.from(config.token_hash,'hex'),Buffer.from(hash,'hex')))throw Object.assign(Error('游戏数据通道未授权'),{status:403});
    return server;
  }
  async function route(req,res,url){
    const p=url.pathname;if(!p.startsWith('/api/game-stats')&&!p.startsWith('/api/admin/game-bridges'))return false;
    if(p==='/api/game-stats/report'&&req.method==='POST'){
      const server=authorize(req);
      limit('game-report:'+server,120);const input=await body(req,1000000);
      if(!/^[\w-]{16,100}$/.test(input.id||'')||!Array.isArray(input.players)||input.players.length>100)throw Error('游戏数据格式无效');
      const observed=Number(input.observed);if(!Number.isSafeInteger(observed)||Math.abs(Date.now()-observed)>10*60000)throw Error('服务器时间相差超过十分钟，请校准时间');
      const rows=[];
      for(const player of input.players){const uid=String(player.uid||'').replaceAll('-','');if(!/^[a-f0-9]{32}$/i.test(uid))throw Error('玩家 UUID 无效');
        const entries=Object.entries(player.stats||{});if(entries.length>500)throw Error('每名玩家最多上报 500 项统计');
        for(const [metric,value]of entries){if(!/^[a-z0-9_:./-]{1,160}$/.test(metric)||!Number.isSafeInteger(value)||value<0)throw Error('统计项无效');rows.push([server,uid.toLowerCase(),metric,value,observed]);}}
      db.exec('BEGIN IMMEDIATE');try{
        if(db.prepare('INSERT OR IGNORE INTO game_stat_events VALUES(?,?,?)').run(server,input.id,Date.now()).changes){
          const write=db.prepare('INSERT INTO game_stats VALUES(?,?,?,?,?) ON CONFLICT(server,uid,metric) DO UPDATE SET value=excluded.value,observed=excluded.observed WHERE excluded.observed>game_stats.observed');for(const row of rows)write.run(...row);
        }
        db.prepare('DELETE FROM game_stat_events WHERE created<?').run(Date.now()-86400000*7);db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
      send(res,200,{ok:true,received:rows.length});return true;
    }
    if(p==='/api/game-stats'&&req.method==='GET'){const user=auth(req),query=db.prepare("SELECT server,metric,value,observed FROM game_stats WHERE uid=? AND server=? ORDER BY (metric LIKE 'minecraft:custom/%') DESC,metric LIMIT 500");send(res,200,{items:servers.flatMap(server=>query.all(user.uid.replaceAll('-','').toLowerCase(),server))});return true;}
    const user=admin(req);
    if(p==='/api/admin/game-bridges'&&req.method==='GET'){send(res,200,{items:servers.map(server=>({...db.prepare('SELECT server,enabled,updated FROM game_bridges WHERE server=?').get(server),server,latest:db.prepare('SELECT MAX(observed) AS time FROM game_stats WHERE server=?').get(server)?.time||null}))});return true;}
    if(p==='/api/admin/game-bridges'&&req.method==='POST'){limit('bridge-admin:'+user.uid,10);const input=await body(req);if(!servers.includes(input.server))throw Error('请选择默认服务器');
      if(input.rotate===true){const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO game_bridges VALUES(?,?,1,?) ON CONFLICT(server) DO UPDATE SET token_hash=excluded.token_hash,enabled=1,updated=excluded.updated').run(input.server,digest(token),Date.now());send(res,200,{server:input.server,token});}
      else {db.prepare('UPDATE game_bridges SET enabled=?,updated=? WHERE server=?').run(input.enabled===true?1:0,Date.now(),input.server);send(res,200,{ok:true});}return true;
    }
    send(res,404,{error:'游戏统计接口不存在'});return true;
  }
  const reached=(uid,t)=>Number(db.prepare('SELECT value FROM game_stats WHERE server=? AND uid=? AND metric=?').get(t.server,uid.replaceAll('-','').toLowerCase(),t.metric)?.value||0)>=t.value;
  return {route,reached,authorize};
}
