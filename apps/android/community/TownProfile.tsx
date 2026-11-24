import {useCallback,useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {AudioLines,Backpack,CalendarDays,ChevronRight,Coins,Download,LayoutGrid,Mail,MonitorSmartphone,Palette,ShoppingBag,Trophy} from 'lucide-react';
import {community,toggleMute,toggleDeafen,voiceActivity} from '../../../packages/community/client';
import {invoke,notify} from '../../desktop/src/model';
import {Avatar} from '../../desktop/src/ui';

type Tools={overlay:boolean;permission:boolean;canPin:boolean;widgets:number};
type AppUpdate={version:string;unmetered:boolean;official:boolean};
export function useTownVoiceControls(uid:string,identityReady:boolean){
  const c=useSnapshot(community);
  const roomPage=useLocation().pathname==='/community/voice';
  const [overlay,setOverlay]=useState(false);
  useEffect(()=>{
    let live=true;
    const read=()=>{void invoke<Tools>('android.device.tools').then(tools=>{if(live)setOverlay(tools.overlay);}).catch(()=>{});};
    read();window.addEventListener('town-tools',read);window.addEventListener('town-resume',read);
    return ()=>{live=false;window.removeEventListener('town-tools',read);window.removeEventListener('town-resume',read);};
  },[]);
  const online=c.connected&&c.user?.uid===uid?new Set(c.users.map(u=>u.uid)).size:0;
  useEffect(()=>{
    if(!identityReady||(uid&&!online))return;
    const refresh=()=>{void invoke('android.widget.presence',{online:uid?online:-1}).catch(()=>{});};
    refresh();window.addEventListener('town-resume',refresh);
    return ()=>window.removeEventListener('town-resume',refresh);
  },[identityReady,uid,online]);
  useEffect(()=>{
    let last='';
    const sync=()=>{
      const cutoff=performance.now()-650;
      const speaker=overlay&&c.room?community.users.filter(u=>u.room===c.room&&!u.muted&&(voiceActivity.get(u.id)??-Infinity)>cutoff).slice(0,3).map(u=>u.name).join('、'):'';
      const snapshot={room:c.connected?c.room:'',muted:c.muted,deafened:c.deafened,listenOnly:c.listenOnly,speaker,roomPage};
      const key=JSON.stringify(snapshot);
      if(key!==last){last=key;void invoke('android.voice.status',snapshot).catch(()=>{last='';});}
    };
    sync();const timer=overlay&&c.room?window.setInterval(sync,280):undefined;
    const resume=()=>{last='';sync();};window.addEventListener('town-resume',resume);
    return ()=>{clearInterval(timer);window.removeEventListener('town-resume',resume);};
  },[overlay,c.connected,c.room,c.muted,c.deafened,c.listenOnly,roomPage]);
  useEffect(()=>{
    let busy=false;
    const control=async(event:Event)=>{
      const {command,room}=((event as CustomEvent).detail||{});
      if(busy||!community.connected||!room||room!==community.room)return;
      busy=true;
      try{if(command==='mute'&&!community.listenOnly)await toggleMute();if(command==='deafen')toggleDeafen();}
      catch{notify('语音状态没有改变，请回到语音房重试。',true);}finally{busy=false;}
    };
    window.addEventListener('town-voice-control',control);return ()=>window.removeEventListener('town-voice-control',control);
  },[]);
}
const groups=[
  [{path:'/community/backpack',label:'我的背包',icon:Backpack},{path:'/community/inbox',label:'收件箱',icon:Mail},{path:'/town/devices',label:'多端接续',icon:MonitorSmartphone}],
  [{path:'/community/wallet',label:'积分与兑换',icon:Coins},{path:'/community/ranking',label:'积分排行榜',icon:Trophy},{path:'/community/shop',label:'积分商城',icon:ShoppingBag},{path:'/community/playtime',label:'服务器在线记录',icon:CalendarDays}]
];

export function TownProfile({name,portrait,account,busy,appearance}:{name:string;portrait:string;account:()=>void;busy:boolean;appearance:()=>void}){
  const [tools,setTools]=useState<Tools|null>(null),[problem,setProblem]=useState(''),[working,setWorking]=useState(false),[tip,setTip]=useState('');
  const [update,setUpdate]=useState<AppUpdate|null>(null),[savingUpdate,setSavingUpdate]=useState(false);
  useEffect(()=>{let live=true;void invoke<AppUpdate>('android.update.options').then(result=>{if(live)setUpdate(result);}).catch(()=>{});return ()=>{live=false;};},[]);
  async function toggleUpdates(){
    if(!update||savingUpdate)return;
    setSavingUpdate(true);
    try{setUpdate(await invoke<AppUpdate>('android.update.options',{unmetered:!update.unmetered}));}
    catch{notify('无法保存更新偏好，请重试。',true);}finally{setSavingUpdate(false);}
  }
  const refresh=useCallback(()=>{void invoke<Tools>('android.device.tools').then(v=>{setTools(v);setProblem('');}).catch(()=>setProblem('无法读取手机工具设置。'));},[]);
  useEffect(()=>{refresh();window.addEventListener('town-resume',refresh);window.addEventListener('town-tools',refresh);
    return ()=>{window.removeEventListener('town-resume',refresh);window.removeEventListener('town-tools',refresh);};},[refresh]);
  async function change(action:string,input:Record<string,unknown>={}){
    if(working)return;setWorking(true);setProblem('');setTip('');
    try{const result=await invoke<Tools&{hint?:string}>(action,input);setTools(result);setTip(result.hint||'');}
    catch(e){setProblem(e instanceof Error?e.message:'操作未完成，请重试。');}finally{setWorking(false);}
  }
  return <section className="launch-page town-content town-profile"><h1 className="town-sr">我的</h1>
    <div className="desk-card town-profile-user"><Avatar name={name} image={portrait} size={46}/><div><h2>{name||'游客'}</h2><small>{name?'皮肤站角色':'可以浏览社区和服务器'}</small></div>
      <button className="small-action" disabled={busy} onClick={account}>{name?'切换角色':'登录皮肤站'}</button></div>
    <section className="desk-card town-device-tools"><h2>手机工具</h2>
      <div className="town-tool-line"><AudioLines size={19}/><div><strong>语音悬浮控件</strong><small>{tools?.overlay?'加入语音房后，可在其他应用中控制麦克风和听筒。':'加入语音房后，在游戏或桌面上控制语音。'}</small></div>
      <button type="button" className="town-switch" role="switch" aria-label="语音悬浮控件" aria-checked={!!tools?.overlay} disabled={!tools||working} onClick={()=>void change('android.voice.overlay',{enabled:!tools?.overlay})}><span/></button></div>
      <div className="town-tool-line"><LayoutGrid size={19}/><div><strong>桌面小组件</strong><small>{tools?.widgets?'桌面已添加 '+tools.widgets+' 个':'从手机桌面直达聊天、语音房和收件箱。'}</small></div>
      <button className="small-action" disabled={!tools||working} onClick={()=>void change('android.widget.pin')}>{tools?.canPin?'添加':'添加方法'}</button></div>
      <Link className="text-action" to="/community/voice">打开语音房<ChevronRight size={15}/></Link>
      {tip&&<p role="status">{tip}</p>}{problem&&<p role="alert">{problem} <button className="text-action" onClick={refresh}>重新读取</button></p>}
    </section>
    {groups.map(rows=><div className="desk-card town-menu" key={rows[0].path}>{rows.map(({path,label,icon:Icon})=><Link key={path} to={path}><Icon size={18}/><span>{label}</span><ChevronRight size={15}/></Link>)}</div>)}
    <div className="desk-card town-menu"><button onClick={appearance}><Palette size={18}/><span>外观与动效</span><ChevronRight size={15}/></button></div>
    {update&&<section className="desk-card town-device-tools"><h2>应用更新</h2>
      <div className="town-tool-line"><Download size={19}/><div><strong>幻想镇 {update.version}</strong><small>{update.official?'正式版':'独立测试版'}</small></div>
        <button className="small-action" onClick={()=>void invoke('android.update.check').catch(()=>notify('无法检查更新，请重试。',true))}>检查更新</button></div>
      {update.official&&<div className="town-tool-line"><MonitorSmartphone size={19}/><div><strong>自动下载更新</strong><small>使用非计费网络下载，安装时由你确认。</small></div>
        <button type="button" className="town-switch" role="switch" aria-label="自动下载更新" aria-checked={update.unmetered} disabled={savingUpdate} onClick={()=>void toggleUpdates()}><span/></button></div>}
    </section>}
  </section>;
}
