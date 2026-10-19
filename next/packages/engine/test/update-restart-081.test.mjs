import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createAppUpdate} from '../core/app-update.mjs';

test('a failed automatic installer must not restart the old launcher again after game exit',async t=>{
 const data=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-update-081-'));
 t.after(()=>fs.rm(data,{recursive:true,force:true}));
 t.mock.timers.enable({apis:['Date','setTimeout','setInterval']});
 const app={isPackaged:true,getVersion:()=> '0.8.0',getPath:()=>data};
 let installs=0,busy=true;
 const open=()=>{
  const updater=new EventEmitter();
  updater.setFeedURL=()=>{};
  updater.checkForUpdates=async()=>{updater.emit('update-available',{version:'0.8.1'});return{};};
  updater.downloadUpdate=async()=>{updater.emit('update-downloaded',{version:'0.8.1'});};
  updater.quitAndInstall=()=>{installs++;};
  const manager=createAppUpdate({app,isBusy:()=>busy,emit:()=>{},updater,discover:async()=>({info:{version:'0.8.1'},sources:[{name:'test'}]})});
  return manager;
 };
 const drain=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
 const first=open();first.configure(true);await drain();
 assert.equal(first.status().ready,true);
 t.mock.timers.tick(1000);assert.equal(installs,0);
 busy=false;t.mock.timers.tick(1000);t.mock.timers.tick(16000);
 assert.equal(installs,1,'first idle exit installs once');first.dispose();
 // Installer failed to replace the executable: same old version starts again.
 const restarted=open();restarted.configure(true);await drain();
 t.mock.timers.tick(1000);t.mock.timers.tick(16000);
 assert.equal(installs,1,'failed installation must require explicit retry, not restart forever');
 restarted.dispose();
});
