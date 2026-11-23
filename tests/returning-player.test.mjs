import assert from 'node:assert/strict';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {installedLibrary,installedServerCache} from '../engine/installed-game-root.mjs';
import {createPresetCatalog,DEFAULT_SERVERS} from '../packages/engine/core/server-presets.mjs';
import {supportRequest} from '../engine/support.mjs';
import {createMusicService} from '../packages/engine/core/music.mjs';

async function temp(t){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-returning-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  return dir;
}
async function localServer(t,handler){
  const server=http.createServer(handler);
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  return 'http://127.0.0.1:'+server.address().port;
}
test('an installed 0.9.2 library restores its directory and last successful start, without rewriting personal files',async t=>{
  const dir=await temp(t),old=path.join(dir,'幻想镇启动器'),root=path.join(dir,'游戏'),file=path.join(old,'settings.json');
  await fs.mkdir(old);assert.equal(await installedLibrary(dir),null);
  await fs.writeFile(file,'{');assert.equal(await installedLibrary(dir),null);
  const source=JSON.stringify({gameRoot:root,selectedInstance:'HXZ-mod-2',unknownFuture:{kept:true}});
  await fs.writeFile(file,source);assert.equal(await installedLibrary(dir),null);
  await fs.mkdir(path.join(root,'versions','HXZ-mod-1'),{recursive:true});
  await fs.writeFile(path.join(old,'launch-history.json'),JSON.stringify([
    {instance:'HXZ-mod-1',root,status:'normal',started:10},{instance:'other-folder',root:dir,status:'normal',started:50},
    {instance:'never-started',root,status:'installing',started:60}
  ]));
  assert.deepEqual(await installedLibrary(dir),{root,selected:'HXZ-mod-2',lastPlayed:{id:'HXZ-mod-1',root,startedAt:10}});
  await fs.writeFile(path.join(old,'game-playtime.json'),JSON.stringify({version:1,days:{'2026-10-01':90000}}));
  assert.equal((await installedLibrary(dir)).playtime.days['2026-10-01'],90000);
  assert.equal(await fs.readFile(file,'utf8'),source);assert.equal(await installedServerCache(dir),null);
});
test('three default servers survive offline, honor cached closures and change only after a valid refresh',async t=>{
  const dir=await temp(t),old=structuredClone(DEFAULT_SERVERS);
  old[2].enabled=false;let failing=true;
  const base=await localServer(t,(_req,res)=>{res.writeHead(failing?503:200,{'Content-Type':'application/json'});res.end(JSON.stringify(failing?{error:'offline'}:{servers:DEFAULT_SERVERS}));});
  const catalog=await createPresetCatalog(dir,()=>base,async()=>({source:base,servers:old}));t.after(catalog.dispose);
  assert.deepEqual(catalog.list().map(row=>row.name),['原版生存群组服','模组一服','模组二服']);
  assert.equal(catalog.list()[2].placeholder,true);
  await assert.rejects(catalog.refresh({force:true,strict:true}),/仍可使用/);
  assert.equal((await catalog.refresh())[2].enabled,false);
  failing=false;await catalog.refresh({force:true,strict:true});
  assert.equal(catalog.list()[2].placeholder,false);
  let source=base;
  const reopened=await createPresetCatalog(dir,()=>source);t.after(reopened.dispose);
  assert.equal(reopened.list()[2].enabled,true);
  source='invalid address';assert.equal(reopened.list().length,3);
  await assert.rejects(reopened.refresh({strict:true}),/社区服务地址/);
});
test('core feedback restricts requests to personal tickets and carries a player reply or reopen action',async t=>{
  const seen=[];
  const base=await localServer(t,async(req,res)=>{
    let body='';for await(const chunk of req)body+=chunk;
    seen.push({path:req.url,method:req.method,body:body?JSON.parse(body):undefined});
    res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({manager:true}));
  });
  const session=()=>({base,token:'local-fixture-only'}),id='fixture_ticket_12345';
  await assert.rejects(supportRequest(session,{path:'/api/points'}));
  await assert.rejects(supportRequest(session,{path:'/api/feedback/'+id,method:'DELETE'}));
  assert.equal((await supportRequest(session,{path:'/api/feedback?scope=all&status=all'})).manager,false);
  assert.equal(new URL(seen[0].path,base).searchParams.get('scope'),'mine');
  await supportRequest(session,{path:'/api/feedback/'+id,method:'POST',body:{body:'新情况',updated:9,status:'archived'}});
  assert.deepEqual(seen[1].body,{body:'新情况',updated:9});
  await supportRequest(session,{path:'/api/feedback/'+id,method:'POST',body:{action:'reopen',updated:11}});
  assert.deepEqual(seen[2].body,{action:'reopen',updated:11});
});

test('a legacy music preview is cancellable, imports offline, keeps unknown fields and deduplicates retries',async t=>{
  const dir=await temp(t),old=path.join(dir,'old'),data=path.join(dir,'new');
  await fs.mkdir(path.join(old,'media'),{recursive:true});await fs.mkdir(data);
  const local='ada80000-0000-4333-8000-000000000001.wav',audio=Buffer.alloc(128);
  audio.write('RIFF');audio.write('WAVE',8);await fs.writeFile(path.join(old,'media',local),audio);
  const original=JSON.stringify({futureLibrary:true,items:[
    {source:'netease',netId:'175',title:'收藏',privateAudio:true,url:'https://invalid.example/private'},
    {source:'netease',netId:'175',title:'重复'},{source:'local',title:'本地样本',url:'hxz-media://local/'+local},
    {source:'local',title:'无副本',url:'hxz-media://local/ada80000-0000-4333-8000-000000000003.wav'}
  ]}),source=path.join(old,'music-library.json'),target=path.join(data,'music-library.json');
  await fs.writeFile(source,original);await fs.writeFile(target,JSON.stringify({version:1,unknown:{n:8},items:[]}));
  const api=createMusicService({data,window:()=>null,dialog:{showOpenDialog:async()=>({filePaths:[source]})}});
  const plan=await api['music.legacy.preview']();assert.deepEqual([plan.ready,plan.duplicate,plan.missing],[2,1,1]);
  api['music.legacy.cancel'](plan);await assert.rejects(api['music.legacy.import'](plan),/过期/);
  assert.equal((await api['music.list']()).items.length,0);
  const next=await api['music.legacy.preview']();assert.deepEqual(await api['music.legacy.import'](next),{added:2,skipped:0});
  const saved=JSON.parse(await fs.readFile(target,'utf8'));assert.deepEqual(saved.unknown,{n:8});
  assert.equal(saved.items[0].privateAudio,undefined);assert.equal(saved.items[0].url,undefined);
  assert.equal(saved.items[1].title,'本地样本');assert.equal((await api['music.legacy.preview']()).ready,0);
  assert.equal(await fs.readFile(source,'utf8'),original);
});
