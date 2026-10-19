import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMusicAppearanceGate} from './music-appearance.mjs';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(loadEffects,initial={}){
  const saved=new Map(Object.entries(initial));
  const storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
  const gate=createMusicAppearanceGate({loadEffects,storage});
  return {gate,saved,storage};
}
test('local earned flags and forced style selection never grant the archive',async()=>{
  const {gate}=fixture(async()=>[],{'hxz.music-appearance.081:player':'{"earned":true,"classic":false,"unlockSeen":true}'});
  gate.setSession('player',true);gate.setArchive(true);
  assert.equal(gate.snapshot.earned,false);await settle();assert.equal(gate.snapshot.earned,false);
  assert.equal(gate.snapshot.unlockPending,false);
});
test('server completion presents an unlock once and keeps only appearance preferences',async()=>{
  const {gate,saved,storage}=fixture(async()=>['music-archive']);
  gate.setSession('player',true);await settle();assert.equal(gate.snapshot.earned,true);assert.equal(gate.snapshot.unlockPending,true);
  gate.markUnlockShown();await gate.refresh();assert.equal(gate.snapshot.unlockPending,true,'refresh does not dismiss an open celebration');
  gate.setArchive(false);gate.dismissUnlock();await gate.refresh();assert.equal(gate.snapshot.unlockPending,false);assert.equal(gate.snapshot.classic,true);
  assert.deepEqual(JSON.parse(saved.get('hxz.music-appearance.081:player')),{classic:true,unlockSeen:true});
  const next=createMusicAppearanceGate({storage,loadEffects:async()=>['music-archive']});next.setSession('player',true);
  assert.equal(next.snapshot.earned,false,'cached presentation is never an entitlement');await settle();assert.equal(next.snapshot.earned,true);assert.equal(next.snapshot.unlockPending,false);
});
test('account, server and disconnection changes invalidate outstanding grants',async()=>{
  let resolve;const {gate}=fixture(()=>new Promise(done=>resolve=done));
  gate.setSession('server-a:player-a',true);const old=resolve;
  gate.setSession('server-b:player-b',true);old(['music-archive']);await settle();assert.equal(gate.snapshot.earned,false);
  resolve(['music-archive']);await settle();assert.equal(gate.snapshot.earned,true);
  gate.setSession('server-b:player-b',false);assert.equal(gate.snapshot.earned,false);gate.setArchive(true);assert.equal(gate.snapshot.earned,false);
});
test('failed, invalid and absent grants fail closed even after a successful response',async()=>{
  let response=['music-archive'];const {gate}=fixture(async()=>{if(response instanceof Error)throw response;return response;});
  gate.setSession('player',true);await settle();assert.equal(gate.snapshot.earned,true);
  for(const next of [Error('offline'),null,{effects:['music-archive']},[]]){response=next;await gate.refresh();assert.equal(gate.snapshot.earned,false);assert.equal(gate.snapshot.unlockPending,false);}
});
test('newest refresh wins and disposed gates ignore replies',async()=>{
  const replies=[];const {gate}=fixture(()=>new Promise(resolve=>replies.push(resolve)));
  gate.setSession('player',true);const refresh=gate.refresh();replies[1]([]);await refresh;replies[0](['music-archive']);await settle();assert.equal(gate.snapshot.earned,false);
  const pending=gate.refresh();gate.dispose();replies[2](['music-archive']);await pending;assert.equal(gate.snapshot.earned,false);
});
test('storage failures cannot interrupt playback or grant an appearance',async()=>{
  const gate=createMusicAppearanceGate({storage:{getItem(){throw Error('unavailable');},setItem(){throw Error('full');}},loadEffects:async()=>['music-archive']});
  gate.setSession('player',true);await settle();gate.markUnlockShown();gate.setArchive(false);gate.dismissUnlock();assert.equal(gate.snapshot.earned,true);assert.equal(gate.snapshot.classic,true);
});
