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
 const [preview,setPreview]=useState('');
 const canPreview=!!c.user?.admin&&c.user.uid===sessionUser;
 const previewChapter=canPreview?preview:'';
 const frame=useRef<HTMLIFrameElement>(null);
 // Wait for the initial authenticated session. Brief WebSocket reconnects must
 // not destroy an editor with an unsaved draft or restart the three-dimensional scene.
 useEffect(()=>{if(c.connected&&c.user?.uid)setSessionUser(c.user.uid);},[c.connected,c.user?.uid]);
 useEffect(()=>{if(!canPreview)setPreview('');},[canPreview]);
 useLayoutEffect(()=>{if(!frame.current)return;return mountLinkingBridge(frame.current,async(path,method,body)=>{
  if(previewChapter){const {storyPreviewRequest}=await import('./linking-story-preview081');return storyPreviewRequest(path,method);}
  const result=await communityRequest(path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)},true);if(method==='POST'&&path.endsWith('/action'))window.dispatchEvent(new Event('hxz-linking-progress'));return result;
 },()=>({theme:state.settings.theme,reducedMotion:state.settings.animationSpeed===0||matchMedia('(prefers-reduced-motion:reduce)').matches,mobile:false}));},[sessionUser,previewChapter]);
 return <section className="linking-archive-host">{canPreview&&<header className={'linking-author-preview'+(previewChapter?' active':'')}>
  <div><strong>{previewChapter?'随包剧情预览 · 只读':'LINKING · 作者工具'}</strong>{previewChapter&&<p>可阅读两卷与第三值夜的随包正文，不代表线上开放状态；不保存进度、不验证口令、不发放奖励。</p>}</div>
  <nav aria-label="剧情预览">{previewChapter?<>
   <Button aria-pressed={previewChapter==='linking-volume-01'} onClick={()=>setPreview('linking-volume-01')}>卷一 · 第七门的回声</Button>
   <Button aria-pressed={previewChapter==='linking-volume-02'} onClick={()=>setPreview('linking-volume-02')}>卷二 · 迟到的北行信</Button>
   <Button aria-pressed={previewChapter==='linking-observer-01'} onClick={()=>setPreview('linking-observer-01')}>值夜 · 未关的观测窗</Button>
   <Button onClick={()=>setPreview('')}>返回线上档案</Button>
  </>:<Button onClick={()=>setPreview('linking-volume-01')}>随包剧情预览</Button>}</nav>
 </header>}{sessionUser?<iframe key={sessionUser+':'+previewChapter} ref={frame} src={'./linking/index.html'+(previewChapter?'?chapter='+previewChapter+'&mode=read':'')} title={previewChapter?'LINKING · 随包剧情只读预览':'LINKING · 档案探索'} allow="autoplay"/>:<div className="linking-connection"><Empty icon={Library} title={c.connecting?'正在连接档案馆…':'LINKING 档案馆'} action={<Button disabled={c.connecting} onClick={()=>account()?connect():ui.dialog='account'}>{c.connecting?'连接中…':account()?'连接社区':'登录角色'}</Button>}>{c.error||'登录社区后，探索档案并同步你的活动进度。'}</Empty></div>}</section>;
}
