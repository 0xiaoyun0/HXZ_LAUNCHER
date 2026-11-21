import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import yauzl from 'yauzl';

export async function verifyApk(file,abi,pin,version){
  const zip=await new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(error,zip)=>error?reject(error):resolve(zip)));
  const names=new Set(),abis=new Set();
  let source;
  try{
    await new Promise((resolve,reject)=>{
      zip.once('error',reject);zip.once('end',resolve);
      zip.on('entry',entry=>{
        const name=entry.fileName;names.add(name);
        if(name.startsWith('lib/'))abis.add(name.split('/')[1]);
        if(name!=='assets/town/source.json'){zip.readEntry();return;}
        if(entry.uncompressedSize>8192){reject(Error('APK 来源记录过大'));return;}
        zip.openReadStream(entry,(error,stream)=>{
          if(error){reject(error);return;}
          const chunks=[];stream.on('error',reject);
          stream.on('data',chunk=>chunks.push(chunk));stream.on('end',()=>{source=Buffer.concat(chunks).toString('utf8');zip.readEntry();});
        });
      });zip.readEntry();
    });
  }finally{zip.close();}
  assert.deepEqual([...abis],[abi],file+' native ABI');
  const meta=JSON.parse(source);
  assert.deepEqual(meta.upstream,pin);assert.equal(meta.version,version);
  for(const name of ['AndroidManifest.xml','classes.dex','assets/controllers/00000000.json','assets/town/index.html','assets/town/town-mark.svg','assets/town/linking/index.html','assets/town/server-presets.json','assets/town/FCL-LICENSE.txt','lib/'+abi+'/libfcl.so','lib/'+abi+'/libgl4es_114.so','lib/'+abi+'/libng_gl4es.so','lib/'+abi+'/libpojavexec.so'])assert.ok(names.has(name),name);
  for(const renderer of ['libglxshim.so','libEGL_mesa.so','libmobileglues.so'])assert.ok(names.has('lib/'+abi+'/'+renderer),abi+' '+renderer);
  for(const jre of [8,17,21,25]){
    const root='assets/app_runtime/java/jre'+jre+'/';
    const expected=root+'bin-'+(abi==='arm64-v8a'?'arm64':'x86_64')+'.tar.xz';
    assert.deepEqual([...names].filter(n=>n.startsWith(root+'bin-')),[expected]);assert.ok(names.has(root+'universal.tar.xz'));
  }
  assert.ok([...names].some(n=>n.startsWith('assets/app_runtime/lwjgl/')&&n.endsWith('/'+abi+'/liblwjgl.so')),abi+' LWJGL');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const root=new URL('../../',import.meta.url),{version}=JSON.parse(await fs.readFile(new URL('package.json',root)));
  const pin=JSON.parse(await fs.readFile(new URL('upstream.json',import.meta.url)));
  for(const abi of ['arm64-v8a','x86_64']){
    const file=new URL('release/'+version+'/android/HXZ-FCL-'+version+'-'+abi+'-debug.apk',root);
    const {fileURLToPath}=await import('node:url');
    await verifyApk(fileURLToPath(file),abi,pin,version);
    console.log(abi+' · FCL 来源、JNI、触控、四套 JRE、LWJGL 与社区资源已核对');
  }
}
