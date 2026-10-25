import {useEffect,useRef,useState} from 'react';
import {useSnapshot} from 'valtio';
import {useNavigate} from 'react-router-dom';
import {Play,Settings2,FolderOpen,ArrowRight,Square,Layers,Search,Star,PackageOpen,Download,Globe,UserPlus} from 'lucide-react';
import {state,ui,task,account,selected,cfg,perform,invoke,selectInstance,launch,importPack,reload,mediaFor,desktop,saveSettings} from './model';
import {connect,disconnect} from '../../../packages/community/client';
import {CardBoard,type CardSpec} from './CardBoard';
import {CardActions} from './CardPrimitives';
import {Avatar,Button,Modal,ContextMenu,Select,Field} from './ui';
import {PackIcon} from './GameLibrary';
import {InstanceManager} from './InstanceManager';
import {ServerMonitor} from './Monitor';
import {PlayCalendar} from './PlayCalendar';
import './home-dashboard.css';

const versionLabel=(game:any)=>[...new Set([game.version==='跟随整合包'?'版本由整合包提供':game.version||'版本待获取',game.loader==='跟随整合包'?'':game.loader||'原版'])].filter(Boolean).join(' · ');
function HomeCover({src,position,animate,onError}:{src:string;position:any;animate:boolean;onError:()=>void}){
 const video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{const media=video.current;if(!media)return;const motion=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>{if(document.hidden||!animate||motion.matches)media.pause();else void media.play().catch(()=>{});};update();document.addEventListener('visibilitychange',update);motion.addEventListener('change',update);return()=>{media.pause();document.removeEventListener('visibilitychange',update);motion.removeEventListener('change',update);};},[src,animate]);
 const style={objectPosition:`${position.coverPositionX??50}% ${position.coverPositionY??50}%`,transform:`scale(${position.coverZoom||1})`};
 return <div className="home-play-cover">{/\.(mp4|webm)(?:[?#]|$)/i.test(src)?<video ref={video} src={src} muted loop playsInline preload="metadata" style={style} onError={onError}/>:<img src={src} alt="" style={style} onError={onError}/>}</div>;
}

export function Home(){
 const s=useSnapshot(state),t=useSnapshot(task),navigate=useNavigate();
 const [query,setQuery]=useState(''),[manage,setManage]=useState(false),[cover,setCover]=useState(''),[switching,setSwitching]=useState(false),identityPending=useRef(false),[starting,setStarting]=useState(''),startPending=useRef(false);
 useEffect(()=>{if(!s.ready)return;const layouts=state.settings.cardLayouts||{};if(Object.entries(layouts).some(([key,value]:any)=>/^home\.(wide|compact)$/.test(key)&&[...(value.items||[]).map((item:any)=>item.i),...(value.hidden||[]),...(value.locked||[]),...(value.fixed||[])].includes('launcher-news')))void saveSettings((settings:any)=>({cardLayouts:Object.fromEntries(Object.entries(settings.cardLayouts||{}).map(([key,value]:any)=>/^home\.(wide|compact)$/.test(key)?[key,{...value,items:(value.items||[]).filter((item:any)=>item.i!=='launcher-news'),...Object.fromEntries(['hidden','locked','fixed'].map(field=>[field,(value[field]||[]).filter((id:string)=>id!=='launcher-news')]))}]:[key,value]))}));},[s.ready]);
 const instances=s.instances,game=selected(s),role=account(s),locked=t.busy||s.running||!!starting,current=cfg(game?.id||'',s);
 async function switchIdentity(change:()=>Promise<void>){
  if(identityPending.current||task.busy||state.running)return;
  identityPending.current=true;setSwitching(true);disconnect();
  try{await change();}finally{if(account())void connect();identityPending.current=false;setSwitching(false);}
 }
 useEffect(()=>{let live=true;const fallback=current.coverMedia||s.settings.defaultCover||(game?mediaFor(game):'');setCover(s.settings.showCover?fallback:'');if(game&&s.settings.showCover&&desktop)void invoke('instance.cover',{id:game.id}).then(value=>{if(live)setCover(value||fallback);}).catch(()=>{});return()=>{live=false;};},[game?.id,current.coverMedia,s.settings.defaultCover,s.settings.showCover]);
 const games=[...instances].filter((i:any)=>(i.name+' '+versionLabel(i)).toLowerCase().includes(query.trim().toLowerCase())).sort((a:any,b:any)=>Number(b.builtin)-Number(a.builtin)||Number(cfg(b.id,s).favorite)-Number(cfg(a.id,s).favorite));
 const actionsFor=(i:any)=>{
  const open=async(dialog='details')=>{await selectInstance(i.id);if(dialog==='details')setManage(true);else{ui.instance=i.id;ui.dialog=dialog;}};
  return [{label:'管理实例',icon:PackageOpen,disabled:locked,action:()=>open()},{label:'启动配置',icon:Settings2,disabled:locked,action:()=>open('instance')},{label:'模组、资源包与蓝图',icon:Layers,disabled:locked||!i.installed,action:()=>open('mods')},{separator:true},...([['versions','版本目录'],['screenshots','截图目录'],['saves','存档目录']] as const).map(([kind,label])=>({label,icon:FolderOpen,disabled:!i.installed,action:()=>invoke('instance.folder',{id:i.id,kind})})),{label:cfg(i.id,s).favorite?'取消收藏':'收藏实例',icon:Star,disabled:locked,action:async()=>{await invoke('instance.favorite',{id:i.id,favorite:!cfg(i.id,s).favorite});await reload();}}];
 };
 async function startInstance(id:string){if(startPending.current||task.busy||state.running)return;startPending.current=true;setStarting(id);try{await selectInstance(id);await launch(id);}finally{startPending.current=false;setStarting('');}}
 const cards:CardSpec[]=[
  {id:'library',title:'游戏实例',x:4,y:0,w:8,minW:4,minH:10,plain:true,className:'home-library-card',content:<div className="home-instance-list">
   <div className="home-list-tools"><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索实例" aria-label="搜索实例"/></div><Button icon={PackageOpen} disabled={locked} onClick={()=>importPack()}>导入</Button><Button icon={Download} onClick={()=>navigate('/workshop/install')}>下载</Button></div>
   <div className="home-game-rows">{games.map((i:any)=><ContextMenu key={i.id} items={actionsFor(i)}><div className={'home-game-row '+(game?.id===i.id?'selected':'')}><button disabled={locked} className="home-game-select" onClick={()=>perform(()=>selectInstance(i.id))} aria-pressed={game?.id===i.id} aria-label={'选择实例 '+i.name}><PackIcon game={i}/><span><strong>{i.name}{cfg(i.id,s).favorite&&<Star size={13}/>}</strong><small>{versionLabel(i)}{i.builtin&&!i.installed?' · 待安装':''}</small></span></button><Button className="home-instance-start" tone={game?.id===i.id?'solid':''} icon={Play} disabled={locked||!!i.placeholder} aria-label={(i.installed?'启动 ':'安装并启动 ')+i.name} onClick={()=>startInstance(i.id)}>{starting===i.id?'准备中':s.running&&game?.id===i.id?'运行中':i.installed?'启动':'安装并启动'}</Button></div></ContextMenu>)}</div>
   {!games.length&&<div className="home-list-empty muted"><p>{instances.length?'没有匹配的实例':'还没有游戏实例，可下载或导入整合包。'}</p></div>}
   <div className="home-list-footer"><span>{instances.filter((i:any)=>i.installed).length} 个已安装{instances.some((i:any)=>i.builtin&&!i.installed)?' · 默认服务器可直接安装':''}</span><button disabled={!game||locked} onClick={async()=>{await selectInstance(game.id);setManage(true);}}>管理实例 <ArrowRight size={14}/></button></div>
  </div>},
  {id:'launch',title:'实例详情',x:0,y:28,w:4,minW:4,minH:9,plain:true,className:'launch-card home-play-card',content:<div className="home-play">
   <div className="home-play-body">
   
   <div className="home-play-identity"><div><h2>{game?.name||'准备好进入幻想镇'}</h2>{game&&<p>{versionLabel(game)}</p>}</div>{game&&<span className={'home-ready '+(game?.error?'error':'')} aria-live="polite">{s.running?'游戏运行中':game?.error?'需要修复':game?.placeholder?'尚未开放':game?.installed?'已准备好':'首次启动自动安装'}</span>}</div>
   {game&&<><dl className="home-instance-facts"><div><dt>Java</dt><dd>{current.javaPath?'独立配置':'自动匹配'}</dd></div><div><dt>内存</dt><dd>{(current.memoryMode==='inherit'?s.settings.memoryMode:current.memoryMode)==='auto'?'自动分配':Math.round((current.memoryMode==='inherit'?s.settings.defaultMemoryMB:current.memoryMB)/1024*10)/10+' GB'}</dd></div><div><dt>整合包更新</dt><dd>{current.autoUpdate?'启动前检查':'手动检查'}</dd></div></dl><CardActions><Button icon={Settings2} disabled={locked} onClick={()=>setManage(true)}>管理实例</Button><Button icon={FolderOpen} disabled={!game.installed} onClick={()=>invoke('instance.folder',{id:game.id,kind:'versions'})}>打开目录</Button>{s.running&&<Button icon={Square} onClick={()=>invoke('game.stop')}>停止游戏</Button>}</CardActions></>}
   {game?.error&&<p className="inline-error">{game.error}</p>}
   {t.busy&&<div className="home-task-progress"><button className="text-link" onClick={()=>ui.tasks=true}><Layers size={15}/>{t.phase}<ArrowRight size={14}/></button>{t.total>0&&<><progress max={t.total} value={t.completed}/><small>当前步骤 · {Math.min(100,t.completed/t.total*100).toFixed(2)}%</small></>}</div>}
   </div>
   {cover&&<HomeCover src={cover} position={current} animate={s.settings.animationSpeed!==0} onError={()=>setCover('')}/>}
  </div>},
  {id:'roles',title:'我的角色',x:0,y:0,w:4,minW:4,minH:7,className:'home-role-card',content:<div className="home-role">
   <div className="home-role-identity"><Avatar name={role?.name} image={role?.avatar} size={48}/><div><strong>{role?.name||(role?'未选择游戏角色':'尚未登录')}</strong><small>{role?.username||'使用幻想镇皮肤站账号'}</small><span className="home-role-status" aria-live="polite">{switching?'正在切换角色…':role?(role.uuid?'已登录 · 当前游戏角色':'账号已登录 · 请管理皮肤站角色'):'登录后选择角色，开始游戏'}</span></div></div>
   {(s.accounts.length>1||role?.profiles?.length>1)&&<div className="home-role-selectors">
    {s.accounts.length>1&&<Field label="切换账号"><Select label="切换游戏账号" value={role?.id||''} disabled={locked||switching} options={s.accounts.map((a:any)=>({value:a.id,label:[a.name||'选择游戏角色',a.username].filter(Boolean).join(' · ')}))} onChange={(id:string)=>switchIdentity(()=>saveSettings({selectedAccount:id}))}/></Field>}
    {role?.profiles?.length>1&&<Field label="游戏角色"><Select label="切换游戏角色" value={role.uuid} disabled={locked||switching} options={role.profiles.map((p:any)=>({value:p.id,label:p.name}))} onChange={(uuid:string)=>switchIdentity(async()=>{await invoke('account.profile',{id:role.id,uuid});await reload();})}/></Field>}
   </div>}
   <CardActions>{role?<><Button icon={Globe} disabled={switching} onClick={()=>navigate('/account?skin=1')}>管理皮肤站</Button><Button icon={UserPlus} disabled={locked||switching} onClick={()=>ui.dialog='account'}>添加账号</Button></>:<Button tone="solid" icon={UserPlus} disabled={switching} onClick={()=>ui.dialog='account'}>登录账号</Button>}</CardActions>
  </div>},
  {id:'playtime',title:'游玩日历',x:4,y:22,w:8,minW:4,minH:13,content:<PlayCalendar/>},
  {id:'monitor',title:'服务状态',x:0,y:14,w:4,minW:4,minH:5,className:'home-monitor-card',content:<ServerMonitor limit={3}/>} 
 ];
 return <div className="air-home home-dashboard"><CardBoard id="home" pageTitle label="启动游戏" cards={cards}/><Modal open={manage} onClose={()=>setManage(false)} title="实例管理" wide><InstanceManager/></Modal></div>;
}
