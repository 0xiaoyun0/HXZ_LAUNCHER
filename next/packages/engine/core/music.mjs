import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {writeJSON,noLinks} from './io.mjs';
import {mediaPath} from './media.mjs';
import {audioFormat,importMusicFile} from './music-files.mjs';

const safeId=value=>{const id=String(value||'').replace(/^netease:/,'');if(!/^\d{1,18}$/.test(id))throw Error('请输入网易云歌曲链接或歌曲 ID');return id;};
export function playlistId(value){
 const text=String(value||'').trim();if(/^\d{1,18}$/.test(text))return text;
 try{const url=new URL(text.match(/https?:\/\/[^\s]+/)?.[0]||text);if(!['music.163.com','y.music.163.com'].includes(url.hostname))throw Error();
  const route=new URL(url.hash.startsWith('#/')?url.hash.slice(1):url.pathname+url.search,url.origin);
  if(!/\/playlist\b/.test(route.pathname))throw Error();return safeId(route.searchParams.get('id'));
 }catch{throw Error('请粘贴网易云公开歌单完整链接（music.163.com/playlist?id=…）或歌单 ID');}
}
async function cloudJSON(route){
 const r=await fetch('https://music.163.com/api/'+route,{headers:{Referer:'https://music.163.com/'},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(`网易云连接失败（HTTP ${r.status}），可稍后重试或播放本地音乐`);
 const chunks=[];let size=0;for await(const part of r.body){size+=part.length;if(size>2*1024*1024)throw Error('网易云响应过大');chunks.push(Buffer.from(part));}const text=Buffer.concat(chunks).toString('utf8');
 let data;try{data=JSON.parse(text);}catch{throw Error('网易云暂时没有返回音乐数据，请稍后重试');}
 if(data.code!==200)throw Error('网易云暂时限制了该请求，请稍后重试');return data;
}
const track=s=>({id:'netease:'+safeId(s.id),netId:safeId(s.id),title:String(s.name||'未命名歌曲').slice(0,200),artist:(s.artists||s.ar||[]).map(a=>a.name).join(' / ').slice(0,200),source:'netease',duration:Number(s.duration||s.dt||0)/1000,cover:s.album?.picUrl||s.al?.picUrl||''});
export function createMusicService({data,dialog,window}) {
 const file=path.join(data,'music-library.json'),pending=new Map();let queue=Promise.resolve();
 const read=async()=>{try{const value=JSON.parse(await fs.readFile(file,'utf8'));return Array.isArray(value.items)?value.items.slice(0,500):[];}catch(e){if(e.code==='ENOENT')return [];throw Error('音乐库读取失败，请保留 music-library.json 并重试');}};
 const mutate=operation=>{const result=queue.then(async()=>{const items=await read();const result=await operation(items);await writeJSON(file,{version:1,items});return result;});queue=result.catch(()=>{});return result;};
 async function addOnline(id){
  const netId=safeId(id),existing=(await read()).find(t=>t.id==='netease:'+netId);if(existing)return existing;
  const response=await cloudJSON('song/detail/?ids='+encodeURIComponent(JSON.stringify([netId])));if(!response.songs?.length)throw Error('未找到这首歌曲');const value=track(response.songs[0]);
  return mutate(items=>{const old=items.find(t=>t.id===value.id);if(old)return old;if(items.length>=500)throw Error('音乐库最多 500 首，请先移除一些曲目');items.push(value);return value;});
 }
 async function prepare(id){
  let item=(await read()).find(t=>t.id===id);if(!item&&String(id).startsWith('netease:'))item=await addOnline(id);if(!item)throw Error('音乐已从列表移除');
  if(item.url){try{await fs.access(mediaPath(data,item.url));return item;}catch{}if(item.source==='local')throw Error('本地音乐副本已丢失，请重新导入');}
  if(pending.has(id))return pending.get(id);
  const job=(async()=>{
   const signal=AbortSignal.timeout(90000);let url='https://music.163.com/song/media/outer/url?id='+safeId(item.netId)+'.mp3',response;
   for(let n=0;n<5;n++){
    const u=new URL(url);if(u.protocol!=='https:'||!(u.hostname==='music.163.com'||u.hostname.endsWith('.music.126.net')))throw Error('网易云返回了不支持的音频地址');
    response=await fetch(u,{redirect:'manual',signal,headers:{Referer:'https://music.163.com/'}});
    if(![301,302,303,307,308].includes(response.status))break;
    const next=response.headers.get('location');await response.body?.cancel();if(!next)break;url=new URL(next,url).href.replace(/^http:/,'https:');
   }
   if(!response?.ok||!response.body){await response?.body?.cancel();throw Error('此曲目未提供可用外链，可能需要会员或存在版权限制。请在网易云客户端收听，或导入可播放的本地文件');}
   const dir=path.join(data,'media');await fs.mkdir(dir,{recursive:true});const temp=path.join(dir,randomUUID()+'.partial');await noLinks(temp);const output=await fs.open(temp,'wx');let size=0,format='';
   try{
    for await(const chunk of response.body){const value=Buffer.from(chunk);if(!size){format=audioFormat(value);if(!format)throw Error('网易云未返回可播放音频，此曲目可能不支持外链播放');}size+=value.length;if(size>128*1024*1024)throw Error('在线曲目超过 128 MB');await output.write(value);}
    if(!size)throw Error('音频数据为空');await output.close();const target=temp.replace('.partial','.'+format);await fs.rename(temp,target);
    item={...item,url:'hxz-media://local/'+path.basename(target),size,format,cached:Date.now()};
    await mutate(async items=>{const index=items.findIndex(t=>t.id===id);if(index<0){await fs.rm(target,{force:true});throw Error('曲目已被移除');}items[index]=item;
      const caches=items.filter(t=>t.source==='netease'&&t.url).sort((a,b)=>(b.cached||0)-(a.cached||0));let total=0;
      for(const value of caches){total+=value.size||0;if(total>256*1024*1024&&value.id!==id){await fs.rm(mediaPath(data,value.url),{force:true}).catch(()=>{});delete value.url;}}
    });return item;
   }catch(error){await response.body.cancel().catch(()=>{});await output.close().catch(()=>{});await fs.rm(temp,{force:true});throw error;}
  })();pending.set(id,job);try{return await job;}finally{pending.delete(id);}
 }
 async function importPlaylist(input){
  const id=playlistId(input),response=await cloudJSON('v6/playlist/detail?id='+id+'&n=1000&s=0'),list=response.playlist||response.result;
  if(!list)throw Error('无法读取此歌单，请确认歌单公开且链接正确');
  const ids=[...new Set((list.trackIds||list.tracks||[]).map(t=>safeId(t.id)))];
  if(!ids.length&&list.trackCount>0)throw Error('此歌单内容需要登录或暂不可读取，请使用公开歌单');
  const existing=new Set((await read()).map(t=>t.id));const selected=ids.filter(id=>!existing.has('netease:'+id)).slice(0,Math.max(0,500-existing.size));
  const songs=new Map((list.tracks||[]).map(s=>[safeId(s.id),s])),missing=selected.filter(id=>!songs.has(id));
  // Fetch metadata only. Audio is prepared when a song is actually played.
  for(let i=0;i<missing.length;i+=100){const details=await cloudJSON('song/detail/?ids='+encodeURIComponent(JSON.stringify(missing.slice(i,i+100))));for(const song of details.songs||[])songs.set(safeId(song.id),song);}
  return mutate(items=>{const known=new Set(items.map(t=>t.id));let added=0,duplicates=0,unavailable=0,limited=0;
   for(const id of ids){if(known.has('netease:'+id)){duplicates++;continue;}if(items.length>=500){limited++;continue;}const song=songs.get(id);if(!song){unavailable++;continue;}items.push(track(song));known.add('netease:'+id);added++;}
   return {name:String(list.name||'网易云歌单').slice(0,200),added,duplicates,unavailable,limited,total:Number(list.trackCount)||ids.length,unlisted:Math.max(0,(Number(list.trackCount)||0)-ids.length)};
  });
 }
 return {
  'music.list':async()=>({items:await read()}),
  'music.adopt':async({url})=>{await fs.access(mediaPath(data,url));return mutate(items=>{const old=items.find(t=>t.url===url);if(old)return old;const item={id:randomUUID(),title:'原背景音乐',artist:'本地音乐',source:'local',url};items.push(item);return item;});},
  'music.search':async({query})=>{const q=String(query||'').trim().slice(0,200);if(!q)return {items:[]};const response=await cloudJSON('search/get/web?s='+encodeURIComponent(q)+'&type=1&offset=0&limit=25');return {items:(response.result?.songs||[]).map(track)};},
  'music.add':async({id})=>addOnline(id),
  'music.playlist':async({link})=>importPlaylist(link),
  'music.prepare':async({id})=>prepare(id),
  'music.import':async()=>{
   const chosen=await dialog.showOpenDialog(window(),{title:'导入本地音乐',properties:['openFile','multiSelections'],filters:[{name:'音乐文件',extensions:['mp3','flac','wav','ogg','opus','m4a','aac','ncm','qmc0','qmc3','qmcflac','qmcogg','mflac','mgg']},{name:'全部文件',extensions:['*']}]});if(chosen.canceled)return {items:[],errors:[]};
   const imported=[],errors=[];
   for(const source of chosen.filePaths.slice(0,50))try{const item=await importMusicFile(data,source);await mutate(async items=>{if(items.length>=500){await fs.rm(mediaPath(data,item.url),{force:true});throw Error('音乐库最多 500 首');}items.push(item);});imported.push(item);}catch(e){errors.push({file:path.basename(source),error:e.message});}
   return {items:imported,errors};
  },
  'music.remove':async({id})=>mutate(async items=>{const index=items.findIndex(t=>t.id===id);if(index<0)return;const [item]=items.splice(index,1);if(item.url)await fs.rm(mediaPath(data,item.url),{force:true}).catch(()=>{});}),
 };
}
