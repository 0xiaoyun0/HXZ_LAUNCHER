import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {ChevronLeft,Headphones,Pause,Play,Plus,SkipBack,SkipForward,Trash2} from 'lucide-react';
import {Link} from 'react-router-dom';
import {invoke,notify,perform,state,ui} from '../model';
import {loadMusic,music,musicTime,nextTrack,playTrack,removeTrack,seekMusic,setMusicVolume,toggleMusic} from '../music-player';
import {NeteaseAccount} from '../Lyrics';

export function Player(){
  const m=useSnapshot(music),s=useSnapshot(state);
  const [query,setQuery]=useState(''),[results,setResults]=useState<any[]>([]),[pending,setPending]=useState(false),[error,setError]=useState('');
  useEffect(()=>{void perform(loadMusic);},[]);
  async function run(fn:()=>Promise<unknown>){if(pending)return;setPending(true);setError('');try{await fn();}catch(e:any){setError(e.message);}finally{setPending(false);}}
  return <section className="launch-page"><Link to="/" className="quiet-link"><ChevronLeft size={15}/>首页</Link><header className="launch-title"><h1>音乐播放器</h1><button className="small-action" disabled={pending} onClick={()=>run(async()=>{const added=await invoke('music.import');await loadMusic();if(added.errors?.length)setError(added.errors.map((item:any)=>item.error||item.message||item).join('、'));})}><Plus size={15}/>导入音乐</button></header>
    <section className="player-now"><Headphones size={30}/><div><h2>{m.current?.title||'选择一首音乐'}</h2><p>{m.current?.artist||'从本机导入，或添加在线歌曲。'}</p></div>
    <div className="play-buttons"><button aria-label="上一首" disabled={!m.items.length} onClick={()=>perform(()=>nextTrack(-1))}><SkipBack/></button><button aria-label={m.playing?'暂停':'播放'} disabled={!m.items.length} onClick={()=>perform(toggleMusic)}>{m.playing?<Pause/>:<Play/>}</button><button aria-label="下一首" disabled={!m.items.length} onClick={()=>perform(()=>nextTrack(1))}><SkipForward/></button></div>
    <label className="player-progress"><span>{musicTime(m.position)}</span><input aria-label="播放进度" type="range" min="0" max={m.duration||0} step=".1" value={m.position||0} onChange={e=>seekMusic(Number(e.target.value))}/><span>{musicTime(m.duration)}</span></label></section>
    <div className="volume-line"><label>音量 <input type="range" aria-label="音量" min="0" max="1" step=".05" value={s.settings.musicVolume??.3} onChange={e=>perform(()=>setMusicVolume(Number(e.target.value)))}/></label></div>
    {(error||m.error)&&<p className="inline-error" role="alert">{error||m.error}</p>}
    <h2 className="minor-title">我的音乐</h2><div className="instance-lines">{m.items.length?m.items.map((track:any)=><div key={track.id} className="setting-line"><button className="small-action" aria-label={'播放 '+track.title} onClick={()=>perform(()=>playTrack(track))}><Play size={16}/></button><span><strong>{track.title}</strong><small>{track.artist||'本地音乐'}</small></span><button className="small-action" aria-label={'移除 '+track.title} onClick={()=>{ui.confirm={title:'从音乐库移除？',body:'原始音乐文件会保留。',action:()=>removeTrack(track.id)};}}><Trash2 size={15}/></button></div>):<p className="empty-line">音乐库还是空的，可以从本机导入音频。</p>}</div>
    <details className="preference-more"><summary>在线歌曲与歌单</summary><form className="music-find" onSubmit={e=>{e.preventDefault();void run(async()=>{if(/playlist|歌单/.test(query)){const info=await invoke('music.playlist',{link:query});await loadMusic();notify('已添加 '+info.added+' 首音乐');}else{const id=query.trim().match(/(?:id=|^)(\d+)(?:&|$)/)?.[1];if(id){await invoke('music.add',{id});await loadMusic();}else setResults((await invoke('music.search',{query})).items);}});}}><input aria-label="歌曲或歌单" placeholder="歌名、歌曲或歌单链接" value={query} onChange={e=>setQuery(e.target.value)}/><button className="small-action" disabled={pending||!query.trim()}>查找或导入</button></form>{results.map(row=><button key={row.id} className="instance-line" onClick={()=>run(async()=>{await invoke('music.add',{id:row.netId||row.id.replace('netease:','')});await loadMusic();notify('已加入音乐库');})}><Plus size={16}/>{row.title} · {row.artist}</button>)}{s.accounts.length>0&&<NeteaseAccount/>}</details></section>;
}
