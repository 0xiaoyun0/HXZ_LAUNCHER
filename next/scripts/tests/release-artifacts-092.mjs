import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import yauzl from 'yauzl';
import {verifyRelease} from '../../packages/engine/core/update-sources.mjs';
import {UPDATE_PUBLIC_KEY} from '../../packages/engine/core/update-public-key.mjs';
import {updateManifest} from '../../apps/community-server/src/update-trust.mjs';

const version=JSON.parse(await fs.readFile('package.json','utf8')).version,root=path.resolve('release',version);
const digest=async(file,algo,encoding='hex')=>{const h=createHash(algo);for await(const bytes of createReadStream(file))h.update(bytes);return h.digest(encoding);};
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
for(const arch of ['x64','ia32']){
 const envelope=await read(path.join(root,'updates',arch==='x64'?'latest.json':'latest-ia32.json'));
 verifyRelease(envelope,UPDATE_PUBLIC_KEY,arch);const manifest=JSON.parse(Buffer.from(envelope.payload,'base64'));
 assert.equal(manifest.version,version);const file=path.join(root,'windows-'+arch,manifest.files[0].url);assert.equal((await fs.stat(file)).size,manifest.files[0].size);assert.equal(await digest(file,'sha512','base64'),manifest.files[0].sha512);
}
const community=updateManifest(await read(path.join(root,'updates/community-update.json'))),archive=path.join(root,'server',community.file.url);
assert.equal(community.version,version);assert.equal((await fs.stat(archive)).size,community.file.size);assert.equal(await digest(archive,'sha512'),community.file.sha512);
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-artifact092-'));
try{
 const moduleFile=path.join(temporary,'old-update-archive.mjs');await fs.writeFile(moduleFile,execFileSync('git',['show','v0.8.0:next/apps/community-server/src/update-archive.mjs']));
 const old=await import(pathToFileURL(moduleFile));
 const names=await new Promise((resolve,reject)=>yauzl.open(archive,{lazyEntries:true},(e,z)=>{if(e)return reject(e);const items=[];z.on('error',reject);z.on('entry',entry=>{try{assert.ok(old.validEntryName(entry.fileName),'0.8 updater must accept '+entry.fileName);items.push(entry.fileName);z.readEntry();}catch(error){z.close();reject(error);}});z.on('end',()=>resolve(items));z.readEntry();}));
 assert.ok(names.includes('integrations/hxzre/bin/mc-tcp-fec.exe'));assert.ok(names.includes('public/operations092.mjs'));assert.ok(names.includes('src/plugin-market.mjs'));
 const unpacked=path.join(temporary,'unpacked');await old.unpackUpdate(archive,unpacked);
 assert.equal((await read(path.join(unpacked,'package.json'))).version,version);
 assert.ok((await fs.stat(path.join(unpacked,'integrations/hxzre/bin/mc-tcp-fec.exe'))).size>0);
 const androidEnvelope=await read(path.join(root,'updates/android-latest.json')),android=JSON.parse(Buffer.from(androidEnvelope.payload,'base64'));
 const apk=path.join(root,'android',path.basename(android.url));assert.equal(android.versionName,version);assert.equal(android.versionCode,90200);assert.equal(await digest(apk,'sha256'),android.sha256);assert.equal((await fs.stat(apk)).size,android.size);
 const sums=(await fs.readFile(path.join(root,version+'-SHA256SUMS.txt'),'utf8')).trim().split('\n');for(const line of sums){const [expected,rel]=line.split('  ');assert.equal(await digest(path.join(root,rel),'sha256'),expected,rel);}
 console.log('PASS desktop signatures and hashes, Android manifest hash, community signature and actual 0.8 unpacker, '+sums.length+' SHA-256 entries');
}finally{assert.ok(temporary.startsWith(path.join(os.tmpdir(),'hxz-artifact092-')));await fs.rm(temporary,{recursive:true,force:true,maxRetries:5});}
