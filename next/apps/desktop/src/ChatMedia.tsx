import {useEffect,useState} from 'react';
import {Bookmark,ImagePlus,Trash2} from 'lucide-react';
import {Button,IconButton,Modal,Empty} from './ui';
import {request} from './data';
import {communityMediaURL} from '../../../packages/community/client';
import {notify,perform} from './model';
import './chat-media.css';

export function ChatAttachments({items=[]}:{items?:any[]}){
 const [active,setActive]=useState<any>(null);
 return <><div className="chat-attachments">{items.map((item,index)=>item.expired?<small className="chat-media-expired" key={index}>图片已过期</small>:<button key={item.id||index} type="button" className="chat-picture" style={{aspectRatio:Math.min(2,Math.max(.75,item.width/item.height))}} onClick={()=>setActive(item)} aria-label="查看聊天图片"><img src={communityMediaURL(item)} loading="lazy" decoding="async" alt={item.mime==='image/gif'?'聊天动图':'聊天图片'} onError={e=>{e.currentTarget.hidden=true;e.currentTarget.parentElement!.dataset.error='图片未能载入';}}/></button>)}</div><Modal open={!!active} title="聊天图片" onClose={()=>setActive(null)}><div className="chat-lightbox">{active&&<img src={communityMediaURL(active)} alt="聊天图片"/>}</div><Button icon={Bookmark} onClick={()=>perform(async()=>{await request('/api/chat/stickers','POST',{id:active.id});notify('已加入我的表情');})}>收藏为表情</Button></Modal></>;
}
export function SavedStickers({pick,disabled}:{pick:(item:any)=>void;disabled?:boolean}){
 const [items,setItems]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const reload=()=>request('/api/chat/stickers').then(v=>{setItems(v.items);setError('');}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
 useEffect(()=>{void reload();},[]);
 return <section className="saved-stickers-panel" aria-label="收藏表情包"><small>{loading?'正在读取…':`已收藏 ${items.length} / 100`}{disabled?' · 本条图片已满':''}</small>{error?<div role="alert" className="inline-error">{error}<Button onClick={reload}>重试</Button></div>:<div className="chat-sticker-grid">{items.map(item=><article key={item.id}><button type="button" disabled={disabled} aria-label={'使用表情包：'+(item.label||'图片')} title={item.label} onClick={()=>pick(item)}><img src={communityMediaURL(item)} loading="lazy" decoding="async" alt={item.label}/></button><IconButton label="移除收藏" icon={Trash2} onClick={()=>perform(async()=>{await request('/api/chat/stickers','DELETE',{id:item.id});await reload();})}/></article>)}</div>}{!loading&&!items.length&&!error&&<p className="sticker-empty">在聊天图片中选择“收藏为表情”，就会显示在这里。</p>}</section>;
}
