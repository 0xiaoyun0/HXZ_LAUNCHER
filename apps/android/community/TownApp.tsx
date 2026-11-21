import React,{lazy,Suspense,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter,Link,Navigate,Route,Routes} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ArrowLeft,UserRound} from 'lucide-react';
import {invoke,state,ui} from '../../desktop/src/model';
import {extension} from '../../desktop/src/launcher/Extensions';
import {communityPages} from '../../desktop/src/launcher/community-pages';
import {Social} from '../../desktop/src/launcher/Social';
import '../../desktop/src/launcher/desktop.css';
import './town.css';

const GameRoom=lazy(()=>import('../../desktop/src/Arcade').then(m=>({default:m.ArcadePage})));
function OnlineGames(){return <section className="town-account"><h1>小游戏联机</h1><nav className="desk-actions" aria-label="联机游戏">{communityPages.filter(p=>p.group==='小游戏联机').map(p=><Link className="small-action" to={p.path} key={p.path}>{p.label}</Link>)}</nav><Link className="small-action" to="/community">返回社区</Link></section>;}
function TownApp(){
  const model=useSnapshot(state),feedback=useSnapshot(ui);
  const [failure,setFailure]=useState('');
  const leave=()=>void window.launcher?.invoke('android.leave');
  useEffect(()=>{void invoke('android.identity').then(player=>{
    Object.assign(state.settings,JSON.parse(localStorage.getItem('town-community-options')||'{}'));
    if(player.uid){extension.ready=true;extension.active=true;state.accounts=[{id:player.uid,uuid:player.uid,name:player.name,authenticated:true}];state.settings.selectedAccount=player.uid;}
  }).catch(error=>setFailure(error.message)).finally(()=>{state.ready=true;});},[]);
  return <div className="town-shell"><header className="town-bar"><button onClick={leave}><ArrowLeft size={19}/>游戏首页</button><strong>幻想镇社区</strong><span><UserRound size={16}/>{model.accounts[0]?.name||'游客'}</span></header>
    <main>{!model.ready?<p className="town-account" role="status">正在读取当前角色…</p>:!model.accounts.length?<section className="town-account"><h1>连接幻想镇角色</h1><p>{failure||'回到游戏首页，点角色头像，选择幻想镇皮肤站并登录。游戏与社区将使用同一个角色。'}</p><button className="launch-primary" onClick={leave}>返回选择角色</button></section>:<Routes><Route path="/community/*" element={<Social/>}/><Route path="/arcade" element={<OnlineGames/>}/><Route path="/arcade/*" element={<Suspense fallback={<p role="status">正在打开游戏…</p>}><GameRoom/></Suspense>}/><Route path="/points" element={<Navigate to="/community/wallet" replace/>}/><Route path="*" element={<Navigate to="/community" replace/>}/></Routes>}</main>
    {feedback.toast&&<div role="status" className="town-toast">{feedback.toast}</div>}</div>;
}
createRoot(document.getElementById('root')!).render(<HashRouter><TownApp/></HashRouter>);
