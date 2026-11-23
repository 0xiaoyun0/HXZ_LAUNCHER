import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import yauzl from 'yauzl';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await fs.readFile(new URL('runtime-files.json',import.meta.url),'utf8'));
async function digest(file){const hash=createHash('sha256');for await(const part of createReadStream(file))hash.update(part);return hash.digest('hex');}
const missing=new Map();
for(const entry of manifest.files){
 const dest=path.join(root,entry.path);
 if(await digest(dest).catch(()=>'')!==entry.sha256)missing.set(entry.entry,{...entry,dest});
}
if(missing.size){
 const name='HXZ-Launcher-0.9.2-source.zip', cache=path.join(root,'.runtime/vendor');
 await fs.mkdir(cache,{recursive:true});
 const file=process.env.HXZ092_SOURCE||path.join(cache,name);
 if(!process.env.HXZ092_SOURCE&&!await fs.access(file).then(()=>true,()=>false)){
   const temp=path.join(cache,randomUUID()+'.tmp');
   try{
    const response=await fetch('https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v0.9.2/'+name,{signal:AbortSignal.timeout(300000)});
    if(!response.ok)throw Error('下载旧运行组件失败。可通过 HXZ092_SOURCE 指定离线源码包。');
    await pipeline(response.body,createWriteStream(temp,{flags:'wx'}));if(await digest(temp)!==manifest.archiveSha256)throw Error('旧源码包校验失败');
    await fs.rename(temp,file);
   }finally{await fs.rm(temp,{force:true});}
 }
 if(await digest(file)!==manifest.archiveSha256)throw Error('0.9.2 源码包 SHA-256 不匹配');
 const zip=await new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(e,v)=>e?reject(e):resolve(v)));
 await new Promise((resolve,reject)=>{
   zip.on('error',reject);zip.on('end',resolve);zip.on('entry',entry=>{
     const target=missing.get(entry.fileName);if(!target){zip.readEntry();return;}
     (async()=>{
       const stream=await new Promise((ok,fail)=>zip.openReadStream(entry,(e,v)=>e?fail(e):ok(v)));
       await fs.mkdir(path.dirname(target.dest),{recursive:true});const temp=target.dest+'.'+randomUUID()+'.tmp';
       try{await pipeline(stream,createWriteStream(temp,{flags:'wx'}));if(await digest(temp)!==target.sha256)throw Error('组件指纹不匹配 '+target.path);await fs.rename(temp,target.dest);}
       finally{await fs.rm(temp,{force:true});}
       missing.delete(entry.fileName);zip.readEntry();
     })().catch(e=>{zip.close();reject(e);});
   });zip.readEntry();
 });
 if(missing.size)throw Error('源码包缺少所需的运行组件');
}
