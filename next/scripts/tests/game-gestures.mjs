import assert from 'node:assert/strict';
import {createSwipeInput} from '../../packages/games/game-gestures.mjs';
let moves=[];const swipe=createSwipeInput(action=>moves.push(action));let time=0;
const event=(game,type,x,y,id=1)=>swipe.handle({type:'pointer'+type,pointerId:id,clientX:x,clientY:y,timeStamp:time+=30},game,360);
event('blocks','down',150,200);event('blocks','up',152,202);assert.deepEqual(moves,['rotate']);
moves=[];event('blocks','down',150,200);event('blocks','move',215,200);event('blocks','up',215,200);assert.deepEqual(moves,['right','right']);
moves=[];event('blocks','down',150,200);event('blocks','move',150,250);assert.deepEqual(moves,[]);event('blocks','up',150,250);assert.deepEqual(moves,['drop']);
moves=[];event('blocks','down',150,200);event('blocks','move',150,250);event('blocks','cancel',150,250);event('blocks','up',150,250);assert.deepEqual(moves,[]);
for(const game of ['maze','snake']){moves=[];event(game,'down',150,200);event(game,'move',180,200);event(game,'move',210,200);event(game,'move',210,160);event(game,'up',210,160);assert.deepEqual(moves,['right','up']);}
moves=[];event('merge','down',150,200);event('merge','move',200,200);event('merge','move',200,150);event('merge','up',200,150);assert.deepEqual(moves,['right']);
moves=[];event('merge','down',150,200);event('merge','down',50,50,2);event('merge','up',20,50,2);event('merge','up',150,155);assert.deepEqual(moves,['up']);
moves=[];event('snake','down',150,200);swipe.reset();event('snake','up',220,200);assert.deepEqual(moves,[]);
console.log('PASS tap rotation, cell-sized shifts, release-to-drop, cancellation, continuous direction, one merge per swipe, multi-touch isolation');
