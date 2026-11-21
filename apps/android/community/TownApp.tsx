import React,{lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter,Link,NavLink,Navigate,Route,Routes,useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {Boxes,Download,MessageCircle,UserRound} from 'lucide-react';
import {invoke,state,ui} from '../../desktop/src/model';
import {extension} from '../../desktop/src/launcher/Extensions';
import {communityPages} from '../../desktop/src/launcher/community-pages';
import {CommunityHeading,Social} from '../../desktop/src/launcher/Social';
import {disconnect} from '../../../packages/community/client';
import {TownLobby,TownWorld,WorldList,useDirectory,type TownServer} from './TownLobby';
import {TownLibrary,GameProgress,useGameTask,active} from './TownPlay';
import {TownWelcome} from './TownWelcome';
import {useAppearance} from '../../desktop/src/workspace/appearance';
import {Avatar} from '../../desktop/src/ui';
import '../../desktop/src/launcher/desktop.css';
import './town.css';

type Player={uid?:string;name?:string;canceled?:boolean};
const GameRoom=lazy(()=>import('../../desktop/src/Arcade').then(m=>({default:m.ArcadePage})));
function OnlineGames(){return <section className="town-content"><h1>小游戏联机</h1><nav className="desk-actions" aria-label="联机游戏">{communityPages.filter(p=>p.group==='小游戏联机').map(p=><Link className="small-action" to={p.path} key={p.path}>{p.label}</Link>)}</nav><Link className="small-action" to="/community">返回社区</Link></section>;}
function applyPlayer(player:Player){
  const uid=player.uid||'';
  if(state.settings.selectedAccount!==uid)disconnect();
  extension.ready=true;extension.active=!!uid;
  state.accounts=uid?[{id:uid,uuid:uid,name:player.name,authenticated:true}]:[];
  state.settings.selectedAccount=uid;
}
function TownApp(){
  const model=useSnapshot(state),feedback=useSnapshot(ui),location=useLocation(),directory=useDirectory();
  const [failure,setFailure]=useState(''),[busy,setBusy]=useState(false),game=useGameTask();
  const speed=model.settings.animationSpeed??1;
  useAppearance(model,speed===0||window.matchMedia('(prefers-reduced-motion: reduce)').matches,speed);
  const pending=useRef(false),identityRevision=useRef(0),scroll=useRef<HTMLElement>(null);
  const uid=model.accounts[0]?.uuid||'';
  useEffect(()=>{scroll.current?.scrollTo(0,0);setFailure('');},[location.pathname,location.search]);
  const refresh=useCallback(async()=>{
    const rev=++identityRevision.current;
    try {const p=await invoke<Player>('android.identity');if(rev===identityRevision.current){applyPlayer(p);setFailure('');}}
    catch(e){if(rev===identityRevision.current)setFailure(e instanceof Error?e.message:'无法读取本机角色。');}
    finally {state.ready=true;}
  },[]);
  useEffect(()=>{
    try{Object.assign(state.settings,JSON.parse(localStorage.getItem('town-community-options')||'{}'));}catch{}
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
    const player:Player=uid?{uid}:await pick();
    if(!player.canceled&&player.uid)await game.send(action,{...input,uid:player.uid});
  });}
  const act=(action:string,input:Record<string,unknown>)=>void work(()=>game.send(action,input));
  const join=(server:TownServer)=>start('android.join',{server:server.id});
  const task=game.task, inLibrary=location.pathname==='/town/games';
  const currentWorld=directory.servers.find(server=>location.pathname==='/town/world/'+server.id);
  const gate=<section className="launch-page town-content"><CommunityHeading title="登录幻想镇社区"/>{location.pathname==='/community/worlds'&&<WorldList directory={directory}/>}<div className="desk-card"><p>使用皮肤站角色参与聊天、论坛和活动。下次打开会继续使用这个角色。</p><button className="launch-primary" disabled={busy||!model.ready} onClick={()=>void work(async()=>{await pick();})}><UserRound size={16}/>登录皮肤站</button></div></section>;
  return <div className="launcher-frame town-shell" data-shell="town"><header className="launcher-bar town-bar"><div className="launcher-brand"><Link className="brand-home" aria-label="幻想镇社区首页" to="/town"><img alt="" src="./town-mark.svg"/><span><strong>幻想镇</strong><small>FANTASY TOWN</small></span></Link></div>
    <nav aria-label="主导航"><Link to="/town" className={!inLibrary?'active':''} aria-current={!inLibrary?'page':undefined}><MessageCircle size={16} aria-hidden/><span>社区</span></Link><NavLink to="/town/games"><Boxes size={16} aria-hidden/><span>游戏库</span></NavLink></nav>
    <button className="role-button town-role" aria-label={uid?'切换皮肤站角色':'登录皮肤站'} title={model.accounts[0]?.name||'登录皮肤站'} disabled={busy||!model.ready} onClick={()=>void work(async()=>{await pick();})}><Avatar name={model.accounts[0]?.name}/><span>{model.accounts[0]?.name||'登录'}</span></button></header>
    <main className="launcher-content town-main" ref={scroll}>
      {failure&&<div className="social-connection town-feedback" role="alert"><span>{failure}</span><button className="small-action" onClick={()=>setFailure('')}>关闭</button></div>}
      <Routes><Route path="/town" element={<TownLobby directory={directory}/>}/><Route path="/town/world/:id" element={<TownWorld directory={directory} member={!!uid} joining={busy||active(task)} join={join}>{currentWorld&&task.server===currentWorld.id&&<GameProgress task={task} act={act} retry={()=>join(currentWorld)}/>}</TownWorld>}/>
      <Route path="/town/games" element={<TownLibrary game={task} act={act} start={start}/>}/>
      <Route path="/community/*" element={uid?<Social worldsContent={<WorldList directory={directory}/>}/>:gate}/>
      <Route path="/arcade" element={uid?<OnlineGames/>:gate}/><Route path="/arcade/*" element={uid?<Suspense fallback={<p role="status">正在打开游戏…</p>}><GameRoom/></Suspense>:gate}/>
      <Route path="/points" element={<Navigate to="/community/wallet" replace/>}/><Route path="*" element={<Navigate to="/town" replace/>}/></Routes></main>
    <footer className="launcher-status town-status"><span className="status-connection"><i/>{uid?'当前角色已登录':'游客浏览'}</span><Link to={task.server?'/town/world/'+encodeURIComponent(task.server):'/town/games'}><Download size={14}/>{active(task)?task.title:'游戏任务'}</Link></footer>
    {feedback.toast&&<div role="status" className="town-toast">{feedback.toast}</div>}</div>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><TownWelcome><TownApp/></TownWelcome></HashRouter>);
