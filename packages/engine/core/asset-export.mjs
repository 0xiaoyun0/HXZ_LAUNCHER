import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/webm':'webm','video/mp4':'mp4'};
export function createAssetExporter({choose,now=Date.now}){
 let task=null;
 async function abort(){const previous=task;task=null;if(previous){await previous.file.close().catch(()=>{});await fs.unlink(previous.temp).catch(()=>{});}}
 async function invoke(input={}){
  if(task&&now()-task.updated>600000)await abort();
  if(input.action==='begin'){
   if(task)throw Error('另一个素材正在导出');const ext=types[input.mime];if(!ext||!Number.isSafeInteger(input.size)||input.size<1||input.size>64*1024*1024)throw Error('素材类型或大小无效');
   const name=String(input.name||'素材').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,110),target=await choose(name,ext);if(!target)return null;
   const id=randomUUID(),temp=path.join(path.dirname(target),'.hxz-export-'+id+'.partial'),file=await fs.open(temp,'wx');task={id,temp,target,file,total:input.size,bytes:0,index:0,updated:now()};return {id};
  }
  if(!task||input.id!==task.id)throw Error('导出已结束，请重新导出');
  if(input.action==='abort'){await abort();return {cancelled:true};}
  if(input.action==='chunk'){
   if(input.index!==task.index||typeof input.data!=='string'||input.data.length>262144||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.data))throw Error('素材分段无效');const bytes=Buffer.from(input.data,'base64');if(task.bytes+bytes.length>task.total)throw Error('素材大小发生变化');
   await task.file.writeFile(bytes);task.bytes+=bytes.length;task.index++;task.updated=now();return {received:task.bytes};
  }
  if(input.action==='finish'){
   if(task.bytes!==task.total)throw Error('素材尚未完整传输');const current=task;await current.file.sync();await current.file.close();try{await fs.rename(current.temp,current.target);task=null;return {saved:true};}catch(error){await abort();throw error;}
  }throw Error('不支持的导出操作');
 }
 // IPC calls are serialized so a double click cannot create two pending destinations.
 let chain=Promise.resolve();return {invoke:input=>{const next=chain.then(()=>invoke(input));chain=next.catch(()=>{});return next;},close:()=>chain.then(abort)};
}
