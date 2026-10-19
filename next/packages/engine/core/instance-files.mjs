import fs from 'node:fs/promises';
import path from 'node:path';
import {inside,noLinks,exists} from './io.mjs';
import {modDirectory} from './instances.mjs';

export const INSTANCE_FILE_TYPES=Object.freeze({
 mods:{title:'模组',directory:'mods',extensions:['jar']},
 resources:{title:'资源包',directory:'resourcepacks',extensions:['zip']},
 shaders:{title:'光影',directory:'shaderpacks',extensions:['zip']},
 schematics:{title:'机械动力蓝图',directory:'schematics',extensions:['nbt']}
});
function typeOf(kind){const type=Object.hasOwn(INSTANCE_FILE_TYPES,kind)?INSTANCE_FILE_TYPES[kind]:null;if(!type)throw Error('不支持的实例文件类型');return type;}
function filename(name){if(typeof name!=='string'||!name||name.length>240||/[\\/:\x00-\x1f]/.test(name)||/[. ]$/.test(name)||name==='.'||name==='..')throw Error('无效文件名');return name;}
function supported(name,type){return type.extensions.some(ext=>name.toLowerCase().endsWith('.'+ext));}
export async function instanceFilePaths(settings,id,kind){
 const type=typeOf(kind),base=path.dirname(await modDirectory(settings,id));
 const active=path.join(base,type.directory),disabled=path.join(base,'.hxz-disabled',type.directory);
 await noLinks(active);await noLinks(disabled);
 return{type,active,disabled,shared:settings.instanceSettings?.[id]?.isolated===false};
}
async function resolveEntry(paths,key){
 if(typeof key!=='string')throw Error('无效文件');
 const match=/^(active|disabled|legacy)\/(.+)$/.exec(key);if(!match)throw Error('无效文件');
 const [,state,name]=match;filename(name);
 const file=inside(state==='disabled'?paths.disabled:paths.active,name);
 await noLinks(file);const stat=await fs.lstat(file);
 if(!stat.isFile()&&!stat.isDirectory())throw Error('不支持此文件类型');
 const legacy=state==='legacy';
 if(legacy&&(!stat.isFile()||!name.toLowerCase().endsWith('.disabled')))throw Error('无效停用文件');
 const original=legacy?name.slice(0,-9):name;
 if(stat.isFile()&&!supported(original,paths.type))throw Error('文件类型不匹配');
 if(stat.isDirectory()&&!['resourcepacks','shaderpacks'].includes(paths.type.directory))throw Error('该类型仅支持文件');
 return{file,name:original,enabled:state==='active',stat};
}
export async function listInstanceFiles(settings,id,kind){
 const paths=await instanceFilePaths(settings,id,kind),items=[];
 for(const [state,dir]of [['active',paths.active],['disabled',paths.disabled]]){
  const entries=await fs.readdir(dir,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return[];throw e;});
  if(entries.length>10000)throw Error('文件数量过多，请在文件夹中整理后重试');
  for(const entry of entries){
   if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;
   const legacy=state==='active'&&entry.isFile()&&entry.name.toLowerCase().endsWith('.disabled');
   const name=legacy?entry.name.slice(0,-9):entry.name;
   if(entry.isDirectory()? !['resources','shaders'].includes(kind):!entry.isFile()||!supported(name,paths.type))continue;
   const key=(legacy?'legacy':state)+'/'+entry.name;
   try{const value=await resolveEntry(paths,key);items.push({key,name,enabled:value.enabled,folder:entry.isDirectory(),size:entry.isFile()?value.stat.size:0});}catch(e){if(e.code==='ENOENT')continue;throw e;}
  }
 }
 items.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN',{numeric:true})||Number(b.enabled)-Number(a.enabled));
 return{items,directory:paths.active,shared:paths.shared};
}
export async function toggleInstanceFile(settings,id,kind,key){
 const paths=await instanceFilePaths(settings,id,kind),entry=await resolveEntry(paths,key);
 const directory=entry.enabled?paths.disabled:paths.active,target=inside(directory,entry.name);
 await noLinks(target);if(await exists(target))throw Error('另一状态中已有同名文件，请先整理同名文件');
 await fs.mkdir(directory,{recursive:true});await fs.rename(entry.file,target);
 return{enabled:!entry.enabled};
}
export async function importInstanceFiles(settings,id,kind,sources){
 const paths=await instanceFilePaths(settings,id,kind);
 if(!Array.isArray(sources)||!sources.length||sources.length>200)throw Error('每次请选择 1–200 个文件');
 const plan=[],names=new Set();
 for(const source of sources){
  if(typeof source!=='string'||!path.isAbsolute(source))throw Error('请选择本机文件');
  await noLinks(source);const stat=await fs.stat(source),name=filename(path.basename(source));
  if(!stat.isFile()||!supported(name,paths.type))throw Error('请导入 '+paths.type.extensions.map(v=>'.'+v).join('、')+' 文件：'+name);
  const lower=name.toLowerCase();if(names.has(lower))throw Error('同一批文件存在重名：'+name);names.add(lower);
  const target=inside(paths.active,name);await noLinks(target);
  if(await exists(target)||await exists(inside(paths.disabled,name))||await exists(target+'.disabled'))throw Error('实例中已有同名文件：'+name+'。请先移除旧文件，不会自动覆盖。');
  plan.push({source,target});
 }
 await fs.mkdir(paths.active,{recursive:true});const copied=[];
 try{for(const item of plan){await fs.copyFile(item.source,item.target,fs.constants.COPYFILE_EXCL);copied.push(item.target);}}
 catch(error){for(const file of copied)await fs.unlink(file).catch(()=>{});throw error;}
 return{count:copied.length};
}
export async function removeInstanceFile(settings,id,kind,key,trash){const paths=await instanceFilePaths(settings,id,kind),entry=await resolveEntry(paths,key);await trash(entry.file);return{ok:true};}
