import {Welcome} from './Welcome';
import {version as launcherVersion} from '../../../package.json';
import {ArchiveSignalMark} from './ArchiveSignal';
import {useArchiveSignal} from './linking-effects';
import {HUB_AREAS} from '../../../packages/hub/navigation.mjs';
import {Compass as HubIcon} from 'lucide-react';
import {CompanionHost} from './CompanionHost';
import {PortableSources,CardTravelLayer} from './PortableCards';
import './card-extras.css';
import './navigation-081.css';
import {Onboarding} from './Onboarding';
import {useGameSleep} from './low-resource';
import {PageLoadIndicator,PageSkeleton,usePageEnter,useReducedMotionPreference} from './PageFeedback';
import {HxzUpdate} from './HxzUpdate';
import {FloatingLyrics} from './Lyrics';
import {InboxButton} from './Inbox';
import {MusicPage,MusicMini,MusicHost} from './Music';
import {PageBoundary} from './PageBoundary';
import {useEffect,useLayoutEffect,useState,useRef,lazy,Suspense} from 'react';
import {useSnapshot} from 'valtio';
import {HashRouter,Routes,Route,NavLink,Navigate,useLocation,useNavigate} from 'react-router-dom';
import {MotionConfig,motion,AnimatePresence} from 'motion/react';
import {Search,Minus,Square,X,Layers,ArrowUpRight,Play,MessagesSquare,Gamepad2,Check,AlertCircle,Settings,LifeBuoy,Sparkles,ShoppingBag,Download,Box,Music2,MoreHorizontal,Palette,PanelTop,UserRound,Network} from 'lucide-react';
import {state,ui,task,account,desktop,reload,perform,invoke,saveSettings,importPack,selectInstance,notify} from './model';
import {community,connect} from '../../../packages/community/client';
import {Home} from './HomeDashboard';
import {GameLibrary} from './GameLibrary';
import {normalizeCardStyle} from '../../../packages/engine/core/card-layout.mjs';
import {Dialogs,TaskDrawer} from './Dialogs';
import {Button,IconButton,Avatar,Modal,Dropdown,Toggle} from './ui';
const MultiplayerPage=lazy(()=>import('./Multiplayer').then(m=>({default:m.MultiplayerPage})));
const GuildPage=lazy(()=>import('./Guild').then(m=>({default:m.GuildPage})));
const Linking=lazy(()=>import('./Linking').then(m=>({default:m.Linking})));
const CommunityPage=lazy(()=>import('./Community').then(m=>({default:m.CommunityPage})));
const Workshop=lazy(()=>import('./Workshop').then(m=>({default:m.Workshop})));
const ArcadePage=lazy(()=>import('./Arcade').then(m=>({default:m.ArcadePage})));
const FeedbackPage=lazy(()=>import('./FeedbackPage').then(m=>({default:m.FeedbackPage})));
const SettingsPage=lazy(()=>import('./Settings').then(m=>({default:m.SettingsPage})));
const AccountPage=lazy(()=>import('./AccountCards').then(m=>({default:m.AccountPage})));
const InventoryPage=lazy(()=>import('./Inventory').then(m=>({default:m.InventoryPage})));
const HubStandalone=lazy(()=>import('./Hub').then(m=>({default:m.HubStandalone})));
function AppRoutes({location}: {location?:string}){return <Routes location={location}><Route path="/" element={<Home/>}/><Route path="/library" element={<GameLibrary/>}/><Route path="/library/worlds" element={<HubStandalone area="worlds"/>}/><Route path="/multiplayer" element={<MultiplayerPage/>}/><Route path="/community/*" element={<CommunityPage/>}/><Route path="/workshop/*" element={<Workshop/>}/><Route path="/arcade/*" element={<ArcadePage/>}/><Route path="/account/community" element={<HubStandalone area="personal"/>}/><Route path="/account/backpack" element={<InventoryPage/>}/><Route path="/account/*" element={<AccountPage/>}/><Route path="/guild" element={<GuildPage/>}/><Route path="/linking" element={<Linking/>}/><Route path="/music" element={<MusicPage/>}/><Route path="/music/watch" element={<MusicPage/>}/><Route path="/settings/appeals" element={<HubStandalone area="support"/>}/><Route path="/manage" element={<HubStandalone area="admin"/>}/><Route path="/feedback" element={<FeedbackPage/>}/><Route path="/settings/*" element={<SettingsPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;}
function Shell(){
 const sleeping=useGameSleep();
 const s=useSnapshot(state),u=useSnapshot(ui),t=useSnapshot(task),c=useSnapshot(community),location=useLocation(),rawNavigate=useNavigate();
 const authenticated=!!account(s)?.id&&account(s)?.authenticated!==false;
 const [command,setCommand]=useState(false),[query,setQuery]=useState(''),[destination,setDestination]=useState(''),[navMode,setNavMode]=useState('full');const nav=useRef<HTMLElement>(null);
 const taps=useRef<number[]>([]),reduce=useReducedMotionPreference(),video=useRef<HTMLVideoElement>(null),main=useRef<HTMLElement>(null);
 // The page viewport resets independently of nested chat history/card scroll areas.
 useLayoutEffect(()=>{if(main.current)main.current.scrollTop=0;},[location.pathname]);
 useEffect(()=>{if(sleeping)video.current?.pause();else void video.current?.play().catch(()=>{});},[sleeping]);
 useEffect(()=>{if(!authenticated)return;const receive=()=>invoke('lobby.invitation.take').then(value=>{if(value){ui.roomInvite=value;if(ui.unsaved||ui.layoutUnsaved)setDestination('/multiplayer');else rawNavigate('/multiplayer');}}).catch(()=>{});void receive();return window.launcher?.subscribe(e=>{if(e.type==='room-invitation')void receive();else if(e.type==='room-invitation-error')notify(e.error);});},[authenticated]);
 const signal=useArchiveSignal();
 const speed=s.settings.animationSpeed??1,off=speed===0||!!reduce;
 const contentMotion=usePageEnter((s.ready?'ready:':'loading:')+location.pathname);
 const navigate=(path:string)=>{if((ui.unsaved||ui.layoutUnsaved)&&location.pathname!==path)setDestination(path);else rawNavigate(path);};
 useEffect(()=>{const capture=(e:MouseEvent)=>{const link=(e.target as Element)?.closest('a');if((!ui.unsaved&&!ui.layoutUnsaved)||!link||e.ctrlKey||e.metaKey||link.target==='_blank')return;const url=new URL(link.href,window.location.href);if(url.origin===window.location.origin&&url.hash.startsWith('#/')&&url.hash.slice(1)!==location.pathname){e.preventDefault();e.stopPropagation();setDestination(url.hash.slice(1));}};document.addEventListener('click',capture,true);return()=>document.removeEventListener('click',capture,true);},[location.pathname]);
 useEffect(()=>{const visibility=()=>{if(document.hidden)video.current?.pause();else void video.current?.play().catch(()=>{});};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);},[]);
 useEffect(()=>{void perform(reload).then(()=>{if(state.settings.selectedAccount)void connect();});const key=(e:KeyboardEvent)=>{if(account(state)?.id&&account(state)?.authenticated!==false&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCommand(v=>!v);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useEffect(()=>{
  const root=document.documentElement;root.dataset.theme=s.settings.theme;root.dataset.motion=off?'off':'on';root.style.setProperty('--duration',off?'0s':(.32/speed)+'s');root.style.setProperty('--accent',s.settings.accentColor||'#5668bc');root.style.setProperty('--font-size',(s.settings.fontSize||16)+'px');
  const rgba=(hex:string,alpha:number)=>`rgba(${hex.slice(1).match(/../g)?.map(v=>parseInt(v,16)).join(',')||'255,255,255'},${Math.max(.2,Math.min(1,alpha))})`;
  const base=s.settings.theme==='dark'?'#252a35':'#ffffff';
  // Derive selection surfaces from the player's accent, including Chromium 108.
  const accent=s.settings.accentColor||'#5668bc',rgb=/^#[0-9a-f]{6}$/i.test(accent)?accent.slice(1).match(/../g)!.map(v=>parseInt(v,16)).join(','):'86,104,188';
  root.style.setProperty('--accent-soft',`rgba(${rgb},${s.settings.theme==='dark'?.19:.09})`);
  root.style.setProperty('--accent-border',`rgba(${rgb},${s.settings.theme==='dark'?.5:.28})`);
  root.style.setProperty('--accent-text',s.settings.theme==='dark'?`rgb(${rgb.split(',').map(v=>Math.round(Number(v)+(255-Number(v))*.55)).join(',')})`:accent);
  for(const [key,value] of Object.entries(s.settings.columns||{}) as any)root.style.setProperty('--'+key+'-surface',rgba(value.color||base,value.opacity??1));
  const card=normalizeCardStyle(s.settings.cardStyle),workspace=s.settings.columns?.workspace;
  root.style.setProperty('--card-surface',rgba(card.color||workspace?.color||base,card.opacity));root.style.setProperty('--card-radius',card.radius+'px');
 },[s.settings.theme,s.settings.fontSize,s.settings.accentColor,s.settings.columns,s.settings.cardStyle,speed,off]);
 const hidden=s.settings.hiddenLinks||[];
 const allPrimary=[{to:'/',name:'游戏',icon:Play},{to:'/multiplayer',name:'联机',icon:Network},{to:'/workshop',name:'资源',icon:Download},{to:'/community',name:'社区',icon:MessagesSquare},{to:'/guild',name:'冒险家协会',icon:Sparkles},{to:'/arcade',name:'小游戏',icon:Gamepad2},{to:'/arcade/shop',name:'积分商城',icon:ShoppingBag},{to:'/music',name:'音乐播放器',icon:Music2},{to:'/linking',name:'LINKING',icon:Sparkles},{to:'/settings',name:'设置',icon:Settings}];
 const mainNav=allPrimary.filter(n=>!hidden.includes(n.to)||['/','/settings','/linking'].includes(n.to));
 const routeActive=(to:string)=>to==='/'?location.pathname==='/'||location.pathname.startsWith('/library'):to==='/arcade'?location.pathname.startsWith('/arcade')&&!location.pathname.startsWith('/arcade/shop'):location.pathname===to||location.pathname.startsWith(to+'/');
 useEffect(()=>{const el=nav.current;if(!el)return;const ctx=document.createElement('canvas').getContext('2d');const measure=()=>{if(!ctx)return;const item=el.querySelector('a');if(!item)return;ctx.font=getComputedStyle(item).font;const needed=mainNav.reduce((sum:number,n:any)=>sum+ctx.measureText(n.name).width+54,0)+(mainNav.length-1)*5;setNavMode(needed<=el.clientWidth?'full':needed-mainNav.length*14<=el.clientWidth?'tight':'icons');};const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[mainNav.map(n=>n.to).join('|'),s.settings.fontSize,authenticated]);
 const commands=[...allPrimary,{to:'/community/blueprints',name:'机械动力蓝图',icon:Box},{to:'/community/notices',name:'启动器更新',icon:Download},...Object.entries(HUB_AREAS).filter(([key,v])=>!['people','creation','knowledge','games','council','media','events'].includes(key)&&(!('admin' in v)||c.user?.admin)).map(([,v])=>v).map(v=>({to:v.path,name:v.title,icon:HubIcon})),{to:'/feedback',name:'问题反馈',icon:LifeBuoy},{to:'/account/backpack',name:'背包与使用凭证',icon:ShoppingBag},...s.instances.filter((i:any)=>!i.builtin||i.installed).map((i:any)=>({to:'/',name:i.name,instance:i.id}))].filter(i=>i.name.toLowerCase().includes(query.toLowerCase()));
 if(!s.ready||s.error||!authenticated)return <Welcome ready={s.ready} error={s.error}/>;
 return <MotionConfig reducedMotion={off?'always':'user'} transition={{duration:off?0:.28/speed,ease:[.22,.68,.24,1]}}><div className={'app-shell air-shell '+(s.settings.backgroundImage||s.settings.backgroundVideo?'has-background':'')} onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}} onDrop={e=>{if(!e.dataTransfer.types.includes('Files'))return;e.preventDefault();const file=e.dataTransfer.files[0];if(file&&!u.dialog)void perform(()=>importPack(file));}}>
  {s.settings.backgroundVideo?<video ref={video} className="app-background" src={s.settings.backgroundVideo} muted autoPlay loop playsInline style={{opacity:s.settings.backgroundOpacity,objectPosition:`${s.settings.backgroundPositionX??50}% ${s.settings.backgroundPositionY??50}%`}}/>:s.settings.backgroundImage?<img className="app-background" src={s.settings.backgroundImage} alt="" style={{opacity:s.settings.backgroundOpacity,objectPosition:`${s.settings.backgroundPositionX??50}% ${s.settings.backgroundPositionY??50}%`}}/>:null}<MusicHost/><CompanionHost/>
  <header className="air-titlebar"><button className="air-brand" onClick={()=>navigate('/')} title="幻想镇 NEXT">{signal.enabled?<ArchiveSignalMark/>:<img src="./media/brand/launcher.svg" alt="" width="39" height="39"/>}<div><strong>幻想镇</strong><small>FANTASY TOWN</small></div></button><nav ref={nav} className={"air-primary-nav "+(navMode==='icons'?"nav-compact":navMode==='tight'?"nav-tight":"")} aria-label="主导航">{mainNav.map((n:any)=><NavLink key={n.to} to={n.to} title={n.name} aria-label={n.name} end={n.to==='/'} className={()=>routeActive(n.to)?'active':''}><n.icon size={17}/><span>{n.name}</span></NavLink>)}</nav><div className="air-window-tools"><IconButton icon={PanelTop} label="快速前往 · Ctrl K" onClick={()=>{setQuery('');setCommand(true);}}/><InboxButton/><IconButton icon={LifeBuoy} label="问题反馈" onClick={()=>navigate('/feedback')}/><button className="air-avatar" title="账号与角色" onClick={()=>navigate('/account')}><Avatar name={account(s)?.name} image={account(s)?.avatar} size={29}/></button><span/><IconButton icon={Minus} label="最小化" onClick={()=>invoke('window.control',{action:'minimize'})}/><IconButton icon={Square} label="最大化" onClick={()=>invoke('window.control',{action:'maximize'})}/><IconButton icon={X} label="关闭" className="close-window" onClick={()=>invoke('window.control',{action:'close'})}/></div></header>
  {!desktop&&<div className="preview-notice">界面预览 · 登录、游戏和实时数据请使用桌面程序</div>}
  <PageLoadIndicator/><main ref={main} className="app-main">{sleeping?<div className="sleep-card"><Play size={32}/><h2>专心游戏，稍后回来</h2><p>页面已休眠，语音、音乐和下载继续运行。</p></div>:s.error?<div className="startup-error"><AlertCircle/><h2>读取本机配置失败</h2><p>{s.error}</p><Button onClick={reload}>重试</Button></div>:!s.ready?<PageSkeleton label="正在准备你的游戏库…"/>:<div ref={contentMotion} className="page-transition"><PageBoundary key={location.pathname}><Suspense fallback={<PageSkeleton/>}><AppRoutes/></Suspense></PageBoundary></div>}</main>
  <footer className="app-status status-balanced"><div className="status-left"><MusicMini/><span className="status-connection" title={c.status}><i className={c.connected?'connected':''}/>{c.status}</span>{c.room&&<span className="status-voice" title={'语音已连接 · '+c.room}>语音 · {c.room}</span>}</div><div className="status-right"><button className="status-task" onClick={()=>ui.tasks=true} title={t.busy?t.phase:'任务与日志'}><Layers size={13}/><span>{t.busy?t.phase:'任务与日志'}</span></button><small>{launcherVersion}</small></div></footer>
  {!sleeping&&s.ready&&<Suspense fallback={null}><PortableSources render={route=><AppRoutes location={route}/>}/></Suspense>}<CardTravelLayer/><Onboarding/><FloatingLyrics/><HxzUpdate/><TaskDrawer/><Dialogs/><AnimatePresence>{u.toast&&<motion.div className={'toast '+(u.toastError?'error':'')} role="status" initial={{opacity:0,y:off?0:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>{u.toastError?<AlertCircle size={18}/>:<Check size={18}/>}<span>{u.toast}</span><IconButton icon={X} label="关闭提示" onClick={()=>ui.toast=''}/></motion.div>}</AnimatePresence>

  <Modal open={command} onClose={()=>setCommand(false)} title="快速前往"><div className="search"><Search size={18}/><input autoFocus placeholder="搜索功能或游戏" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>Ctrl K</kbd></div><div className="command-list">{commands.map((item:any)=><button key={item.name} onClick={()=>perform(async()=>{if(item.instance)await selectInstance(item.instance);navigate(item.to);setCommand(false);})}><span>{item.name}{hidden.includes(item.to)&&<small> · 已从导航隐藏</small>}</span><ArrowUpRight size={17}/></button>)}</div></Modal>
  <Modal open={!!destination} title="应用尚未保存的更改？" onClose={()=>setDestination('')}><p>可以保存后离开，或放弃本次更改。</p><footer className="modal-actions"><Button onClick={()=>setDestination('')}>继续编辑</Button><Button onClick={()=>{const pending=[ui.unsaved,ui.layoutUnsaved];for(const change of pending)change?.discard();ui.unsaved=null;ui.layoutUnsaved=null;rawNavigate(destination);setDestination('');}}>放弃更改</Button><Button tone="solid" onClick={async()=>{const pending=[ui.unsaved,ui.layoutUnsaved];for(const change of pending)await change?.save();ui.unsaved=null;ui.layoutUnsaved=null;rawNavigate(destination);setDestination('');}}>保存并离开</Button></footer></Modal>
 </div></MotionConfig>;
}
export default function App(){return <HashRouter><PageBoundary><Shell/></PageBoundary></HashRouter>;}
