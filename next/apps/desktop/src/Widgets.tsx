import {WorkflowCard} from './WorkflowCard';
import {ExtensionCard} from './ExtensionCard';
import {cardExtension,EXTENSION_LIMIT} from '../../../packages/engine/core/card-extension.mjs';
import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useSnapshot,ref as keepReference} from 'valtio';
import {StickyNote,Clock3,CalendarDays,Search,Sparkles,Save,Plus,ArrowUpRight,ListChecks} from 'lucide-react';
import {state,saveSettings,invoke,desktop,notify,ui} from './model';
import {Button,Field,Select,Toggle,Modal} from './ui';
import {normalizeWidgets} from '../../../packages/engine/core/card-extras.mjs';
export const widgetKinds=[{id:'note',name:'便利贴',icon:StickyNote},{id:'clock',name:'时钟',icon:Clock3},{id:'calendar',name:'日历',icon:CalendarDays},{id:'search',name:'网页搜索',icon:Search},{id:'assistant',name:'小助手',icon:Sparkles},{id:'workflow',name:'流程卡片',icon:ListChecks}];
const drafts=new Map<string,{save:()=>Promise<unknown>;discard:()=>void}>();
const pending={save:async()=>{for(const d of Array.from(drafts.values()))await d.save();},discard:()=>{for(const d of drafts.values())d.discard();}};
export function AddWidget({page,onClose}:{page:string;onClose:()=>void}){
 const [extension,setExtension]=useState<any>(null),[error,setError]=useState('');
 return <Modal open title="添加通用卡片" onClose={onClose}><div className="widget-picker">{widgetKinds.map(k=><Button key={k.id} icon={k.icon} onClick={async()=>{await saveSettings((s:any)=>{const list=normalizeWidgets(s.widgets);if(list.length>=36)throw Error('最多保留 36 张通用卡片');return {widgets:[...list,{id:crypto.randomUUID(),type:k.id,page,title:k.name,text:'',engine:'bing',hour24:true,steps:k.id==='workflow'?['pause-music','page-home']:[]}]};});onClose();}}>{k.name}<Plus size={16}/></Button>)}</div><div className="extension-import"><Field label="导入卡片扩展 · JSON"><input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';setError('');setExtension(null);if(!file)return;try{if(file.size>EXTENSION_LIMIT)throw Error('卡片扩展不得超过 64 KB');setExtension(cardExtension(await file.text()));}catch(e:any){setError(e.message);}}}/></Field>{error&&<p className="inline-error">{error}</p>}{extension&&<><h3>{extension.title}</h3><p>{extension.description}</p><small className="muted">作者：{extension.author} · {extension.blocks.length} 个内容块</small><p>点击后可打开：{extension.hosts.length?extension.hosts.join('、'):'仅启动器内的页面'}。不会自动联网或运行脚本。</p><Button tone="solid" icon={Plus} onClick={async()=>{await saveSettings((s:any)=>{if(s.widgets.length>=36)throw Error('最多保留 36 张通用卡片');return {widgets:[...s.widgets,{id:crypto.randomUUID(),type:'extension',page,title:extension.title,extension,checked:[]}]};});onClose();}}>添加此扩展卡片</Button></>}</div></Modal>;
}
function useMinute(){const [now,setNow]=useState(()=>new Date());useEffect(()=>{let timer:any;const tick=()=>{clearTimeout(timer);if(document.hidden)return;setNow(new Date());timer=setTimeout(tick,60000-Date.now()%60000+30);};document.addEventListener('visibilitychange',tick);tick();return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',tick);};},[]);return now;}
export function Widget({id,editing}:{id:string;editing:boolean}){
 const s=useSnapshot(state),item=s.settings.widgets?.find((v:any)=>v.id===id);
 return item?<WidgetContent key={id} item={item} editing={editing}/>:null;
}
function WidgetContent({item,editing}:{item:any;editing:boolean}){
 const id=item.id,s=useSnapshot(state),[draft,setDraft]=useState<any>(item),[query,setQuery]=useState(''),now=useMinute(),navigate=useNavigate();
 useEffect(()=>setDraft(item),[item]);
 const store=async(value:any)=>{await saveSettings((s:any)=>({widgets:normalizeWidgets(s.widgets.map((v:any)=>v.id===id?{...v,...value}:v))}));};
 const changed=JSON.stringify(draft)!==JSON.stringify(item);
 const save=()=>store(draft);
 // Draft content is never lost when the player finishes editing or navigates away.
 useEffect(()=>{if(!editing||!changed)return;drafts.set(id,{save,discard:()=>setDraft(item)});ui.layoutUnsaved=keepReference(pending);return()=>{drafts.delete(id);if(!drafts.size&&ui.layoutUnsaved===pending)ui.layoutUnsaved=null;};},[id,editing,changed,JSON.stringify(draft)]);
 let content;
 if(item.type==='workflow')content=<WorkflowCard item={item} draft={draft} editing={editing} onChange={setDraft}/>;
 if(item.type==='extension')content=<ExtensionCard item={item} now={now}/>;
 if(item.type==='note')content=editing?<textarea className="widget-note-editor" aria-label="便利贴内容" maxLength={8000} rows={6} value={draft.text} onChange={e=>setDraft({...draft,text:e.target.value})}/>:<div className="widget-note">{item.text||<span className="muted">进入卡片编辑模式，写下备忘。</span>}</div>;
 if(item.type==='clock')content=<div className="widget-clock"><time>{now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:item.hour24===false})}</time><span>{now.toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'})}</span>{editing&&<Toggle label="24 小时制" checked={draft.hour24} onChange={(v:boolean)=>setDraft({...draft,hour24:v})}/>}</div>;
 if(item.type==='calendar'){const year=now.getFullYear(),month=now.getMonth(),offset=(new Date(year,month,1).getDay()+6)%7,days=new Date(year,month+1,0).getDate();content=<div className="widget-calendar"><strong>{year} 年 {month+1} 月</strong><div>{['一','二','三','四','五','六','日'].map(d=><small key={d}>{d}</small>)}{Array.from({length:offset},(_,i)=><span key={'empty'+i}/>)}{Array.from({length:days},(_,i)=><span key={i} className={i+1===now.getDate()?'today':''}>{i+1}</span>)}</div></div>;}
 if(item.type==='search')content=<><form className="widget-search" onSubmit={e=>{e.preventDefault();const url=(item.engine==='google'?'https://www.google.com/search?q=':'https://www.bing.com/search?q=')+encodeURIComponent(query.trim());if(query.trim())desktop?void invoke('external.open',{url}).catch(e=>notify(e.message,true)):window.open(url,'_blank','noopener,noreferrer');}}><div className="search"><Search size={17}/><input aria-label="网页搜索关键词" placeholder={item.engine==='google'?'搜索 Google':'搜索 Bing'} value={query} onChange={e=>setQuery(e.target.value)}/></div><Button type="submit" disabled={!query.trim()} icon={ArrowUpRight}>搜索</Button></form>{editing&&<Field label="搜索引擎"><Select value={draft.engine} options={[{value:'bing',label:'Bing'},{value:'google',label:'Google'}]} onChange={(engine:string)=>setDraft({...draft,engine})}/></Field>}</>;
 if(item.type==='assistant')content=<div className="widget-helper"><p>{!s.accounts.length?'先登录皮肤站角色，然后选择一个服务器。':s.running?'游戏正在运行，祝你旅途愉快。':'想做些什么？'}</p><Button onClick={()=>{ui.tasks=true;}}>查看任务与日志</Button><Button onClick={()=>navigate('/workshop/install')}>安装新游戏</Button><Button onClick={()=>ui.onboarding=true}>重新观看新手引导</Button></div>;
 return <div className={'generic-widget type-'+item.type}>{editing&&<Field label="卡片名称"><input value={draft.title} maxLength={40} onChange={e=>setDraft({...draft,title:e.target.value})}/></Field>}{content}{editing&&changed&&<Button icon={Save} tone="solid" onClick={save}>保存卡片</Button>}</div>;
}
