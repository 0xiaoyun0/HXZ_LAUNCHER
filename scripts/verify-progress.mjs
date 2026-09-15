import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {once} from 'node:events';import {createHash} from 'node:crypto';import {spawn} from 'node:child_process';
import {inspectPack,extractPack} from '../client/src-electron/core/packs.mjs';
import {prepareLaunch} from '../client/src-electron/core/minecraft.mjs';
const root=path.resolve(import.meta.dirname,'..'),scratch=await fs.mkdtemp(path.join(root,'.test/progress-021-'));
const javaHome='C:/Program Files/Java/jdk-21/bin',cp=[path.join(root,'client/resources/installer/game-installer.jar'),path.join(root,'client/resources/hxzup/updater-1.0.3.jar')].join(path.delimiter);
async function run(command,args){const child=spawn(command,args,{windowsHide:true,shell:false});let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);const [code]=await once(child,'close');assert.equal(code,0,output);return output;}
await run(path.join(javaHome,'javac.exe'),['-encoding','UTF-8','--release','8','-cp',cp,'-d',scratch,path.join(root,'scripts/fixtures/InstallerProgress.java')]);
const bytes=Buffer.alloc(65536,7),hash=createHash('sha1').update(bytes).digest('hex');
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Length':bytes.length});res.write(bytes.subarray(0,32768));setTimeout(()=>res.end(bytes.subarray(32768)),450);});server.listen(0,'127.0.0.1');await once(server,'listening');
try{
 const stdout=await run(path.join(javaHome,'java.exe'),['-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-Dstderr.encoding=UTF-8','-cp',scratch+path.delimiter+cp,'up.hxz.InstallerProgress',path.join(scratch,'minecraft'),'http://127.0.0.1:'+server.address().port+'/file',hash]);
 const events=stdout.split('\n').filter(s=>s.startsWith('HXZ_PROGRESS\t')).map(s=>JSON.parse(s.slice(13)));
 assert.ok(events.some(e=>e.total===2&&e.completed<2&&e.received>0&&e.activeFiles.length>0));assert.equal(events.at(-1).completed,2);assert.equal(events.at(-1).total,2);
 await fs.writeFile(path.join(scratch,'installer-events.json'),JSON.stringify(events,null,2));
 const pack=await inspectPack('E:/QQDOWNLOAD/hxzv3.mrpack'),extracted=[];
 const result=await extractPack(pack,path.join(scratch,'pack'),{onProgress:p=>extracted.push(p)});
 assert.ok(result.hxzup);assert.equal(result.updateUrls.length,3);assert.ok(pack.overrideCount>0);assert.equal(extracted.at(-1).completed,pack.overrideCount);
 const launches=[];await prepareLaunch({root:path.join(root,'.test/import-020/minecraft'),id:'hxzv3-import',java:'C:/Program Files/Java/zulu21.34.19-ca-jdk21.0.3-win_x64/bin/java.exe',settings:{memoryMB:2048},account:{name:'LocalCheck',uuid:'00000000000000000000000000000001',accessToken:'0'},onProgress:p=>launches.push(p)});
 for(const name of ['校验游戏依赖','校验游戏资源']){const phase=launches.filter(p=>p.phase===name);assert.ok(phase.length>0);assert.equal(phase.at(-1).completed,phase.at(-1).total);assert.ok(phase.some(p=>p.activeFiles?.length));}
 await fs.writeFile(path.join(root,'.test/progress-events.json'),JSON.stringify([...events,...extracted,...launches].map(e=>({type:'task',busy:true,...e})),null,2));
 console.log('PASS actual Java installer bytes/files; real mrpack extraction and HXZ UP detection; cached NeoForge launch preparation progress.');
}finally{await new Promise(r=>server.close(r));}
