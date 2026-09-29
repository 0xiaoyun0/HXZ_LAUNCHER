import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import yauzl from 'yauzl';
import {noLinks,inside,exists} from './io.mjs';
import {modDirectory} from './instances.mjs';
const cache=new Map();
async function containsCreate(file){
 const stat=await fs.stat(file),key=file+'|'+stat.size+'|'+stat.mtimeMs;
 if(cache.has(key))return cache.get(key);
 const result=await new Promise(resolve=>{
  yauzl.open(file,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{
   if(error){resolve(false);return;}let count=0,done=false;
   const finish=value=>{if(done)return;done=true;clearTimeout(timer);zip.close();resolve(value);};
   const timer=setTimeout(()=>finish(false),4000);zip.on('error',()=>finish(false));zip.on('end',()=>finish(false));
   zip.on('entry',entry=>{
    if(++count>50000){finish(false);return;}
    if(!['fabric.mod.json','META-INF/mods.toml','META-INF/neoforge.mods.toml'].includes(entry.fileName)||entry.uncompressedSize>128*1024){zip.readEntry();return;}
    zip.openReadStream(entry,(error,stream)=>{if(error){finish(false);return;}const chunks=[];let bytes=0;stream.on('error',()=>finish(false));stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>128*1024){stream.destroy();finish(false);}else chunks.push(chunk);});stream.on('end',()=>{if(done)return;try{const value=Buffer.concat(chunks).toString('utf8');const found=entry.fileName==='fabric.mod.json'?JSON.parse(value).id==='create':value.split(/\[\[mods\]\]/).slice(1).some(section=>/^\s*modId\s*=\s*["']create["']\s*(?:#.*)?$/m.test(section.split(/\n\s*\[/)[0]));if(found){finish(true);return;}}catch{}zip.readEntry();});});
   });zip.readEntry();
  });
 });
 if(cache.size>=2000)cache.clear();cache.set(key,result);return result;
}
// Importing a schematic does not require resolving Java or inherited launch metadata.
export async function listBlueprintInstances(settings){
 if(!settings.gameRoot)return [];
 const base=path.join(settings.gameRoot,'versions');await noLinks(base);
 const dirs=await fs.readdir(base,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
 return createInstances(settings,dirs.filter(e=>e.isDirectory()).slice(0,300).map(e=>({id:e.name,name:e.name})));
}
async function createFolder(settings,id){
 const dir=await modDirectory(settings,id);
 if(await exists(inside(settings.gameRoot,'versions/'+id+'/.hxzl/install-request.json')))throw Error('实例正在安装，请完成安装后导入蓝图');
 const files=(await fs.readdir(dir,{withFileTypes:true})).filter(f=>f.isFile()&&/\.jar$/i.test(f.name));
 if(files.length>10000)throw Error('实例模组数量过多');
 files.sort((a,b)=>Number(/^create[-_.]/i.test(b.name))-Number(/^create[-_.]/i.test(a.name)));
 for(const file of files){try{const full=inside(dir,file.name);await noLinks(full);if(await containsCreate(full))return dir;}catch{/* A removed or unreadable unrelated mod must not hide Create. */}}
 return null;
}
export async function createInstances(settings,instances){
 const result=[];
 let index=0;
 await Promise.all(Array.from({length:Math.min(4,instances.length)},async()=>{while(index<instances.length){const instance=instances[index++];try{if(await createFolder(settings,instance.id))result.push({id:instance.id,name:instance.name||instance.id});}catch{/* Missing/incomplete instances do not accept imports. */}}}));
 return result.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN',{numeric:true}));
}
export async function importBlueprint(settings,id,source,filename){
 const mods=await createFolder(settings,id);
 if(!mods)throw Error('此实例尚未启用机械动力 Create，请重新选择');
 const dir=path.join(path.dirname(mods),'schematics');await noLinks(dir);await fs.mkdir(dir,{recursive:true});
 let name=String(filename||'blueprint.nbt').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,120).replace(/\.nbt$/i,'');if(!name||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))name='blueprint';
 for(let n=0;n<1000;n++){const file=inside(dir,name+(n?' ('+n+')':'')+'.nbt');await noLinks(file);try{await fs.copyFile(source,file,constants.COPYFILE_EXCL);return file;}catch(e){if(e.code!=='EEXIST')throw e;}}
 throw Error('同名蓝图过多，请清理后重试');
}
