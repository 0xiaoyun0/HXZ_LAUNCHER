// Also executed by the actual Electron 22 ia32 / Node 16 runtime.
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
if(!globalThis.fetch){const {createRequire}=require('node:module');const legacy=createRequire(path.resolve(__dirname,'../tools/legacy/package.json'));Object.assign(globalThis,legacy('undici'));}
require('../scripts/legacy-polyfills.cjs');
(async()=>{
 const {createServices}=await import('../src-electron/core/services.mjs');
 const {chooseGameDrive}=await import('../src-electron/core/game-storage.mjs');
 assert.equal(chooseGameDrive([{name:'C:',free:1e12},{name:'D:',free:10e9},{name:'F:',free:100e9}]),'F:');
 assert.equal(chooseGameDrive([{name:'C:',free:1e12}]),'');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-storage-045-')),game=path.join(root,'HXZ-minecraft/.minecraft'),id='中文实例';let service;
 try{
  await fs.mkdir(path.join(game,'versions',id),{recursive:true});await fs.mkdir(path.join(game,'assets'));
  await fs.writeFile(path.join(game,'versions',id,id+'.json'),JSON.stringify({id,mainClass:'fixture'}));
  await fs.writeFile(path.join(game,'assets','shared'),'keep');
  await fs.writeFile(path.join(root,'settings.json'),JSON.stringify({gameRoot:game,communityUrl:'http://127.0.0.1:9'}));
  service=await createServices({data:root,resources:root,safeStorage:{isEncryptionAvailable:()=>false},emit(){}});
  const preferences={instancesCollapsed:true,chinesePaths:false,confirmUnsaved:false,theme:'dark',accentColor:'#abc123',backgroundPositionX:23,showLinking:true};
  const saved=await service.invoke('settings.save',preferences);
  for(const [key,value] of Object.entries(preferences))assert.equal(saved[key],value,key);
  await assert.rejects(()=>service.invoke('settings.save',{theme:'light',accentColor:'#ffffff',instancesCollapsed:false,voiceMode:'invalid'}));
  const unchanged=await service.invoke('settings.save',{});
  for(const [key,value] of Object.entries(preferences))assert.equal(unchanged[key],value,'atomic '+key);
  await service.invoke('instance.delete',{id,mode:'logical',confirmed:true});assert((await service.invoke('instance.deleted')).some(i=>i.id===id));
  assert.equal((await fs.stat(path.join(game,'versions',id))).isDirectory(),true);
  await service.invoke('instance.restore',{id});assert.equal((await service.invoke('instance.deleted')).length,0);
  await assert.rejects(()=>service.invoke('instance.delete',{id:'../assets',mode:'physical',confirmed:true}));
  await service.invoke('instance.delete',{id,mode:'physical',confirmed:true});
  await assert.rejects(()=>fs.stat(path.join(game,'versions',id)),{code:'ENOENT'});assert.equal(await fs.readFile(path.join(game,'assets','shared'),'utf8'),'keep');
  console.log('Storage/delete/Unicode passed on '+process.versions.node+' '+process.arch);
 }finally{service?.dispose();await fs.rm(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
