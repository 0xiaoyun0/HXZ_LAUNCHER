import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {roomGame,invitation,parseInvitation} from '../core/direct-wire.mjs';
import {compatibleRoomGame} from '../core/room-instance.mjs';
const pc={minecraft:'1.21.1',loader:'fabric',loaderVersion:'0.16.14',modCount:100,mods:'a'.repeat(64),preset:'HXZ-survival'};
const phone={...pc,modCount:97,mods:'b'.repeat(64),platform:'android',compatibilityPolicy:'hxz-android-1'};
test('Android preset markers alone never waive installed mod differences',()=>{
 assert(!compatibleRoomGame(pc,phone));assert(!compatibleRoomGame(phone,pc));
 for(const preset of ['HXZ-survival','HXZ-mod-1','HXZ-mod-2'])assert(!compatibleRoomGame({...pc,preset},{...phone,preset}));
 assert(compatibleRoomGame(pc,{...pc,platform:'android',compatibilityPolicy:'hxz-android-1'}));
});
test('desktop, custom, unknown policy and game/loader differences stay strict',()=>{
 assert(!compatibleRoomGame(pc,{...pc,mods:'b'.repeat(64)}));
 for(const patch of [{preset:''},{preset:'custom'},{preset:'HXZ-mod-1'},{minecraft:'1.21.2'},{loader:'neoforge'},{loaderVersion:'0.16.15'},{platform:'desktop'},{platform:'android',compatibilityPolicy:undefined},{compatibilityPolicy:'future-policy'}])assert(!compatibleRoomGame(pc,{...phone,...patch}),JSON.stringify(patch));
 assert(!compatibleRoomGame({...pc,preset:'custom'},{...phone,preset:'custom'}));assert(compatibleRoomGame(pc,{...pc}));assert(!compatibleRoomGame(null,phone));
});
test('wire roundtrip retains only validated Android compatibility markers',()=>{
 assert.deepEqual(roomGame(phone),phone);assert.deepEqual(roomGame(pc),pc);
 const room={v:1,id:'test-room-084-abcdefgh',key:'K'.repeat(43),fingerprint:'f'.repeat(64),name:'Android room',hosts:[],p2p:true,port:12555,expires:Date.now()+60000,game:phone};
 assert.deepEqual(parseInvitation(invitation(room)).game,phone);
 assert.throws(()=>roomGame({...phone,platform:'ios'}),/平台兼容/);assert.throws(()=>roomGame({...phone,platform:'desktop'}),/平台兼容/);assert.throws(()=>roomGame({...phone,compatibilityPolicy:'future-policy'}),/平台兼容/);
});
test('standalone server protocol is copied from engine canonical source',async()=>{
 assert.equal(await readFile(new URL('../../../apps/community-server/src/direct-wire.mjs',import.meta.url),'utf8'),await readFile(new URL('../core/direct-wire.mjs',import.meta.url),'utf8'));
});
