import test from 'node:test';
import assert from 'node:assert/strict';
import {rewardView,legacyBoard} from '../../packages/playtime/view.mjs';
test('cumulative progress uses fixed 24h/5 points and survives legacy API absence',()=>{
 assert.equal(rewardView(null),null);
 assert.equal(rewardView({scheme:'legacy-weekly'}),null);
 const view=rewardView({scheme:'cumulative-24h',enabled:true,earnedPoints:'15',progressSeconds:82800});
 assert.equal(view.earned,'15');assert.equal(view.remaining,3600);assert.match(view.label,/1 小时.*5 积分/);
 assert.equal(rewardView({scheme:'cumulative-24h',enabled:true,progressSeconds:0}).remaining,86400);
});
test('pause and pending awards are not presented as already paid',()=>{
 const paused=rewardView({scheme:'cumulative-24h',enabled:false,pendingIntervals:2,earnedPoints:'5',progressSeconds:1});
 assert.equal(paused.earned,'5');assert.equal(paused.pending,2);assert.match(paused.label,/暂停/);
 assert.match(rewardView({scheme:'cumulative-24h',enabled:true,pendingIntervals:2}).label,/2 份/);
});
test('only historical/old backend boards retain rank rewards',()=>{
 assert.ok(legacyBoard({rewardScheme:'legacy-weekly'}));
 assert.ok(legacyBoard({rules:{minWeeklyMinutes:30}}));
 assert.equal(legacyBoard({rewardScheme:'cumulative-24h'}),false);
 assert.equal(legacyBoard({rules:{scheme:'cumulative-24h'}}),false);
});
