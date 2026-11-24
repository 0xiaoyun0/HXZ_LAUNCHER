import React,{lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createHashRouter,RouterProvider,Link,Navigate,Route,Routes,useLocation,useNavigate} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ChevronRight,CircleAlert,Mail,UserRound,X} from 'lucide-react';
import {invoke,state,ui} from '../../desktop/src/model';
import {extension} from '../../desktop/src/launcher/Extensions';
import {CommunityHeading,Social} from '../../desktop/src/launcher/Social';
import {community,communityAvatar,disconnect} from '../../../packages/community/client';
import {setVoiceFallback} from '../../../packages/community/voice-relay.mjs';
import {TownLobby,TownWorld,WorldList,useDirectory,type TownServer} from './TownLobby';
import {TownLibrary,TownTasks,GameProgress,useGameTask,active} from './TownPlay';
import {TownNavigation,TownSectionBar,useBottomNavigation} from './TownNavigation';
import {TownProfile,useTownVoiceControls} from './TownProfile';
import {TownDevices} from './TownDevices';
import {TownAppearance,type AppearanceSection} from './TownAppearance';
import {TownBackdrop} from './TownBackdrop';
import {useTownPersonalization} from './personalization';
import {TownWelcome} from './TownWelcome';
import {TownRoundDialogs} from './TownRoundDialogs';
import {TownToast,useTownPage} from './TownInteractions';
import {communityPages} from '../../desktop/src/launcher/community-pages';
import {useAppearance} from '../../desktop/src/workspace/appearance';
import {useReducedMotionPreference} from '../../desktop/src/PageFeedback';
import {Avatar} from '../../desktop/src/ui';
import {ContentImages} from '../../desktop/src/content-images';
import '../../desktop/src/launcher/desktop.css';
import './town.css';
import './town-personalization.css';
import './town-panels.css';
import './town-motion.css';

type Player={uid?:string;name?:string;canceled?:boolean};
setVoiceFallback(async()=>(await import('./voice-opus')).openMobileOpus());
const GameRoom=lazy(()=>import('../../desktop/src/Arcade').then(m=>({default:m.ArcadePage})));
function applyPlayer(player:Player){
  const uid=player.uid||'';
  if(state.settings.selectedAccount!==uid)disconnect();
  extension.ready=true;extension.active=!!uid;
  state.accounts=uid?[{id:uid,uuid:uid,name:player.name,authenticated:true}]:[];
  state.settings.selectedAccount=uid;
}
function TownApp(){
  const model=useSnapshot(state),feedback=useSnapshot(ui),location=useLocation(),directory=useDirectory();
  const [failure,setFailure]=useState(''),[busy,setBusy]=useState(false),[appearance,setAppearance]=useState<AppearanceSection>('style'),[editing,setEditing]=useState(false),game=useGameTask();
  const personal=useTownPersonalization();
  const [membersToolbar,setMembersToolbar]=useState<HTMLDivElement|null>(null);
  const speed=model.settings.animationSpeed??1;
  const reducedMotion=useReducedMotionPreference(),bottomNavigation=useBottomNavigation();
  useAppearance(model,speed===0||reducedMotion,speed);
  const skin=model.settings.desktopThemes?.active||'town';
  useEffect(()=>{void invoke('android.appearance.bars',{skin}).catch(()=>{});},[skin]);
  const pending=useRef(false),identityRevision=useRef(0),scroll=useRef<HTMLElement>(null);
  useTownPage(scroll,speed===0||reducedMotion);
  const edit=(section:AppearanceSection)=>{setAppearance(section);setEditing(true);};
  const uid=model.accounts[0]?.uuid||'';
  const navigate=useNavigate();
  useEffect(()=>{
    let live=true;
    const take=()=>{void invoke<string>('android.widget.target').then(path=>{if(live&&path&&locationHash()!==path)navigate(path);}).catch(()=>{});};
    const locationHash=()=>window.location.hash.slice(1);
    window.addEventListener('town-widget',take);window.addEventListener('town-resume',take);take();
    return ()=>{live=false;window.removeEventListener('town-widget',take);window.removeEventListener('town-resume',take);};
  },[navigate]);
  const social=useSnapshot(community),name=model.accounts[0]?.name||'';
  const portrait=uid&&social.user?.uid===uid&&social.user.avatarVersion?communityAvatar(uid,social.user.avatarVersion):'';
  useTownVoiceControls(uid,model.ready);
  useEffect(()=>{setFailure('');},[location.pathname,location.search]);
  const refresh=useCallback(async()=>{
    const rev=++identityRevision.current;
    try {const p=await invoke<Player>('android.identity');if(rev===identityRevision.current){applyPlayer(p);setFailure('');}}
    catch(e){if(rev===identityRevision.current)setFailure(e instanceof Error?e.message:'无法读取本机角色。');}
    finally {if(rev===identityRevision.current)state.ready=true;}
  },[]);
  useEffect(()=>{
    void refresh();
    const resume=()=>{if(!pending.current)void refresh();};
    window.addEventListener('town-resume',resume);
    return ()=>window.removeEventListener('town-resume',resume);
  },[refresh]);
  async function work(action:()=>Promise<void>){
    if(pending.current)return;
    pending.current=true;setBusy(true);setFailure('');
    try{await action();}catch(e){setFailure(e instanceof Error?e.message:'暂时无法完成，请重试。');}
    finally{pending.current=false;setBusy(false);}
  }
  async function pick(){
    ++identityRevision.current;
    const p=await invoke<Player>('android.account');
    if(!p.canceled)applyPlayer(p);
    return p;
  }
  function start(action:string,input:Record<string,unknown>){void work(async()=>{
    if(!state.ready)return;
    const player:Player=uid?{uid}:await pick();
    if(!player.canceled&&player.uid)await game.send(action,{...input,uid:player.uid});
  });}
  const act=(action:string,input:Record<string,unknown>)=>void work(()=>game.send(action,input));
  const join=(server:TownServer)=>start('android.join',{server:server.id});
  const task=game.task;
  const currentWorld=directory.servers.find(server=>location.pathname==='/town/world/'+server.id);
  const area=communityPages.find(page=>page.path===location.pathname)?.label;
  const gate=<section className="launch-page town-content town-gate"><CommunityHeading title={area||'幻想镇社区'}/>
    {location.pathname==='/community/worlds'&&<WorldList directory={directory}/>}
    <div className="desk-card town-identity-card"><span className="town-rest-icon"><UserRound size={25} aria-hidden/></span>
      <div><h2>登录幻想镇社区</h2><p>用皮肤站角色参与聊天、论坛和活动。下次打开会记住这个角色。</p></div>
      <button className="launch-primary" disabled={busy||!model.ready} onClick={()=>void work(async()=>{await pick();})}>登录皮肤站</button></div></section>;
  return <ContentImages.Provider value={personal.layout.contentImages}><div className="launcher-frame town-shell" data-shell="town" data-nav={bottomNavigation?'bottom':'top'} data-wallpaper={personal.layout.background==='custom'&&personal.media.background?'custom':undefined}>
    <TownBackdrop personal={personal} reduced={speed===0||reducedMotion}/>
    <header className="launcher-bar town-bar"><div className="launcher-brand"><button className="brand-home" aria-label={uid?'切换皮肤站角色':'登录皮肤站角色'} disabled={busy||!model.ready} onClick={()=>void work(async()=>{await pick();})}>
      {uid?<Avatar name={name} image={portrait}/>:<UserRound size={22} aria-hidden/>}<span><strong>幻想镇</strong><small>{name||'登录皮肤站'}</small></span><ChevronRight size={14} aria-hidden/></button></div>
    {!bottomNavigation&&<TownNavigation bottom={false} working={active(task)}/>}
    <div className="town-header-tools"><Link className="town-look-button" aria-label="收件箱" to="/community/inbox"><Mail size={21}/></Link></div></header>
    <TownSectionBar membersToolbar={uid&&bottomNavigation?setMembersToolbar:undefined}/>
    <main className="launcher-content town-main" ref={scroll}>
      {failure&&<div className="town-feedback" role="alert"><CircleAlert size={19} aria-hidden/><span>{failure}</span><button className="icon-button" aria-label="关闭错误提示" onClick={()=>setFailure('')}><X size={17}/></button></div>}
      <Routes><Route path="/town" element={<TownLobby directory={directory} personal={personal} edit={edit}/>}/><Route path="/town/world/:id" element={<TownWorld directory={directory} member={!!uid} playerName={model.accounts[0]?.name} identityReady={model.ready} joining={busy||active(task)} join={join}>{currentWorld&&task.server===currentWorld.id&&<GameProgress task={task} act={act} retry={()=>join(currentWorld)}/>}</TownWorld>}/>
      <Route path="/town/games" element={<TownLibrary game={task} act={act} start={start} identityReady={model.ready}/>}/>
      <Route path="/town/tasks" element={<TownTasks task={task} act={act} servers={directory.servers}/>}/>
      <Route path="/town/me" element={<TownProfile name={name} portrait={portrait} account={()=>void work(async()=>{await pick();})} busy={busy||!model.ready} appearance={()=>edit('style')}/>}/>
      <Route path="/town/devices" element={uid?<TownDevices key={uid} uid={uid} servers={directory.servers}/>:gate}/>
      <Route path="/community/*" element={uid?<Social worldsContent={<WorldList directory={directory}/>} membersToolbar={membersToolbar}/>:gate}/>
      <Route path="/arcade/*" element={uid||location.pathname==='/arcade'?<Suspense fallback={<p role="status">正在打开游戏…</p>}><GameRoom/></Suspense>:gate}/>
      <Route path="/points" element={<Navigate to="/community/wallet" replace/>}/><Route path="*" element={<Navigate to="/town" replace/>}/></Routes></main>
    {bottomNavigation&&<TownNavigation bottom working={active(task)}/>}
    <TownAppearance open={editing} close={()=>setEditing(false)} systemReduced={reducedMotion} personal={personal} initial={appearance}/>
    <TownRoundDialogs/>
    {feedback.toast&&<TownToast key={feedback.toastId} id={feedback.toastId} error={feedback.toastError} message={feedback.toast}/>}</div></ContentImages.Provider>;
}
try{Object.assign(state.settings,JSON.parse(localStorage.getItem('town-community-options')||'{}'));}catch{}
const router=createHashRouter([{path:'*',element:<TownWelcome><TownApp/></TownWelcome>}]);
createRoot(document.getElementById('root')!).render(<RouterProvider router={router}/>);
