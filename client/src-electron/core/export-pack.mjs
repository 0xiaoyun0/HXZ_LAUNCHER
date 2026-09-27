import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {randomUUID} from 'node:crypto';
import yazl from 'yazl';
import {inside,noLinks,exists,json} from './io.mjs';
import {readVersion} from './minecraft.mjs';
import {instanceTarget} from './mod-plan.mjs';
import {modDirectory} from './instances.mjs';
import {normalizeUpdateUrl} from './hxzup-sources.mjs';
export async function exportPack({settings,id,destination,resources,urls=[],signal,progress=()=>{}}){
 const metadata=await readVersion(settings.gameRoot,id),target=instanceTarget(metadata),root=path.dirname(await modDirectory(settings,id));
 const dependencies={minecraft:target.minecraft};
 if(target.loader){const pattern={forge:'net.minecraftforge:forge:',neoforge:'net.neoforged:neoforge:',fabric:'net.fabricmc:fabric-loader:',quilt:'org.quiltmc:quilt-loader:'}[target.loader];
  const patch=metadata.patches?.find(p=>p.id===target.loader);let version=patch?.version||(metadata.libraries||[]).find(l=>l.name?.startsWith(pattern))?.name.split(':')[2];
  if(target.loader==='forge'&&version?.startsWith(target.minecraft+'-'))version=version.slice(target.minecraft.length+1);
  if(!version)throw Error('无法确定加载器版本，未生成不完整整合包');dependencies[['fabric','quilt'].includes(target.loader)?target.loader+'-loader':target.loader]=version;
 }
 if(!/^\d[\w.+-]{1,80}$/.test(target.minecraft))throw Error('实例缺少实际 Minecraft 版本');
 const updater=inside(settings.gameRoot,'versions/'+id+'/updater'),config=await json(path.join(updater,'config.json')).catch(()=>({}));
 const servers=(urls.length?urls:settings.instanceSettings[id]?.updateUrls||config.servers||[]).map(normalizeUpdateUrl);
 if(!servers.length)throw Error('实例没有 HXZUP 更新地址');
 const entries=[];let total=0;
 async function walk(dir,relative){for(const entry of await fs.readdir(dir,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})){
  signal?.throwIfAborted();if(entry.isSymbolicLink())throw Error('导出内容包含链接：'+entry.name);
  if(entry.name.startsWith('.')||/account|token|password|credential|session|^usercache|^usernamecache|^servers\.dat/i.test(entry.name))continue;
  const file=path.join(dir,entry.name),name=relative+'/'+entry.name;await noLinks(file);
  if(entry.isDirectory())await walk(file,name);else if(entry.isFile()){const size=(await fs.stat(file)).size;if(++total>50000||size>2*1024**3)throw Error('导出文件过多或单文件过大');entries.push({file,name});}
 }}
 for(const name of ['mods','config','defaultconfigs','kubejs','scripts','resourcepacks','shaderpacks','datapacks'])await walk(path.join(root,name),name);
 await noLinks(destination);const stage=destination+'.'+randomUUID()+'.part',zip=new yazl.ZipFile();
 let current;zip.on('error',e=>zip.outputStream.destroy(e));
 try{
  await fs.mkdir(path.dirname(destination),{recursive:true});
  const output=pipeline(zip.outputStream,createWriteStream(stage,{flags:'wx'}),{signal});current=output;output.catch(()=>{});
  zip.addBuffer(Buffer.from(JSON.stringify({formatVersion:1,game:'minecraft',versionId:'export-'+new Date().toISOString().slice(0,10),name:id,summary:'HXZUP 可更新整合包',dependencies,files:[]},null,2)),'modrinth.index.json');
  for(const [i,entry] of entries.entries()){signal?.throwIfAborted();zip.addFile(entry.file,'overrides/'+entry.name,{compress:!(/\.(jar|zip|png|ogg|mp4|webp)$/i.test(entry.file)),compressionLevel:/\.(jar|zip|png|ogg|mp4|webp)$/i.test(entry.file)?0:3});if(i%50===0)progress({completed:i,total:entries.length,detail:entry.name});}
  // The stable agent only selects versioned JARs. Both entry points must use
  // the same patched runtime, not the original 1.0.3 bundled compile dependency.
  for(const name of ['updater-1.0.3.jar','launcher-agent.jar','updater-launcher.jar'])zip.addFile(path.join(resources,'hxzup',name==='updater-1.0.3.jar'?'updater-launcher.jar':name),'overrides/updater/'+name,{compress:false});
  zip.addBuffer(Buffer.from(JSON.stringify({gameVersion:target.minecraft,loader:{type:target.loader||'',version:target.loader?dependencies[['fabric','quilt'].includes(target.loader)?target.loader+'-loader':target.loader]:''}},null,2)),'overrides/updater/portable.json');
  zip.addBuffer(Buffer.from(JSON.stringify({servers,parallelDownloads:settings.downloadConcurrency,showChangelog:true,theme:'light'},null,2)),'overrides/updater/config.json');
  zip.addBuffer(Buffer.from('@echo off\r\nsetlocal\r\npushd "%~dp0"\r\nset "HXZ_JAVA=%~1"\r\nif not defined HXZ_JAVA if defined JAVA_HOME if exist "%JAVA_HOME%\\bin\\java.exe" set "HXZ_JAVA=%JAVA_HOME%\\bin\\java.exe"\r\nif not defined HXZ_JAVA set "HXZ_JAVA=java"\r\n"%HXZ_JAVA%" -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8 -jar updater\\updater-launcher.jar\r\nset "hxzResult=%errorlevel%"\r\npopd\r\nif not "%hxzResult%"=="0" pause\r\nexit /b %hxzResult%\r\n'),'overrides/HXZUP-update.cmd');
  zip.addBuffer(Buffer.from('导入此 mrpack 到支持 Modrinth 格式的启动器，并启用实例隔离。游戏本体与加载器由目标启动器管理。\n\n手动更新：双击实例游戏目录中的 HXZUP-update.cmd。如果 Java 不在 PATH/JAVA_HOME 中，可运行 HXZUP-update.cmd "你的Java完整路径\\bin\\java.exe"，Java 8及以上均可运行更新器。\n\n自动更新（推荐启动前命令）：在目标启动器的实例设置中配置启动前命令："Java完整路径/bin/java.exe" -jar "实例游戏目录/updater/updater-launcher.jar"。设置等待命令完成，失败时不启动游戏。\n也可在工作目录确为该实例游戏目录的启动器中增加 JVM 参数：-javaagent:updater/launcher-agent.jar。不要同时配置两种自动更新方式。mrpack标准不携带通用启动钩子，导入后必须设置一次。\n\n兼容模式中0代表updater目录，1代表实例游戏目录，仅同步本实例内容；2至5层不能跨启动器通用映射，遇到此类文件会明确停止，管理员应将实例内容放在1层，游戏本体/依赖交给目标启动器。服务器更换游戏或加载器版本时需重新导入对应导出包，避免用旧启动参数启动新游戏。保留updater/portable.json，勿覆盖引导JAR。\n没有导出登录凭据、存档、截图、日志与本地更新状态。\n'),'overrides/HXZUP-使用说明.txt');
  zip.end();current=output;await output;signal?.throwIfAborted();await fs.rename(stage,destination);progress({completed:entries.length,total:entries.length,detail:'导出完成'});return destination;
 }finally{zip.outputStream.destroy();if(current)await current.catch(()=>{});await fs.rm(stage,{force:true}).catch(()=>{});}
}
