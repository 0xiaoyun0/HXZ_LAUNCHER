import {useCallback,useEffect,useRef,useState} from 'react';
import {Box,Download,FolderInput,Globe,LoaderCircle,Play,RefreshCw,SlidersHorizontal,X} from 'lucide-react';
import {Link} from 'react-router-dom';
import {invoke} from '../../desktop/src/model';
import {SectionHeading} from '../../desktop/src/SectionHeading';
import {TownInstanceOptions} from './TownInstanceOptions';

export type GameTask={phase:'idle'|'working'|'choice'|'error'|'done';ticket?:string;step?:number;server?:string;title?:string;detail?:string;done?:number;total?:number;options?:{value:string;label:string}[]};
export const active=(t:GameTask)=>t.phase==='working'||t.phase==='choice';
export function useGameTask(){
 const [task,setTask]=useState<GameTask>({phase:'idle'}),rev=useRef(0);
 const refresh=useCallback(async()=>{const n=++rev.current;try{const data=await invoke<GameTask>('android.game.state');if(n===rev.current&&data)setTask(data);}catch{}},[]);
 useEffect(()=>{void refresh();window.addEventListener('town-game',refresh);window.addEventListener('town-resume',refresh);return()=>{window.removeEventListener('town-game',refresh);window.removeEventListener('town-resume',refresh);};},[refresh]);
 async function send(action:string,input:Record<string,unknown>){await invoke(action,input);await refresh();}
 return {task,send};
}
export function GameProgress({task,act,retry}:{task:GameTask;act:(a:string,v:Record<string,unknown>)=>void;retry?:()=>void}){
 if(task.phase==='idle')return null;
 return <section className="desk-card town-progress" aria-label="游戏任务" role={task.phase==='error'?'alert':undefined}>
   <SectionHeading title={<>{active(task)?<LoaderCircle size={17}/>:<Box size={17}/>} {task.title}</>}/>
   {task.detail&&<p className="town-copy">{task.detail}</p>}
   {!!task.total&&<progress aria-label="运行环境准备进度" max={task.total} value={task.done}/>}
   {task.phase==='working'&&<p role="status" className="desk-empty">可以继续浏览社区，进度会保留在这里。</p>}
   <div className="desk-actions">{task.options?.map((o,i)=><button className={i===0?'launch-primary':'small-action'} key={o.value} onClick={()=>act('android.game.respond',{ticket:task.ticket,step:task.step,value:o.value})}>{o.label}</button>)}
   {active(task)&&<button className="small-action" onClick={()=>act('android.game.cancel',{ticket:task.ticket})}><X size={15}/>取消</button>}
   {task.phase==='error'&&retry&&<button className="small-action" onClick={retry}><RefreshCw size={15}/>重试</button>}</div></section>;
}
export function TownLibrary({game,act,start,identityReady}:{game:GameTask;act:(a:string,v:Record<string,unknown>)=>void;start:(a:string,v:Record<string,unknown>)=>void;identityReady:boolean}){
 const [editing,setEditing]=useState('');
 const [list,setList]=useState<string[]>([]),[versions,setVersions]=useState<string[]>([]),[filter,setFilter]=useState(''),[catalog,setCatalog]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const refresh=useCallback(async()=>{try{setError('');setList(await invoke<string[]>('android.game.list'));setReady(true);}catch{setError('暂时读不到游戏目录。');}},[]);
 useEffect(()=>{void refresh();},[refresh,game.phase==='done']);
 async function open(){setCatalog(true);if(versions.length)return;setLoading(true);setError('');try{setVersions(await invoke<string[]>('android.game.versions'));}catch{setError('暂时连不上版本目录，请重试。');}finally{setLoading(false);}}
 return <section className="launch-page town-content"><header className="launch-title"><h1>游戏库</h1></header>
 <div className="town-stack"><GameProgress task={game} act={act}/>
 <section className="desk-card"><SectionHeading title={<><Box size={17}/> 本机实例</>} actions={<button className="icon-button" aria-label="刷新实例" onClick={()=>void refresh()}><RefreshCw size={16}/></button>}/>
 <div className="town-list">{list.map(name=><div className="town-item town-instance" key={name}><Box size={20}/><strong>{name}</strong><div className="desk-actions"><button className="icon-button" aria-label={name+' 实例设置'} disabled={active(game)} onClick={()=>setEditing(name)}><SlidersHorizontal size={17}/></button><button className="small-action" disabled={!identityReady||active(game)} onClick={()=>start('android.game.play',{instance:name})}><Play size={15}/>启动</button></div></div>)}</div>
 {editing&&<TownInstanceOptions key={editing} instance={editing} close={()=>setEditing('')}/>}
 {!list.length&&<p className="desk-empty">{ready?'本机还没有实例。可以从服务器公告安装配套整合包，也可以下载原版游戏。':'正在读取本机实例…'}</p>}
 <div className="desk-actions"><button className="small-action" disabled={active(game)} onClick={()=>void open()}><Download size={16}/>下载游戏</button><button className="small-action" disabled={!identityReady||active(game)} onClick={()=>start('android.game.import',{})}><FolderInput size={16}/>导入整合包</button><Link className="text-action" to="/town"><Globe size={16}/>社区服务器</Link></div></section>
 {catalog&&<section className="desk-card"><SectionHeading title="下载 Minecraft" actions={<button className="icon-button" aria-label="收起版本目录" onClick={()=>setCatalog(false)}><X size={16}/></button>}/><label className="town-search">查找版本<input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="例如 1.21.1"/></label>
 {loading&&<p role="status">正在读取官方版本目录…</p>}{versions.filter(v=>v.includes(filter.trim())).slice(0,20).map(v=><div className="town-item" key={v}><Box size={16}/><strong>{v}</strong><button className="small-action" disabled={!identityReady||active(game)} onClick={()=>start('android.game.download',{version:v})}>安装</button></div>)}
 {!loading&&versions.length>0&&!versions.some(v=>v.includes(filter.trim()))&&<p>没有匹配的版本。</p>}</section>}
 {error&&<div className="desk-card" role="alert">{error} <button className="small-action" onClick={()=>void(catalog?open():refresh())}>重试</button></div>}</div></section>;
}
