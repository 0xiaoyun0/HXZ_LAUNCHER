import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,replay} from '../shared/arcade-engine.mjs';
import {createGame as oldGame,step as oldStep} from '../shared/arcade-engine-v6.mjs';
import {FLIGHT_UPGRADES,availableFlightUpgrades} from '../shared/arcade-upgrades.mjs';
test('24 flight upgrades change simulation state and survive deterministic replay',()=>{
 assert.equal(FLIGHT_UPGRADES.length,24);assert.equal(new Set(FLIGHT_UPGRADES.map(v=>v.id)).size,24);
 for(const {id} of FLIGHT_UPGRADES){
  const a=createGame('fighter',42);a.phase='upgrade';a.choices=[id];a.lives=2;a.shield=0;
  const b=structuredClone(a);step(a,['upgrade:'+id]);step(b,['upgrade:'+id]);
  assert.equal(a.level,2);assert.equal(a.phase,'flight');assert.equal(a.choices.length,0);
  assert.ok(id==='repair'?a.lives===3:id==='shield'?a.shield===1:a[id]>0);
  for(let n=0;n<2000&&!a.over;n++){step(a);step(b);assert.ok(a.shots.length<=140&&a.enemies.length<=36&&a.bullets.length<=600);}
  assert.deepEqual(a,b,id);assert.ok(Number.isFinite(a.score));
 }
 const fresh=createGame('fighter',3);assert.ok(!availableFlightUpgrades(fresh).includes('repair'));
 assert.throws(()=>replay('fighter',42,1,[[1,'upgrade:__proto__']]));
 const legacy=oldGame('fighter',42);for(let i=0;i<50;i++)oldStep(legacy);assert.equal(legacy.pierce,undefined);
});
import {BREAKOUT_BUFFS,applyBreakoutBuff} from '../../../server/shared/arcade-breakout.mjs';
test('breakout bonuses are bounded and blast does not collect the same brick twice',()=>{
 assert.equal(BREAKOUT_BUFFS.length,9);
 const s=createGame('breakout',7);s.lives=2;applyBreakoutBuff(s,'repair');assert.equal(s.lives,3);applyBreakoutBuff(s,'repair');assert.equal(s.shields,1);
 for(let n=0;n<8;n++)applyBreakoutBuff(s,'shield');assert.equal(s.shields,2);
 const origin={x:0,y:0,alive:false};s.bricks=[origin,{x:10,y:10,alive:true,hp:1},{x:100,y:100,alive:true,hp:3},{x:20,y:20,alive:true,hp:1,stone:true}];applyBreakoutBuff(s,'blast',origin);const score=s.score;assert.equal(s.bricks[1].alive,false);assert.equal(s.bricks[2].hp,3);assert.equal(s.bricks[3].alive,true);applyBreakoutBuff(s,'blast',origin);assert.equal(s.score,score);applyBreakoutBuff(s,'breaker',origin);assert.equal(s.bricks[3].alive,false);
 for(const id of ['wide','slow','heavy','gold','guide']){applyBreakoutBuff(s,id);assert.ok(s[id+'Until']>s.tick);}
});
