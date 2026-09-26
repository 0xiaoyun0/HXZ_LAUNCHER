import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {beginInstall} from '../src-electron/core/install-jobs.mjs';
import {prepareLaunch} from '../src-electron/core/minecraft.mjs';
import {writeJSON} from '../src-electron/core/io.mjs';

test('deleted upgrade target can be reinstalled using the retained verified stage',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-045-recovery-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const id='中文 实例',target=path.join(root,'versions',id),request={gameVersion:'1.21.1',loader:{type:'',version:''}};
  await writeJSON(path.join(target,id+'.json'),{id});
  const original=await beginInstall(root,id,request,null,{upgrade:true});
  await fs.writeFile(path.join(original.stage,'verified.jar'),'verified contents');
  await original.save('failed','EPERM: replacement denied');
  await fs.rm(target,{recursive:true});
  const retry=await beginInstall(root,id,request,null,{});
  assert.equal(await fs.readFile(path.join(retry.stage,'verified.jar'),'utf8'),'verified contents');
  await retry.commit();
  assert.equal(await fs.readFile(path.join(target,'verified.jar'),'utf8'),'verified contents');
});

test('upgrade request after manual removal does not copy from a missing directory',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-045-missing-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const job=await beginInstall(root,'removed',{gameVersion:'1.21.1'},null,{upgrade:true});
  await fs.writeFile(path.join(job.stage,'verified.jar'),'fresh');
  await job.commit();
  assert.equal(await fs.readFile(path.join(job.target,'verified.jar'),'utf8'),'fresh');
});

test('completed publication journal does not block the next upgrade',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-045-journal-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const job=await beginInstall(root,'retained',{gameVersion:'1.21'},null,{});
  await fs.writeFile(path.join(job.stage,'save.dat'),'keep');
  await job.save('committing');
  await fs.mkdir(path.dirname(job.target),{recursive:true});
  await fs.rename(job.stage,job.target);
  const next=await beginInstall(root,'retained',{gameVersion:'1.21.1'},null,{upgrade:true});
  assert.equal(await fs.readFile(path.join(next.stage,'save.dat'),'utf8'),'keep');
  assert.equal(await fs.readFile(path.join(job.target,'save.dat'),'utf8'),'keep');
});

test('actual x64 launch excludes x86 Maven native artifacts with extension suffix',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxzl-045-native-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const libraries=[];
  for(const classifier of ['natives-windows','natives-windows-x86']){
    const file=`org/lwjgl/lwjgl/3.4.1/lwjgl-3.4.1-${classifier}.jar`;
    await fs.mkdir(path.dirname(path.join(root,'libraries',file)),{recursive:true});
    await fs.writeFile(path.join(root,'libraries',file),'native fixture');
    libraries.push({name:`org.lwjgl:lwjgl:3.4.1:${classifier}@jar`,downloads:{artifact:{path:file,url:''}}});
  }
  await writeJSON(path.join(root,'versions/原版/原版.json'),{id:'原版',javaVersion:{majorVersion:21},mainClass:'net.minecraft.client.main.Main',libraries,arguments:{jvm:['-cp','${classpath}'],game:[]}});
  await fs.writeFile(path.join(root,'versions/原版/原版.jar'),'fixture');
  const result=await prepareLaunch({root,id:'原版',java:process.env.HXZ_TEST_JAVA||'C:/Program Files/Java/jdk-21/bin/java.exe',settings:{},account:{name:'Fixture',uuid:'test',accessToken:'test'}});
  const cp=result.args[result.args.indexOf('-cp')+1];
  assert.ok(!cp.includes('natives-windows-x86'),'x86 native artifact leaked into the real x64 classpath');
  assert.ok(cp.includes('natives-windows.jar'));
  assert.ok(result.args.some(a=>a.includes('.hxzl'+path.sep+'natives-x64')),'native cache must be isolated by actual Java architecture');
});
