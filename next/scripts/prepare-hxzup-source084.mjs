import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const slash=p=>p.split(path.sep).join('/');
async function plain(file) {const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Source must be a regular file: '+file);return fs.readFile(file);}
export async function prepareHxzupSource(sourceRoot='E:/hxz_up/hxzup') {
  const root=path.resolve(sourceRoot),base=path.join(repo,'.runtime/hxz-runtime-upstream/source-bundle-input/hxzup');
  const paths=[];
  for(const dir of ['client/src/main/java/up/hxz','client/src/launcher/java/up/hxz/launcher','client/src/android/java/up/hxz/android']) {
    for(const name of (await fs.readdir(path.join(root,dir))).sort())if(name.endsWith('.java'))paths.push(dir+'/'+name);
  }
  paths.push('client/src/android/native/hxz_android.c','client/src/desktop/native/focus_windows.c','client/src/desktop/native/focus_linux.c','client/src/desktop/native/focus_macos.c',
    'client/src/main/resources/META-INF/THIRD-PARTY-NOTICES.txt','client/src/main/resources/META-INF/licenses/gson-LICENSE.txt',
    'client/version.txt','client/lib/gson-2.13.2.jar.sha256',
    'scripts/build-client.ps1','scripts/build-android.ps1','scripts/build-focus.ps1','scripts/build-focus-unix.ps1');
  const files=[];
  for(const relative of paths) {
    if(!/^[A-Za-z0-9_./+-]+$/.test(relative)||relative.includes('..'))throw Error('Unsafe source name');
    const bytes=await plain(path.join(root,...relative.split('/'))),file=path.join(base,...relative.split('/'));await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);
    files.push({file:slash(path.relative(repo,file)),sourcePath:relative,archivePath:'inputs/hxzup-own-source/'+relative,sha256:hash(bytes),size:bytes.length,role:relative.includes('/META-INF/')?'runtime-license':'recipe-source',component:'hxzup',origin:'hxzup-own-source/'+relative});
  }
  const license=await plain(path.join(repo,'LICENSE')),licenseFile=path.join(base,'LICENSE');await fs.writeFile(licenseFile,license);
  files.push({file:slash(path.relative(repo,licenseFile)),archivePath:'inputs/hxzup-own-source/LICENSE',sha256:hash(license),size:license.length,role:'runtime-license',component:'hxzup',origin:'LICENSE'});
  const gsonUrl='https://repo.maven.apache.org/maven2/com/google/code/gson/gson/2.13.2/gson-2.13.2-sources.jar';
  const gsonFile=path.join(base,'third-party/gson-2.13.2-sources.jar'),gsonSha1='e28a0b248e9435c6b6863275b2e5c1569dfac888';
  let gson;try{gson=await plain(gsonFile);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!gson||createHash('sha1').update(gson).digest('hex')!==gsonSha1) {
    const response=await fetch(gsonUrl,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Official Gson source HTTP '+response.status);
    const parts=[];let size=0;for await(const part of response.body){size+=part.length;if(size>4*1024*1024)throw Error('Gson source exceeds budget');parts.push(part);}gson=Buffer.concat(parts);
    if(createHash('sha1').update(gson).digest('hex')!==gsonSha1)throw Error('Official Gson published source hash mismatch');await fs.mkdir(path.dirname(gsonFile),{recursive:true});await fs.writeFile(gsonFile,gson);
  }
  files.push({file:slash(path.relative(repo,gsonFile)),archivePath:'inputs/hxzup-own-source/third-party/gson-2.13.2-sources.jar',sourcePath:'third-party/gson-2.13.2-sources.jar',sha256:hash(gson),publishedSha1:gsonSha1,size:gson.length,role:'recipe-source',component:'hxzup',origin:gsonUrl,license:'Apache-2.0'});
  const lock={schemaVersion:1,kind:'hxzup-project-source-snapshot',project:'HXZUP self-owned updater project',sourceRoot:'hxzup-own-source',sourceCoverage:'Complete available project launcher bootstrap, main updater Java sources, Android bridge/native and desktop native sources plus build recipes. Current HXZ launcher installer patches and IO/Rules are additionally supplied from the frozen runtime tool sources; this snapshot is not claimed byte-reproducible with the pre-existing JAR.',files};
  const file=path.join(repo,'.runtime/hxz-runtime-upstream/hxzup-source-snapshot.lock.json');await fs.writeFile(file,JSON.stringify(lock,null,2)+'\n');return {lock:file,files:files.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await prepareHxzupSource(process.argv[2]),null,2));
