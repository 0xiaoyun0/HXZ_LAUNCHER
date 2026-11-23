import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {randomUUID} from 'node:crypto';
import yauzl from 'yauzl';
import yazl from 'yazl';
import {inside,noLinks,exists,hash,json,writeJSON} from './io.mjs';

const MAX_FILES=100000,MAX_BYTES=16*1024**3;
function relative(value){
 if(typeof value!=='string'||!value||/[\\:*?"<>|\x00-\x1f]/.test(value)||value.split('/').some(v=>!v||v==='.'||v==='..'||/[. ]$/.test(v)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(v)))throw Error('存档包含不安全的路径');return value;
}
async function archive(file,visit,{signal}={}){
 if(!path.isAbsolute(file))throw Error('存档路径无效');await noLinks(file);
 if((await fs.stat(file)).size>2*1024**3)throw Error('存档压缩包最多 2 GB');
 const zip=await new Promise((ok,no)=>yauzl.open(file,{lazyEntries:true,validateEntrySizes:true},(e,z)=>e?no(e):ok(z)));let count=0,bytes=0;const names=new Set();
 const abort=()=>zip.emit('error',signal.reason||Error('已取消'));signal?.addEventListener('abort',abort,{once:true});
 try{await new Promise((ok,no)=>{zip.on('error',no);zip.on('end',ok);zip.on('entry',entry=>{(async()=>{
  signal?.throwIfAborted();const directory=entry.fileName.endsWith('/'),name=relative(directory?entry.fileName.slice(0,-1):entry.fileName);
  if(++count>MAX_FILES||(bytes+=entry.uncompressedSize)>MAX_BYTES)throw Error('存档超过文件数量或解压大小上限');
  if(names.has(name.toLowerCase()))throw Error('存档包含重复文件项');names.add(name.toLowerCase());
  const type=(entry.externalFileAttributes>>>16)&0xf000;if(entry.generalPurposeBitFlag&1||type&&type!==0x8000&&type!==0x4000)throw Error('存档不支持加密、链接或特殊文件');
  if(!directory)await visit({...entry,name},()=>new Promise((yes,fail)=>zip.openReadStream(entry,(e,s)=>e?fail(e):yes(s))));zip.readEntry();
 })().catch(no);});zip.readEntry();});}finally{signal?.removeEventListener('abort',abort);zip.close();}
}
export async function inspectWorldArchive(file,options={}){
 const levels=[],files=[];let bytes=0;await archive(file,async entry=>{files.push(entry.name);bytes+=entry.uncompressedSize;if(/(^|\/)level.dat$/.test(entry.name))levels.push(entry.name);},options);
 if(levels.length!==1)throw Error('请选择只包含一个世界的 ZIP，存档中应有唯一的 level.dat');
 const prefix=levels[0].slice(0,-'level.dat'.length);if(files.some(v=>!v.startsWith(prefix)))throw Error('ZIP 包含存档之外的文件，请只压缩该世界目录');
 return {prefix,files:files.length,bytes};
}
export async function extractWorldArchive(file,destination,{signal,progress=()=>{},expectedHash}={}){
 if(expectedHash&&await hash(file,'sha256')!==expectedHash)throw Error('存档下载内容校验不一致');
 const info=await inspectWorldArchive(file,{signal});await noLinks(destination);if(await exists(destination)){
  const receipt=path.join(destination,'.hxzl-world-source.json');await noLinks(receipt);const old=await json(receipt).catch(()=>null);if(expectedHash&&old?.sha256===expectedHash&&await exists(path.join(destination,'level.dat')))return {...info,directory:destination,resumed:true};
  throw Error('目标存档已存在，未覆盖现有世界');
 }
 const base=path.dirname(destination),stage=inside(base,'.hxzl-world-'+randomUUID());await fs.mkdir(base,{recursive:true});
 if(typeof fs.statfs==='function'){const stat=await fs.statfs(base);if(stat.bavail*stat.bsize<info.bytes+64*1024**2)throw Error('磁盘空间不足以导入存档');}
 let completed=0,last=0;
 try{
  await fs.mkdir(stage);await archive(file,async(entry,open)=>{const name=relative(entry.name.slice(info.prefix.length));if(name==='session.lock')return;const target=inside(stage,name);await noLinks(target);await fs.mkdir(path.dirname(target),{recursive:true});const meter=new Transform({transform(chunk,encoding,done){completed+=chunk.length;if(Date.now()-last>100){last=Date.now();progress({completed,total:info.bytes,unit:'bytes',activeFiles:[name]});}done(null,chunk);}});await pipeline(await open(),meter,createWriteStream(target,{flags:'wx'}),{signal});},{signal});
  if(expectedHash)await writeJSON(path.join(stage,'.hxzl-world-source.json'),{sha256:expectedHash,created:Date.now()});
  signal?.throwIfAborted();await noLinks(destination);if(await exists(destination))throw Error('目标存档刚被创建，请换一个名称');await fs.rename(stage,destination);progress({completed,total:completed,unit:'bytes',activeFiles:[]});return {...info,directory:destination};
 }finally{if(!stage.startsWith(base+path.sep))throw Error('存档暂存路径越界');await noLinks(stage);await fs.rm(stage,{recursive:true,force:true}).catch(()=>{});}
}
export async function exportWorld(source,destination,{signal,progress=()=>{}}={}){
 await noLinks(source);await noLinks(destination);if(!await exists(path.join(source,'level.dat')))throw Error('所选目录不是 Minecraft 世界');
 const scan=[''],files=[];let bytes=0,dirs=0;
 while(scan.length){signal?.throwIfAborted();const rel=scan.pop();if(++dirs>MAX_FILES)throw Error('存档目录过多');for(const entry of await fs.readdir(inside(source,rel),{withFileTypes:true})){
  const name=relative(rel?rel+'/'+entry.name:entry.name),file=inside(source,name),stat=await fs.lstat(file);if(stat.isSymbolicLink())throw Error('存档包含链接');if(stat.isDirectory()){scan.push(name);continue;}if(!stat.isFile())throw Error('存档包含特殊文件');if(['session.lock','.hxzl-world-source.json'].includes(name))continue;if(files.length>=MAX_FILES||(bytes+=stat.size)>MAX_BYTES)throw Error('存档超过导出上限');files.push({name,file,size:stat.size,mtime:stat.mtimeMs});
 }}
 if(path.resolve(destination).startsWith(path.resolve(source)+path.sep))throw Error('请将导出文件保存到存档目录之外');
 const temp=destination+'.'+randomUUID()+'.partial';await noLinks(temp);await fs.mkdir(path.dirname(destination),{recursive:true});const zip=new yazl.ZipFile(),streams=new Set();let completed=0,last=0;
 try{
  for(const item of files)zip.addReadStreamLazy(item.name,{size:item.size,mtime:new Date(item.mtime)},cb=>{noLinks(item.file).then(()=>{signal?.throwIfAborted();const stream=createReadStream(item.file);streams.add(stream);stream.on('close',()=>streams.delete(stream));stream.on('data',chunk=>{completed+=chunk.length;if(Date.now()-last>100){last=Date.now();progress({completed,total:bytes,unit:'bytes',activeFiles:[item.name]});}});cb(null,stream);}).catch(cb);});
  zip.end();await pipeline(zip.outputStream,createWriteStream(temp,{flags:'wx'}),{signal});
  for(const item of files){await noLinks(item.file);const after=await fs.stat(item.file);if(after.size!==item.size||after.mtimeMs!==item.mtime)throw Error('存档在导出时发生变化，请关闭游戏后重试');}
  signal?.throwIfAborted();await inspectWorldArchive(temp,{signal});await noLinks(destination);await fs.rename(temp,destination);progress({completed,total:bytes,unit:'bytes',activeFiles:[]});return {file:destination,sha256:await hash(destination,'sha256'),bytes:(await fs.stat(destination)).size};
 }finally{for(const stream of streams)stream.destroy();zip.outputStream.destroy();await fs.rm(temp,{force:true}).catch(()=>{});}
}
export async function putWorldReceipt(instance,value){await writeJSON(path.join(instance,'.hxzl/world.json'),{record:value.record,revision:value.revision,title:value.title,sha256:value.sha256,imported:Date.now(),world:'社区世界'});}
