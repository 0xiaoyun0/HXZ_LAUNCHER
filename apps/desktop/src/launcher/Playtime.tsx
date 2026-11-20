import {playDuration as pretty} from './HomeSidebar';
import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ChevronLeft} from 'lucide-react';
import {invoke,state} from '../model';
export function Playtime(){
  const s=useSnapshot(state),[data,setData]=useState<any>(),[error,setError]=useState('');
  const refresh=useCallback(async()=>{try{setData(await invoke('game.playtime'));setError('');}catch(e:any){setError(e.message);}},[]);
  useEffect(()=>{void refresh();if(!s.running)return;const timer=setInterval(refresh,5000);return()=>clearInterval(timer);},[s.running,refresh]);
  return <section className="launch-page"><Link className="quiet-link" to="/"><ChevronLeft size={15}/>首页</Link><header className="launch-title"><h1>游玩记录</h1></header>
  {error?<p className="inline-error" role="alert">{error} <button onClick={refresh}>重试</button></p>:!data?<p>正在读取本机记录…</p>:<><div className="playtime-summary"><span>本机累计</span><h2>{pretty(data.totalSeconds)}</h2><p>{s.running?'正在计时 · ':''}多个实例同时运行时，重叠时间只计一次。</p></div><h2 className="minor-title">近一年的游玩日期</h2><div className="instance-lines">{data.days.length?[...data.days].reverse().map((day:any)=><div className="setting-line" key={day.date}><strong>{day.date}</strong><time>{pretty(day.seconds)}</time></div>):<p className="empty-line">从这里启动游戏后，会自动记录游玩时间。已有记录可在设置中从旧版导入。</p>}</div></>}</section>;
}
