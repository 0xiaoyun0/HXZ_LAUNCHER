import {randomBytes} from 'node:crypto';
import {createBoard,playMove} from '../shared/board-games.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
// Only server-accepted moves are archived. Practice positions never award points.
export function createBoardWorkshop({db,auth,admin,body,send,limit,now}){
 db.exec(`CREATE TABLE IF NOT EXISTS board_move_history(match TEXT PRIMARY KEY,moves TEXT NOT NULL,complete INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS board_public_replays(code TEXT PRIMARY KEY,match TEXT UNIQUE NOT NULL,owner TEXT NOT NULL,title TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS board_practice_matches(match TEXT PRIMARY KEY,code TEXT NOT NULL,ply INTEGER NOT NULL);`);
 const practice=id=>!!db.prepare('SELECT 1 FROM board_practice_matches WHERE match=?').get(id);
 function begin(id){db.prepare('INSERT INTO board_move_history VALUES(?,?,1)').run(id,'[]');}
 function record(match,move){
  const row=db.prepare('SELECT * FROM board_move_history WHERE match=?').get(match.id);if(!row?.complete||practice(match.id))return;
  const moves=JSON.parse(row.moves);if(moves.length>=600||match.state.ply!==moves.length+1){db.prepare('UPDATE board_move_history SET complete=0 WHERE match=?').run(match.id);return;}
  moves.push({to:move.to,...Number.isInteger(move.from)?{from:move.from}:{},...move.promotion?{promotion:move.promotion}:{}});db.prepare('UPDATE board_move_history SET moves=? WHERE match=?').run(JSON.stringify(moves),match.id);
 }
 function shared(code){
  const row=db.prepare('SELECT r.*,m.game,m.a_name,m.b_name,m.state,h.moves,h.complete FROM board_public_replays r JOIN board_matches m ON m.id=r.match JOIN board_move_history h ON h.match=r.match WHERE r.code=?').get(code);
  if(!row?.complete)fail('挑战码不存在或已被撤回',404);return {code:row.code,owner:row.owner,title:row.title,game:row.game,players:[row.a_name,row.b_name],moves:JSON.parse(row.moves),result:JSON.parse(row.state).winner,created:row.created};
 }
 function position(code,ply,game){const v=shared(code);if(v.game!==game||!Number.isInteger(ply)||ply<0||ply>v.moves.length)fail('请选择这份棋谱中的有效局面');let state=createBoard(game);for(const move of v.moves.slice(0,ply))state=playMove(state,move);if(state.winner)fail('这个局面已结束，请选前一步');return state;}
 async function route(req,res,url){
  if(url.pathname!=='/api/board-workshop'&&!url.pathname.startsWith('/api/board-workshop/'))return false;
  const user=auth(req);limit('board-workshop:'+user.uid,60);const parts=url.pathname.split('/'),code=parts[3];
  if(req.method==='GET'&&!code){const offset=Math.min(10000,Math.max(0,Number(url.searchParams.get('offset'))||0));const items=db.prepare('SELECT r.code,r.title,r.created,m.game,m.a_name,m.b_name FROM board_public_replays r JOIN board_matches m ON m.id=r.match ORDER BY r.created DESC LIMIT 20 OFFSET ?').all(offset);
   const mine=db.prepare('SELECT m.id,m.game,m.a_name,m.b_name,m.updated FROM board_matches m JOIN board_move_history h ON h.match=m.id WHERE m.finished=1 AND (m.a=? OR m.b=?) AND h.complete=1 AND NOT EXISTS(SELECT 1 FROM board_practice_matches p WHERE p.match=m.id) ORDER BY m.updated DESC LIMIT 30').all(user.uid,user.uid);
   send(res,200,{items,mine});return true;
  }
  if(code&&!/^[a-zA-Z0-9_-]{12}$/.test(code))fail('挑战码格式不正确');
  if(req.method==='GET'&&code){const v=shared(code);send(res,200,{...v,editable:v.owner===user.uid});return true;}
  if(req.method==='POST'&&!code){limit('board-replay-share:'+user.uid,6);const input=await body(req),m=db.prepare('SELECT * FROM board_matches WHERE id=?').get(String(input.match||''));if(!m||!m.finished||![m.a,m.b].includes(user.uid)||practice(m.id))fail('只能分享自己已结束的正常对局',403);
   const h=db.prepare('SELECT * FROM board_move_history WHERE match=?').get(m.id);if(!h?.complete||!JSON.parse(h.moves).length)fail('这局没有完整棋谱，旧版或超过 600 步的对局无法回放');
   const existing=db.prepare('SELECT code FROM board_public_replays WHERE match=?').get(m.id);if(existing){send(res,200,shared(existing.code));return true;}
   if(db.prepare('SELECT COUNT(*) n FROM board_public_replays WHERE owner=?').get(user.uid).n>=100)fail('最多公开 100 份棋谱，请先撤回旧分享');
   const title=String(input.title||'').trim();if(!title||title.length>80)fail('棋谱标题限 1–80 字');const code=randomBytes(9).toString('base64url');db.prepare('INSERT INTO board_public_replays VALUES(?,?,?,?,?)').run(code,m.id,user.uid,title,now());send(res,200,shared(code));return true;
  }
  if(req.method==='DELETE'&&code){const v=shared(code);if(v.owner!==user.uid)admin(req);db.prepare('DELETE FROM board_public_replays WHERE code=?').run(code);send(res,200,{ok:true});return true;}
  fail('棋局工坊接口不存在',404);
 }
 return {begin,record,practice,position,route,mark:(id,code,ply)=>db.prepare('INSERT INTO board_practice_matches VALUES(?,?,?)').run(id,code,ply)};
}
