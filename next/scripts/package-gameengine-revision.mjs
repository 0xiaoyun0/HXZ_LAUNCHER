// Prepare revision artifacts. Publishing and update-feed activation are separate steps.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createWriteStream,createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import yazl from 'yazl';

const root=process.cwd(),source=path.join(root,'.runtime/fcl-source/FoldCraftLauncher-efe4dcc5dbc78c55be177c330239e12845ae7ccf');
const build=Number(process.argv.find(a=>a.startsWith('--build='))?.slice(8)||70003);
const version=process.argv.find(a=>a.startsWith('--version='))?.slice(10)||'0.7.0';
if(!Number.isInteger(build)||build<70001)throw Error('Invalid revision build');
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid component version');
const out=path.join(root,version==='0.7.0'?`release/${version}/android/revision-${build}`:`release/${version}/android/game-engine`);await fs.mkdir(out,{recursive:true});
const java='C:/Program Files/Java/jdk-21/bin/java.exe',buildTools=path.join(root,'.runtime/android-sdk/build-tools/35.0.0');
const apk=path.join(out,`HXZ-GameEngine-${version}-${build}-arm64.apk`);
const input=path.join(source,`FCL/build/outputs/apk/release/HXZ-GameEngine-release-${version}-arm64-v8a.apk`);
const info=JSON.parse(await fs.readFile(path.join(path.dirname(input),'output-metadata.json'),'utf8'));
if(info.applicationId!=='top.hxzmc.gameengine'||info.elements[0].versionCode!==build||info.elements[0].versionName!==version)throw Error('Wrong build output');
if(!process.argv.includes('--source-only')){
const aligned=path.join(root,`.runtime/android-adaptation/engine-${build}-aligned.apk`);
const signing=JSON.parse(await fs.readFile('C:/Users/admin/.hxz-launcher-publish/android-community-signing.json','utf8'));
execFileSync(path.join(buildTools,'zipalign.exe'),['-P','16','-f','4',input,aligned],{windowsHide:true,stdio:'pipe'});
execFileSync(java,['-jar',path.join(buildTools,'lib/apksigner.jar'),'sign','--ks',signing.keystore,'--ks-key-alias','hxz-community','--ks-pass','env:HXZ_REVISION_SIGNING','--key-pass','env:HXZ_REVISION_SIGNING','--out',apk,aligned],{windowsHide:true,stdio:'pipe',env:{...process.env,HXZ_REVISION_SIGNING:signing.password}});
}
const verified=execFileSync(java,['-jar',path.join(buildTools,'lib/apksigner.jar'),'verify','--verbose','--print-certs',apk],{windowsHide:true,encoding:'utf8'});
if(!verified.includes('2d330c0dadd47ce20e18982c278619a84b973cb1e060937811020f035bd90a06'))throw Error('Signing certificate differs');
await fs.writeFile(path.join(out,'APK签名验证.txt'),verified);
const sourceZip=path.join(out,`HXZ-GameEngine-${version}-${build}-source.zip`),prefix=`HXZ-GameEngine-${version}-${build}-source/`;
const zip=new yazl.ZipFile(),done=pipeline(zip.outputStream,createWriteStream(sourceZip));let count=0;
const excluded=new Set(['.git','.gradle','.kotlin','.idea','.cxx','build','local.properties']);
async function add(dir,rel=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){if(excluded.has(entry.name)||/\.(?:jks|keystore|pepk|p12|pfx|apk|idsig)$/i.test(entry.name))continue;const name=rel+entry.name;if(entry.isSymbolicLink())throw Error('Unexpected symlink '+name);if(entry.isDirectory())await add(path.join(dir,entry.name),name+'/');else{zip.addFile(path.join(dir,entry.name),prefix+name);count++;}}}
await add(source);
const revisionNote=version==='0.7.0'?'docs/0.7.0安卓适配修订.md':'docs/0.8.3下载源与恢复.md';
for(const [file,name] of [['mobile/game-engine/README.md','HXZ-ADAPTER-README.md'],['mobile/game-engine/repack-sable.py','hxz-repro/repack-sable.py'],['mobile/game-engine/assets/hxz/LICENSE-Sable-Rapier-Android.txt','hxz-repro/assets/hxz/LICENSE-Sable-Rapier-Android.txt'],[revisionNote,'HXZ-REVISION.md'],['mobile/game-engine/apply-adaptation.mjs','hxz-repro/apply-adaptation.mjs'],['mobile/game-engine/prepare-source.mjs','hxz-repro/prepare-source.mjs']])zip.addBuffer(await fs.readFile(file),prefix+name);
zip.addBuffer(Buffer.from(`# Build ${build} (${version} Android revision)

Exact modified FCL source, upstream commit efe4dcc5dbc78c55be177c330239e12845ae7ccf, GPL-3.0. Original notices are retained. No signing keys, local settings or build output are included.

Use JDK 21, Gradle 8.14.4, Android SDK/Build Tools 35, NDK 30.0.16248370, CMake 3.31.6 and Ninja 1.12.1. Set JAVA_HOME. Create local.properties with sdk.dir, cmake.dir and arch=arm64; change the machine-specific ndkPath in FCL/build.gradle.kts to your NDK. Run Gradle :FCL:assembleRelease --console=plain, then zipalign -P 16 -f 4 and apksigner with your own key. A custom community APK and game engine must use the same certificate. All HXZ patches are already applied; do not run the initial prepare script again.

The Sable adapter JAR is bundled under FCL/src/main/assets/hxz. Java adapter classes remain unchanged from https://github.com/sa1672ndo/sable-android-patch/tree/2.0.3 (MIT). Its ARM64 library was replaced with libsable_rapier.so from SableRapierPlugin_2.0.3_bc33fe1.apk at https://github.com/ZalithLauncher/NativeLibPlugin/releases/tag/sable_rapier-0.1.0_NDK_BUILD; native source: https://github.com/MovTery/sable_rapier_android (Apache-2.0). hxz-repro/repack-sable.py checks input hashes and rebuilds that asset from the two upstream release files. Licenses and modification notices are included in the JAR and assets.

APK compilation and the local JVM regression checks pass. The 0.8.3 download changes were verified on a local JVM; no new physical-device compatibility claim is made. See HXZ-REVISION.md for the validation record and exact remaining limitations.
`),prefix+'HXZ-BUILD.md');
zip.end();await done;
await fs.copyFile('mobile/game-engine/README.md',path.join(out,'运行组件修订说明.md'));
await fs.copyFile(revisionNote,path.join(out,'适配记录.md'));
await fs.copyFile(path.join(source,'LICENSE'),path.join(out,'LICENSE-FCL.txt'));
async function hash(file){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
const records=[];for(const file of [apk,sourceZip])records.push({name:path.basename(file),size:(await fs.stat(file)).size,sha256:await hash(file)});
await fs.writeFile(path.join(out,'SHA256SUMS.txt'),records.map(r=>r.sha256+'  '+r.name).join('\n')+'\n');
const updates=path.join(root,'release',version,'updates');await fs.mkdir(updates,{recursive:true});
const manifest=path.join(updates,'game-engine-latest.json'),notes=path.join(out,'运行组件更新说明.md');
await fs.writeFile(notes,`幻想镇游戏运行组件 ${version} / ${build}\n\n官方优先，故障后换镜像；连接与无进度超时、断点恢复、可信哈希校验和取消等待。保留原有游戏与配置。手机 GPU、加载器和模组兼容性仍需实机验证。\n`);
const signing=JSON.parse(await fs.readFile('C:/Users/admin/.hxz-launcher-publish/android-community-signing.json','utf8'));
execFileSync(java,[path.join(root,'mobile/tools/SignAndroidUpdate.java'),apk,String(build),version,`https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v${version}/${path.basename(apk)}`,notes,manifest,'android-game-engine','top.hxzmc.gameengine'],{windowsHide:true,stdio:'pipe',env:{...process.env,HXZ_ANDROID_KEYSTORE:signing.keystore,HXZ_ANDROID_STORE_PASSWORD:signing.password}});
await fs.copyFile(manifest,path.join(out,'game-engine-latest.json'));
records.push({name:path.relative(out,manifest).replaceAll('\\','/'),size:(await fs.stat(manifest)).size,sha256:await hash(manifest)});
await fs.writeFile(path.join(out,'SHA256SUMS.txt'),records.map(r=>r.sha256+'  '+r.name).join('\n')+'\n');
await fs.writeFile(path.join(out,'revision.json'),JSON.stringify({version,build,package:'top.hxzmc.gameengine',architecture:'arm64-v8a',published:false,files:records},null,2)+'\n');
console.log(JSON.stringify({folder:out,sourceFiles:count,files:records},null,2));
