import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './helpers/hub.mjs';

test('dedicated bridge isolates tokens and servers; whitelist approval delivers one typed action',async t=>{
 const f=await fixture(t,{alice:'a'.repeat(32),bob:'b'.repeat(32)}),{req}=f;
 const {token}=await req('admin','/api/admin/game-bridges','POST',{server:'mod-1',rotate:true});
 async function bridge(p,value,status=200,server='mod-1',credential=token){const res=await fetch(f.base+'/api/game-bridge/'+p,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+credential,'X-HXZ-Server':server},body:JSON.stringify(value)}),data=await res.json();assert.equal(res.status,status,JSON.stringify(data));return data;}
 const heartbeat={status:{version:'1.21.1',loader:'neoforge/21.1.250',online:0,max:20,players:[],capabilities:['status','statistics','chat','recipes','whitelist']}};
 await bridge('poll',heartbeat,403,'mod-2');await bridge('poll',heartbeat,403,'mod-1','0'.repeat(64));
 await bridge('poll',heartbeat);
 assert.equal((await req('alice','/api/hub/game-servers')).items[1].connected,true);
 await req('alice','/api/admin/game-access','PUT',{server:'mod-1',chat:true},403);
 await req('admin','/api/admin/game-access','PUT',{server:'mod-1',chat:true,whitelist:true});
 await req('alice','/api/hub/records','POST',{kind:'whitelist',title:'申请',revision:0,status:'review',data:{server:'mod-1',player:'bob'}},400);
 const record=await req('alice','/api/hub/records','POST',{kind:'whitelist',title:'入服申请',revision:0,status:'review',data:{server:'mod-1',player:'alice'}}),p='/api/hub/records/'+record.id;
 await req('bob',p,'GET',undefined,404);
 await req('admin',p+'/review','POST',{revision:1,status:'published'});
 await req('admin',p+'/review','POST',{revision:1,status:'published'},409);
 const actions=(await bridge('poll',heartbeat)).actions;assert.equal(actions.length,1);assert.equal(actions[0].kind,'whitelist');assert.equal(actions[0].value.uid,'a'.repeat(32));
 await bridge('ack',{id:actions[0].id,status:'done'});await bridge('ack',{id:actions[0].id,status:'done'});
 assert.equal((await bridge('poll',heartbeat)).actions.length,0);
 const chat={requestId:randomUUID(),body:'你好'};
 await req('alice','/api/hub/game/mod-1/chat','POST',chat);await req('alice','/api/hub/game/mod-1/chat','POST',chat);
 assert.equal((await bridge('poll',heartbeat)).actions.length,1);
 await req('bob','/api/hub/game/mod-1/chat','POST',chat,409);
 await bridge('chat',{id:randomUUID(),uid:'b'.repeat(32),name:'bob',body:'游戏消息'});
 assert.equal((await req('alice','/api/hub/game/mod-1/chat')).items.length,2);
 await bridge('console',{command:'op bob'},404);
 await req('admin','/api/admin/game-access','PUT',{server:'mod-1',chat:false,whitelist:false});
 assert.equal((await bridge('poll',heartbeat)).actions.length,0);
 await f.restart();assert.equal((await req('alice','/api/hub/game-servers')).items[1].version,'1.21.1');
});

test('trusted recipe and machine reports are bounded and machines remain owner-only',async t=>{
 const f=await fixture(t,{alice:'a'.repeat(32),bob:'b'.repeat(32)}),{req}=f;
 const {token}=await req('admin','/api/admin/game-bridges','POST',{server:'mod-2',rotate:true});
 const report=async (route,value,status=200)=>{const r=await fetch(f.base+'/api/game-bridge/'+route,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-HXZ-Server':'mod-2'},body:JSON.stringify(value)});assert.equal(r.status,status,await r.text());};
 await report('recipes',{items:[{id:'minecraft:stone',type:'minecraft:smelting',output:'minecraft:stone',quantity:1,ingredients:[{quantity:1,options:['minecraft:cobblestone']}]}]});
 assert.equal((await req('bob','/api/hub/game/mod-2/recipes?q=stone')).items.length,1);
 await report('recipes',{items:[{id:'minecraft:bad',type:'minecraft:smelting',output:'../bad',quantity:1,ingredients:[]}]},400);
 await report('machines',{items:[{uid:'a'.repeat(32),id:'pump',name:'水泵',metric:'production',value:12,unit:'桶'}]});
 assert.equal((await req('alice','/api/hub/game/mod-2/machines')).items.length,1);assert.equal((await req('bob','/api/hub/game/mod-2/machines')).items.length,0);
});
