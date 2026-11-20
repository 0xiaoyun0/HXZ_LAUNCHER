import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {noLinks} from './io.mjs';
export const mediaReference=value=>typeof value==='string'&&/^(?:hxz-media:\/\/local|http:\/\/hxz-media\.localhost)\/[a-f0-9-]{36}\.(?:mp4|webm|mp3|ogg|wav|m4a|flac|aac|png|jpg|jpeg|webp)$/.test(value);
export function mediaPath(root,url){if(!mediaReference(url))throw Error('无效媒体地址');return path.join(root,'media',new URL(url).pathname.slice(1));}

export async function cacheWallpaper(root,bytes,extension){
  const ext=extension.toLowerCase(),limit=['mp4','webm'].includes(ext)?50:8;
  if(!['mp4','webm','png','jpg','jpeg','webp'].includes(ext)||!bytes.length||bytes.length>limit*1024*1024)throw Error('壁纸格式或大小不受支持');
  const digest=createHash('sha256').update(bytes).digest('hex').slice(0,32);
  const name=[digest.slice(0,8),digest.slice(8,12),digest.slice(12,16),digest.slice(16,20),digest.slice(20)].join('-')+'.'+ext;
  const dir=path.join(root,'media'),file=path.join(dir,name),url='http://hxz-media.localhost/'+name;
  await noLinks(file);await fs.mkdir(dir,{recursive:true});
  if((await fs.stat(file).catch(()=>null))?.size===bytes.length)return url;
  const temp=path.join(dir,randomUUID()+'.tmp');
  try{await fs.writeFile(temp,bytes,{flag:'wx',mode:0o600});await fs.rename(temp,file);}
  finally{await fs.rm(temp,{force:true});}
  return url;
}
export async function importMedia(data,source,kind){
 const ext=path.extname(source).slice(1).toLowerCase(),allowed=kind==='music'?['mp3','ogg','wav','m4a']:['mp4','webm','png','jpg','jpeg','webp'];
 if(!allowed.includes(ext))throw Error('不支持此媒体格式');
 await noLinks(source);const stat=await fs.stat(source),limit=['mp4','webm'].includes(ext)||kind==='music'?50*1024*1024:8*1024*1024;
 if(!stat.isFile()||stat.size>limit)throw Error('视频与音乐限 50 MB，图片限 8 MB');
 const name=randomUUID()+'.'+ext,target=path.join(data,'media',name);await noLinks(target);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target,fs.constants.COPYFILE_EXCL);return 'http://hxz-media.localhost/'+name;
}
