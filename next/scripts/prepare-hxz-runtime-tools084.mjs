import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import yauzl from 'yauzl';

const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const AUTH={version:'1.2.8',commit:'5437f5b465ee3f5be0a1e5e1ae3c50978114f6fb',
  jar:'https://authlib-injector.yushi.moe/artifact/56/authlib-injector-1.2.8.jar',
  authority:'https://authlib-injector.yushi.moe/artifact/latest.json',
  sha256:'9c7f4343e6c82034958ffb48c14a2cb0c85928be7283103ce17da00c6d5a7b10',
  source:'https://codeload.github.com/yushijinhun/authlib-injector/zip/5437f5b465ee3f5be0a1e5e1ae3c50978114f6fb',
  sourceSha256:'be3c56d65dcb51c75662ef3fc68c9daf5bc19f2354b76a3d76ab7ddfc6ad60ba'};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const slash=value=>value.split(path.sep).join('/');

async function fetchPinned(url,file,sha256,{offline=false}={}) {
  try {const saved=await fs.readFile(file);if(hash(saved)===sha256)return;}catch(error){if(error.code!=='ENOENT')throw error;}
  if(offline)throw Error(`Missing pinned upstream file in offline mode: ${file}`);
  const response=await fetch(url,{signal:AbortSignal.timeout(40000),headers:{'User-Agent':'HXZ-IndependentRuntime/0.8.4'}});
  if(!response.ok)throw Error(`HTTP ${response.status}: ${url}`);
  const chunks=[];let length=0;for await(const part of response.body) {length+=part.length;if(length>32*1024*1024)throw Error(`Pinned upstream file exceeds limit: ${url}`);chunks.push(Buffer.from(part));}
  const bytes=Buffer.concat(chunks);if(hash(bytes)!==sha256)throw Error(`Pinned upstream SHA256 mismatch: ${url}`);
  await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);
}
async function zipFiles(file,predicate) {
  return new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(error,zip)=>{
    if(error)return reject(error);const result=new Map();let count=0;
    zip.on('error',reject);zip.on('end',()=>resolve(result));zip.on('entry',entry=>{
      if(++count>30000){zip.close();reject(Error('Archive entry count exceeds limit'));return;}
      if(!predicate(entry.fileName)){zip.readEntry();return;}
      if(entry.uncompressedSize>4*1024*1024){zip.close();reject(Error('License entry exceeds limit'));return;}
      zip.openReadStream(entry,(error,stream)=>{
        if(error){reject(error);zip.close();return;}const parts=[];let length=0;
        stream.on('data',part=>{length+=part.length;if(length>4*1024*1024)stream.destroy(Error('License entry exceeds limit'));else parts.push(part);});
        stream.on('error',reject);stream.on('end',()=>{result.set(entry.fileName,Buffer.concat(parts));zip.readEntry();});
      });
    });zip.readEntry();
  }));
}
/** Fixed upstream agent plus unmodified current project tools. This is a development lock refresh. */
export async function prepareRuntimeTools({repo=REPO,offline=false}={}) {
  const base=path.join(repo,'.runtime/hxz-runtime-upstream/tools'),artifacts=path.join(base,'artifacts');
  const jar=path.join(artifacts,'authlib-injector-1.2.8.jar'),source=path.join(artifacts,'authlib-injector-1.2.8-source.zip');
  await fetchPinned(AUTH.jar,jar,AUTH.sha256,{offline});await fetchPinned(AUTH.source,source,AUTH.sourceSha256,{offline});
  const stage=path.join(base,'input/app_runtime');await fs.mkdir(stage,{recursive:true});const rows=[];
  const add=async(relative,component,bytes,origin,role)=>{
    if(!/^[A-Za-z0-9_./+-]+$/.test(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Invalid tool output path');
    const file=path.join(stage,...relative.split('/'));await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);
    rows.push({path:relative,file:slash(path.relative(repo,file)),sha256:hash(bytes),size:bytes.length,component,status:'ready',role,origin});
  };
  await add('tools/updater-launcher.jar','hxzup',await fs.readFile(path.join(repo,'resources/hxzup/updater-launcher.jar')),'resources/hxzup/updater-launcher.jar','binary');
  await add('tools/direct-lobby.jar','direct-lobby',await fs.readFile(path.join(repo,'resources/direct-lobby/direct-lobby.jar')),'resources/direct-lobby/direct-lobby.jar','binary');
  await add('tools/authlib-injector.jar','authlib-injector',await fs.readFile(jar),AUTH.jar,'binary');
  await add('licenses/hxzup/LICENSE','hxzup',await fs.readFile(path.join(repo,'LICENSE')),'LICENSE','license');
  await add('licenses/direct-lobby/LICENSE','direct-lobby',await fs.readFile(path.join(repo,'LICENSE')),'LICENSE','license');
  await add('licenses/runtime-build/LICENSE','runtime-build',await fs.readFile(path.join(repo,'LICENSE')),'LICENSE','license');
  const buildDirectory=path.join(repo,'mobile/runtime/upstream-build');
  for(const name of (await fs.readdir(buildDirectory)).sort()) {
    const file=path.join(buildDirectory,name);if(!(await fs.lstat(file)).isFile())throw Error('Runtime build source must be a regular file: '+name);
    await add('sources/runtime-build/'+name,'runtime-build',await fs.readFile(file),'mobile/runtime/upstream-build/'+name,'source');
  }
  for(const name of (await fs.readdir(path.join(repo,'resources/installer/src/up/hxz'))).filter(name=>name.endsWith('.java')).sort())
    await add('sources/hxzup/installer/'+name,'hxzup',await fs.readFile(path.join(repo,'resources/installer/src/up/hxz',name)),'resources/installer/src/up/hxz/'+name,'source');
  for(const name of ['IO.java','Rules.java'])await add('sources/hxzup/updater-base/'+name,'hxzup',await fs.readFile(path.join(repo,'mobile/runtime/updater-base',name)),'mobile/runtime/updater-base/'+name,'source');
  await add('sources/direct-lobby/DirectLobbyAgent.java','direct-lobby',await fs.readFile(path.join(repo,'resources/direct-lobby/src/top/hxz/DirectLobbyAgent.java')),'resources/direct-lobby/src/top/hxz/DirectLobbyAgent.java','source');
  await add('sources/authlib-injector/authlib-injector-1.2.8-source.zip','authlib-injector',await fs.readFile(source),AUTH.source,'source');
  const prefix=`authlib-injector-${AUTH.commit}/`;
  for(const [name,bytes] of await zipFiles(source,name=>[prefix+'COPYING.md',prefix+'AGPLv3-with-authlib-injector-exception.txt',prefix+'CC-BY-SA-4.0.txt'].includes(name)))
    await add('licenses/authlib-injector/'+name.slice(prefix.length),'authlib-injector',bytes,AUTH.source+'#'+name,'license');
  for(const [component,file] of [['hxzup',path.join(repo,'resources/hxzup/updater-launcher.jar')],['authlib-injector',jar]])
    for(const [name,bytes] of await zipFiles(file,name=>name==='META-INF/THIRD-PARTY-NOTICES.txt'||(/^META-INF\/licenses\/[^/]+$/.test(name))))
      await add('licenses/'+component+'/bundled/'+name.slice(name.lastIndexOf('/')+1),component,bytes,(component==='hxzup'?'resources/hxzup/updater-launcher.jar':AUTH.jar)+'#'+name,'license');
  if(!rows.some(row=>row.path==='licenses/authlib-injector/AGPLv3-with-authlib-injector-exception.txt'))throw Error('Full authlib-injector license absent from source');
  const published={version:AUTH.version,sourceCommit:AUTH.commit,download_url:AUTH.jar,checksums:{sha256:AUTH.sha256},authority:AUTH.authority,
    source_url:AUTH.source,source_sha256:AUTH.sourceSha256,license:'AGPL-3.0-or-later WITH AUTHLIB-INJECTOR-exception',unmodified:true};
  await add('provenance/authlib-injector-published.json','authlib-injector',Buffer.from(JSON.stringify(published,null,2)+'\n'),AUTH.authority,'provenance');
  rows.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  const lock={schemaVersion:1,kind:'hxz-runtime-tools',requiredComponents:['hxzup','direct-lobby','authlib-injector','runtime-build'].map(id=>({id,status:'ready'})),
    artifacts:[{id:'authlib-injector-1.2.8',...published,status:'ready'},
      {id:'hxzup',kind:'project-tool',file:'resources/hxzup/updater-launcher.jar',license:'Apache-2.0; embedded Gson Apache-2.0',status:'ready',sourceCoverage:'Repository maintained installer sources and updater IO/Rules; pre-existing bootstrap classes are not claimed rebuilt by this script.'},
      {id:'direct-lobby',kind:'project-tool',file:'resources/direct-lobby/direct-lobby.jar',license:'Apache-2.0',status:'ready',source:'resources/direct-lobby/src/top/hxz/DirectLobbyAgent.java'},
      {id:'runtime-build',kind:'project-build-sources',source:'mobile/runtime/upstream-build',license:'Apache-2.0 for independent build scripts; upstream notices retained',status:'ready'}],
    stagedFiles:rows};
  await fs.mkdir(path.join(repo,'mobile/runtime'),{recursive:true});await fs.writeFile(path.join(repo,'mobile/runtime/tools.lock.json'),JSON.stringify(lock,null,2)+'\n');
  return {lock:path.join(repo,'mobile/runtime/tools.lock.json'),stage,files:rows.length,authlibSha256:AUTH.sha256};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const unknown=process.argv.slice(2).filter(arg=>arg!=='--offline');if(unknown.length)throw Error('Usage: node scripts/prepare-hxz-runtime-tools084.mjs [--offline]');
  console.log(JSON.stringify(await prepareRuntimeTools({offline:process.argv.includes('--offline')}),null,2));
}
