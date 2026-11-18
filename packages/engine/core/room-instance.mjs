import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {inside,noLinks,hash,json,writeJSON} from './io.mjs';
import {readVersion,scanInstances} from './minecraft.mjs';
import {instanceTarget} from './mod-plan.mjs';
export function loaderVersion(meta,type){
 const patch=(meta.patches||[]).find(p=>String(p.id).toLowerCase()===type);if(patch?.version)return String(patch.version);
 const prefixes={fabric:'net.fabricmc:fabric-loader:',quilt:'org.quiltmc:quilt-loader:',neoforge:'net.neoforged:neoforge:',forge:'net.minecraftforge:forge:'};
 const value=(meta.libraries||[]).find(l=>prefixes[type]&&l.name?.startsWith(prefixes[type]))?.name.split(':')[2]||'';
 return type==='forge'?value.replace(/^1\.\d+(?:\.\d+)?-/,''):value;
}
export async function describeRoomInstance(root,id,settings={},presets=[]){
 const instance=inside(root,'versions/'+id),meta=await readVersion(root,id),target=instanceTarget(meta);
 const dir=path.join(settings[id]?.isolated===false?root:instance,'mods');await noLinks(dir);
 const entries=(await fs.readdir(dir,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})).filter(f=>f.isFile()&&/\.jar$/i.test(f.name));
 if(entries.length>10000)throw Error('实例模组数量超过上限');
 const cacheFile=path.join(instance,'.hxzl/room-digests.json'),old=await json(cacheFile).catch(()=>({})),cache={};let index=0;
 await Promise.all(Array.from({length:Math.min(4,entries.length)},async()=>{while(index<entries.length){const name=entries[index++].name,file=path.join(dir,name);await noLinks(file);const stat=await fs.stat(file),key=JSON.stringify([dir,stat.size,stat.mtimeMs,stat.ctimeMs]);cache[name]={key,hash:old[name]?.key===key&&/^[a-f0-9]{64}$/.test(old[name].hash)?old[name].hash:await hash(file,'sha256')};}}));
 await noLinks(cacheFile);await writeJSON(cacheFile,cache);
 return {minecraft:target.minecraft,loader:target.loader,loaderVersion:loaderVersion(meta,target.loader),modCount:entries.length,mods:entries.length?createHash('sha256').update(Object.values(cache).map(v=>v.hash).sort().join('\n')).digest('hex'):'',preset:presets.some(p=>p.id===id)?id:''};
}
export function compatibleRoomGame(a,b){
 if(!a||!b||a.minecraft!==b.minecraft||a.loader!==b.loader||a.loaderVersion!==b.loaderVersion)return false;
 // An invitation's platform/preset marker cannot prove which substitutions are installed.
 // Keep the room strict until a verified per-pack mapping can attest both inventories.
 return a.mods===b.mods&&a.modCount===b.modCount;
}
export async function roomInstancePlan(root,target,settings,presets,preferred=''){
 if(!root||!path.isAbsolute(root))throw Error('请先在设置中选择游戏目录，再安装或加入房间');
 if(!target.game)return {legacy:true,instance:preferred,download:false,reason:'旧版邀请没有版本清单，请手动选择与房主相同的整合包。'};
 const game=target.game,list=(await scanInstances(root)).filter(v=>!v.error).sort((a,b)=>Number(b.id===preferred)-Number(a.id===preferred));
 for(const item of list){const meta=await readVersion(root,item.id).catch(()=>null);if(!meta)continue;const t=instanceTarget(meta);if(t.minecraft!==game.minecraft||t.loader!==game.loader)continue;const actual=await describeRoomInstance(root,item.id,settings,presets);if(compatibleRoomGame(actual,game))return {instance:item.id,download:false,game};}
 if(game.preset&&presets.some(p=>p.id===game.preset&&p.enabled))return {instance:game.preset,download:true,preset:true,game,reason:'将从社区管理员配置的地址安装对应整合包，并核对房主的版本与模组清单。'};
 if(!game.modCount&&(!game.loader||game.loaderVersion)){let id=('联机-'+game.minecraft+(game.loader?'-'+game.loader+'-'+game.loaderVersion:'')).slice(0,70),suffix=1;while(list.some(v=>v.id===id)){id=('联机-'+game.minecraft+'-'+suffix++).slice(0,80);}return {instance:id,download:true,game,reason:'将安装与房主相同的游戏版本和加载器。'};}
 throw Error('没有找到相同的整合包。请先向房主获取并导入整合包；此邀请未提供可信的整包下载配置，不能只安装同版本空壳。');
}
