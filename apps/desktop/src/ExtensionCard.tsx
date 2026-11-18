import {useNavigate} from 'react-router-dom';import {useSnapshot} from 'valtio';
import {community} from '../../../packages/community/client';
import {EXTENSION_ROUTES} from '../../../packages/engine/core/card-extension.mjs';
import {state,invoke,selected,saveSettings} from './model';import {Button,Toggle} from './ui';
export function ExtensionCard({item,now}:{item:any;now:Date}){
 const snapshot=useSnapshot(state),c=useSnapshot(community),navigate=useNavigate();
 return <div className="extension-card">{item.extension.blocks.map((b:any,index:number)=>b.type==='text'?<p className="prose" key={index}>{b.text}</p>:b.type==='link'?<Button key={index} onClick={()=>b.page?navigate(EXTENSION_ROUTES[b.page]):invoke('external.open',{url:b.url})}>{b.label}</Button>:b.type==='metric'?<div key={index} className="extension-metric"><small>{b.label||{instance:'当前实例',community:'社区连接',clock:'本机时间'}[b.metric as string]}</small><strong>{b.metric==='instance'?selected(snapshot)?.name||'尚未选择实例':b.metric==='community'?c.connected?'已连接':'未连接':now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</strong></div>:<Toggle key={b.id} label={b.label} checked={item.checked?.includes(b.id)||false} onChange={(checked:boolean)=>saveSettings((s:any)=>({widgets:s.widgets.map((v:any)=>v.id===item.id?{...v,checked:checked?[...new Set([...(v.checked||[]),b.id])]:(v.checked||[]).filter((id:string)=>id!==b.id)}:v)}))}/>)}<small className="muted">{item.extension.author} · 本机卡片扩展</small></div>;
}
