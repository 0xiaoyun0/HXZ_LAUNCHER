import React,{lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createHashRouter,RouterProvider,Link,Navigate,Route,Routes,useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {Palette,UserRound} from 'lucide-react';
import {invoke,state,ui} from '../../desktop/src/model';
import {extension} from '../../desktop/src/launcher/Extensions';
import {CommunityHeading,Social} from '../../desktop/src/launcher/Social';
import {disconnect} from '../../../packages/community/client';
import {TownLobby,TownWorld,WorldList,useDirectory,type TownServer} from './TownLobby';
import {TownLibrary,TownTasks,GameProgress,useGameTask,active} from './TownPlay';
import {TownNavigation,useBottomNavigation} from './TownNavigation';
import {TownAppearance,type AppearanceSection} from './TownAppearance';
import {TownBackdrop} from './TownBackdrop';
import {useTownPersonalization} from './personalization';
import {TownWelcome} from './TownWelcome';
import {TownRoundDialogs} from './TownRoundDialogs';
import {useAppearance} from '../../desktop/src/workspace/appearance';
import {useReducedMotionPreference} from '../../desktop/src/PageFeedback';
import {Avatar} from '../../desktop/src/ui';
import '../../desktop/src/launcher/desktop.css';
import './town.css';
import './town-personalization.css';
import './town-motion.css';

type Player={uid?:string;name?:string;canceled?:boolean};
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
  const [failure,setFailure]=useState(''),[busy,setBusy]=useState(false),[appearance,setAppearance]=useState<AppearanceSection|null>(null),game=useGameTask();
  const personal=useTownPersonalization();
  const speed=model.settings.animationSpeed??1;
  const reducedMotion=useReducedMotionPreference(),bottomNavigation=useBottomNavigation();
  useAppearance(model,speed===0||reducedMotion,speed);
  const skin=model.settings.desktopThemes?.active||'town';
  useEffect(()=>{void invoke('android.appearance.bars',{skin}).catch(()=>{});},[skin]);
  const pending=useRef(false),identityRevision=useRef(0),scroll=useRef<HTMLElement>(null);
  const uid=model.accounts[0]?.uuid||'';
  useEffect(()=>{scroll.current?.scrollTo(0,0);setFailure('');},[location.pathname,location.search]);
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
  const gate=<section className="launch-page town-content"><CommunityHeading title="登录幻想镇社区"/>{location.pathname==='/community/worlds'&&<WorldList directory={directory}/>}<div className="desk-card"><p>使用皮肤站角色参与聊天、论坛和活动。下次打开会继续使用这个角色。</p><button className="launch-primary" disabled={busy||!model.ready} onClick={()=>void work(async()=>{await pick();})}><UserRound size={16}/>登录皮肤站</button></div></section>;
  return <div className="launcher-frame town-shell" data-shell="town" data-nav={bottomNavigation?'bottom':'top'} data-wallpaper={personal.layout.background==='custom'&&personal.media.background?'custom':undefined}>
    <TownBackdrop personal={personal} reduced={speed===0||reducedMotion}/>
    <header className="launcher-bar town-bar"><div className="launcher-brand"><Link className="brand-home" aria-label="幻想镇社区首页" to="/town"><img alt="" src="./town-mark.svg"/><span><strong>幻想镇</strong><small>FANTASY TOWN</small></span></Link></div>
    {!bottomNavigation&&<TownNavigation bottom={false} working={active(task)}/>}
    <div className="town-header-tools"><button type="button" className="town-look-button" aria-label="外观与动效" title="外观与动效" onClick={()=>setAppearance('style')}><Palette size={18}/></button>
      <button className="role-button town-role" aria-label={uid?'切换皮肤站角色':'登录皮肤站'} title={model.accounts[0]?.name||'登录皮肤站'} disabled={busy||!model.ready} onClick={()=>void work(async()=>{await pick();})}><Avatar name={model.accounts[0]?.name}/><span>{model.accounts[0]?.name||'登录'}</span></button></div></header>
    <main className="launcher-content town-main" ref={scroll}>
      {failure&&<div className="social-connection town-feedback" role="alert"><span>{failure}</span><button className="small-action" onClick={()=>setFailure('')}>关闭</button></div>}
      <Routes><Route path="/town" element={<TownLobby directory={directory} personal={personal} edit={setAppearance}/>}/><Route path="/town/world/:id" element={<TownWorld directory={directory} member={!!uid} playerName={model.accounts[0]?.name} identityReady={model.ready} joining={busy||active(task)} join={join}>{currentWorld&&task.server===currentWorld.id&&<GameProgress task={task} act={act} retry={()=>join(currentWorld)}/>}</TownWorld>}/>
      <Route path="/town/games" element={<TownLibrary game={task} act={act} start={start} identityReady={model.ready}/>}/>
      <Route path="/town/tasks" element={<TownTasks task={task} act={act} servers={directory.servers}/>}/>
      <Route path="/community/*" element={uid?<Social worldsContent={<WorldList directory={directory}/>}/>:gate}/>
      <Route path="/arcade/*" element={uid||location.pathname==='/arcade'?<Suspense fallback={<p role="status">正在打开游戏…</p>}><GameRoom/></Suspense>:gate}/>
      <Route path="/points" element={<Navigate to="/community/wallet" replace/>}/><Route path="*" element={<Navigate to="/town" replace/>}/></Routes></main>
    {bottomNavigation&&<TownNavigation bottom working={active(task)}/>}
    {appearance&&<TownAppearance close={()=>setAppearance(null)} systemReduced={reducedMotion} personal={personal} initial={appearance}/>}
    <TownRoundDialogs/>
    {feedback.toast&&<div role="status" className="town-toast">{feedback.toast}</div>}</div>;
}
try{Object.assign(state.settings,JSON.parse(localStorage.getItem('town-community-options')||'{}'));}catch{}
const router=createHashRouter([{path:'*',element:<TownWelcome><TownApp/></TownWelcome>}]);
createRoot(document.getElementById('root')!).render(<RouterProvider router={router}/>);
