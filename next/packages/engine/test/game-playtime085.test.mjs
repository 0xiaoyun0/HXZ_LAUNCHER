import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {gamePlaytime} from '../core/game-playtime.mjs';

async function fixture(t,start='2026-10-21T15:59:50Z'){
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-playtime-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));
 let wall=Date.parse(start),mono=0,scheduled;
 const make=()=>gamePlaytime(home,{wall:()=>wall,mono:()=>mono,schedule:fn=>{scheduled=fn;return 1;},cancel:()=>{}});
 return {home,make,tick(ms,wallMs=ms){wall+=wallMs;mono+=ms;},get scheduled(){return scheduled;}};
}
test('Beijing midnight splits actual running time; preparation is excluded',async t=>{
 const f=await fixture(t),p=f.make();f.tick(3600000);assert.equal((await p.snapshot()).totalSeconds,0);
 // Start ten seconds before the following midnight.
 f.tick(23*3600000);await p.start('game');f.tick(30000);await p.stop('game');
 assert.deepEqual((await p.snapshot()).days,[{date:'2026-10-22',seconds:10},{date:'2026-10-23',seconds:20}]);
});
test('a crashed launcher only retains its last checkpoint; restart never books the gap',async t=>{
 const f=await fixture(t,'2026-10-21T03:00:00Z'),first=f.make();await first.start('old');f.tick(30000);await first.pulse();
 first.dispose();f.tick(12*3600000);const restarted=f.make();assert.equal((await restarted.snapshot()).totalSeconds,30);
 await restarted.start('new');f.tick(15000);await restarted.stop('new');assert.equal((await restarted.snapshot()).totalSeconds,45);
});
test('parallel games count the union and repeated stops do not add time',async t=>{
 const f=await fixture(t),p=f.make();await p.start('a');f.tick(10000);await p.start('b');f.tick(10000);await p.stop('a');f.tick(10000);await p.stop('b');await p.stop('b');
 assert.equal((await p.snapshot()).totalSeconds,30);
});
test('clock rollback never duplicates credited wall time; forward jumps and suspension are bounded',async t=>{
 const f=await fixture(t,'2026-10-21T03:00:00Z'),p=f.make();await p.start('a');f.tick(30000);await p.pulse();
 f.tick(10000,-20000);await p.pulse();f.tick(10000);await p.pulse();assert.equal((await p.snapshot()).totalSeconds,30);
 f.tick(10000);await p.pulse();f.tick(30000,3600000);await p.pulse();assert.equal((await p.snapshot()).totalSeconds,60);
 f.tick(8*3600000);await p.stop('a');assert.equal((await p.snapshot()).totalSeconds,120);
});
test('stored calendar stays within 365 days and oversized files are rejected',async t=>{
 const f=await fixture(t,'2026-10-21T03:00:00Z'),p=f.make();await p.start('a');f.tick(30000);await p.stop('a');f.tick(365*86400000);
 assert.equal((await p.snapshot()).activeDays,0);await p.start('b');f.tick(30000);await p.stop('b');
 assert.equal(Object.keys(JSON.parse(await fs.readFile(path.join(f.home,'game-playtime.json'),'utf8')).days).length,1);
 await fs.writeFile(path.join(f.home,'game-playtime.json'),' '.repeat(65537));await assert.rejects(f.make().snapshot(),/过大/);
});
test('a failed exit save still stops heartbeat counting for the exited process',async t=>{
 const f=await fixture(t,'2026-10-21T03:00:00Z'),p=f.make(),file=path.join(f.home,'game-playtime.json');await p.start('game');
 // Make the destination unavailable after start; restore it after the failed exit save.
 await fs.mkdir(file);f.tick(30000);await assert.rejects(p.stop('game'));
 await fs.rmdir(file);f.tick(30000);await p.pulse();assert.equal((await p.snapshot()).totalSeconds,30);
});
