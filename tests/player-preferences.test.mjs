import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createServices} from '../packages/engine/core/services.mjs';
import {installedLibrary} from '../engine/installed-game-root.mjs';
import {requestedHeap,controlledHeapArgs} from '../packages/engine/core/memory-policy.mjs';

test('0.9.2 manual heap and disabled FEC survive the first start, later edits and restart',async t=>{
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-player-prefs-'));
  t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
  const legacy=path.join(tmp,'幻想镇启动器'),home=path.join(tmp,'third'),root=path.join(tmp,'game');
  await Promise.all([legacy,home,path.join(root,'versions','world')].map(p=>fs.mkdir(p,{recursive:true})));
  const original=JSON.stringify({gameRoot:root,memoryMode:'manual',defaultMemoryMB:7168,fecEnabled:false,communityRelayEnabled:false,instanceSettings:{world:{memoryMode:'inherit',memoryMB:4096}},otherFutureSetting:'untouched'});
  await fs.writeFile(path.join(legacy,'settings.json'),original);
  const open=()=>createServices({data:home,resources:home,initialLibrary:()=>installedLibrary(tmp),emit(){},window:()=>null,safeStorage:{isEncryptionAvailable:()=>false}});
  let service=await open();
  try{
    let settings=(await service.invoke('state',{localOnly:true})).settings;
    assert.equal(settings.fecEnabled,false);
    assert.equal(requestedHeap(settings,settings.instanceSettings.world,16384,12000),7168);
    await service.invoke('settings.save',{fecEnabled:true,communityRelayEnabled:true});
    settings=await service.invoke('settings.save',{fecEnabled:false,communityRelayEnabled:false,memoryMode:'manual',defaultMemoryMB:6144});
    assert.equal(settings.fecEnabled,false);
    assert.equal(settings.communityRelayEnabled,false);
    await service.dispose();service=await open();
    settings=(await service.invoke('state',{localOnly:true})).settings;
    assert.equal(settings.fecEnabled,false);
    assert.equal(requestedHeap(settings,settings.instanceSettings.world,16384,12000),6144);
    assert.deepEqual(controlledHeapArgs(['-Xmx4096M','-XX:MaxHeapSize=4096M','-Xms8192M'],6144),['-Xms6144M']);
    assert.equal(await fs.readFile(path.join(legacy,'settings.json'),'utf8'),original);
  }finally{await service.dispose();}
});
