import {execFileSync,spawnSync} from 'node:child_process';
import {readFile,mkdir,cp,copyFile,stat,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
import React from '@vitejs/plugin-react';
import {verifyApk} from './verify-apk.mjs';
import {DEFAULT_SERVERS} from '../../server/shared/server-presets.mjs';

const app=path.resolve(fileURLToPath(new URL('.',import.meta.url))), root=path.resolve(app,'../..');
const cache=path.join(root,'.runtime'), source=path.join(cache,'fcl-clean');
const assets=path.join(cache,'town-android-assets'), town=path.join(assets,'town');
const pin=JSON.parse(await readFile(path.join(app,'upstream.json'),'utf8'));
const {version}=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const arch=process.argv.includes('--x86_64')?'x86_64':'arm64';
const release=process.argv.includes('--release');
const git=(...args)=>execFileSync('git',['-C',source,...args],{encoding:'utf8',windowsHide:true}).trim();
await mkdir(cache,{recursive:true});
if(!await stat(path.join(source,'.git')).catch(()=>null)){
  await mkdir(source,{recursive:true});
  git('init');git('remote','add','origin',pin.repository);
  git('fetch','--depth=1','origin',pin.commit);git('checkout','--detach','FETCH_HEAD');
}
if(git('rev-parse','HEAD')!==pin.commit||git('remote','get-url','origin').replace(/\.git$/,'')!==pin.repository.replace(/\.git$/,''))throw Error('FCL 来源或提交与 upstream.json 不一致');
const patch=path.join(app,'fcl.patch');
if(spawnSync('git',['-C',source,'apply','--reverse','--check','--whitespace=nowarn',patch],{windowsHide:true}).status!==0)git('apply','--whitespace=nowarn',patch);
if(git('ls-files','--others','--exclude-standard'))throw Error('FCL 工作区含补丁外的源码文件，请检查 '+source);
const actual=git('diff','--binary','--no-ext-diff').replace(/\r\n/g,'\n');
if(actual!==(await readFile(patch,'utf8')).trim().replace(/\r\n/g,'\n'))throw Error('上游工作区存在补丁以外的修改，请检查 '+source);
const archive=path.join(root,'apps/linking');
if(!await stat(path.join(archive,'node_modules/three/package.json')).catch(()=>null)){
  const npm=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--no-fund','--no-audit'],{cwd:archive,stdio:'inherit',windowsHide:true,shell:process.platform==='win32'});
  if(npm.status!==0)throw Error('LINKING 依赖安装失败');
}
for(const [cwd,script] of [[root,'scripts/build-linking-story-preview081.mjs'],[archive,'scripts/patch-rolling-number.mjs']]){
  const result=spawnSync(process.execPath,[script],{cwd,stdio:'inherit',windowsHide:true});
  if(result.status!==0)throw Error('准备 LINKING 资源失败');
}
await build({root:path.join(app,'community'),base:'./',publicDir:false,configFile:false,plugins:[React()],build:{outDir:town,emptyOutDir:true,target:'chrome80'}});
await build({root:archive,configFile:path.join(archive,'vite.config.ts'),plugins:[{
  name:'town-android-linking',enforce:'pre',
  transform(code,id){
    if(path.resolve(id)!==path.join(archive,'src/entry.ts'))return;
    const support=path.join(app,'community/compat.ts').split(path.sep).join('/');
    return ['import '+JSON.stringify(support)+';',code].join('\n');
  }
}],build:{outDir:path.join(town,'linking'),emptyOutDir:true,target:'chrome80',cssTarget:'chrome80'}});
await cp(path.join(root,'public/media/games'),path.join(town,'media/games'),{recursive:true});
await copyFile(path.join(source,'LICENSE'),path.join(town,'FCL-LICENSE.txt'));
await writeFile(path.join(town,'server-presets.json'),JSON.stringify(DEFAULT_SERVERS.map(({name,address})=>({name,address}))));
await writeFile(path.join(town,'source.json'),JSON.stringify({upstream:pin,version,changes:'apps/android/fcl.patch',license:'GPL-3.0-or-later'}));
if(process.argv.includes('--prepare'))process.exit(0);
const [major,minor,fix]=version.split('.').map(Number);
if(!Number.isInteger(fix)||minor>999||fix>999)throw Error('无效的安卓版本号 '+version);
if(release&&!['HXZ_ANDROID_STORE','HXZ_ANDROID_STORE_PASSWORD','HXZ_ANDROID_KEY_ALIAS','HXZ_ANDROID_KEY_PASSWORD'].every(k=>process.env[k]))throw Error('正式 APK 需要幻想镇自己的发布签名');
const gradle=process.env.HXZ_GRADLE||path.join(source,process.platform==='win32'?'gradlew.bat':'gradlew');
const params=['-p',source,'-Darch='+arch,'-PtownApp='+app,'-PtownAssets='+assets,'-PtownVersion='+version,'-PtownCode='+(major*1000000+minor*1000+fix),':FCL:assemble'+(release?'Release':'Debug'),'--console=plain','--max-workers=3'];
// Pass arguments as separate values on Unix. On Windows Gradle is normally a batch file.
let built;
if(process.platform==='win32'&&/\.(cmd|bat)$/i.test(gradle)){
  if([gradle,...params].some(v=>/["%!\r\n&|<>^]/.test(v)))throw Error('Gradle 路径含 Windows 命令保留字符');
  const command='"'+[gradle,...params].map(v=>'"'+v+'"').join(' ')+'"';
  built=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c',command],{cwd:source,stdio:'inherit',windowsVerbatimArguments:true,windowsHide:true});
}else built=spawnSync(gradle,params,{cwd:source,stdio:'inherit',windowsHide:true});
if(built.error)throw built.error;
if(built.status!==0)process.exit(built.status??1);
const mode=release?'release':'debug',abi=arch==='arm64'?'arm64-v8a':'x86_64';
const output=path.join(source,'FCL/build/outputs/apk',mode);
const files=(await readdir(output)).filter(n=>n.endsWith('-'+abi+'.apk'));
if(files.length!==1)throw Error('找不到目标架构的 APK');
const dir=path.join(root,'release',version,'android');
await mkdir(dir,{recursive:true});
const apk=path.join(dir,'HXZ-FCL-'+version+'-'+abi+'-'+mode+'.apk');
await verifyApk(path.join(output,files[0]),abi,pin,version);
await copyFile(path.join(output,files[0]),apk);
console.log(apk);
