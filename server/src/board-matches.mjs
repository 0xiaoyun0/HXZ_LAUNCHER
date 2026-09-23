import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { BOARD_GAMES,createBoard,legalMoves,playMove } from '../shared/board-games.mjs';

export function createBoardMatches({db,auth,body,send,limit,points,now=()=>Date.now()}) {
  db.exec('CREATE TABLE IF NOT EXISTS board_matches(id TEXT PRIMARY KEY,game TEXT,a TEXT,b TEXT,a_name TEXT,b_name TEXT,mode TEXT,level INTEGER,state TEXT,updated INTEGER,created INTEGER,finished INTEGER DEFAULT 0); CREATE INDEX IF NOT EXISTS board_matches_active ON board_matches(finished,updated);');
  const busy=new Set(),workers=new Set();let closed=false;
  function read(id){const row=db.prepare('SELECT * FROM board_matches WHERE id=?').get(id);if(!row)throw Error('对局不存在');return {...row,state:JSON.parse(row.state)};}
  function finish(match){
    if(!match.state.winner||match.finished)return;
    const winner=match.state.winner,who=winner==='a'?match.a:match.b,name=winner==='a'?match.a_name:match.b_name;
    // Both score recording and settlement are idempotent; mark the match after awarding.
    if(winner!=='draw'&&who&&who!=='@bot'){
      if(match.mode==='online')points.win({uid:who,name},match.id);
      else if(winner==='a')points.recordScore(match.game,{uid:who,name},match.level*10000+Math.max(1,600-match.state.ply));
    }
    match.finished=1;db.prepare('UPDATE board_matches SET finished=1 WHERE id=?').run(match.id);
  }
  function save(match){db.prepare('UPDATE board_matches SET b=?,b_name=?,state=?,updated=? WHERE id=?').run(match.b,match.b_name,JSON.stringify(match.state),match.updated,match.id);finish(match);}
  function expire(match){if(match.finished)return;if(match.state.winner){finish(match);return;}
    if(match.b&&now()-match.updated>5*60000){match.state.winner=match.state.turn==='a'?'b':'a';save(match);}
    else if(!match.b&&now()-match.created>30*60000){match.state.winner='draw';save(match);}
  }
  function view(match,user){expire(match);return {id:match.id,game:match.game,mode:match.mode,level:match.level,a:{uid:match.a,name:match.a_name},b:match.b?{uid:match.b,name:match.b_name}:null,
    side:match.a===user.uid?'a':match.b===user.uid?'b':'',state:{...match.state,positions:undefined},legal:!match.state.winner&&match.b?legalMoves(match.state):[],updated:match.updated,deadline:match.updated+5*60000,thinking:busy.has(match.id)};}
  async function computer(match){
    if(closed||match.mode!=='bot'||match.state.winner||match.state.turn!=='b'||busy.has(match.id))return;
    if(workers.size>=4)throw Error('机器人正在思考，请稍后刷新对局');
    busy.add(match.id);const ply=match.state.ply;
    try{
      const move=await new Promise((resolve,reject)=>{
        const worker=new Worker(new URL('./board-worker.mjs',import.meta.url),{workerData:{state:match.state,level:match.level},resourceLimits:{maxOldGenerationSizeMb:96}});workers.add(worker);
        const timer=setTimeout(()=>{void worker.terminate();reject(Error('机器人思考超时，请重试'));},10000);
        worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{clearTimeout(timer);workers.delete(worker);if(code)reject(Error('机器人暂时不可用，请重试'));});
      });
      if(closed)return;const current=read(match.id);
      if(current.state.ply===ply&&!current.finished){current.state=playMove(current.state,move);current.updated=now();save(current);}
    }finally{busy.delete(match.id);}
  }
  async function route(req,res,url){
    if(!url.pathname.startsWith('/api/boards'))return false;
    const user=auth(req);if(user.consoleAdmin)throw Error('请使用玩家角色参与');limit('boards:'+user.uid,100);
    const id=url.pathname.split('/')[3];
    if(req.method==='GET'){
      if(!id){
        for(const r of db.prepare('SELECT id FROM board_matches WHERE finished=0 AND updated<?').all(now()-5*60000))expire(read(r.id));
        const items=db.prepare("SELECT id FROM board_matches WHERE finished=0 AND (a=? OR b=? OR (mode='online' AND b='')) ORDER BY created DESC LIMIT 40").all(user.uid,user.uid).map(r=>view(read(r.id),user));
        send(res,200,{items});
      }else{let m=read(id);if(m.mode==='bot'&&m.a!==user.uid)throw Error('此练习属于其他玩家');expire(m);await computer(m);send(res,200,view(read(id),user));}
      return true;
    }
    if(req.method!=='POST')throw Error('不支持的对局操作');const input=await body(req);
    if(!id){
      limit('board-create:'+user.uid,6);
      if(!BOARD_GAMES.some(g=>g.id===input.game)||!['online','bot'].includes(input.mode)||!Number.isInteger(input.level)||input.level<1||input.level>5)throw Error('请选择游戏、模式和难度');
      const previous=db.prepare('SELECT id FROM board_matches WHERE finished=0 AND (a=? OR b=?)').all(user.uid,user.uid);for(const m of previous)expire(read(m.id));
      if(db.prepare('SELECT COUNT(*) AS n FROM board_matches WHERE finished=0 AND (a=? OR b=?)').get(user.uid,user.uid).n>=2)throw Error('请先完成或退出已有对局');
      const id=randomUUID();db.prepare('INSERT INTO board_matches VALUES(?,?,?,?,?,?,?,?,?,?,?,0)').run(id,input.game,user.uid,input.mode==='bot'?'@bot':'',user.name,input.mode==='bot'?'机器人':'',input.mode,input.level,JSON.stringify(createBoard(input.game)),now(),now());send(res,201,view(read(id),user));return true;
    }
    let match=read(id);expire(match);
    if(match.finished)throw Error('本局已结束');
    if(input.action==='join'){
      if(match.mode!=='online'||match.b||match.a===user.uid)throw Error('无法加入此对局');
      match.b=user.uid;match.b_name=user.name;match.updated=now();save(match);
    }else{
      const side=match.a===user.uid?'a':match.b===user.uid?'b':'';if(!side)throw Error('你不是此对局的玩家');
      if(input.action==='resign') {match.state.winner=!match.b?'draw':side==='a'?'b':'a';save(match);}
      else if(input.action==='move'){
        if(!match.b||match.state.turn!==side||input.ply!==match.state.ply||busy.has(id))throw Error('对局已变化，请刷新后操作');
        if(!input.move||!Number.isInteger(input.move.to)||(match.game!=='gomoku'&&!Number.isInteger(input.move.from)))throw Error('落子位置无效');
        match.state=playMove(match.state,input.move);match.updated=now();save(match);await computer(match);
      }else throw Error('对局操作无效');
    }
    send(res,200,view(read(id),user));return true;
  }
  return {route,close:async()=>{closed=true;await Promise.all([...workers].map(w=>w.terminate()));}};
}
