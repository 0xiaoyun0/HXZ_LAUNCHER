import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {inside,noLinks,json,writeJSON,exists} from './io.mjs';

const MAX_FILES=150000,MAX_BYTES=256*1024**3;
function locations(root,id){
 if(!path.isAbsolute(root||'')||typeof id!=='string'||!id||id.length>100||/[\\/:*?"<>|\x00-\x1f]/.test(id)||/[. ]$/.test(id)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(id))throw Error('实例目录无效');
 return {id,target:inside(root,'versions/'+id),home:inside(root,'.hxzl-maintenance/'+id)};
}
const KEY=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function snapshotKey(value){if(!KEY.test(value||''))throw Error('恢复点编号无效');return value;}
const check=signal=>signal?.throwIfAborted();
async function walk(base,{signal,skipTransient=true,template=false}={}){
 await noLinks(base);const files=[],groups={},pending=[''];let bytes=0,directories=0,pathBytes=0;
 while(pending.length){
  check(signal);const relative=pending.pop();if(++directories>MAX_FILES)throw Error('目录数量过多，请先整理实例');
  for(const entry of await fs.readdir(inside(base,relative),{withFileTypes:true})){
   check(signal);if(!relative&&(skipTransient&&['logs','crash-reports','.hxzl-natives','natives','.cache'].includes(entry.name)||template&&['saves','screenshots'].includes(entry.name)))continue;
   const rel=relative?relative+'/'+entry.name:entry.name,file=inside(base,rel),stat=await fs.lstat(file);
   if(stat.isSymbolicLink())throw Error('实例包含链接，无法安全备份：'+rel);
   if(stat.isDirectory()){pending.push(rel);continue;}
   if(!stat.isFile())throw Error('实例包含特殊文件：'+rel);
   bytes+=stat.size;pathBytes+=Buffer.byteLength(rel);
   if(files.length>=MAX_FILES||bytes>MAX_BYTES||pathBytes+files.length*180>24*1024**2)throw Error('实例文件清单过大，请分开整理后再创建恢复点');
   files.push({path:rel,size:stat.size,mtime:stat.mtimeMs});const key=rel.includes('/')?rel.split('/')[0]:'版本文件';groups[key]=(groups[key]||0)+stat.size;
  }
 }
 return {files,bytes,groups:Object.entries(groups).map(([name,bytes])=>({name,bytes})).sort((a,b)=>b.bytes-a.bytes)};
}
async function capacity(dir,bytes){
 if(typeof fs.statfs!=='function')return;
 const stat=await fs.statfs(dir);if(stat.bavail*stat.bsize<bytes+64*1024**2)throw Error('磁盘剩余空间不足，请先释放空间');
}
async function copyFiles(from,to,files,{signal,progress=()=>{},verify=false}={}){
 let completed=0,total=files.reduce((n,f)=>n+f.size,0),last=0;
 const result=[];await fs.mkdir(to,{recursive:true});
 for(const item of files){
  check(signal);const source=inside(from,item.path),destination=inside(to,item.path);await noLinks(source);await noLinks(destination);
  const before=await fs.stat(source);if(!before.isFile()||before.size!==item.size)throw Error('文件在处理过程中发生变化：'+item.path);
  await fs.mkdir(path.dirname(destination),{recursive:true});const digest=createHash('sha256');let size=0;
  const meter=new Transform({transform(chunk,encoding,callback){digest.update(chunk);size+=chunk.length;completed+=chunk.length;if(Date.now()-last>100){last=Date.now();progress({completed,total,unit:'bytes',activeFiles:[item.path]});}callback(null,chunk);}});
  await pipeline(createReadStream(source),meter,createWriteStream(destination,{flags:'wx'}),{signal});
  const checksum=digest.digest('hex'),after=await fs.stat(source);
  if(before.size!==size||before.mtimeMs!==after.mtimeMs||verify&&checksum!==item.sha256)throw Error('文件校验未通过：'+item.path);
  result.push({path:item.path,size,sha256:checksum});
 }
 progress({completed,total,unit:'bytes',activeFiles:[]});return result;
}
async function clean(home,target){
 if(target===home||!target.startsWith(home+path.sep))throw Error('维护清理路径越界');
 await noLinks(target);await fs.rm(target,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
async function fingerprint(base,options={}){
 const scan=await walk(base,{...options,skipTransient:false}),files=[];let completed=0,last=0;
 for(const item of scan.files){
  check(options.signal);const file=inside(base,item.path);await noLinks(file);const before=await fs.stat(file),sum=createHash('sha256');let size=0;
  for await(const chunk of createReadStream(file)){
   check(options.signal);sum.update(chunk);size+=chunk.length;completed+=chunk.length;
   if(Date.now()-last>100){last=Date.now();options.progress?.({phase:'校验还原前的恢复点',completed,total:scan.bytes,unit:'bytes',activeFiles:[item.path]});}
  }
  const after=await fs.stat(file);if(size!==before.size||after.mtimeMs!==before.mtimeMs)throw Error('文件在处理过程中发生变化：'+item.path);
  files.push({path:item.path,size,sha256:sum.digest('hex')});
 }
 return {...scan,files};
}
async function recover(paths,options={}){
 const record=path.join(paths.home,'restore.json');if(!await exists(record))return;
 await noLinks(record);const journal=await json(record),key=snapshotKey(journal.operation),stage=inside(paths.home,'stage-'+key),rollback=inside(paths.home,'rollback-'+key),previous=inside(paths.home,key);
 if(journal.instance!==paths.id)throw Error('恢复记录不属于此实例，请保留维护目录');
 for(const file of [paths.target,stage,rollback,previous])await noLinks(file);
 // Before the new directory is published, an interrupted replacement rolls back.
 if(!await exists(paths.target)&&await exists(rollback))await fs.rename(rollback,paths.target);
 if(!await exists(paths.target))throw Error('恢复操作尚未完成，请保留维护目录并重试');
 if(await exists(stage))await clean(paths.home,stage);
 // A completed replacement retains the previous version as another recovery point.
 if(await exists(rollback)){
  await fs.mkdir(previous,{recursive:true});await fs.rename(rollback,path.join(previous,'files'));
 }
 // If closing interrupted the backup hash, its directory remains journalled.
 if(await exists(path.join(previous,'files'))&&!await exists(path.join(previous,'manifest.json'))){
  const list=await fingerprint(path.join(previous,'files'),options);
  await writeJSON(path.join(previous,'manifest.json'),{format:1,instance:journal.instance,key,created:journal.created,label:'还原前自动保留',bytes:list.bytes,files:list.files});
 }
 await fs.rm(record,{force:true});
}
export async function inspectInstance(root,id,options={}){
 const paths=locations(root,id);await noLinks(paths.home);await recover(paths,options);
 const scan=await walk(paths.target,{...options,skipTransient:false}),snapshots=[];
 for(const name of await fs.readdir(paths.home).catch(()=>[])){
  if(!KEY.test(name))continue;
  try{const file=inside(paths.home,name+'/manifest.json');await noLinks(file);const entry=await json(file);if(entry.format===1&&entry.instance===id&&Array.isArray(entry.files))snapshots.push({key:name,label:entry.label,created:entry.created,bytes:entry.bytes,files:entry.files.length});}catch{}
 }
 return {id,bytes:scan.bytes,files:scan.files.length,groups:scan.groups,snapshots:snapshots.sort((a,b)=>b.created-a.created)};
}
export async function createSnapshot(root,id,{label='手动恢复点',signal,progress}={}){
 const paths=locations(root,id);await noLinks(paths.home);await recover(paths,{signal,progress});await fs.mkdir(paths.home,{recursive:true});
 const entries=(await fs.readdir(paths.home)).filter(v=>KEY.test(v));if(entries.length>=30)throw Error('已有 30 个恢复点，请先删除不需要的恢复点');
 const scan=await walk(paths.target,{signal}),key=randomUUID(),target=inside(paths.home,key),stage=inside(paths.home,'snapshot-'+key);await capacity(paths.home,scan.bytes);
 try{
  const files=await copyFiles(paths.target,path.join(stage,'files'),scan.files,{signal,progress});check(signal);
  const value={format:1,instance:id,key,created:Date.now(),label:String(label).trim().slice(0,80)||'手动恢复点',bytes:scan.bytes,files};
  await writeJSON(path.join(stage,'manifest.json'),value);await fs.rename(stage,target);return {key,bytes:scan.bytes};
 }finally{await clean(paths.home,stage).catch(()=>{});}
}
export async function restoreSnapshot(root,id,key,{signal,progress}={}){
 const paths=locations(root,id);await noLinks(paths.home);await recover(paths,{signal,progress});snapshotKey(key);
 const source=inside(paths.home,key);await noLinks(path.join(source,'manifest.json'));const manifest=await json(path.join(source,'manifest.json'));
 if(manifest.format!==1||manifest.instance!==id||!Array.isArray(manifest.files)||manifest.files.length>MAX_FILES)throw Error('恢复点无效');
 const unique=new Set();let total=0;for(const file of manifest.files){inside(source,file.path);if(!file.path||file.path.split('/').some(v=>!v||v==='.')||!Number.isSafeInteger(file.size)||file.size<0||!/^[a-f0-9]{64}$/.test(file.sha256)||unique.has(file.path.toLowerCase()))throw Error('恢复点清单无效');unique.add(file.path.toLowerCase());total+=file.size;}
 if(total>MAX_BYTES)throw Error('恢复点过大');await capacity(paths.home,total);
 const operation=randomUUID(),stage=inside(paths.home,'stage-'+operation),rollback=inside(paths.home,'rollback-'+operation),record=path.join(paths.home,'restore.json');
 try{
  await copyFiles(path.join(source,'files'),stage,manifest.files,{signal,progress,verify:true});check(signal);await noLinks(paths.target);await noLinks(rollback);
  await writeJSON(record,{operation,instance:id,created:Date.now()});
  if(await exists(paths.target))await fs.rename(paths.target,rollback);
  try{await fs.rename(stage,paths.target);}catch(error){if(await exists(rollback))await fs.rename(rollback,paths.target);throw error;}
  await recover(paths,{progress});return {ok:true};
 }finally{if(!await exists(record))await clean(paths.home,stage).catch(()=>{});}
}
export async function deleteSnapshot(root,id,key){
 const paths=locations(root,id);snapshotKey(key);await noLinks(paths.home);await recover(paths);const target=inside(paths.home,key);
 await noLinks(path.join(target,'manifest.json'));const manifest=await json(path.join(target,'manifest.json'));if(manifest.instance!==id)throw Error('恢复点不属于此实例');await clean(paths.home,target);return {ok:true};
}
export async function cloneInstance(root,id,newId,{signal,progress,template=false,prepare=async()=>{}}={}){
 const source=locations(root,id),destination=locations(root,newId);await noLinks(source.home);await noLinks(destination.target);if(await exists(destination.target))throw Error('同名实例已存在');
 await recover(source,{signal,progress});const scan=await walk(source.target,{signal,template});await fs.mkdir(source.home,{recursive:true});await capacity(source.home,scan.bytes);const stage=inside(source.home,'clone-'+randomUUID());
 try{
  await copyFiles(source.target,stage,scan.files,{signal,progress});const metadata=await json(inside(stage,id+'.json'));metadata.id=newId;await writeJSON(inside(stage,newId+'.json'),metadata);await fs.rm(inside(stage,id+'.json'));
  if(await exists(inside(stage,id+'.jar')))await fs.rename(inside(stage,id+'.jar'),inside(stage,newId+'.jar'));
  // A copy starts as an installed experiment, never as somebody else's pending job.
  await fs.rm(inside(stage,'.hxzl/install-request.json'),{force:true});
  await prepare(stage);
  check(signal);await noLinks(destination.target);if(await exists(destination.target))throw Error('同名实例已出现，请换一个名称');await fs.rename(stage,destination.target);return {id:newId};
 }finally{await clean(source.home,stage).catch(()=>{});}
}

// Copy first, verify every file, then switch the configured root. The source is retained.
export async function migrateGameRoot(root,destination,{signal,progress}={}){
 if(!path.isAbsolute(root||'')||!path.isAbsolute(destination||''))throw Error('请选择绝对路径的游戏目录');
 root=path.resolve(root);destination=path.resolve(destination);const a=root.toLowerCase(),b=destination.toLowerCase();
 if(a===b||a.startsWith(b+path.sep)||b.startsWith(a+path.sep)||destination===path.parse(destination).root)throw Error('新旧游戏目录不能相同或相互包含');
 await noLinks(root);await noLinks(destination);if(!await exists(path.join(root,'versions')))throw Error('原游戏目录缺少 versions 文件夹');
 if(await exists(destination)&&(await fs.readdir(destination)).length)throw Error('目标目录不是空目录，未覆盖任何文件');
 const parent=path.dirname(destination);await fs.mkdir(parent,{recursive:true});const scan=await walk(root,{signal,skipTransient:false});await capacity(parent,scan.bytes);
 const stage=inside(parent,'.hxzl-migrate-'+randomUUID());
 try{
  await copyFiles(root,stage,scan.files,{signal,progress});
  await fs.mkdir(path.join(stage,'versions'),{recursive:true});
  // Update only launcher-owned receipts; game config and player files keep their bytes.
  for(const entry of await fs.readdir(path.join(stage,'versions'),{withFileTypes:true})){
   if(!entry.isDirectory())continue;const version=inside(stage,'versions/'+entry.name),final=inside(destination,'versions/'+entry.name);
   for(const [relative,patch]of [['.hxzl/installer-settings.json',{gameDir:destination}],['updater/.updater/local-game-profile.json',{gameDirectory:destination,gameRunDirectory:final,instanceDirectory:final}]]){
    const file=inside(version,relative);if(await exists(file)){await noLinks(file);await writeJSON(file,{...await json(file),...patch});}
   }
  }
  check(signal);await noLinks(destination);if(await exists(destination)){if((await fs.readdir(destination)).length)throw Error('目标目录在迁移期间发生变化，已停止替换');await fs.rmdir(destination);}
  await fs.rename(stage,destination);return {root:destination,previous:root,bytes:scan.bytes,files:scan.files.length};
 }finally{await clean(parent,stage).catch(()=>{});}
}
