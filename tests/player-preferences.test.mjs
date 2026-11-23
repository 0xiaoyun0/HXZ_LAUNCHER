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

test('independent settings survive concurrent writes, failed edits and a cold start',async t=>{
  const home=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-setting-roundtrip-'));
  t.after(()=>fs.rm(home,{recursive:true,force:true}));
  await fs.writeFile(path.join(home,'settings.json'),JSON.stringify({futureField:{revision:13}}));
  const open=()=>createServices({data:home,resources:home,emit(){},window:()=>null,safeStorage:{isEncryptionAvailable:()=>false}});
  let service=await open();
  const preferences={
    animationSpeed:0,fontSize:20,memoryMode:'manual',defaultMemoryMB:6656,downloadConcurrency:16,
    downloadSpeedMBps:2,downloadMode:'domestic',fecEnabled:false,communityRelayEnabled:false,
    hxzupPopup:false,promptJavaDownload:false,autoCheckUpdates:false,gameWindowAction:'keep',
    keepLauncherAvailable:true,gameSleep:false,memoryOptimization:false,shortcutEnabled:false,
    confirmUnsaved:false,chinesePaths:false,showCover:false,autoReportErrors:false,
    voiceOverlay:true,voiceMode:'push-to-talk',voiceKey:'KeyV',voiceSounds:false,chatHistoryDays:7,
    musicVolume:0,musicPlayMode:'shuffle',videoQuality:'efficient',onboardingDone:true,
    communityUrl:'https://example.org',libraryView:'cards'
  };
  try{
    await Promise.all(Object.entries(preferences).map(([key,value])=>service.invoke('settings.save',{[key]:value})));
    await service.invoke('settings.save',{cardStyle:{opacity:.7,radius:18,color:'#365578',gap:19}});
    await service.invoke('settings.save',{cardStyle:{gap:22}});
    await assert.rejects(service.invoke('settings.save',{defaultMemoryMB:1,fontSize:14}));
    await service.dispose();service=await open();
    const {settings}=await service.invoke('state',{localOnly:true});
    for(const [key,value] of Object.entries(preferences))assert.deepEqual(settings[key],value,key);
    assert.deepEqual(settings.cardStyle,{opacity:.7,radius:18,color:'#365578',gap:22});
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(home,'settings.json'),'utf8')).futureField,{revision:13});
  }finally{await service.dispose();}
});
