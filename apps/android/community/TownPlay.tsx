import {useCallback,useEffect,useRef,useState} from 'react';
import {Box,ChevronRight,Download,Globe,ListChecks,Play,RefreshCw,Search,SlidersHorizontal,X} from 'lucide-react';
import {Link,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {invoke} from '../../desktop/src/model';
import {SectionHeading} from '../../desktop/src/SectionHeading';
import {TownInstanceOptions,type OptionTab} from './TownInstanceOptions';
import {FolderGlyph,LatticeGlyph,StatusMark,TransferMeter} from '../../desktop/src/launcher/micro/Feedback';

export type GameTask={phase:'idle'|'working'|'choice'|'error'|'done';ticket?:string;step?:number;server?:string;instance?:string;optionTab?:OptionTab;title?:string;detail?:string;done?:number;total?:number;options?:{value:string;label:string}[]};
const instanceSettings=(name:string,tab?:OptionTab)=>'/town/games?'+new URLSearchParams(tab?{instance:name,tab}:{instance:name}).toString();
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
 const status=task.phase==='error'?'failed':task.phase==='done'?'done':task.phase==='working'?'running':'pending';
 return <section className="desk-card town-progress" data-phase={task.phase} aria-label="游戏任务" role={task.phase==='error'?'alert':undefined}>
   <SectionHeading title={<><StatusMark status={status} progress={task.total&&task.done!=null?task.done/task.total*100:null}/> {task.title}</>}/>
   {task.detail&&<p className="town-copy">{task.detail}</p>}
   {(!!task.total||task.phase==='working')&&<TransferMeter label="运行环境准备进度" max={task.total} value={task.total?task.done:undefined} running={task.phase==='working'}/>}
   {task.phase==='working'&&<p role="status" className="desk-empty">可以继续浏览社区，进度会保留在这里。</p>}
   <div className="desk-actions">{task.options?.map((o,i)=><button className={i===0?'launch-primary':'small-action'} key={o.value} onClick={()=>act('android.game.respond',{ticket:task.ticket,step:task.step,value:o.value})}>{o.label}</button>)}
   {active(task)&&<button className="small-action" onClick={()=>act('android.game.cancel',{ticket:task.ticket})}><X size={15}/>取消</button>}
   {task.phase==='error'&&task.instance&&<Link className="small-action" to={instanceSettings(task.instance,task.optionTab)} state={{townOptions:true}}><SlidersHorizontal size={15}/>调整实例设置</Link>}
   {task.phase==='error'&&retry&&<button className="small-action" onClick={retry}><RefreshCw size={15}/>重试</button>}</div></section>;
}
export function TownTasks({task,act,servers}:{task:GameTask;act:(action:string,input:Record<string,unknown>)=>void;servers:{id:string;name:string}[]}){
 const server=servers.find(s=>s.id===task.server);
 return <section className="launch-page town-content town-task-page"><header className="launch-title"><h1>游戏任务</h1></header>
   <div className="town-stack">{task.phase==='idle'?<section className="desk-card town-resting">
     <span className="town-rest-icon"><ListChecks size={28} aria-hidden/></span><h2>当前没有游戏任务</h2><p>整合包下载、版本校验和启动进度会显示在这里。</p>
     <Link className="text-action" to="/town/games">打开游戏库<ChevronRight size={16}/></Link>
   </section>:<><GameProgress task={task} act={act}/>{server&&<Link className="town-task-return" to={'/town/world/'+encodeURIComponent(server.id)}><Globe size={16}/>{server.name}<ChevronRight size={16}/></Link>}</>}</div></section>;
}
export function TownLibrary({game,act,start,identityReady}:{game:GameTask;act:(a:string,v:Record<string,unknown>)=>void;start:(a:string,v:Record<string,unknown>)=>void;identityReady:boolean}){
 const [query,setQuery]=useSearchParams(),location=useLocation(),navigate=useNavigate();
 const editing=query.get('instance');
 function closeOptions(){
   if(location.state?.townOptions){navigate(-1);return;}
   const next=new URLSearchParams(query);next.delete('instance');next.delete('tab');setQuery(next,{replace:true});
 }
 const [list,setList]=useState<string[]>([]),[versions,setVersions]=useState<string[]>([]),[filter,setFilter]=useState(''),[catalog,setCatalog]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const refresh=useCallback(async()=>{try{setError('');setList(await invoke<string[]>('android.game.list'));setReady(true);}catch{setError('暂时读不到游戏目录。');}},[]);
 useEffect(()=>{void refresh();},[refresh,game.phase==='done']);
 async function open(){setCatalog(true);if(versions.length)return;setLoading(true);setError('');try{setVersions(await invoke<string[]>('android.game.versions'));}catch{setError('暂时连不上版本目录，请重试。');}finally{setLoading(false);}}
 return <section className="launch-page town-content"><header className="launch-title"><h1>游戏库</h1></header>
 <div className="town-stack"><GameProgress task={game} act={act}/>
 <section className="desk-card"><SectionHeading title={<><Box size={17}/> 本机实例</>} actions={<button className="icon-button" aria-label="刷新实例" onClick={()=>void refresh()}><RefreshCw size={16}/></button>}/>
 <div className="town-list">{list.map(name=><div className="town-item town-instance" key={name}><Box size={20}/><strong>{name}</strong><div className="desk-actions"><button className="icon-button" aria-label={name+' 实例设置'} disabled={active(game)} onClick={()=>navigate(instanceSettings(name),{state:{townOptions:true}})}><SlidersHorizontal size={17}/></button><button className="small-action" disabled={!identityReady||active(game)} onClick={()=>start('android.game.play',{instance:name})}><Play size={15}/>启动</button></div></div>)}</div>
 {editing&&list.includes(editing)&&<TownInstanceOptions key={editing} instance={editing} initialTab={query.get('tab')==='graphics'?'graphics':'memory'} close={closeOptions}/>}
 {editing&&ready&&!list.includes(editing)&&<p role="status">这个实例已从游戏库移除。 <button className="text-action" onClick={closeOptions}>关闭</button></p>}
 {!list.length&&<p className="desk-empty">{ready?'本机还没有实例。可以从服务器公告安装配套整合包，也可以下载原版游戏。':'正在读取本机实例…'}</p>}
 <div className="desk-actions town-library-actions"><button className="launch-primary" disabled={active(game)} onClick={()=>void open()}><Download size={16}/>下载游戏</button><button className="small-action" disabled={!identityReady||active(game)} onClick={()=>start('android.game.import',{})}><FolderGlyph/>导入整合包</button><Link className="text-action" to="/town"><Globe size={16}/>社区服务器</Link></div></section>
 {catalog&&<section className="desk-card"><SectionHeading title="下载 Minecraft" actions={<button className="icon-button" aria-label="收起版本目录" onClick={()=>setCatalog(false)}><X size={16}/></button>}/><label className="town-search"><Search size={17} aria-hidden/><input aria-label="查找版本" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="查找版本，例如 1.21.1"/></label>
 {loading&&<p role="status"><LatticeGlyph/> 正在读取官方版本目录…</p>}{versions.filter(v=>v.includes(filter.trim())).slice(0,20).map(v=><div className="town-item" key={v}><Box size={16}/><strong>{v}</strong><button className="small-action" disabled={!identityReady||active(game)} onClick={()=>start('android.game.download',{version:v})}>安装</button></div>)}
 {!loading&&versions.length>0&&!versions.some(v=>v.includes(filter.trim()))&&<p>没有匹配的版本。</p>}</section>}
 {error&&<div className="desk-card" role="alert">{error} <button className="small-action" onClick={()=>void(catalog?open():refresh())}>重试</button></div>}</div></section>;
}
