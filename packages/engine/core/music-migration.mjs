import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {mediaPath} from './media.mjs';
import {importMusicFile} from './music-files.mjs';
import {noLinks} from './io.mjs';

const label=value=>typeof value==='string'?value.slice(0,200):'';
function key(track){
  if(track.source==='netease')return 'netease:'+String(track.netId||track.id).replace(/^netease:/,'');
  return track.legacyMedia||track.url?.split('/').pop()||track.id;
}

export function musicMigration({data,choose,read,mutate}){
  let preview=null;
  async function inspect(file){
    await noLinks(file);
    const stat=await fs.stat(file);
    if(!stat.isFile()||stat.size>8*1024*1024)throw Error('请选择 8 MiB 以内的旧版 music-library.json');
    const index=JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
    if(!Array.isArray(index?.items)||index.items.length>5000)throw Error('无法识别旧版音乐库');
    const existing=await read(),keys=new Set(existing.map(key)),rows=[];
    let duplicate=0,missing=0,limited=0;
    for(const track of index.items){
      if(!track||typeof track!=='object'){missing++;continue;}
      const meta={title:label(track.title),artist:label(track.artist),album:label(track.album)};
      let row;
      if(track.source==='netease'){
        const netId=String(track.netId||track.id).replace(/^netease:/,'');
        if(!/^\d{1,18}$/.test(netId)){missing++;continue;}
        row={key:'netease:'+netId,meta:{...meta,id:'netease:'+netId,netId,source:'netease',duration:Math.max(0,Number(track.duration)||0)}};
      }else if(track.source==='local'){
        try{
          const source=mediaPath(path.dirname(file),track.url);await noLinks(source);
          const local=await fs.stat(source);
          if(!local.isFile()||!local.size||local.size>128*1024*1024||!/[.](wav|mp3|ogg|flac|m4a|aac)$/i.test(source))throw Error();
          row={key:path.basename(source),source,meta};
        }catch{missing++;continue;}
      }else{missing++;continue;}
      if(keys.has(row.key)){duplicate++;continue;}
      keys.add(row.key);
      if(existing.length+rows.length>=500){limited++;continue;}
      rows.push(row);
    }
    return {rows,total:index.items.length,duplicate,missing,limited};
  }
  return {
    async 'music.legacy.preview'(){
      preview=null;
      const selected=await choose();
      if(!selected)return {cancelled:true};
      if(path.resolve(selected).toLowerCase()===path.join(data,'music-library.json').toLowerCase())throw Error('这是当前音乐库，请选择 0.9.2 的音乐库');
      const {rows,...counts}=await inspect(selected);
      preview={ticket:randomUUID(),at:Date.now(),rows};
      return {...counts,ticket:preview.ticket,ready:rows.length};
    },
    'music.legacy.cancel'({ticket}){if(preview?.ticket===ticket)preview=null;return true;},
    async 'music.legacy.import'({ticket}){
      if(!preview||preview.ticket!==ticket||Date.now()-preview.at>30*60*1000)throw Error('曲库预览已过期，请重新选择');
      const pending=preview,created=[];
      try{
        const result=await mutate(async items=>{
          const known=new Set(items.map(key));let added=0,skipped=0;
          for(const row of pending.rows){
            if(known.has(row.key)||items.length>=500){skipped++;continue;}
            let item=row.meta;
            if(row.source){
              try{
                const copy=await importMusicFile(data,row.source);
                created.push(mediaPath(data,copy.url));
                item={...copy,...row.meta,title:row.meta.title||copy.title,legacyMedia:row.key};
              }catch{skipped++;continue;}
            }
            items.push(item);known.add(row.key);added++;
          }
          return {added,skipped};
        });
        if(preview===pending)preview=null;
        return result;
      }catch(error){await Promise.allSettled(created.map(file=>fs.unlink(file)));throw error;}
    }
  };
}
