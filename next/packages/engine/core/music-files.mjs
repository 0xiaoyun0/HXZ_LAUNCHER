import fs from 'node:fs/promises';
import path from 'node:path';
import {createDecipheriv,randomUUID} from 'node:crypto';
import {noLinks} from './io.mjs';

export function audioFormat(data) {
 if(data.subarray(0,4).toString()==='fLaC')return 'flac';
 if(data.subarray(0,4).toString()==='OggS')return 'ogg';
 if(data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WAVE')return 'wav';
 if(data.subarray(4,8).toString()==='ftyp')return 'm4a';
 if(data[0]===255&&(data[1]&246)===240)return 'aac';
 if(data.subarray(0,3).toString()==='ID3'||data[0]===255&&(data[1]&224)===224)return 'mp3';
 return '';
}
const decrypt=(data,key)=>{const cipher=createDecipheriv('aes-128-ecb',Buffer.from(key,'hex'),null);return Buffer.concat([cipher.update(data),cipher.final()]);};
// QMC v1 format constants. Its 128-byte pattern consists of paired rows, with a
// 32767-byte wrap after the first block. No account files or external keys are read.
const rows=['4ad6ca9067f752','5e95239f13117e','47743d90aa3f51','c609d59ffa66f9','f3d6a190a0f7f0','1d95de9f8411f4','0e74bb90bc3f92','00095b9f6266a1'].map(v=>[...Buffer.from(v,'hex')]);
const qmcPattern=Uint8Array.from(rows.flatMap((row,i)=>[195,...row,216,...rows[7-i].slice().reverse()]));
export const qmcByte=offset=>qmcPattern[(offset>32767?offset%32767:offset)%128];
export async function importMusicFile(root,source) {
 await noLinks(source);const input=await fs.open(source,'r');let output,target;
 try {
  const stat=await input.stat();if(!stat.isFile()||stat.size<12||stat.size>256*1024*1024)throw Error('音乐文件需在 12 字节至 256 MB 之间');
  let position=0;
  const read=async size=>{if(size<0||size>2*1024*1024||position+size>stat.size)throw Error('音乐文件已损坏或格式不完整');const b=Buffer.alloc(size);const r=await input.read(b,0,size,position);if(r.bytesRead!==size)throw Error('音乐文件读取不完整');position+=size;return b;};
  const number=async()=> (await read(4)).readUInt32LE();
  const head=await read(12);let format=audioFormat(head),mask=null,metadata={},qmc=false;
  if(head.subarray(0,8).toString()==='CTENFDAM') {
   position=10;const keyData=await read(await number());
   const key=decrypt(keyData.map(v=>v^100),'687a4852416d736f356b496e62617857').subarray(17);
   if(!key.length)throw Error('NCM 音频密钥不完整');
   const box=Uint8Array.from({length:256},(_,i)=>i);let j=0;
   for(let i=0;i<256;i++){j=(j+box[i]+key[i%key.length])&255;[box[i],box[j]]=[box[j],box[i]];}
   mask=Uint8Array.from({length:256},(_,i)=>{const n=(i+1)&255;return box[(box[n]+box[(box[n]+n)&255])&255];});
   const meta=await read(await number());
   if(meta.length)try{metadata=JSON.parse(decrypt(Buffer.from(meta.map(v=>v^99).subarray(22).toString(),'base64'),'2331346c6a6b5f215c5d2630553c2728').toString().slice(6));}catch{}
   position+=5;const space=await number(),size=await number();if(size>space||space>16*1024*1024||position+space>=stat.size)throw Error('NCM 封面数据损坏');position+=space;
  } else if(format)position=0;
  else if(/^\.qmc(?:0|2|3|flac|ogg)$/.test(path.extname(source).toLowerCase())){position=0;qmc=true;}
  else {
   const ext=path.extname(source).toLowerCase();
   throw Error(/\.(mflac\w*|mgg\w*|qmc\w*|qishui|cache)$/.test(ext)?'这是专有加密音频，当前格式无法直接播放。请从原音乐软件导出 MP3 / FLAC / M4A 后导入。':'未识别到可播放音频，请检查文件是否完整；更改扩展名无法解密音频');
  }
  const start=position,chunk=Buffer.alloc(64*1024);let offset=0;
  await fs.mkdir(path.join(root,'media'),{recursive:true});
  while(position<stat.size){
   const {bytesRead}=await input.read(chunk,0,Math.min(chunk.length,stat.size-position),position);if(!bytesRead)throw Error('音频读取意外中断');
   if(mask)for(let i=0;i<bytesRead;i++)chunk[i]^=mask[(offset+i)&255];
   if(qmc)for(let i=0;i<bytesRead;i++)chunk[i]^=qmcByte(offset+i);
   if(!output){format=audioFormat(chunk.subarray(0,bytesRead));if(!format)throw Error('音频内容无法识别，可能是未支持的加密版本');target=path.join(root,'media',randomUUID()+'.'+format);await noLinks(target);output=await fs.open(target,'wx');}
   await output.write(chunk,0,bytesRead);position+=bytesRead;offset+=bytesRead;
  }
  await output?.close();output=null;
  return {id:randomUUID(),title:String(metadata.musicName||path.basename(source,path.extname(source))).slice(0,200),artist:Array.isArray(metadata.artist)?metadata.artist.map(a=>Array.isArray(a)?a[0]:a).join(' / ').slice(0,200):'本地音乐',source:'local',format,url:'hxz-media://local/'+path.basename(target),size:stat.size-start};
 } catch(error){await output?.close().catch(()=>{});if(target)await fs.rm(target,{force:true});throw error;}finally{await input.close();}
}
