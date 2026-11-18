import test from 'node:test';
import assert from 'node:assert/strict';
import {botMove} from '../src/board-engine.mjs';
import {createBoard,playMove,legalMoves,sameMove} from '../shared/board-games.mjs';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {analyseBoard} from '../src/board-engine.mjs';

export const opening=game=>playMove(createBoard(game),game==='chess'?{from:52,to:36}:game==='xiangqi'?{from:64,to:65}:{to:112});

test('highest strength replies remain legal and bounded including startup',async()=>{
 for(const game of ['chess','xiangqi','gomoku']){
  const state=opening(game),start=performance.now(),move=await botMove(state,5),elapsed=performance.now()-start;
  assert(legalMoves(state).some(m=>sameMove(m,move)),game+' legal reply');
  console.log(game+' level 5: '+Math.round(elapsed)+'ms');
  // Includes normal process startup; cold-start accounting has a separate test.
  assert(elapsed<5000,game+' reply took '+Math.round(elapsed)+'ms');
 }
});

test('delivery deadline uses the last legal completed depth, tolerates late first depth and cancels search',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const late of [false,true]){
  const child=new EventEmitter();Object.assign(child,{stdout:new PassThrough(),stderr:new PassThrough(),stdin:new PassThrough(),killed:false,kill(){this.killed=true;}});
  const state=opening('chess'),legal=legalMoves(state),job=analyseBoard(state,5,{spawnEngine:()=>child});
  const emit=value=>child.stdout.emit('data',JSON.stringify(value)+'\n');emit({type:'ready'});
  if(!late){emit({type:'candidate',move:legal[0]});emit({type:'candidate',move:legal[1]});emit({type:'candidate',move:{from:-1,to:999}});}
  t.mock.timers.tick(849);assert.equal(child.killed,false);
  t.mock.timers.tick(1);
  if(late){assert.equal(child.killed,false);emit({type:'candidate',move:legal[1]});}
  assert.deepEqual(await job.promise,legal[1]);assert.equal(child.killed,true);
 }
});

test('a forced legal move bypasses subprocess startup',async()=>{
 const state=createBoard('chess');state.fen='7k/8/5K1Q/8/8/8/8/8 b - - 0 1';
 const legal=legalMoves(state);assert.equal(legal.length,1);
 const job=analyseBoard(state,5,{spawnEngine:()=>{throw Error('forced moves must not spawn');}});
 assert.deepEqual(await job.promise,legal[0]);
});

test('five strengths retain immediate gomoku wins and forced blocks plus chess mate',async()=>{
 for(let level=1;level<=5;level++){
  for(const winning of [true,false]){
   const s=createBoard('gomoku');s.turn='b';s.ply=7;
   for(const i of [105,106,107,108])s.board[i]=winning?'b':'a';
   for(const i of [0,2,4])s.board[i]=winning?'a':'b';
   const move=await botMove(s,level);assert.equal(move.to,109,'level '+level+(winning?' immediate win':' forced block'));
  }
  const s=createBoard('chess');s.fen='7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';
  assert.equal(playMove(s,await botMove(s,level)).winner,'a','level '+level+' mate in one');
 }
});
