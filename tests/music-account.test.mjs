import test from 'node:test';
import assert from 'node:assert/strict';
import {musicAccount} from '../engine/music-account.mjs';
test('a private music session stays bound to its community identity and honours track access',async()=>{
 const user={base:'http://localhost',uid:'alice'},profiles=[],ids=[];let mode='trial';
 const service=musicAccount(async(action,input)=>{profiles.push(input.profile);return action==='music.web.cookies'?[['MUSIC_U','fixture']]:[];},async(url,input)=>{
   assert.equal(url,'https://music.163.com/api/song/enhance/player/url');assert.equal(input.redirect,'error');ids.push(input.body.get('ids'));
   return Response.json({data:[{url:mode==='wrong'?'https://example.invalid/a':'http://x.music.126.net/a',freeTrialInfo:mode==='trial'}]});
 });
 await service.login(user);assert.deepEqual(await service.status(user),{loggedIn:true});
 await assert.rejects(service.resolve(user,123),/权限/);mode='wrong';await assert.rejects(service.resolve(user,123),/地址/);
 mode='full';assert.equal(await service.resolve(user,123),'https://x.music.126.net/a');
 await service.logout({...user,uid:'bob'});assert.notEqual(profiles[0],profiles.at(-1));assert.equal(new Set(ids).size,1);
});
