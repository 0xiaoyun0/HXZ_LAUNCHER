import {Fragment,useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {ChevronLeft,Headphones,Pause,Play,Plus,SkipBack,SkipForward,Trash2} from 'lucide-react';
import {ChoiceGroup} from './ChoiceControls';
import {CardBoard} from '../CardBoard';
import {Link} from 'react-router-dom';
import {account,invoke,notify,perform,saveSettings,state,ui} from '../model';
import {loadMusic,music,musicTime,nextTrack,playTrack,removeTrack,seekMusic,setMusicVolume,toggleMusic} from '../music-player';
import {LyricsCard,loadLyrics,NeteaseAccount} from '../Lyrics';

export function Player(){
  const m=useSnapshot(music),s=useSnapshot(state);
  const [query,setQuery]=useState(''),[results,setResults]=useState<any[]>([]),[pending,setPending]=useState(false),[error,setError]=useState('');
  const [kind,setKind]=useState('song'),[filter,setFilter]=useState(''),[order,setOrder]=useState('library'),[lyrics,setLyrics]=useState(false);
  useEffect(()=>{void perform(loadMusic);},[]);
  useEffect(()=>{if(lyrics&&m.current?.id)void loadLyrics();},[lyrics,m.current?.id]);
  const tracks=m.items.filter((t:any)=>[t.title,t.artist,t.album].join(' ').toLowerCase().includes(filter.trim().toLowerCase()));
  if(order!=='library')tracks.sort((a:any,b:any)=>String(a[order]||'').localeCompare(String(b[order]||''),'zh-CN'));
  async function run(fn:()=>Promise<unknown>){if(pending)return;setPending(true);setError('');try{await fn();}catch(e:any){setError(e.message);}finally{setPending(false);}}
  const importButton=<button className="small-action" disabled={pending} onClick={()=>run(async()=>{const added=await invoke('music.import');await loadMusic();if(added.errors?.length)setError(added.errors.map((item:any)=>item.error||item.message||item).join('、'));})}><Plus size={15}/>导入音乐</button>;
  const player=<>
    <section className="player-now"><Headphones size={30}/><div><h2>{m.current?.title||'选择一首音乐'}</h2><p>{m.current?.artist||'从本机导入，或添加在线歌曲。'}</p></div>
    <div className="play-buttons"><button aria-label="上一首" disabled={!m.items.length} onClick={()=>perform(()=>nextTrack(-1))}><SkipBack/></button><button aria-label={m.playing?'暂停':'播放'} disabled={!m.items.length} onClick={()=>perform(toggleMusic)}>{m.playing?<Pause/>:<Play/>}</button><button aria-label="下一首" disabled={!m.items.length} onClick={()=>perform(()=>nextTrack(1))}><SkipForward/></button></div>
    <label className="player-progress"><span>{musicTime(m.position)}</span><input aria-label="播放进度" type="range" min="0" max={m.duration||0} step=".1" value={m.position||0} onChange={e=>seekMusic(Number(e.target.value))}/><span>{musicTime(m.duration)}</span></label></section>
    <div className="volume-line"><ChoiceGroup label="播放模式" value={s.settings.musicPlayMode||'list'} options={[['list','列表循环'],['single','单曲循环'],['shuffle','随机播放']]} onChange={mode=>perform(async()=>{await saveSettings({musicPlayMode:mode});music.mode=mode;})}/><label><span>音量</span><input type="range" aria-label="音量" min="0" max="1" step=".05" value={s.settings.musicVolume??.3} onChange={e=>perform(()=>setMusicVolume(Number(e.target.value)))}/></label></div>
    </>;
  const lyricsPanel=<div className="lyrics-tools">{lyrics?<LyricsCard inline/>:<button className="small-action" disabled={!m.current} onClick={()=>setLyrics(true)}>{m.current?'显示同步歌词':'播放后查看歌词'}</button>}</div>;
  const messages=<>{m.notice&&<p role="status">{m.notice}</p>}{(error||m.error)&&<p className="inline-error" role="alert">{error||m.error}</p>}
    </>;
  const library=<><div className="music-find"><input aria-label="搜索我的音乐" placeholder="搜索曲名、歌手或专辑" value={filter} onChange={e=>setFilter(e.target.value)}/><ChoiceGroup label="曲库排序" value={order} options={[['library','曲库顺序'],['artist','歌手'],['album','专辑'],['title','曲名']]} onChange={setOrder}/></div><div className="instance-lines">{tracks.length?tracks.map((track:any,index:number)=><Fragment key={track.id}>{['artist','album'].includes(order)&&(!index||tracks[index-1][order]!==track[order])&&<h3 className="minor-title">{track[order]||(order==='artist'?'未知歌手':'未知专辑')}</h3>}<div className="setting-line"><button className="small-action" aria-label={'播放 '+track.title} onClick={()=>perform(()=>playTrack(track))}><Play size={16}/></button><span><strong>{track.title}</strong><small>{track.artist||'本地音乐'}</small></span><button className="small-action" aria-label={'移除 '+track.title} onClick={()=>{ui.confirm={title:'从音乐库移除？',body:'原始音乐文件会保留。',action:()=>removeTrack(track.id)};}}><Trash2 size={15}/></button></div></Fragment>):<p className="empty-line">{m.items.length?'没有找到匹配的音乐。':'音乐库还是空的，可以从本机导入音频。'}</p>}</div>
    </>;
  const online=<div className="online-music"><form className="music-find" onSubmit={e=>{e.preventDefault();void run(async()=>{if(kind==='playlist'||/playlist|歌单/.test(query)){const info=await invoke('music.playlist',{link:query});await loadMusic();notify('已加入 '+info.added+' 首，重复 '+info.duplicates+' 首'+(info.unavailable?'，暂不可用 '+info.unavailable+' 首':'')+(info.limited?'，超出容量 '+info.limited+' 首':'')+(info.unlisted?'，未公开 '+info.unlisted+' 首':''));}else{const id=query.trim().match(/(?:id=|^)(\d+)(?:&|$)/)?.[1];if(id){await invoke('music.add',{id});await loadMusic();}else setResults((await invoke('music.search',{query})).items);}});}}><ChoiceGroup label="在线内容类型" value={kind} options={[['song','单曲'],['playlist','歌单']]} onChange={v=>{setKind(v);setResults([]);}}/><input aria-label="歌曲或歌单" placeholder="歌名、歌曲或歌单链接" value={query} onChange={e=>setQuery(e.target.value)}/><button className="small-action" disabled={pending||!query.trim()}>查找或导入</button></form>{results.map(row=><button key={row.id} className="instance-line" onClick={()=>run(async()=>{await invoke('music.add',{id:row.netId||row.id.replace('netease:','')});await loadMusic();notify('已加入音乐库');})}><Plus size={16}/>{row.title} · {row.artist}</button>)}{account(s)?.authenticated&&<NeteaseAccount/>}</div>;
  return <section className="launch-page music-page"><Link to="/" className="quiet-link"><ChevronLeft size={15}/>首页</Link>{messages}
    <CardBoard id="music" label="音乐播放器" pageTitle actions={importButton} cards={[
      {id:'player',title:'播放控制',w:s.settings.workspaceLayout==='library'?5:12,content:player},{id:'library',title:'我的音乐',w:s.settings.workspaceLayout==='library'?7:12,content:library},
      {id:'lyrics',title:'歌词',w:6,content:lyricsPanel},{id:'online',title:'在线音乐',w:6,content:online}
    ]}/></section>;
}
