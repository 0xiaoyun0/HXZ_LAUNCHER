import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createPoints,weekOf} from '../src/points.mjs';
import {createBoard,playMove,legalMoves,botMove} from '../shared/board-games.mjs';

test('weekly settlement, multiplayer cap, arbitrary precision redemption and spending are idempotent',async t=>{
 const db=new DatabaseSync(':memory:');let time=Date.parse('2026-12-27T23:59:59+08:00');
 const user={uid:'player1',name:'测试玩家'},other={uid:'player2',name:'另一玩家'};
 const points=createPoints({db,auth:()=>user,admin:()=>({uid:'admin'}),body:async r=>r.input,send:(res,status,value)=>Object.assign(res,{status,value}),limit(){},now:()=>time});
 t.after(()=>{points.close();db.close();});
 points.recordScore('runner',user,200);points.recordScore('runner',other,100);
 assert.equal(points.win(user,'match1'),true);assert.equal(points.win(user,'match2'),false);
 assert.equal(points.weeklyBoard(weekOf(time))[0].points,'4');
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM points_annual').get().n,0,'unsettled week must not enter annual');
 time=Date.parse('2026-12-28T00:00:00+08:00');points.settle();points.settle();
 assert.equal(db.prepare('SELECT balance FROM points_wallet WHERE uid=?').get(user.uid).balance,'7');
 const amount='900719925474099312345678901234567890';let response={};
 await points.route({method:'POST',input:{amount}},response,new URL('http://localhost/api/admin/points/code'));
 const code=response.value.code;response={};
 await points.route({method:'POST',input:{code}},response,new URL('http://localhost/api/points/redeem'));
 assert.equal(response.value.balance,String(BigInt(amount)+7n));
 await assert.rejects(()=>points.route({method:'POST',input:{code}},{},new URL('http://localhost/api/points/redeem')),/已兑换/);
 const request={method:'POST',input:{id:'one-spend-operation',uid:user.uid,amount:'5',operation:'spend',reason:'兑换奖品'}};
 await points.route(request,{},new URL('http://localhost/api/admin/points/adjust'));await points.route(request,{},new URL('http://localhost/api/admin/points/adjust'));
 assert.equal(db.prepare('SELECT balance FROM points_wallet WHERE uid=?').get(user.uid).balance,String(BigInt(amount)+2n));
 assert.equal(db.prepare('SELECT points FROM points_annual WHERE uid=? AND year=2026').get(user.uid).points,'7','redemption waits for weekly settlement');
 assert.equal(points.weeklyBoard(weekOf(time))[0].points,amount,'redemption joins the current week');
 time=Date.parse('2027-01-01T00:00:00+08:00');response={};await points.route({method:'GET'},response,new URL('http://localhost/api/points/leaderboard?period=annual'));
 assert.equal(response.value.total,0);assert.equal(db.prepare('SELECT balance FROM points_wallet WHERE uid=?').get(user.uid).balance,String(BigInt(amount)+2n));
 time=Date.parse('2027-01-04T00:00:00+08:00');points.settle();points.settle();
 assert.equal(db.prepare('SELECT points FROM points_annual WHERE uid=? AND year=2027').get(user.uid).points,String(BigInt(amount)+3n));
 assert.equal(db.prepare('SELECT balance FROM points_wallet WHERE uid=?').get(user.uid).balance,String(BigInt(amount)+5n));
});

test('annual ranking is the sum of settled combined weekly game boards plus podium bonuses',t=>{
 const db=new DatabaseSync(':memory:');let time=Date.parse('2026-09-21T12:00:00+08:00');
 const a={uid:'a',name:'甲'},b={uid:'b',name:'乙'},c={uid:'c',name:'丙'};
 const points=createPoints({db,now:()=>time});t.after(()=>{points.close();db.close();});
 points.recordScore('runner',a,300);points.recordScore('runner',b,200);points.recordScore('runner',c,100);
 points.recordScore('blocks',b,500);points.recordScore('blocks',a,400);
 points.recordScore('gomoku',c,50000);points.recordScore('gomoku',a,40000);
 points.win(c,'one');points.win(c,'two');
 const week=weekOf(time);assert.deepEqual(points.weeklyBoard(week).map(p=>[p.uid,p.points]),[['a','7'],['b','5'],['c','5']]);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM points_annual').get().n,0);
 time+=7*86400000;points.settle();points.settle();
 assert.deepEqual(db.prepare('SELECT uid,points FROM points_annual ORDER BY uid').all().map(p=>[p.uid,p.points]),[['a','10'],['b','7'],['c','6']]);
 points.recordScore('chess',a,100);points.recordScore('breakout',b,200);
 assert.equal(db.prepare('SELECT points FROM points_annual WHERE uid=?').get('a').points,'10');
 time+=7*86400000;points.settle();
 assert.deepEqual(db.prepare('SELECT uid,points FROM points_annual ORDER BY uid').all().map(p=>[p.uid,p.points]),[['a','16'],['b','12'],['c','6']]);
});

test('board rules reject illegal moves, handle wins/checkmates and five bot levels choose legal moves',()=>{
 let g=createBoard('gomoku');for(const to of [112,0,113,1,114,2,115,3,116])g=playMove(g,{to});assert.equal(g.winner,'a');
 let x=createBoard('xiangqi');x.board[73]='ap';assert(!legalMoves(x).some(m=>m.from===82&&m.to===63));
 assert.throws(()=>playMove(x,{from:85,to:76+1}),/棋规/);
 let c=createBoard('chess');for(const [from,to] of [[53,45],[12,28],[54,38],[3,39]])c=playMove(c,{from,to});assert.equal(c.winner,'b');
 for(const game of ['gomoku','xiangqi','chess'])for(let level=1;level<=5;level++){const s=createBoard(game),move=botMove(s,level);assert(legalMoves(s).some(m=>m.from===move.from&&m.to===move.to));}
});
