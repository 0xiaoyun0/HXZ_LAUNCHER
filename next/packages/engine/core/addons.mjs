import fs from 'node:fs/promises';
import path from 'node:path';
import {inside,noLinks,exists,remoteJSON,download,json,writeJSON,hash,parallel} from './io.mjs';
import {modDirectory,listMods} from './instances.mjs';
import {readVersion} from './minecraft.mjs';
import {instanceTarget} from './mod-plan.mjs';
import {getDownloadMode} from './sources.mjs';
const API='https://api.modrinth.com/v2';
const kinds=['datapack','resourcepack','shader'];
async function target(settings,id){const mods=await modDirectory(settings,id);return {root:path.dirname(mods),version:instanceTarget(await readVersion(settings.gameRoot,id)).minecraft};}
export async function addonWorlds(settings,id){const {root}=await target(settings,id);return (await fs.readdir(path.join(root,'saves'),{withFileTypes:true}).catch(()=>[])).filter(e=>e.isDirectory()).map(e=>e.name);}
export async function addonSearch(settings,input){
 if(!kinds.includes(input.kind))throw Error('资源类型无效');const {version}=await target(settings,input.instance);
 const facets=[[input.kind==='datapack'?'categories:datapack':'project_type:'+input.kind],['versions:'+version]];
 return remoteJSON(API+'/search?'+new URLSearchParams({query:String(input.query||'').slice(0,100),facets:JSON.stringify(facets),limit:'20',offset:String(Math.max(0,Math.floor(Number(input.offset)||0)))}));
}
export async function addonInstall(settings,input,{signal,onTransfer}={}){
 if(!kinds.includes(input.kind)||!/^[-\w]{1,100}$/.test(input.project))throw Error('资源项目无效');
 const {root,version}=await target(settings,input.instance);
 const versions=await remoteJSON(API+'/project/'+input.project+'/version?game_versions='+encodeURIComponent(JSON.stringify([version])),{signal});
 const release=versions.find(v=>v.game_versions.includes(version)&&(!input.version||v.id===input.version)&&(input.kind!=='datapack'||v.loaders.includes('datapack')));
 if(!release)throw Error('此资源没有兼容当前游戏版本的文件');
 const file=release.files.find(f=>f.primary)||release.files[0];
 if(!file||!file.filename.endsWith('.zip')||!/^https:\/\//.test(file.url)||!file.hashes?.sha512||!Number.isSafeInteger(file.size)||file.size>1024**3)throw Error('资源文件缺少可信校验或格式不支持');
 let dir=path.join(root,input.kind==='shader'?'shaderpacks':'resourcepacks');
 if(input.kind==='datapack'){
  if(!input.world||!(await addonWorlds(settings,input.instance)).includes(input.world))throw Error('请选择存档');
  dir=inside(root,'saves/'+input.world+'/datapacks');await noLinks(dir);
  if(!await exists(path.join(path.dirname(dir),'level.dat')))throw Error('请选择有效的游戏存档，数据包需要安装到存档中');
 }
 const dest=inside(dir,file.filename);await noLinks(dest);
 if(await exists(dest)&&await hash(dest,'sha512')!==file.hashes.sha512)throw Error('同名文件已存在，请先在资源目录中处理');
 await download(file.url,dest,{sha512:file.hashes.sha512,size:file.size,maxSize:1024**3,signal,onTransfer});
 return {file:file.filename,directory:dir,hint:input.kind==='shader'?'已下载；游戏需要兼容的光影加载模组，进入游戏后选择光影。':input.kind==='resourcepack'?'进入游戏的资源包设置启用。':'数据包已放入所选存档。'};
}
async function publicPost(route,data){let failure;for(const base of getDownloadMode()==='official'?[API]:['https://mod.mcimirror.top/modrinth/v2',API])try{return await remoteJSON(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}catch(e){failure=e;}throw failure;}
export async function modDetails(settings,id,data){
 const dir=await modDirectory(settings,id),files=await listMods(dir),cacheFile=path.join(data,'mod-metadata.json');let cache=await json(cacheFile).catch(()=>({}));
 const rows=[];await parallel(files,async f=>{const file=path.join(dir,f.file);await noLinks(file);const st=await fs.stat(file),key=file+':'+st.size+':'+st.mtimeMs;const saved=cache[key];rows.push({...f,key,hash:saved?.hash||await hash(file),meta:saved?.meta});},4);
 const missing=rows.filter(r=>!r.meta);for(let i=0;i<missing.length;i+=100){
  const chunk=missing.slice(i,i+100),matched=await publicPost('/version_files',{hashes:chunk.map(r=>r.hash),algorithm:'sha1'});
  const ids=[...new Set(Object.values(matched).map(v=>v.project_id))];
  const projects=ids.length?await remoteJSON(API+'/projects?ids='+encodeURIComponent(JSON.stringify(ids))):[];
  for(const row of chunk){const project=projects.find(p=>p.id===matched[row.hash]?.project_id);row.meta=project?{title:project.title,icon:project.icon_url,project:project.id,source:'项目作者发布名称'}:{title:row.name,source:'文件名（未找到作者名称）'};}
 }
 cache=Object.fromEntries(rows.map(r=>[r.key,{hash:r.hash,meta:r.meta}]));await writeJSON(cacheFile,cache);
 return rows.map(({key,hash,...row})=>({...row,name:row.meta.title,icon:/^https:\/\//.test(row.meta.icon||'')?row.meta.icon:'',nameSource:row.meta.source})).sort((a,b)=>a.file.localeCompare(b.file));
}
