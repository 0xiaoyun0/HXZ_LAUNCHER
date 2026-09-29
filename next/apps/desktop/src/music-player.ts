import {proxy} from 'valtio';
import {invoke,state,notify,saveSettings} from './model';
import {community,shareRoomMusic} from '../../../packages/community/client';

export const music=proxy<any>({items:[],current:null,playing:false,loading:false,position:0,duration:0,error:'',notice:'',mode:'list',ready:false});
let audio:HTMLAudioElement|null=null,context:AudioContext|null=null,localGain:GainNode|null=null,destination:MediaStreamAudioDestinationNode|null=null,generation=0;
type PlaybackRun={failed:Set<string>;skipped:number};
function detachMediaHandlers(){if(audio){audio.onerror=null;audio.ontimeupdate=null;}}
export const musicTime=(n:number)=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
function player(){
 if(audio)return audio;
 audio=new Audio();audio.preload='metadata';audio.crossOrigin='anonymous';audio.volume=Math.max(0,Math.min(1,state.settings.musicVolume??.3));
 audio.addEventListener('play',()=>music.playing=true);audio.addEventListener('pause',()=>music.playing=false);
 audio.addEventListener('timeupdate',()=>music.position=audio!.currentTime);
 audio.addEventListener('loadedmetadata',()=>music.duration=Number.isFinite(audio!.duration)?audio!.duration:0);
 audio.addEventListener('ended',()=>{if(music.mode==='single'&&music.current)void playTrack(music.current);else void nextTrack().catch(fail);});
 return audio;
}
const fail=(e:any)=>{music.error=e?.message||String(e);notify(music.error,true);};
export async function loadMusic(){const result=await invoke('music.list');music.items=result.items;music.ready=true;}
async function attemptTrack(track:any,run:PlaybackRun,resume=false):Promise<void>{
 const token=++generation,el=player();detachMediaHandlers();el.pause();
 if(!resume){el.removeAttribute('src');el.load();}
 music.loading=true;music.error='';music.current=JSON.parse(JSON.stringify(track));music.position=resume?el.currentTime:0;music.duration=resume&&Number.isFinite(el.duration)?el.duration:0;
 let recovery:Promise<void>|undefined;
 async function recover(error:any){
  if(token!==generation)return;
  detachMediaHandlers();el.pause();music.playing=false;
  // Autoplay permission is not a broken song. Advancing cannot resolve it.
  if(error?.name==='NotAllowedError'){music.loading=false;music.error='系统阻止自动播放，请点击播放重试。';return;}
  run.failed.add(track.id);run.skipped++;
  const reason=error?.message||'音频无法播放';
  const list=music.items as any[],index=list.findIndex(t=>t.id===track.id);
  const ordered=[...list.slice(index+1),...list.slice(0,index+1)].filter(t=>!run.failed.has(t.id));
  const next=music.mode==='shuffle'?ordered[Math.floor(Math.random()*ordered.length)]:ordered[0];
  if(!next){music.loading=false;music.notice='';music.error=`当前列表没有可播放的歌曲，已停止尝试（${run.failed.size} 首）。最后失败：${track.title} · ${reason}`;return;}
  music.notice=`已跳过 ${run.skipped} 首无法播放的歌曲，正在尝试下一首。`;
  await attemptTrack(next,run);
 }
 function failed(error:any){if(token!==generation)return Promise.resolve();return recovery??(recovery=recover(error));}
 try{
  const prepared=resume||track.legacy?track:await invoke('music.prepare',{id:track.id});if(token!==generation)return;
  if(!prepared.url)throw Error('歌曲没有可用的音频地址');
  music.current=prepared;
  el.onerror=()=>{if(el.error)void failed(Error(el.error.code===2?'音频读取失败，请检查网络或本地文件。':'音频损坏或格式不受支持。'));};
  // Keep failed IDs until audio actually advances; play/error can occur in the same turn.
  el.ontimeupdate=()=>{if(token===generation&&!el.paused&&el.currentTime>0){run.failed.clear();run.skipped=0;}};
  if(!resume)el.src=prepared.url;
  if(context?.state==='suspended')await context.resume();if(token!==generation)return;
  await el.play();if(token!==generation)return;
  if(run.skipped)music.notice=`已跳过 ${run.skipped} 首无法播放的歌曲。`;
  if(!track.legacy)void loadMusic().catch(()=>{});
 }catch(e){await failed(e);}finally{if(token===generation)music.loading=false;}
}
export async function playTrack(track:any){music.notice='';await attemptTrack(track,{failed:new Set(),skipped:0});}
export async function toggleMusic(){
 if(music.loading){stopMusic();return;}
 const el=player();if(music.playing){el.pause();return;}
 if(music.current){music.notice='';await attemptTrack(music.current,{failed:new Set(),skipped:0},!!el.getAttribute('src')&&!el.error&&!music.error);}
 else if(music.items.length)await playTrack(music.items[0]);
}
export async function nextTrack(direction=1){const list=music.items;if(!list.length)return;const index=list.findIndex((t:any)=>t.id===music.current?.id);let next=(index+direction+list.length)%list.length;if(music.mode==='shuffle'&&list.length>1){next=(Math.max(0,index)+1+Math.floor(Math.random()*(list.length-1)))%list.length;}await playTrack(list[next]);}
export function seekMusic(position:number){if(audio&&Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(audio.duration,position));}
export function setMusicVolume(value:number){const level=Math.max(0,Math.min(1,value));if(localGain)localGain.gain.value=level;else if(audio)audio.volume=level;return saveSettings({musicVolume:level});}
export async function shareMusic(enabled:boolean){
 if(!enabled){shareRoomMusic(null);return;}
 if(!community.room)throw Error('请先加入一起听房间');if(!music.current)throw Error('请先选择一首音乐');
 const el=player();
 if(!context){context=new AudioContext();const source=context.createMediaElementSource(el);localGain=context.createGain();localGain.gain.value=state.settings.musicVolume??.3;source.connect(localGain);localGain.connect(context.destination);destination=context.createMediaStreamDestination();source.connect(destination);el.volume=1;}
 await context.resume();shareRoomMusic(destination!.stream);
}
export async function removeTrack(id:string){if(music.current?.id===id){stopMusic();player().removeAttribute('src');player().load();music.current=null;music.position=0;music.duration=0;music.error='';music.notice='';}await invoke('music.remove',{id});await loadMusic();}
export function stopMusic(){generation++;detachMediaHandlers();audio?.pause();music.loading=false;music.playing=false;shareRoomMusic(null);}
window.addEventListener('beforeunload',()=>{audio?.pause();void context?.close();});
