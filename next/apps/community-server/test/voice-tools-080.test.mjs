import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {WebSocket} from 'ws';import {fixture} from './helpers/hub.mjs';
async function voice(f,t,uid,room='lobby'){
 const {token}=await f.req(uid,'/api/session','POST',{uid}),ws=new WebSocket(f.base.replace('http:','ws:')+'/ws'),messages=[];ws.on('error',()=>{});ws.on('message',(data,binary)=>{if(!binary)messages.push(JSON.parse(data));});t.after(()=>ws.terminate());await once(ws,'open');ws.send(JSON.stringify({type:'auth',token,platform:'desktop'}));
 const wait=async check=>{for(let i=0;i<100;i++){const found=messages.find(check);if(found)return found;await new Promise(r=>setTimeout(r,10));}throw Error('websocket event timed out');};const ready=await wait(v=>v.type==='ready');ws.send(JSON.stringify({type:'voice-join',room,transport:'ws-opus-v1'}));await wait(v=>v.type==='presence'&&v.users?.some(u=>u.id===ready.id&&u.room===room));return {id:ready.id,ws,messages};
}
test('room collaboration requires this device membership and keeps media signals between enrolled peers',async t=>{
 const f=await fixture(t),a=await voice(f,t,'alice'),b=await voice(f,t,'bob'),e=await voice(f,t,'eve','mod-1'),p='/api/voice-tools/';
 const get=(who,id)=>f.req(who,p+'state?client='+id),post=(who,id,op,data={},status=200)=>f.req(who,p+op,'POST',{client:id,...data},status);
 await f.req('eve',p+'state?client='+a.id,'GET',undefined,409);await f.req('admin',p+'state?client=missing','GET',undefined,409);
 const initial=await get('alice',a.id);assert.equal(initial.host,a.id);await post('bob',b.id,'mode',{mode:'classroom'},403);
 await post('alice',a.id,'mode',{mode:'classroom'});await post('bob',b.id,'caption',{text:'unauthorized'},403);await post('bob',b.id,'hand',{raised:true});assert.deepEqual((await get('alice',a.id)).hands,[b.id]);await post('alice',a.id,'speaker',{target:b.id,allowed:true});
 const caption=await post('bob',b.id,'caption',{text:'已准备好我的建造方案'});assert.equal(caption.captions[0].name,'bob');assert.equal((await get('eve',e.id)).captions.length,0);
 const share=await post('alice',a.id,'screen/start',{title:'建造方案'});await post('eve',e.id,'screen/watch',{screen:share.screen.id,watching:true},409);await post('bob',b.id,'screen/signal',{screen:share.screen.id,to:a.id,data:{type:'answer',sdp:'v=0'}},403);
 const connection=(await post('bob',b.id,'screen/watch',{screen:share.screen.id,watching:true})).screen.watchers[0].version;await post('alice',a.id,'screen/signal',{screen:share.screen.id,to:b.id,connection,data:{type:'offer',sdp:'v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel'}},400);await post('alice',a.id,'screen/signal',{screen:share.screen.id,to:b.id,connection,data:{type:'offer',sdp:'v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96'}});
 const signals=(await get('bob',b.id)).signals;assert.equal(signals.length,1);assert.equal(signals[0].from,a.id);assert.equal((await get('alice',a.id)).signals.length,0);assert.equal((await f.req('bob',p+'state?client='+b.id+'&after='+signals[0].seq)).signals.length,0);
 await post('bob',b.id,'screen/stop',{},403);await post('alice',a.id,'host',{target:b.id});await post('bob',b.id,'screen/stop');assert.equal((await get('alice',a.id)).screen,null);
 await post('bob',b.id,'timer',{minutes:25});assert.ok((await get('alice',a.id)).ends>Date.now()+24*60000);
 a.ws.send(JSON.stringify({type:'voice-leave'}));await new Promise(r=>setTimeout(r,30));await f.req('alice',p+'state?client='+a.id,'GET',undefined,409);
});
test('classroom gates actual Opus relay until granted and releases gating when mode ends',async t=>{
 const f=await fixture(t),a=await voice(f,t,'alice'),b=await voice(f,t,'bob'),p='/api/voice-tools/';let frames=0;a.ws.on('message',(_raw,binary)=>{if(binary)frames++;});
 await f.req('alice',p+'mode','POST',{client:a.id,mode:'classroom'});let seq=0;const speak=async()=>{const frame=Buffer.alloc(10);frame[0]=1;frame.writeUInt32BE(++seq,5);b.ws.send(frame);await new Promise(r=>setTimeout(r,40));};
 await speak();assert.equal(frames,0);await f.req('alice',p+'speaker','POST',{client:a.id,target:b.id,allowed:true});await speak();assert.equal(frames,1);await f.req('alice',p+'mode','POST',{client:a.id,mode:'chat'});await speak();assert.equal(frames,2);
});
