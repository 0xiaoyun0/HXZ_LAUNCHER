import {useEffect,useRef,useState,lazy,Suspense} from 'react';
import {createHashRouter,RouterProvider,Link,NavLink,useNavigate,useLocation,useBlocker} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {Activity,ArrowRight,Check,ChevronRight,ContactRound,HelpCircle,Inbox,Layers3,Menu,Search,Settings2,X} from 'lucide-react';
import {account,desktop,invoke,notify,perform,reload,selectInstance,state,task,ui} from './model';
import {community,connect} from '../../../packages/community/client';
import {version} from '../../../package.json';
import {destinations,currentDestination,matches} from './workspace/destinations';
import {WorkspaceRoutes} from './workspace/Routes';
import {PageBoundary} from './PageBoundary';
import {Modal,Avatar,IconButton} from './ui';
import {Welcome} from './Welcome';
import {useAppearance} from './workspace/appearance';
import {PageLoadIndicator} from './PageFeedback';
import {Minus,Square} from 'lucide-react';
import {Dialogs,TaskDrawer} from './Dialogs';
import {HxzUpdate} from './HxzUpdate';
import {useGameSleep} from './low-resource';
import {Onboarding} from './Onboarding';
import {PortableSources,CardTravelLayer} from './PortableCards';
import {MusicHost,MusicMini} from './Music';
import {CompanionHost} from './CompanionHost';
import {FloatingLyrics} from './Lyrics';
import './card-extras.css';
import './navigation-081.css';

function Finder({close}:{close:()=>void}){
 const [term,setTerm]=useState(''),s=useSnapshot(state),c=useSnapshot(community),navigate=useNavigate();
 const pages=destinations.filter(d=>(!d.admin||c.user?.admin)&&matches(term,d.name,d.keys));
 const games=term?s.instances.filter((g:any)=>matches(term,g.name,g.id,g.version)).slice(0,12):[];
 return <Modal open title="搜索功能与实例" onClose={close}><label className="finder-input"><Search size={18}/><input autoFocus value={term} onChange={e=>setTerm(e.target.value)} placeholder="输入功能、实例名或版本"/></label><div className="finder-results">{pages.map(p=><button key={p.path} onClick={()=>{close();navigate(p.path);}}><p.icon size={17}/><strong>{p.name}</strong><small>{p.group}</small><ChevronRight size={14}/></button>)}{games.map((g:any)=><button key={g.id} onClick={()=>perform(async()=>{await selectInstance(g.id);close();navigate('/');})}><Layers3 size={17}/><strong>{g.name}</strong><small>游戏实例</small><ChevronRight size={14}/></button>)}{!pages.length&&!games.length&&<p>没有找到匹配的功能或实例。</p>}</div></Modal>;
}
function Shell(){
 const s=useSnapshot(state),u=useSnapshot(ui),t=useSnapshot(task),c=useSnapshot(community),role=account(s);
 const navigate=useNavigate(),location=useLocation(),main=useRef<HTMLElement>(null);
 const [search,setSearch]=useState(false);
 const sleeping=useGameSleep();
 const blocker=useBlocker(({currentLocation,nextLocation})=>!!(ui.unsaved||ui.layoutUnsaved)&&currentLocation.pathname+currentLocation.search!==nextLocation.pathname+nextLocation.search);
 useEffect(()=>{void perform(reload);const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearch(v=>!v);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useEffect(()=>{if(role?.authenticated)void connect();},[role?.id,role?.uuid,s.settings.communityUrl]);
 useEffect(()=>{main.current?.scrollTo(0,0);},[location.pathname]);
 useEffect(()=>{const take=()=>{void invoke('lobby.invitation.take').then(url=>{if(url){ui.roomInvite=url;navigate('/multiplayer');}}).catch(()=>{});};take();return window.launcher?.subscribe(e=>{
   if(e.type==='pack-drop')void perform(async()=>{const pack=await invoke('pack.inspect',{file:e.file});if(pack){ui.pack=pack;ui.dialog='import';}});
   if(e.type==='room-link')take();
   if(e.type==='close-busy')notify('游戏或下载仍在运行，窗口已最小化。可在任务中结束后退出。');
 });},[navigate]);
 const [guest,setGuest]=useState(()=>localStorage.getItem('hxz-third-guest')==='1');
 const themeSpeed=s.settings.animationSpeed??1;
 useAppearance(s,themeSpeed===0,themeSpeed);
 const paths=['/','/library','/multiplayer','/workshop','/community','/explore'];
 const names:Record<string,string>={'/':'游戏','/library':'游戏库','/multiplayer':'联机','/workshop':'资源','/community':'社区','/explore':'更多'};
 const primary=paths.map(path=>destinations.find(d=>d.path===path)!).filter(d=>!s.settings.hiddenLinks?.includes(d.path)||['/','/library','/explore'].includes(d.path));
 if(!s.ready||s.error||(!role?.authenticated&&!guest))return <Welcome ready={s.ready} error={s.error} onBrowse={()=>{localStorage.setItem('hxz-third-guest','1');setGuest(true);}}/>;
 const settings=s.settings,scene=settings.backgroundVideo||settings.backgroundImage;
 const style={opacity:settings.backgroundOpacity,objectPosition:(settings.backgroundPositionX??50)+'% '+(settings.backgroundPositionY??50)+'%'};
 return <div className={'app-shell air-shell shell-3rd '+(scene?'has-background':'')}>
 {scene&&(settings.backgroundVideo?<video className="app-background" src={scene} style={style} muted autoPlay loop playsInline/>:<img className="app-background" alt="" src={scene} style={style}/>)}
 <header className="air-titlebar" data-tauri-drag-region><button className="air-brand" onClick={()=>navigate('/')} title="幻想镇 3rd"><img src="./media/brand/launcher.svg" alt="" width="39" height="39"/><div><strong>幻想镇</strong><small>FANTASY TOWN</small></div></button>
 <nav className="air-primary-nav third-nav" aria-label="主导航" data-tauri-drag-region>{primary.map(d=><NavLink key={d.path} to={d.path} end={d.path==='/'} aria-label={names[d.path]} title={names[d.path]}><d.icon size={17}/><span>{names[d.path]}</span></NavLink>)}</nav>
 <div className="air-window-tools"><IconButton icon={Search} label="搜索功能与实例 · Ctrl K" onClick={()=>setSearch(true)}/><IconButton icon={Inbox} label="收件箱" onClick={()=>navigate('/community/inbox')}/><IconButton icon={Settings2} label="设置" onClick={()=>navigate('/settings')}/><button className="air-avatar" title="账号与角色" onClick={()=>{if(role)navigate('/account');else ui.dialog='account';}}><Avatar name={role?.name||'访客'} image={role?.avatar} size={29}/></button><span/>
 {([{action:'minimize',icon:Minus,label:'最小化'},{action:'maximize',icon:Square,label:'最大化'},{action:'close',icon:X,label:'关闭'}]).map(item=><IconButton key={item.action} icon={item.icon} label={item.label} className={item.action==='close'?'close-window':''} onClick={()=>perform(()=>invoke('window.control',{action:item.action}))}/>)}</div><PageLoadIndicator/></header>
 <main id="workspace-main" tabIndex={-1} ref={main} className="app-main">{sleeping?<section className="sleep-card"><h2>游戏运行中</h2><p>返回此窗口即可继续操作。</p></section>:<div className="page-transition"><PageBoundary key={location.pathname}><WorkspaceRoutes/></PageBoundary></div>}</main>
 <footer className="app-status status-balanced"><div className="status-left"><MusicMini/><span className="status-connection"><i className={c.connected?'connected':''}/>{c.connected?c.status:role?c.status:'本地浏览'}</span>{c.room&&<span className="status-voice">语音 · {c.room}</span>}</div><div className="status-right"><button className="status-task" onClick={()=>ui.tasks=true}><Layers3 size={13}/><span>{t.busy?t.phase:'任务与日志'}</span></button><small>{version}</small></div></footer>
 <Dialogs/><TaskDrawer/><Onboarding/><HxzUpdate/><FloatingLyrics/><MusicHost/>{role?.authenticated&&<CompanionHost/>}
 {s.ready&&role&&<Suspense fallback={null}><PortableSources render={route=><WorkspaceRoutes location={route}/>}/></Suspense>}<CardTravelLayer/>
 {search&&<Finder close={()=>setSearch(false)}/>}
 {u.toast&&<div className={'third-toast '+(u.toastError?'error':'')} role="status"><Check size={16}/>{u.toast}<button aria-label="关闭提示" onClick={()=>ui.toast=''}><X size={14}/></button></div>}
 {blocker.state==='blocked'&&<Modal open title="保存当前更改？" onClose={()=>blocker.reset()}><div className="modal-actions"><button onClick={()=>blocker.reset()}>继续编辑</button><button onClick={()=>{for(const p of [ui.unsaved,ui.layoutUnsaved])p?.discard();ui.unsaved=null;ui.layoutUnsaved=null;blocker.proceed();}}>放弃更改</button><button className="primary-action" onClick={()=>perform(async()=>{for(const p of [ui.unsaved,ui.layoutUnsaved])await p?.save();ui.unsaved=null;ui.layoutUnsaved=null;blocker.proceed();})}>保存并离开<ArrowRight size={14}/></button></div></Modal>}
 </div>;
}
const router=createHashRouter([{path:'*',element:<PageBoundary><Shell/></PageBoundary>}]);
export default function App(){return <RouterProvider router={router}/>;}
