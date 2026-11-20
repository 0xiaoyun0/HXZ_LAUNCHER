import {ArchiveSignalMark} from '../ArchiveSignal';
import {useArchiveSignal} from '../linking-effects';
import {WindowButtons} from './WindowButtons';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {createHashRouter,RouterProvider,Routes,Route,Navigate,NavLink,Link,useLocation,useNavigate} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {AlertCircle,ArrowRight,Box,Check,ChevronRight,Layers3,Minus,Search,Settings2,Square,UserRound,X} from 'lucide-react';
import {account,desktop,invoke,notify,perform,reload,state,task,ui} from '../model';
import {useAppearance} from '../workspace/appearance';
import {Avatar,Modal,IconButton} from '../ui';
import {PageBoundary} from '../PageBoundary';
import {Dialogs,TaskDrawer} from '../Dialogs';
import {useGameSleep} from '../low-resource';
import {pages} from './pages';
import {Home} from './Home';
import {version} from '../../../../package.json';
import {CommunitySlot,extension,Extensions,refreshExtension} from './Extensions';
import {MiniPlayer} from './MiniPlayer';
import {IssueHelp} from '../IssueHelp';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';
const Support=lazy(()=>import('./Support').then(m=>({default:m.Support})));
const Updates=lazy(()=>import('../LauncherNews').then(m=>({default:m.LauncherUpdates})));
const Servers=lazy(()=>import('./Servers').then(m=>({default:m.Servers})));
const Player=lazy(()=>import('./Player').then(m=>({default:m.Player})));
const Playtime=lazy(()=>import('./Playtime').then(m=>({default:m.Playtime})));
const Library=lazy(()=>import('../GameLibrary').then(m=>({default:m.GameLibrary})));
const Resources=lazy(()=>import('../Workshop').then(m=>({default:m.Workshop})));
const Lobby=lazy(()=>import('../Multiplayer').then(m=>({default:m.MultiplayerPage})));
const Settings=lazy(()=>import('./Preferences').then(m=>({default:m.Preferences})));
const Identity=lazy(()=>import('./Preferences').then(m=>({default:m.Identity})));
const Preflight=lazy(()=>import('./Preflight').then(m=>({default:m.Preflight})));

function Finder({close}:{close:()=>void}){
 const [query,setQuery]=useState(''),s=useSnapshot(state),go=useNavigate(),tokens=query.trim().toLowerCase().split(/\s+/);
 const match=(v:string)=>tokens.every(t=>v.toLowerCase().includes(t));
 const active=useSnapshot(extension).active;
 const results=pages.filter(p=>(active||!p.path.startsWith('/community'))&&match(p.label+' '+p.terms)),games=query.trim()?s.instances.filter((g:any)=>match(g.name+' '+g.id+' '+g.version)).slice(0,8):[];
 const open=(path:string)=>{close();go(path);};
 return <Modal open title="搜索启动器" onClose={close}><label className="finder-input"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索实例或功能"/></label><div className="finder-results">{results.map(p=><button key={p.path} onClick={()=>open(p.path)}><p.icon size={16}/>{p.label}<ChevronRight size={14}/></button>)}{games.map((g:any)=><button key={g.id} onClick={()=>open('/library?q='+encodeURIComponent(g.id))}><Box size={16}/>{g.name}<ChevronRight size={14}/></button>)}{!results.length&&!games.length&&<p>没有匹配的实例或功能。</p>}</div></Modal>;
}
function Frame(){
 const s=useSnapshot(state),u=useSnapshot(ui),t=useSnapshot(task),role=account(s),navigate=useNavigate(),location=useLocation(),main=useRef<HTMLElement>(null),[finder,setFinder]=useState(false);
 useAppearance(s,(s.settings.animationSpeed??1)===0,s.settings.animationSpeed??1);const asleep=useGameSleep();
 useEffect(()=>{void perform(reload);const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setFinder(v=>!v);}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 useEffect(()=>{main.current?.scrollTo(0,0);},[location.pathname]);
 useEffect(()=>{if(!desktop)return;const take=()=>{void invoke('lobby.invitation.take').then(url=>{if(url){ui.roomInvite=url;navigate('/multiplayer');}}).catch(()=>{});};take();return window.launcher?.subscribe(e=>{if(e.type==='room-link')take();if(e.type==='close-busy')notify('游戏或下载正在运行，启动器已最小化。');if(e.type==='file-drop'){
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
 const selectedTop=shortcutPage?'':location.pathname.startsWith('/community')?'/community':location.pathname.startsWith('/workshop')?'/workshop':location.pathname==='/servers'?'/multiplayer':location.pathname;
 const roleName=role?.name||'账号';
 return <div className="launcher-frame"><header className="launcher-bar" data-tauri-drag-region>
   <Link to="/" className="launcher-brand" aria-label="幻想镇首页">{ext.active&&archiveSignal.enabled?<ArchiveSignalMark/>:<img src="./media/brand/launcher.svg" alt=""/>}<span><strong>幻想镇</strong><small>FANTASY TOWN</small></span></Link>
   <nav aria-label="主导航">{visible.filter(p=>p.primary).map(p=>
     <Link key={p.path} to={p.path} aria-current={selectedTop===p.path?'page':undefined} className={selectedTop===p.path?'active':''} aria-label={p.label} title={p.label}>
       <p.icon size={17} strokeWidth={1.75} aria-hidden/><span>{p.label}</span>
     </Link>)}</nav>
   <nav className="bar-shortcuts" aria-label="快捷导航">{visible.filter(p=>['/community/guild','/music','/community/linking'].includes(p.path)).map(p=>
     <NavLink key={p.path} to={p.path} aria-label={p.label} title={p.label}>
       <p.icon size={16} strokeWidth={1.75} aria-hidden/><span>{p.path.endsWith('linking')?'LINKING':p.label}</span>
     </NavLink>)}</nav>
   <div className="bar-spacer" data-tauri-drag-region/>
   <div className="launcher-tools">
     <IconButton icon={Search} label="搜索实例或功能" onClick={()=>setFinder(true)}/>
     <button className={'toolbar-settings'+(location.pathname.startsWith('/settings')?' active':'')} aria-label="设置" title="设置" onClick={()=>navigate('/settings')}><Settings2 size={16}/><span>设置</span></button>
     <button className="role-button" aria-label="账号与角色" title={role?.name?'账号与角色 · '+roleName:'账号与角色'} onClick={()=>navigate('/account')}>
       <Avatar name={role?.name||'旅'} image={role?.avatar} size={26}/><span className="bar-role-name">{roleName}</span>
     </button>
   </div>
   <WindowButtons/>
 </header>
 {typeof s.settings.backgroundImage==='string'&&/^(?:data:image\/(?:png|jpeg|webp);base64,|http:\/\/hxz-media\.localhost\/)/i.test(s.settings.backgroundImage)&&<div className="launcher-wallpaper" aria-hidden="true" style={{backgroundImage:'url('+JSON.stringify(s.settings.backgroundImage)+')',opacity:Math.max(.05,Math.min(.85,Number(s.settings.backgroundOpacity)||.4))}}/>}
 <main ref={main} className="launcher-content" id="workspace-main"><PageBoundary key={location.pathname.startsWith('/community')?'/community':location.pathname}>{s.error?<section className="launch-page"><h1>无法读取本机资料</h1><IssueHelp issue={playerError(s.error,'state')}/><button onClick={()=>perform(reload)}>重试</button></section>:!s.ready?<p className="launch-page" role="status">正在读取本机游戏…</p>:asleep?<section className="launch-page"><h1>游戏运行中</h1></section>:gate?<section className="launch-page login-gate"><h1>{destination?.label}</h1><p>{location.pathname==='/multiplayer'?'登录幻想镇账号后，可以创建房间或加入伙伴。':location.pathname==='/guild'?'登录后查看委托与协会进度。':'登录后可以继续阅读和同步档案进度。'}</p><button className="launch-primary" onClick={()=>ui.dialog='account'}>登录账号 <ArrowRight size={16}/></button></section>:
 <Suspense fallback={<p className="launch-page" role="status">正在打开…</p>}><Routes><Route index element={<Home/>}/><Route path="/community/*" element={<CommunitySlot/>}/><Route path="/town" element={<Navigate replace to="/community"/>}/><Route path="/playtime" element={<Playtime/>}/><Route path="/music" element={<Player/>}/><Route path="/guild" element={<Navigate replace to="/community/guild"/>}/><Route path="/linking" element={<Navigate replace to="/community/linking"/>}/><Route path="/library" element={<Library/>}/><Route path="/workshop/*" element={<Resources/>}/><Route path="/servers" element={<Servers/>}/><Route path="/support" element={<Support/>}/><Route path="/updates" element={<section className="launch-page"><header className="launch-title"><h1>更新公告</h1></header><Updates/></section>}/><Route path="/multiplayer" element={<Lobby/>}/><Route path="/settings/extensions" element={<Extensions/>}/><Route path="/settings" element={<Settings/>}/><Route path="/account" element={<Identity/>}/><Route path="/check" element={<Preflight/>}/><Route path="*" element={<section className="launch-page"><h1>找不到这个页面</h1><Link to="/">返回首页</Link></section>}/></Routes></Suspense>}</PageBoundary></main>
 <footer className="launcher-status"><span className="status-connection"><i/>{s.running?'游戏运行中':role?.authenticated?'当前角色已登录':'本地工作台'}</span><MiniPlayer/><button onClick={()=>ui.tasks=true}><Layers3 size={14}/>{t.busy?t.phase:'任务与日志'}</button><span>{version}</span></footer><Dialogs/><TaskDrawer/><Modal open={!!u.issueOpen&&!!u.issue} title="处理建议" onClose={()=>ui.issueOpen=false}>{u.issue&&<IssueHelp issue={u.issue}/>}</Modal>{finder&&<Finder close={()=>setFinder(false)}/>}
 {u.toast&&<div className={'third-toast '+(u.toastError?'error':'')} role="status">{u.toastError?<AlertCircle size={16}/>:<Check size={15}/>}<span>{u.toast}</span>{u.toastError&&u.issue&&<button onClick={()=>{ui.issueOpen=true;ui.toast='';}}>处理方法</button>}<button aria-label="关闭提示" onClick={()=>ui.toast=''}><X size={14}/></button></div>}</div>;
}
const router=createHashRouter([{path:'*',element:<Frame/>}]);export default function App(){return <RouterProvider router={router}/>;}
