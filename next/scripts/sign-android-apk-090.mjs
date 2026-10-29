import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';

const version=process.env.HXZ_ANDROID_VERSION||'0.9.0';
const build=process.env.HXZ_ANDROID_VERSION_CODE||'90001';
const root=path.resolve(`release/${version}/android`);
const stem=`HXZ-Community-Android-${version}-${build}.apk`;
const unaligned=path.join(root,`${stem}.unaligned`);
const aligned=path.join(root,`${stem}.aligned`);
const output=path.join(root,stem);
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
  '--v1-signing-enabled','false','--v2-signing-enabled','true','--v3-signing-enabled','false','--v4-signing-enabled','false',
  '--out',output,aligned
],{HXZ_ANDROID_STORE_PASSWORD:signing.password});
await run(path.join(tools,'apksigner.bat'),['verify','--verbose',output]);
await fs.rm(unaligned,{force:true});
await fs.rm(aligned,{force:true});
console.log(`signed APK bytes=${(await fs.stat(output)).size}`);
