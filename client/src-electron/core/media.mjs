import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {noLinks} from './io.mjs';
export const mediaReference=value=>typeof value==='string'&&/^hxz-media:\/\/local\/[a-f0-9-]{36}\.(?:mp4|webm|mp3|ogg|wav|m4a|png|jpg|jpeg|webp)$/.test(value);
export function mediaPath(root,url){if(!mediaReference(url))throw Error('无效媒体地址');return path.join(root,'media',new URL(url).pathname.slice(1));}
export async function importMedia(data,source,kind){
 const ext=path.extname(source).slice(1).toLowerCase(),allowed=kind==='music'?['mp3','ogg','wav','m4a']:['mp4','webm','png','jpg','jpeg','webp'];
 if(!allowed.includes(ext))throw Error('不支持此媒体格式');
 await noLinks(source);const stat=await fs.stat(source),limit=['mp4','webm'].includes(ext)||kind==='music'?50*1024*1024:8*1024*1024;
 if(!stat.isFile()||stat.size>limit)throw Error('视频与音乐限 50 MB，图片限 8 MB');
 const name=randomUUID()+'.'+ext,target=path.join(data,'media',name);await noLinks(target);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target,fs.constants.COPYFILE_EXCL);return 'hxz-media://local/'+name;
}
