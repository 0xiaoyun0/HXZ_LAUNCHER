import fs from 'node:fs/promises';
import {createReadStream, createWriteStream} from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import yauzl from 'yauzl';
import yazl from 'yazl';

const version=process.env.HXZ_ANDROID_VERSION||'0.9.0';
const build=process.env.HXZ_ANDROID_VERSION_CODE||'90001';
const root=path.resolve('.runtime/android-patch-090');
const input=path.resolve('mobile/android/app/build/outputs/apk/release/app-release.apk');
const web=path.resolve('mobile/web/dist');
const output=path.resolve(`release/${version}/android/HXZ-Community-Android-${version}-${build}.apk.unaligned`);

await fs.rm(root,{recursive:true,force:true});
await fs.mkdir(root,{recursive:true});

function extractArchive(file,destination){
  return new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(error,archive)=>{
    if(error)return reject(error);
    archive.on('error',reject);
    archive.on('entry',entry=>{
      const name=entry.fileName.replaceAll('\\','/');
      // APK signatures are invalid after changing assets; apksigner adds fresh ones.
      if(name.startsWith('META-INF/')||name.endsWith('/')){archive.readEntry();return;}
      // Keep native/classes/resources from the existing verified APK, then replace
      // the complete web asset tree with the current mobile build.
      if(name.startsWith('assets/')&&name!=='assets/hxz-game-probe.jar'){
        archive.readEntry();
        return;
      }
      const target=path.join(destination,...name.split('/'));
      if(!target.startsWith(destination+path.sep))return reject(new Error('Unsafe APK entry '+name));
      fs.mkdir(path.dirname(target),{recursive:true}).then(()=>archive.openReadStream(entry,(streamError,stream)=>{
        if(streamError)return reject(streamError);
        pipeline(stream,createWriteStream(target)).then(()=>archive.readEntry()).catch(reject);
      })).catch(reject);
    });
    archive.on('end',resolve);
    archive.readEntry();
  }));
}

await extractArchive(input,root);
await fs.mkdir(path.join(root,'assets'),{recursive:true});

async function copyTree(source,target){
  await fs.mkdir(target,{recursive:true});
  for(const entry of await fs.readdir(source,{withFileTypes:true})){
    const from=path.join(source,entry.name),to=path.join(target,entry.name);
    if(entry.isDirectory())await copyTree(from,to);
    else if(entry.isFile())await fs.copyFile(from,to);
  }
}
await copyTree(web,path.join(root,'assets'));

await fs.mkdir(path.dirname(output),{recursive:true});
const zip=new yazl.ZipFile();
const writing=pipeline(zip.outputStream,createWriteStream(output));
async function add(directory,relative=''){
  for(const entry of (await fs.readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const source=path.join(directory,entry.name),name=relative+entry.name;
    if(entry.isDirectory())await add(source,name+'/');
    else if(entry.isFile())zip.addFile(source,name);
  }
}
await add(root);zip.end();await writing;
console.log(`patched APK archive: ${output}`);
