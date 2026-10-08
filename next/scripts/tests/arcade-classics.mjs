import assert from 'node:assert/strict';
import {GAMES,createGame,step,replaySegment} from '../../server/shared/arcade-engine.mjs';
import * as previous from '../../server/shared/arcade-engine-v5.mjs';
const merge=createGame('merge',1);merge.cells=[2,2,2,2,...Array(12).fill(0)];step(merge,['left']);assert.deepEqual(merge.cells.slice(0,2),[4,4]);assert.equal(merge.score,8);
const blocked=createGame('merge',1);blocked.cells=[2,...Array(15).fill(0)];step(blocked,['left']);assert.equal(blocked.cells.filter(Boolean).length,1);assert.equal(blocked.moves,0);
for(let i=0;i<108;i++){const m=createGame('mines',i);step(m,['reveal:'+i]);assert.equal(m.over,false);assert.equal(m.cells[i],0);assert.equal(m.cells.filter(n=>n===-1).length,20);}
const flags=createGame('mines',21);step(flags,['flag:4']);step(flags,['reveal:4']);assert.equal(flags.open[4],false);assert.equal(flags.ready,false);step(flags,['flag:4','reveal:4']);assert.equal(flags.open[4],true);
const won=createGame('mines',7);step(won,['reveal:0']);for(let i=0;i<108&&!won.over;i++)if(won.cells[i]!==-1)step(won,['reveal:'+i]);assert.equal(won.won,true);assert.equal(won.revealed,88);
const snake=createGame('snake',21);step(snake,['left']);for(let i=0;i<8;i++)step(snake);assert.equal(snake.direction,'right');assert.equal(snake.snake[0].x,9);
const tanks=createGame('tanks',21);step(tanks,['mode:coop','left','p2:right','fire']);assert.equal(tanks.coop,true);assert(tanks.players[0].x<140&&tanks.players[1].x>220);assert.equal(tanks.bullets.length,1);
const paddle=createGame('breakout',1);paddle.wideUntil=100;step(paddle,[{x:0}]);assert.equal(paddle.paddle,62);step(paddle,[{x:360}]);assert.equal(paddle.paddle,298);
for(const g of GAMES){const seed=17,sim=createGame(g.id,seed),inputs=[];for(let i=0;i<250&&!sim.over;i++){let actions=[];if(i%14===0)actions=g.id==='mines'?['reveal:'+i%108]:g.id==='garden'?['wave']:g.id==='tanks'?['fire','right']:g.id==='runner'?['jump']:['left','up','right','down'].slice(i%4,i%4+1);for(const a of actions)inputs.push([sim.tick+1,a]);step(sim,actions);}const replay=replaySegment(createGame(g.id,seed),sim.tick,inputs);assert.deepEqual(replay,sim,g.id+' replay');}
assert(previous.GAMES.some(g=>g.id==='contra'));assert(!previous.GAMES.some(g=>g.id==='tanks'));assert.equal(previous.createGame('contra',1).game,'contra');
console.log('PASS first-click safety (108 cells), flags, mines win, 2048 merges, snake reversal, co-op input, wide paddle, all games replay and legacy rules');
