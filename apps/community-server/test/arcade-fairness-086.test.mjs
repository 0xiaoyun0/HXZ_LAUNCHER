import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,replay,replaySegment,GAMES,bricks} from '../../../server/shared/arcade-engine.mjs';
import * as previous from '../../../server/shared/arcade-engine-v8.mjs';
import {generateMines} from '../../../server/shared/arcade-mines.mjs';

const adjacent=i=>Array.from({length:9},(_,n)=>[i%9+n%3-1,Math.floor(i/9)+Math.floor(n/3)-1])
 .filter(([x,y])=>x>=0&&x<9&&y>=0&&y<12).map(([x,y])=>y*9+x).filter(j=>j!==i);
// Independent player policy: consult only numbers already shown in the UI.
function solveVisible(state,advance){
 while(!state.over){
  const flags=state.flags.filter(Boolean).length,unknown=state.open.flatMap((v,i)=>!v&&!state.flags[i]?[i]:[]);
  let action=flags===20?unknown.map(i=>'reveal:'+i):unknown.length===20-flags?unknown.map(i=>'flag:'+i):[];
  for(let i=0;i<108&&!action.length;i++)if(state.open[i]){
   const around=adjacent(i),hidden=around.filter(j=>!state.open[j]&&!state.flags[j]),left=state.cells[i]-around.filter(j=>state.flags[j]).length;
   if(hidden.length&&(left===0||left===hidden.length))action=hidden.map(j=>(left?'flag:':'reveal:')+j);
  }
  if(!action.length)return false;
  // A real input tick admits at most four operations.
  for(let n=0;n<action.length&&!state.over;n+=4)advance(action.slice(n,n+4));
 }
 return !!state.won;
}

test('old first-safe boards can stall visible deduction; new boards finish without guessing across every first cell',()=>{
 const old=previous.createGame('mines',2);previous.step(old,['reveal:54']);
 assert.equal(solveVisible(old,a=>previous.step(old,a)),false,'regression fixture stalls using visible deductions');
 let boards=0;
 for(let seed=1;seed<=20;seed++)for(let first=0;first<108;first++){
  const s=createGame('mines',seed);step(s,['reveal:'+first]);
  assert.equal(s.cells[first],0);assert.equal(s.cells.filter(v=>v===-1).length,20);
  assert(solveVisible(s,a=>step(s,a)),'deduction stalled: seed '+seed+' first '+first);
  assert.equal(s.revealed,88);boards++;
 }
 console.log(boards+' generated boards completed using only visible clues and the mine total');
});

test('bounded generator fallback is safe and reveals all non-mines for all first cells',()=>{
 let exhausted=0;
 for(let first=0;first<108;first++){
  const s=createGame('mines',1);let calls=0;
  s.cells=generateMines(s,first,()=>{calls++;return 0;});s.ready=true;
  if(calls>6000)exhausted++;
  assert(calls<=64*107,'bounded shuffling');step(s,['reveal:'+first]);
  assert(solveVisible(s,a=>step(s,a)));assert.equal(s.cells.filter(v=>v<0).length,20);
 }
 assert(exhausted>0,'fixtures must exercise exhausted rejection attempts');
});

test('deduced mines game replays identically across checkpoints and all distributed engine copies',async()=>{
 const s=createGame('mines',2),inputs=[];
 const advance=actions=>{for(const a of actions)inputs.push([s.tick+1,a]);step(s,actions);};
 advance(['reveal:54']);assert(solveVisible(s,advance));
 assert.deepEqual(replay('mines',2,s.tick,inputs),s);
 const middle=Math.floor(s.tick/2),checkpoint=replay('mines',2,middle,inputs.filter(e=>e[0]<=middle));
 assert.deepEqual(replaySegment(checkpoint,s.tick,inputs.filter(e=>e[0]>middle)),s);
 for(const name of ['../shared/arcade-engine.mjs','../../../packages/mobile-ui/server/shared/arcade-engine.mjs']){
  const engine=await import(name);assert.deepEqual(engine.replay('mines',2,s.tick,inputs),s);
 }
});

function reachable(width,height,walls,start){
 const seen=new Set([start]),queue=[start];
 for(const i of queue)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const x=i%width+dx,y=Math.floor(i/width)+dy,n=y*width+x;
  if(x>=0&&x<width&&y>=0&&y<height&&!walls.has(n)&&!seen.has(n)){seen.add(n);queue.push(n);}
 }return seen;
}

test('all 100 maze levels have reachable pellets and guardian homes; 30 dungeon rooms have reachable enemies, chest and exit',()=>{
 for(let seed=1;seed<=20;seed++){
  const maze=createGame('maze',seed);
  for(let level=1;level<=100;level++){
   assert.equal(maze.level,level);const seen=reachable(19,23,new Set(maze.cells.flatMap((v,i)=>v?[i]:[])),20);
   for(let i=0;i<maze.pellets.length;i++)if(maze.pellets[i])assert(seen.has(i));
   for(const g of maze.ghosts)assert(seen.has(g.homeY*19+g.homeX));
   maze.remaining=0;step(maze);
  }assert.equal(maze.won,true);
  const dungeon=createGame('dungeon',seed),cell=(x,y)=>Math.floor((y-50)/36)*9+Math.floor((x-18)/36);
  for(let level=1;level<=30;level++){
   assert.equal(dungeon.level,level);const seen=reachable(9,11,new Set(dungeon.walls),cell(dungeon.x,dungeon.y));
   assert(seen.has(cell(180,80)),'exit reachable');
   for(const e of [...dungeon.enemies,...dungeon.chests])assert(seen.has(cell(e.x,e.y)),'spawn reachable');
   dungeon.enemies=[];dungeon.x=180;dungeon.y=80;step(dungeon);
   if(level<30){assert(dungeon.choices.length);step(dungeon,['upgrade:'+dungeon.choices[0]]);}
  }assert.equal(dungeon.won,true);
 }
});

test('100 breakout layouts contain breakable targets and solid bricks cannot prevent level settlement',()=>{
 const s=createGame('breakout',1);
 for(let level=1;level<=100;level++){
  s.level=level;bricks(s);assert(s.bricks.some(b=>b.alive&&!b.stone));
  for(const b of s.bricks)if(!b.stone)b.alive=false;
  s.serve=0;step(s);assert(level===100?s.won:s.level===level+1);
 }
});

test('all arcade simulations keep deterministic input replay and finite scores',()=>{
 assert.equal(GAMES.length,20);
 for(const game of GAMES)for(let seed=1;seed<=10;seed++){
  const s=createGame(game.id,seed),inputs=[];
  while(s.tick<180&&!s.over){const actions=game.id==='mines'?[]:game.id==='runner'?['jump']:game.id==='tanks'?['fire','right']:game.id==='garden'?s.tick===0?['build:seed:16','wave']:[]:['left','up','right','down'].slice(Math.floor(s.tick/15)%4,Math.floor(s.tick/15)%4+1);
   for(const action of actions)inputs.push([s.tick+1,action]);step(s,actions);assert(Number.isFinite(s.score));
  }assert.deepEqual(replay(game.id,seed,s.tick,inputs),s,game.id+' seed '+seed);
 }
});
