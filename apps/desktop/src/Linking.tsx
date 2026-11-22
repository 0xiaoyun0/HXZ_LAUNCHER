import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useSnapshot} from 'valtio';
import {Library,RefreshCw} from 'lucide-react';
import {state} from './model';
import {community,connect,communityRequest} from '../../../packages/community/client';
import {playerError} from '../../../packages/engine/core/player-errors.mjs';
import {mountLinkingBridge} from '../../../packages/linking/host';
import './linking-host.css';

export function Linking(){
  const c=useSnapshot(community),[sessionUser,setSessionUser]=useState(community.connected?community.user?.uid||'':'');
  const frame=useRef<HTMLIFrameElement>(null),[slot,setSlot]=useState<HTMLElement|null>(null);
  const mobile=window.launcher?.platform==='android';
  // A reconnect updates the status without restarting the reader or its current chapter.
  useEffect(()=>{if(c.connected&&c.user?.uid)setSessionUser(c.user.uid);},[c.connected,c.user?.uid]);
  useLayoutEffect(()=>{setSlot(document.getElementById('archive-status-actions'));},[]);
  useLayoutEffect(()=>{
    if(!frame.current)return;
    return mountLinkingBridge(frame.current,async(path,method,body)=>{
      if(!mobile&&path.startsWith('/api/admin/'))throw Error('请从社区后台管理档案。');
      const result=await communityRequest(path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)},true);
      if(method==='POST'&&path.endsWith('/action'))window.dispatchEvent(new Event('hxz-linking-progress'));
      return result;
    },()=>({theme:state.settings.theme,reducedMotion:state.settings.animationSpeed===0||matchMedia('(prefers-reduced-motion:reduce)').matches,mobile,playerOnly:!mobile}));
  },[sessionUser,mobile]);
  const retry=sessionUser&&!c.connected?<button type="button" disabled={c.connecting} onClick={()=>void connect()}><RefreshCw size={14}/>{c.connecting?'正在重连':'连接中断 · 重试'}</button>:null;
  const issue=c.error?playerError(c.error,'community.connect'):null;
  return <section className="linking-archive-host" aria-label="LINKING 档案馆">
    {retry&&(slot?createPortal(retry,slot):mobile?<div className="archive-local-tools">{retry}</div>:null)}
    {sessionUser?<iframe key={sessionUser} ref={frame} src="./linking/index.html" title="LINKING · 档案探索" allow="autoplay"/>:
      <div className="linking-connection"><div className="archive-message">
        <Library aria-hidden size={30}/><h1>LINKING 档案馆</h1>
        <p role="status">{c.connecting?'正在连接档案馆…':issue?issue.title+'。'+issue.message:'连接社区后可以阅读档案并同步进度。'}</p>
        {!c.connecting&&<button className="small-action" onClick={()=>void connect()}><RefreshCw size={15}/>重新连接</button>}
      </div></div>}
  </section>;
}
