import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';

const root=path.resolve('release/0.9.0/android');
const unaligned=path.join(root,'HXZ-Community-Android-0.9.0-90000.apk.unaligned');
const aligned=path.join(root,'HXZ-Community-Android-0.9.0-90000.apk.aligned');
const output=path.join(root,'HXZ-Community-Android-0.9.0-90000.apk');
const signing=JSON.parse(await fs.readFile(path.join(process.env.USERPROFILE,'.hxz-launcher-publish/android-community-signing.json'),'utf8'));
const tools=path.resolve('.runtime/android-sdk/build-tools/35.0.0');

function run(file,args,env={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(file,args,{stdio:'inherit',env:{...process.env,...env},windowsHide:true,shell:file.toLowerCase().endsWith('.bat')});
    child.on('error',reject);
    child.on('exit',code=>code===0?resolve():reject(new Error(`${path.basename(file)} exited ${code}`)));
  });
}

await run(path.join(tools,'zipalign.exe'),['-p','-f','4',unaligned,aligned]);
await run(path.join(tools,'apksigner.bat'),[
  'sign','--ks',signing.keystore,'--ks-key-alias',signing.alias,
  '--ks-pass','env:HXZ_ANDROID_STORE_PASSWORD','--key-pass','env:HXZ_ANDROID_STORE_PASSWORD',
  '--out',output,aligned
],{HXZ_ANDROID_STORE_PASSWORD:signing.password});
await run(path.join(tools,'apksigner.bat'),['verify','--verbose',output]);
await fs.rm(unaligned,{force:true});
await fs.rm(aligned,{force:true});
console.log(`signed APK bytes=${(await fs.stat(output)).size}`);
