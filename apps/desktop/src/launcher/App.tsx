import {ArchiveSignalMark} from '../ArchiveSignal';
import {useArchiveSignal} from '../linking-effects';
import {WindowButtons} from './WindowButtons';
import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createHashRouter,RouterProvider,Routes,Route,Navigate,NavLink,Link,useLocation,useNavigate,useBlocker} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {AlertCircle,ArrowRight,Box,Check,ChevronRight,Layers3,Minus,Search,Settings2,Square,UserRound,X} from 'lucide-react';
import {account,desktop,invoke,notify,perform,reload,state,task,ui} from '../model';
import {useAppearance} from '../workspace/appearance';
import {Avatar,Modal,IconButton} from '../ui';
import {PageBoundary} from '../PageBoundary';
import {Dialogs,TaskDrawer} from '../Dialogs';
import {useGameSleep} from '../low-resource';
import {liteTabs,pages} from './pages';
import {desktopDestination} from './community-pages';
import {Home} from './Home';
import {PortableSources} from '../PortableCards';
import {Wallpaper} from './Wallpaper';
import {workspaceLayout,workspaceModules} from '../../../../packages/engine/core/desktop-workspace.mjs';
import {version} from '../../../../package.json';
import {CommunitySlot,extension,Extensions,refreshExtension} from './Extensions';
import {MiniPlayer} from './MiniPlayer';
import {IssueHelp} from '../IssueHelp';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';
const LiteMore=lazy(()=>import('./LiteHome').then(m=>({default:m.LiteMore})));
const LiteHome=lazy(()=>import('./LiteHome').then(m=>({default:m.LiteHome})));
const Arcade=lazy(()=>import('../Arcade').then(m=>({default:m.ArcadePage})));
const Support=lazy(()=>import('./Support').then(m=>({default:m.Support})));
const Updates=lazy(()=>import('../LauncherNews').then(m=>({default:m.LauncherUpdates})));
const Servers=lazy(()=>import('./Servers').then(m=>({default:m.Servers})));
const Player=lazy(()=>import('./Player').then(m=>({default:m.Player})));
const Playtime=lazy(()=>import('./Playtime').then(m=>({default:m.Playtime})));
const Library=lazy(()=>import('../GameLibrary').then(m=>({default:m.GameLibrary})));
const Resources=lazy(()=>import('../Workshop').then(m=>({default:m.Workshop})));
const InstallCards=lazy(()=>import('../Workshop').then(m=>({default:m.Install})));
const Lobby=lazy(()=>import('../Multiplayer').then(m=>({default:m.MultiplayerPage})));
const Settings=lazy(()=>import('./Preferences').then(m=>({default:m.Preferences})));
const Identity=lazy(()=>import('./Preferences').then(m=>({default:m.Identity})));
const Preflight=lazy(()=>import('./Preflight').then(m=>({default:m.Preflight})));

function ArcadeExitPrompt({round,stay,leave}:{round:{pause:()=>void;ranked:()=>boolean;finish:()=>Promise<boolean>};stay:()=>void;leave:()=>void}){
 const [busy,setBusy]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{round.pause();},[round]);
 async function finish(){
   setBusy(true);
   try{if(await round.finish())leave();else setFailed(true);}
   catch{setFailed(true);}finally{setBusy(false);}
 }
 return <Modal open title="结束本局并离开？" onClose={()=>{if(!busy)stay();}}>
   <p role={failed?'alert':undefined}>{failed?'成绩暂未提交。可以留在本局重试，也可以放弃本次提交。':round.ranked()?'离开前会将本局成绩提交至社区。':'离开前会保存本机最好成绩。'}</p>
   <footer className="modal-actions"><button className="small-action" disabled={busy} onClick={stay}>返回游戏</button>{failed&&<button className="small-action" disabled={busy} onClick={leave}>放弃提交并离开</button>}
   <button className="launch-primary" disabled={busy} onClick={finish}>{busy?'正在结算…':failed?'重试并离开':'结算并离开'}</button></footer>
 </Modal>;
}
function PendingNavigation(){
 const blocker=useBlocker(({currentLocation,nextLocation})=>!!(ui.layoutUnsaved||ui.arcadeRound?.hasProgress())&&currentLocation.pathname+currentLocation.search!==nextLocation.pathname+nextLocation.search);
 if(blocker.state!=='blocked')return null;
 if(ui.arcadeRound)return <ArcadeExitPrompt round={ui.arcadeRound} stay={()=>blocker.reset()} leave={()=>blocker.proceed()}/>;
 return <Modal open title="保存卡片内容？" onClose={()=>blocker.reset()}><p>这张卡片有正在编辑的内容。</p><footer className="modal-actions"><button className="small-action" onClick={()=>blocker.reset()}>继续编辑</button><button className="small-action" onClick={()=>{ui.layoutUnsaved?.discard();blocker.proceed();}}>放弃更改</button><button className="launch-primary" onClick={()=>perform(async()=>{await ui.layoutUnsaved?.save();blocker.proceed();})}>保存并离开</button></footer></Modal>;
}
function ArcadeRoutes(){
 const {pathname,search}=useLocation(),target=desktopDestination(pathname+search);
 if(target&&target!==pathname+search)return <Navigate replace to={target}/>;
 return <Arcade/>;
}
function Finder({close}:{close:()=>void}){
 const [query,setQuery]=useState(''),s=useSnapshot(state),go=useNavigate(),tokens=query.trim().toLowerCase().split(/\s+/);
 const match=(v:string)=>tokens.every(t=>v.toLowerCase().includes(t));
 const active=useSnapshot(extension).active;
 const results=pages.filter(p=>(active||!p.path.startsWith('/community')||['/community/ranking','/community/wallet','/community/shop'].includes(p.path))&&match(p.label+' '+p.terms)),games=query.trim()?s.instances.filter((g:any)=>match(g.name+' '+g.id+' '+g.version)).slice(0,8):[];
 const open=(path:string)=>{close();go(path);};
 return <Modal open title="搜索启动器" onClose={close}><label className="finder-input"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索实例或功能"/></label><div className="finder-results">{results.map(p=><button key={p.path} onClick={()=>open(p.path)}><p.icon size={16}/>{p.label}<ChevronRight size={14}/></button>)}{games.map((g:any)=><button key={g.id} onClick={()=>open('/library?q='+encodeURIComponent(g.id))}><Box size={16}/>{g.name}<ChevronRight size={14}/></button>)}{!results.length&&!games.length&&<p>没有匹配的实例或功能。</p>}</div></Modal>;
}
function Frame(){
 const s=useSnapshot(state),u=useSnapshot(ui),t=useSnapshot(task),role=account(s),navigate=useNavigate(),location=useLocation(),main=useRef<HTMLElement>(null),[finder,setFinder]=useState(false);
 const [shell,setShell]=useState(()=>sessionStorage.getItem('hxz-shell')||'full');
 const homeArea=location.pathname==='/lite'||location.pathname.startsWith('/lite/');
 const lite=homeArea||(location.pathname!=='/'&&shell==='lite');
 const initialEntry=useRef(location.pathname==='/');
 useLayoutEffect(()=>{
   if(location.pathname==='/'||homeArea){
     const next=homeArea?'lite':'full';
     setShell(next);sessionStorage.setItem('hxz-shell',next);
   }
 },[location.pathname,homeArea]);
 useEffect(()=>{
   if(!s.ready||!initialEntry.current)return;
   initialEntry.current=false;
   if(location.pathname==='/'&&s.settings.liteStartup)navigate('/lite',{replace:true});
 },[s.ready,s.settings.liteStartup,location.pathname,navigate]);
 useAppearance(s,(s.settings.animationSpeed??1)===0,s.settings.animationSpeed??1);const asleep=useGameSleep();
 useEffect(()=>{void perform(reload);const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setFinder(v=>!v);}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 useEffect(()=>{main.current?.scrollTo(0,0);},[location.pathname]);
 useEffect(()=>{if(!desktop)return;const take=()=>{void invoke('lobby.invitation.take').then(url=>{if(url){ui.roomInvite=url;navigate('/multiplayer');}}).catch(()=>{});};take();return window.launcher?.subscribe(e=>{if(e.type==='open-lite')navigate('/lite');if(e.type==='room-link')take();if(e.type==='close-busy')notify('游戏或下载正在运行，启动器已最小化。');if(e.type==='file-drop'){
    const target=document.elementFromPoint(e.x/window.devicePixelRatio,e.y/window.devicePixelRatio)?.closest('.instance-files');
    if(target){target.dispatchEvent(new CustomEvent('instance-file-drop',{detail:e.ticket}));return;}
    if(document.querySelector('[role="dialog"]')||!['/','/library','/workshop','/workshop/install'].includes(location.pathname))return;
    void perform(async()=>{const p=await invoke('drop.apply',{ticket:e.ticket,target:'pack'});if(p){ui.pack=p;ui.dialog='import';}});
  }});},[navigate,location.pathname]);
 const ext=useSnapshot(extension),archiveSignal=useArchiveSignal();
 useEffect(()=>{void perform(refreshExtension);},[]);
 const visible=pages.filter(p=>ext.active||!p.path.startsWith('/community'));
 const destination=pages.find(p=>p.path===location.pathname);
 const gate=location.pathname==='/multiplayer'&&!role?.authenticated;
 const shortcutPage=['/community/guild','/community/linking','/music'].includes(location.pathname);
 const selectedTop=location.pathname==='/lite'?'/':shortcutPage?'':location.pathname.startsWith('/community/arcade/')||location.pathname.startsWith('/arcade')?'/arcade':location.pathname.startsWith('/community')?'/community':location.pathname.startsWith('/workshop')?'/workshop':location.pathname==='/servers'?'/multiplayer':location.pathname;
 const liteTab=location.pathname==='/lite'?'/lite':location.pathname.startsWith('/workshop')?'/workshop/install':location.pathname.startsWith('/settings')?'/settings':'/lite/more';
 const tabs=lite?liteTabs:visible.filter(p=>p.primary);
 const roleName=role?.name||'账号';
 const modules=workspaceModules(s.settings.workspaceModules),workspace=workspaceLayout(s.settings.workspaceLayout);
 return <div className="launcher-frame" data-shell={lite?'lite':'full'} data-workspace={workspace.id}><header className="launcher-bar" data-tauri-drag-region>
   <Link to={lite?'/lite':'/'} className="launcher-brand" aria-label="幻想镇首页">{ext.active&&archiveSignal.enabled?<ArchiveSignalMark/>:<img src="./media/brand/launcher.svg" alt=""/>}<span><strong>幻想镇</strong><small>FANTASY TOWN</small></span></Link>
   <nav aria-label="主导航">{tabs.map(p=>{
     const active=(lite?liteTab:selectedTop)===p.path;
     return <Link key={p.path} to={p.path} aria-current={active?'page':undefined} className={active?'active':''} aria-label={p.label} title={p.label}>
       <p.icon size={17} strokeWidth={1.75} aria-hidden/><span>{p.label}</span>
     </Link>;})}</nav>
   {!lite&&modules.shortcuts&&<nav className="bar-shortcuts" aria-label="快捷导航">{visible.filter(p=>['/community/guild','/music','/community/linking'].includes(p.path)).map(p=>
     <NavLink key={p.path} to={p.path} aria-label={p.label} title={p.label}>
       <p.icon size={16} strokeWidth={1.75} aria-hidden/><span>{p.path.endsWith('linking')?'LINKING':p.label}</span>
     </NavLink>)}</nav>}
   <div className="bar-spacer" data-tauri-drag-region/>
   <div className="launcher-tools">
     <IconButton icon={Search} label="搜索实例或功能" onClick={()=>setFinder(true)}/>
     {!lite&&<><button className={'toolbar-settings'+(location.pathname.startsWith('/settings')?' active':'')} aria-label="设置" title="设置" onClick={()=>navigate('/settings')}><Settings2 size={16}/><span>设置</span></button>
     <button className="role-button" aria-label="账号与角色" title={role?.name?'账号与角色 · '+roleName:'账号与角色'} onClick={()=>navigate('/account')}>
       <Avatar name={role?.name||'旅'} image={role?.avatar} size={26}/><span className="bar-role-name">{roleName}</span>
     </button></>}
   </div>
   <WindowButtons/>
 </header>
 <Wallpaper settings={s.settings} sleeping={asleep||!!s.running}/>
 <main ref={main} className="launcher-content" id="workspace-main"><PageBoundary key={location.pathname.startsWith('/community')?'/community':location.pathname}>{s.error?<section className="launch-page"><h1>无法读取本机资料</h1><IssueHelp issue={playerError(s.error,'state')}/><button onClick={()=>perform(reload)}>重试</button></section>:!s.ready?<p className="launch-page" role="status">正在读取本机游戏…</p>:asleep?<section className="launch-page"><h1>游戏运行中</h1></section>:gate?<section className="launch-page login-gate"><h1>{destination?.label}</h1><p>{location.pathname==='/multiplayer'?'登录幻想镇账号后，可以创建房间或加入伙伴。':location.pathname==='/guild'?'登录后查看委托与协会进度。':'登录后可以继续阅读和同步档案进度。'}</p><button className="launch-primary" onClick={()=>ui.dialog='account'}>登录账号 <ArrowRight size={16}/></button></section>:
 <Suspense fallback={<p className="launch-page" role="status">正在打开…</p>}><Routes><Route index element={<Home/>}/><Route path="/lite" element={<LiteHome/>}/><Route path="/lite/more" element={<LiteMore/>}/><Route path="/arcade/*" element={<ArcadeRoutes/>}/><Route path="/community/*" element={<CommunitySlot/>}/><Route path="/town" element={<Navigate replace to="/community"/>}/><Route path="/playtime" element={<Playtime/>}/><Route path="/music" element={<Player/>}/><Route path="/guild" element={<Navigate replace to="/community/guild"/>}/><Route path="/linking" element={<Navigate replace to="/community/linking"/>}/><Route path="/library" element={<Library/>}/><Route path="/workshop/*" element={<Resources/>}/><Route path="/servers" element={<Servers/>}/><Route path="/support" element={<Support/>}/><Route path="/updates" element={<section className="launch-page"><header className="launch-title"><h1>更新公告</h1></header><Updates/></section>}/><Route path="/multiplayer" element={<Lobby/>}/><Route path="/settings/extensions" element={<Extensions/>}/><Route path="/settings" element={<Settings/>}/><Route path="/account" element={<Identity/>}/><Route path="/check" element={<Preflight/>}/><Route path="*" element={<section className="launch-page"><h1>找不到这个页面</h1><Link to="/">返回首页</Link></section>}/></Routes></Suspense>}</PageBoundary></main>
 <footer className="launcher-status"><span className="status-connection"><i/>{s.running?'游戏运行中':role?.authenticated?'当前角色已登录':'本地工作台'}</span>{!lite&&modules.miniPlayer&&<MiniPlayer/>}<button onClick={()=>ui.tasks=true}><Layers3 size={14}/><span title={t.busy?t.phase:undefined}>{t.busy?t.phase:'任务与日志'}</span></button><span>{version}</span></footer><Suspense fallback={null}><PortableSources render={path=>path==='/'?<Home/>:path==='/music'?<Player/>:path==='/workshop/install'?<InstallCards/>:null}/></Suspense><PendingNavigation/><Dialogs/><TaskDrawer/><Modal open={!!u.issueOpen&&!!u.issue} title="处理建议" onClose={()=>ui.issueOpen=false}>{u.issue&&<IssueHelp issue={u.issue}/>}</Modal>{finder&&<Finder close={()=>setFinder(false)}/>}
 {u.toast&&<div className={'third-toast '+(u.toastError?'error':'')} role="status">{u.toastError?<AlertCircle size={16}/>:<Check size={15}/>}<span>{u.toast}</span>{u.toastError&&u.issue&&<button onClick={()=>{ui.issueOpen=true;ui.toast='';}}>处理方法</button>}<button aria-label="关闭提示" onClick={()=>ui.toast=''}><X size={14}/></button></div>}</div>;
}
const router=createHashRouter([{path:'*',element:<Frame/>}]);export default function App(){return <RouterProvider router={router}/>;}
