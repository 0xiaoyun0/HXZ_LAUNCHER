import {useSnapshot} from 'valtio';
import {Link} from 'react-router-dom';
import {Headphones,Pause,Play} from 'lucide-react';
import {music,toggleMusic} from '../music-player';
import {perform} from '../model';
export function MiniPlayer(){
  const m=useSnapshot(music);
  return <div className="launcher-mini"><Link to="/music" aria-label="音乐播放器"><Headphones size={15}/><span>{m.current?.title||'音乐播放器'}</span></Link>{m.current&&<button aria-label={m.playing?'暂停当前音乐':'继续当前音乐'} onClick={()=>perform(toggleMusic)}>{m.playing?<Pause size={14}/>:<Play size={14}/>}</button>}</div>;
}
