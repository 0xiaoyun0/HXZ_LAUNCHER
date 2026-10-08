import assert from 'node:assert/strict';
import {createTankRooms} from '../../apps/community-server/src/tank-rooms.mjs';
import {validClassicAction} from '../../server/shared/arcade-classics.mjs';
let time=Date.now();const scores=[],events=[];
const roomService=createTankRooms({auth:r=>r.user,body:async r=>r.body,send:(r,c,v)=>r.value=v,limit(){},broadcast:(v)=>events.push(v),points:{recordScore:(g,u,s)=>scores.push({g,uid:u.uid,s})},now:()=>time});
const host={uid:'host',name:'房主'},guest={uid:'guest',name:'伙伴'},outsider={uid:'other',name:'旁观者'};
async function api(user,id='',body){const res={};await roomService.route({method:body?'POST':'GET',body,user},res,new URL('http://test/api/coop/tanks'+(id?'/'+id:'')));return res.value;}
try{
 let {room}=await api(host,'',{title:'双设备测试'}),id=room.id;
 await api(guest,id,{action:'join'});await api(guest,id,{action:'ready'});
 await assert.rejects(api(guest,id,{action:'start'}),/房主/);
 await assert.rejects(api(outsider,id),/加入/);await assert.rejects(api(outsider,id,{action:'pause'}),/不在/);
 roomService.input(host,{id,seq:1,keys:[]},'pc');roomService.input(guest,{id,seq:1,keys:[]},'phone');await api(host,id,{action:'start'});
 roomService.input(host,{id,seq:2,keys:['left']},'pc');roomService.input(guest,{id,seq:2,keys:['right']},'phone');roomService.tick();room=(await api(host,id)).room;
 assert(room.state.coop);assert(room.state.players[0].x<140);assert(room.state.players[1].x>220);
 const oldX=room.state.players[0].x;roomService.input(host,{id,seq:1,keys:['right']},'pc');roomService.tick();assert(room.state.players[0].x<oldX,'stale input cannot reverse direction');
 assert.equal(validClassicAction('tanks','mode:coop'),false,'solo replay cannot enable a second player');assert.equal(validClassicAction('tanks','p2:fire'),false);
 time+=2600;roomService.tick();assert.equal((await api(host,id)).room.phase,'paused');await assert.rejects(api(host,id,{action:'resume'}),/恢复连接/);
 roomService.input(host,{id,seq:1,keys:[]},'pc-new');roomService.input(guest,{id,seq:1,keys:[]},'phone-new');await api(host,id,{action:'resume'});
 // Fixture drives an actual terminal rule state; client API has no state mutation route.
 room.state.lives=0;room.state.score=220;roomService.tick();roomService.tick();assert.equal(scores.length,2);assert.deepEqual(scores.map(s=>s.uid).sort(),['guest','host']);assert(scores.every(s=>s.s===220));
 const second=await api(host,'',{title:'离开测试'});await api(guest,second.room.id,{action:'join'});await api(guest,second.room.id,{action:'ready'});for(const user of [host,guest])roomService.input(user,{id:second.room.id,seq:1,keys:[]},user.uid);await api(host,second.room.id,{action:'start'});await api(host,second.room.id,{action:'leave'});roomService.tick();assert.equal(scores.length,2,'abandoned run does not earn scores');
 console.log('PASS authoritative two-player input, role isolation, stale sequence, reconnect reset, pause on loss, once-only settlement and abort without awards');
}finally{roomService.close();}
