import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useSnapshot} from 'valtio';
import {Library} from 'lucide-react';
import {state,account,ui} from './model';
import {Button,Empty} from './ui';
import {community,connect,communityRequest} from '../../../packages/community/client';
import {mountLinkingBridge} from '../../../packages/linking/host';
import './linking-host.css';
export function Linking(){
 const c=useSnapshot(community),[sessionUser,setSessionUser]=useState(community.connected?community.user?.uid||'':'');
 const frame=useRef<HTMLIFrameElement>(null);
 // Wait for the initial authenticated session. Brief WebSocket reconnects must
 // not destroy an editor with an unsaved draft or restart the three-dimensional scene.
 useEffect(()=>{if(c.connected&&c.user?.uid)setSessionUser(c.user.uid);},[c.connected,c.user?.uid]);
 useLayoutEffect(()=>{if(!frame.current)return;return mountLinkingBridge(frame.current,(path,method,body)=>communityRequest(path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)},true),()=>({theme:state.settings.theme,reducedMotion:state.settings.animationSpeed===0||matchMedia('(prefers-reduced-motion:reduce)').matches,mobile:false}));},[sessionUser]);
 return <section className="linking-archive-host">{sessionUser?<iframe key={sessionUser} ref={frame} src="./linking/index.html" title="LINKING · 档案探索" allow="autoplay"/>:<div className="linking-connection"><Empty icon={Library} title={c.connecting?'正在连接档案馆…':'LINKING 档案馆'} action={<Button disabled={c.connecting} onClick={()=>account()?connect():ui.dialog='account'}>{c.connecting?'连接中…':account()?'连接社区':'登录角色'}</Button>}>{c.error||'登录社区后，探索档案并同步你的活动进度。'}</Empty></div>}</section>;
}
