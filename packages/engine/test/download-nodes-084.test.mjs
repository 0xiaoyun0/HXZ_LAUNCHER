import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {download} from '../core/io.mjs';
import {downloadSources,setDownloadMode} from '../core/sources.mjs';
import {DOWNLOAD_NODES} from '../core/source-health.mjs';

test('a prior file failure cannot move a new file ahead of its official origin',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-nodes084-')),body=Buffer.from('same trusted artifact'),sha1=createHash('sha1').update(body).digest('hex'),hits=[];
 let broken=true;
 const official=http.createServer((req,res)=>{hits.push('official');if(broken)res.writeHead(503);res.end(broken?'temporarily unavailable':body);});
 const mirror=http.createServer((req,res)=>{hits.push('mirror');res.end(body);});
 for(const server of [official,mirror])await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{for(const server of [official,mirror]){server.closeAllConnections();await new Promise(r=>server.close(r));}await fs.rm(root,{recursive:true,force:true});});
 const origin=`http://127.0.0.1:${official.address().port}/file`,backup=`http://127.0.0.1:${mirror.address().port}/file`;
 setDownloadMode('official');
 await download(origin,root+'/first',{urls:[origin,backup],sha1,retryDelay:1,retryBudgetMs:0});assert.deepEqual(hits,[...Array(5).fill('official'),'mirror']);
 hits.length=0;broken=false;
 await download(origin,root+'/second',{urls:[origin,backup],sha1,retryBudgetMs:0});assert.deepEqual(hits,['official']);
});

test('Central regional mirrors preserve the exact coordinate and exclude loader repositories',()=>{
 setDownloadMode('official');
 const coordinate='/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar',raw='https://repo.maven.apache.org/maven2'+coordinate,candidates=downloadSources(raw);
 assert.equal(candidates[0],raw);
 for(const host of ['maven-central.storage-download.googleapis.com','maven-central-eu.storage-download.googleapis.com','maven-central-asia.storage-download.googleapis.com'])assert.ok(candidates.includes('https://'+host+'/maven2'+coordinate));
 for(const loader of ['https://maven.fabricmc.net/net/fabricmc/fabric-loader/0.16.0/fabric-loader-0.16.0.jar','https://maven.neoforged.net/releases/net/neoforged/neoforge/21.1.1/neoforge-21.1.1-installer.jar'])assert.ok(downloadSources(loader).every(url=>!url.includes('googleapis.com')));
 for(const suffix of ['?token=private','#private'])assert.deepEqual(downloadSources(raw+suffix),[raw+suffix]);
});

test('published loader caches remain specific and authlib release mirrors keep the requested version',()=>{
 const coordinate='/net/fabricmc/fabric-loader/0.16.0/fabric-loader-0.16.0.jar';
 assert.ok(downloadSources('https://maven.fabricmc.net'+coordinate).includes('https://repo.spongepowered.org/repository/fabricmc-proxy'+coordinate));
 const quilt='/org/quiltmc/quilt-loader/0.26.4/quilt-loader-0.26.4.jar';
 assert.ok(downloadSources('https://maven.quiltmc.org/repository/release'+quilt).includes('https://repo.spongepowered.org/repository/quiltmc'+quilt));
 const artifact='https://authlib-injector.yushi.moe/artifact/56/authlib-injector-1.2.8.jar',release='https://github.com/yushijinhun/authlib-injector/releases/download/v1.2.8/authlib-injector-1.2.8.jar';
 const urls=downloadSources(artifact);assert.equal(urls[0],artifact);assert.ok(urls.includes(release));
 for(const prefix of ['https://gh-proxy.com/','https://ghproxy.net/'])assert.ok(urls.includes(prefix+release));
 assert.deepEqual(downloadSources('https://authlib-injector.yushi.moe/artifact/latest.json'),['https://authlib-injector.yushi.moe/artifact/latest.json']);
 assert.deepEqual(downloadSources(artifact+'?token=private'),[artifact+'?token=private']);
 for(const base of ['https://repo.nju.edu.cn/maven','https://maven.proxy.ustclug.org/maven2','https://maven.reposilite.com/maven-central'])assert.ok(downloadSources('https://libraries.minecraft.net'+coordinate).includes(base+coordinate));
 const files=DOWNLOAD_NODES.filter(n=>n.purpose==='file');assert.equal(files.length,34);assert.equal(new Set(files.map(n=>n.host)).size,files.length);
 assert.equal(DOWNLOAD_NODES.filter(n=>n.purpose==='metadata').length,5);
});
