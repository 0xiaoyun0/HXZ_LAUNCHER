import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {_electron} from 'playwright-core';
import {validatePluginPackage} from '../../server/shared/plugin-package.mjs';

const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const source=await fs.readFile(`release/${version}/plugin-sdk/hxz-example-banner-1.0.0.hxzplugin`,'utf8'),plugin=validatePluginPackage(source);
const targets=[
 ['x64-portable',`release/${version}/windows-x64/portable/幻想镇 NEXT.exe`],
 ['ia32-portable',`release/${version}/windows-ia32/portable/幻想镇 NEXT.exe`],
 ['x64-installed','.runtime/installers/x64/output/win-unpacked/幻想镇启动器.exe'],
 ['ia32-installed','.runtime/installers/ia32/output/win-ia32-unpacked/幻想镇启动器.exe']
];
await fs.mkdir('.preview/screens',{recursive:true});
for(const [kind,executable]of targets.filter(v=>!process.env.HXZ_SMOKE_TARGET||v[0]===process.env.HXZ_SMOKE_TARGET)){
 console.log('Checking '+kind);
 const data=await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'hxz-desktop092-'));let app;
 try{
  const dir=path.join(data,'plugins',plugin.manifest.id);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'package.hxzplugin'),source);
  await fs.writeFile(path.join(data,'plugins/installed.json'),JSON.stringify({[plugin.manifest.id]:{manifest:plugin.manifest,sha256:plugin.sha256,enabled:true}}));
  await fs.writeFile(path.join(data,'settings.json'),JSON.stringify({autoCheckUpdates:false,autoReportErrors:false,onboardingDone:true,gameRoot:path.join(data,'game')}));
  const environment={...process.env,HXZ_NEXT_HOME:data,HXZ_NEXT_VERIFY:'1'};delete environment.ELECTRON_RUN_AS_NODE;
  app=await _electron.launch({executablePath:await fs.realpath(executable),env:environment,timeout:30000});
  const run=code=>app.evaluate(async({BrowserWindow},code)=>{const win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('index.html'));if(!win)return null;return win.webContents.executeJavaScript(code);},code);
  let ready=false;for(let i=0;i<120;i++){if(await run("!!document.querySelector('.hxz-example-banner')").catch(()=>false)){ready=true;break;}await new Promise(r=>setTimeout(r,100));}assert.equal(ready,true,'plugin renderer should run');
  assert.equal(await app.evaluate(({app})=>app.getVersion()),version);
  const status=await run("window.launcher.invoke('state',{localOnly:true})");assert.equal(status.ok,true);assert.equal(status.value.settings.keepLauncherAvailable,true);assert.deepEqual(status.value.sessions,[]);
  const plugins=await run("window.launcher.invoke('plugins.list')");assert.equal(plugins.value.items[0].enabled,true);assert.equal(plugins.value.items[0].error,'');
  const stopped=await run("window.launcher.invoke('plugins.disable',{id:"+JSON.stringify(plugin.manifest.id)+"})");assert.equal(stopped.ok,true);assert.equal(await run("!!document.querySelector('.hxz-example-banner')"),false);
  await new Promise(r=>setTimeout(r,500));
  const screenshot=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));await fs.writeFile('.preview/screens/desktop092-'+kind+'.png',Buffer.from(screenshot,'base64'));
  console.log('PASS '+kind+' version, native IPC, plugin activation/render/disposal and default sessions');
 }finally{await app?.close();assert.ok(data.startsWith(path.join(await fs.realpath(os.tmpdir()),'hxz-desktop092-')));await fs.rm(data,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
}
