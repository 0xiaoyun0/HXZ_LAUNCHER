import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import yauzl from 'yauzl';
import {androidRelease,apkName,releasePackage,releaseSigner,supportedAbis} from './release-info.mjs';

export async function verifyApk(file,abi,pin,info){
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
  assert.deepEqual(meta.upstream,pin);
  for(const key of ['version','build','versionCode'])assert.equal(meta[key],info[key],key);
  for(const name of ['AndroidManifest.xml','classes.dex','assets/controllers/00000000.json','assets/town/index.html','assets/town/linking/index.html','assets/town/server-presets.json','assets/town/FCL-LICENSE.txt','assets/town/OPUS-LICENSE.txt','assets/town/media/town/town-hall.webp','lib/'+abi+'/libfcl.so','lib/'+abi+'/libgl4es_114.so','lib/'+abi+'/libng_gl4es.so','lib/'+abi+'/libpojavexec.so'])assert.ok(names.has(name),name);
  for(const renderer of ['libglxshim.so','libEGL_mesa.so','libmobileglues.so'])assert.ok(names.has('lib/'+abi+'/'+renderer),abi+' '+renderer);
  for(const jre of [8,17,21,25]){
    const root='assets/app_runtime/java/jre'+jre+'/';
    const expected=root+'bin-'+(abi==='arm64-v8a'?'arm64':'x86_64')+'.tar.xz';
    assert.deepEqual([...names].filter(n=>n.startsWith(root+'bin-')),[expected]);assert.ok(names.has(root+'universal.tar.xz'));
  }
  assert.ok([...names].some(n=>n.startsWith('assets/app_runtime/lwjgl/')&&n.endsWith('/'+abi+'/liblwjgl.so')),abi+' LWJGL');
}
export async function verifyReleaseApk(file,abi,pin,release){
  await verifyApk(file,abi,pin,release);
  const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
  assert.ok(sdk,'验证正式 APK 需要 Android SDK 35');
  const tools=path.join(sdk,'build-tools','35.0.0');
  const extension=process.platform==='win32'?'.exe':'';
  const java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin','java'+extension):'java';
  const run=(tool,args)=>execFileSync(tool,args,{encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
  const info=run(path.join(tools,'aapt'+extension),['dump','badging',file]);
  const pkg=/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m.exec(info);
  assert.ok(pkg,'无法读取 APK 应用标识');
  assert.equal(pkg[1],releasePackage);
  assert.equal(Number(pkg[2]),release.versionCode);
  assert.equal(pkg[3],release.versionName);
  assert.doesNotMatch(info,/^application-debuggable/m);
  assert.deepEqual(/^native-code: +(.*)$/m.exec(info)?.[1].trim(),"'"+abi+"'");
  const signature=run(java,['-jar',path.join(tools,'lib','apksigner.jar'),'verify','--verbose','--print-certs',file]);
  const signers=Array.from(signature.matchAll(/^Signer #\d+ certificate SHA-256 digest: ([a-f0-9]+)\s*$/gmi),m=>m[1].toLowerCase());
  assert.deepEqual(signers,[releaseSigner],'正式 APK 签名须与原版 0.9.2 一致');
  assert.match(signature,/Verified using v2 scheme .*: true/);
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const root=new URL('../../',import.meta.url),release=androidRelease(JSON.parse(await fs.readFile(new URL('package.json',root))));
  const pin=JSON.parse(await fs.readFile(new URL('upstream.json',import.meta.url)));
  const official=process.argv.includes('--release');
  for(const abi of supportedAbis){
    const file=new URL('release/'+release.id+'/android/'+apkName(release,abi,official?'release':'debug'),root);
    await (official?verifyReleaseApk:verifyApk)(fileURLToPath(file),abi,pin,release);
    console.log(abi+' · FCL 来源、JNI、触控、四套 JRE、LWJGL 与社区资源已核对'+(official?'；正式签名、包名及版本号通过':''));
  }
}
