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
  for(const name of ['updater-1.0.3.jar','launcher-agent.jar','updater-launcher.jar'])zip.addFile(path.join(resources,'hxzup',name),'overrides/updater/'+name,{compress:false});
  zip.addBuffer(Buffer.from(JSON.stringify({servers,parallelDownloads:settings.downloadConcurrency,showChangelog:true,theme:'light'},null,2)),'overrides/updater/config.json');
  zip.addBuffer(Buffer.from('@echo off\r\npushd "%~dp0"\r\njava -jar updater\\updater-launcher.jar\r\nset "hxzResult=%errorlevel%"\r\npopd\r\nif not "%hxzResult%"=="0" pause\r\nexit /b %hxzResult%\r\n'),'overrides/HXZUP-update.cmd');
  zip.addBuffer(Buffer.from('导入此 mrpack 到支持 Modrinth 格式的启动器。游戏本体与加载器由目标启动器下载。\n更新：开游戏之前，双击实例目录中的 HXZUP-update.cmd；或在支持启动前命令的启动器中运行 java -jar updater/updater-launcher.jar，工作目录设为此实例目录。使用该实例适用的 Java。\n首次更新会读取服务端文件策略；仅对本实例执行。没有导出登录凭据、聊天记录、存档、截图、日志与本地更新状态。\n'),'overrides/HXZUP-使用说明.txt');
  zip.end();current=output;await output;signal?.throwIfAborted();await fs.rename(stage,destination);progress({completed:entries.length,total:entries.length,detail:'导出完成'});return destination;
 }finally{zip.outputStream.destroy();if(current)await current.catch(()=>{});await fs.rm(stage,{force:true}).catch(()=>{});}
}
