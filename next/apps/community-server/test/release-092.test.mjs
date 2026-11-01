import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './helpers/hub.mjs';
import {validatePluginPackage} from '../shared/plugin-package.mjs';

const plugin=()=>({format:'hxz-plugin-v1',manifest:{id:'test-extension',version:'1.0.0',apiVersion:1,name:'测试插件',author:'Alice',description:'测试完整权限插件',permissions:['launcher.full'],platforms:['win32-x64','win32-ia32'],main:'main.cjs'},files:{'main.cjs':'exports.activate = api => () => {};'}});
test('plugin submissions require review, immutable versions and publisher ownership',async t=>{
 const f=await fixture(t),p=plugin(),created=await f.req('alice','/api/plugins','POST',{package:p},201);
 assert.equal((await f.req('bob','/api/plugins')).items.length,0);
 await f.req('bob','/api/plugins/'+created.id+'/package','GET',undefined,404);
 await f.req('bob','/api/admin/plugins/'+created.id,'PUT',{status:'approved'},403);
 const pending=(await f.req('admin','/api/admin/plugins')).items[0];
 await f.req('admin','/api/admin/plugins/'+created.id,'PUT',{status:'approved',reason:'代码已审阅',updated:pending.updated});
 assert.equal((await f.req('bob','/api/plugins')).items.length,1);
 const download=await f.req('bob','/api/plugins/'+created.id+'/package');assert.equal(validatePluginPackage(download.package).sha256,download.sha256);
 await f.req('alice','/api/plugins','POST',{package:p},409);p.manifest.version='1.0.1';await f.req('bob','/api/plugins','POST',{package:p},403);
 const malicious=plugin();malicious.manifest.id='unsafe-extension';malicious.files['../outside.cjs']='unsafe';await f.req('alice','/api/plugins','POST',{package:malicious},400);
 const live=await f.req('admin','/api/admin/plugins/'+created.id);await f.req('admin','/api/admin/plugins/'+created.id,'PUT',{status:'withdrawn',reason:'测试下架',updated:live.updated});
 await f.req('bob','/api/plugins/'+created.id+'/package','GET',undefined,404);
 await f.restart();assert.equal((await f.req('alice','/api/plugins?mine=1')).items[0].status,'withdrawn');
});
test('automatic diagnostics redact secrets, deduplicate delivery and record resolution history',async t=>{
 const f=await fixture(t),report={eventId:randomUUID(),message:'测试连接失败',version:'0.9.2',platform:'win32-x64',detail:'Authorization: Bearer SECRET123 password=private C:\\Users\\private-user\\logs',context:{instance:'mod-1',os:'Windows',accessToken:'DO-NOT-STORE'}};
 const created=await f.req('alice','/api/error-reports','POST',report,201);
 await f.req('alice','/api/error-reports','POST',report);
 await f.req('alice','/api/admin/error-reports','GET',undefined,403);
 let result=await f.req('admin','/api/admin/error-reports/'+created.id);assert.equal(result.item.occurrences,1);assert.equal(result.item.name,'alice');assert.doesNotMatch(JSON.stringify(result),/SECRET123|private-user|DO-NOT-STORE/);
 await f.req('admin','/api/admin/error-reports/'+created.id,'PUT',{updated:result.item.updated,status:'resolved',assignee:'管理员 A',note:'DNS 已修复'});
 result=await f.req('admin','/api/admin/error-reports/'+created.id);assert.equal(result.history.length,1);assert.equal(result.item.assignee,'管理员 A');
 await f.req('alice','/api/error-reports','POST',{...report,eventId:randomUUID()},201);
 result=await f.req('admin','/api/admin/error-reports/'+created.id);assert.equal(result.item.status,'open');assert.equal(result.item.occurrences,2);
 await f.restart();assert.equal((await f.req('admin','/api/admin/error-reports')).total,1);
});
test('MC bridge v2 rejects stale sessions and sequence rollback, and reports shutdown',async t=>{
 const f=await fixture(t),{token}=await f.req('admin','/api/admin/game-bridges','POST',{server:'mod-1',rotate:true});
 const poll={protocol:2,bridgeVersion:'0.9.2',session:randomUUID(),sequence:2,status:{version:'1.21.1',loader:'neoforge',online:1,max:20,players:[{uid:'a'.repeat(32),name:'alice'}],capabilities:['status']}};
 async function send(value,status=200){const r=await fetch(f.base+'/api/game-bridge/poll',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-HXZ-Server':'mod-1'},body:JSON.stringify(value)}),v=await r.json();assert.equal(r.status,status,JSON.stringify(v));return v;}
 assert.equal((await send(poll)).sequence,2);assert.equal((await send(poll)).duplicate,true);
 await send({...poll,sequence:1},409);await send({...poll,status:{...poll.status,online:0,players:[]}},409);
 const online=await f.req('alice','/api/server-online?refresh=1');const mod=online.items.find(v=>v.id==='mod-1');assert.equal(mod.online,1);assert.equal(mod.source,'game-bridge');assert.equal(mod.sample,false);
 const newer={...poll,session:randomUUID(),sequence:1};await send(newer);await send({...poll,sequence:99},409);
 await send({...newer,sequence:2,status:{...poll.status,running:false}});
 const bridge=(await f.req('admin','/api/admin/game-access')).items.find(v=>v.server==='mod-1');assert.equal(bridge.connected,false);assert.equal(bridge.online,0);
});
