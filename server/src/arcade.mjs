import {randomUUID,randomBytes} from 'node:crypto';
import {BOARD_GAMES} from '../shared/board-games.mjs';
import {GAMES,MAX_TICKS,replay} from '../shared/arcade-engine.mjs';
export function createArcade({db,auth,admin,body,send,limit,broadcast,points}){
  db.exec('CREATE TABLE IF NOT EXISTS arcade_scores(game TEXT NOT NULL,uid TEXT NOT NULL,name TEXT NOT NULL,score INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(game,uid)); CREATE INDEX IF NOT EXISTS arcade_ranking ON arcade_scores(game,score DESC,updated);');
  const runs=new Map();
  const board=game=>db.prepare('SELECT uid,name,score,updated FROM arcade_scores WHERE game=? ORDER BY score DESC,updated ASC LIMIT 10').all(game);
  return async(req,res,url)=>{
    if(!url.pathname.startsWith('/api/arcade/')&&!url.pathname.startsWith('/api/admin/arcade/'))return false;
    const parts=url.pathname.split('/'),game=parts[3]==='arcade'?parts[4]:parts[3];
    if(![...GAMES,...BOARD_GAMES].some(g=>g.id===game))throw Error('小游戏不存在');
    if(url.pathname.startsWith('/api/admin/')){admin(req);if(req.method!=='DELETE')throw Error('不支持的操作');const input=await body(req);if(typeof input.uid!=='string')throw Error('请选择玩家');db.prepare('DELETE FROM arcade_scores WHERE game=? AND uid=?').run(game,input.uid);db.prepare('DELETE FROM game_weekly WHERE game=? AND uid=?').run(game,input.uid);broadcast({type:'arcade-ranking',game});send(res,200,{ok:true});return true;}
    if(req.method==='GET'){let user;try{user=auth(req);}catch{}send(res,200,points?points.gameBoard(game,user):{items:board(game)});return true;}
    if(BOARD_GAMES.some(g=>g.id===game))throw Error('请通过棋桌进行对局');
    const user=auth(req);if(user.consoleAdmin)throw Error('请使用玩家角色参与');
    if(req.method!=='POST')throw Error('不支持的操作');
    limit('arcade:'+user.uid,20);
    const input=await body(req,768*1024);
    if(url.pathname.endsWith('/start')){
      const now=Date.now();for(const [id,r] of runs)if(now-r.started>20*60000||r.uid===user.uid)runs.delete(id);
      if(runs.size>=5000)throw Error('游戏服务繁忙');
      const id=randomUUID(),seed=randomBytes(4).readUInt32LE();runs.set(id,{uid:user.uid,game,seed,started:now});send(res,200,{id,seed,maxTicks:MAX_TICKS});
    }else if(url.pathname.endsWith('/finish')){
      limit('arcade-submit:'+user.uid,6);
      const run=runs.get(input.id);if(!run||run.uid!==user.uid||run.game!==game)throw Error('本局已过期，请重新开始');
      if(run.result){send(res,200,{score:run.result.score,...(points?points.gameBoard(game,user):{items:board(game)})});return true;}
      if(Date.now()-run.started>20*60000||input.ticks/30*1000>Date.now()-run.started+2500)throw Error('游戏时长无效');
      const result=replay(game,run.seed,input.ticks,input.inputs);points?.recordScore(game,user,result.score);run.result={score:result.score};
      db.prepare('INSERT INTO arcade_scores VALUES(?,?,?,?,?) ON CONFLICT(game,uid) DO UPDATE SET name=excluded.name,score=excluded.score,updated=excluded.updated WHERE excluded.score>arcade_scores.score').run(game,user.uid,user.name,result.score,Date.now());
      broadcast({type:'arcade-ranking',game});send(res,200,{score:result.score,...(points?points.gameBoard(game,user):{items:board(game)})});
    }else throw Error('游戏接口不存在');
    return true;
  };
}
