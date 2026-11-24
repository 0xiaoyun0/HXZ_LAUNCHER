import {useContentImages} from './content-images';
import React,{useState} from 'react';import * as Dialog from '@radix-ui/react-dialog';import {X,ListFilter,Check,Search,ArrowUpRight} from 'lucide-react';import {perform,notify,errorMessage,reportFailure} from './model';
import {RefineImage} from './launcher/micro/RefineImage';
import {LatticeGlyph} from './launcher/micro/Feedback';
import {useChoiceGlide} from './launcher/useChoiceGlide';
import {ChoiceGroup} from './launcher/ChoiceControls';
export function DialogSections({children,actions}:{children:React.ReactNode;actions:React.ReactElement}){
 return <div className="dialog-sections"><div className="dialog-scroll">{children}</div>{actions}</div>;
}
export function Button({children,icon:Icon,onClick,tone='',className='',disabled=false,busyIndicator=true,...props}:any){const [busy,setBusy]=useState(false);return <button {...props} disabled={disabled||busy} aria-busy={busy||undefined} className={`button ${tone} ${className}`} onClick={async e=>{if(!onClick)return;setBusy(true);try{await onClick(e);}catch(error:any){reportFailure(error);}finally{setBusy(false);}}}>{busy&&busyIndicator?<LatticeGlyph/>:Icon?<Icon size={17}/>:null}{children}</button>}
export function IconButton({icon:Icon,label,...props}:any){return <Button {...props} className={'icon-button '+(props.className||'')} icon={Icon} data-hint={props['data-hint']||label} aria-label={label}/>}
export function Modal({open,onClose,title,children,wide=false,description}:any){const origin=React.useRef<HTMLElement|null>(null),descriptionId=React.useId();return <Dialog.Root open={open} onOpenChange={v=>!v&&onClose?.()}><Dialog.Portal><Dialog.Overlay className="modal-backdrop"/><Dialog.Content className={'modal '+(wide?'wide':'')} aria-describedby={description?descriptionId:undefined} onOpenAutoFocus={event=>{
 const source=document.activeElement as HTMLElement,content=event.target;
 origin.current=source;
 if(!(content instanceof HTMLElement)||!source||source===document.body)return;
 const from=source.getBoundingClientRect(),to=content.getBoundingClientRect();
 if(!to.width||!to.height)return;
 const x=Math.max(-1,Math.min(1,(from.left+from.width/2-to.left-to.width/2)/(to.width/2)));
 const y=Math.max(-1,Math.min(1,(from.top+from.height/2-to.top-to.height/2)/(to.height/2)));
 content.style.setProperty('--origin-x',(50+x*44)+'%');content.style.setProperty('--origin-y',(50+y*44)+'%');
 content.style.setProperty('--approach-x',x*.48+'em');content.style.setProperty('--approach-y',y*.48+'em');
 }} onCloseAutoFocus={e=>{if(origin.current?.isConnected){e.preventDefault();origin.current.focus({preventScroll:true});}}}><header><div><Dialog.Title>{title}</Dialog.Title>{description&&<Dialog.Description id={descriptionId}>{description}</Dialog.Description>}</div><Dialog.Close asChild><IconButton icon={X} label="关闭"/></Dialog.Close></header><div className="modal-body">{children}</div></Dialog.Content></Dialog.Portal></Dialog.Root>}
export function Select({value,onChange,options,label,disabled=false}:any){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[title,setTitle]=useState('');
 const entries=options.map((o:any)=>typeof o==='object'?o:{value:o,label:String(o)});
 const selected=entries.find((o:any)=>String(o.value)===String(value));
 const choose=(v:any)=>{setOpen(false);void perform(()=>onChange(v));};
 if(entries.length>=2&&entries.length<=3&&entries.every((o:any)=>String(o.label).length<=10&&!o.disabled)){
   return <ChoiceGroup label={label||entries.map((o:any)=>o.label).join(' / ')} value={value} options={entries.map((o:any)=>[o.value,o.label])} disabled={disabled}
     onChange={v=>choose(entries.find((o:any)=>String(o.value)===v)!.value)}/>;
 }
 const matches=entries.filter((o:any)=>!query.trim()||String(o.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <><button type="button" className="small-action choice-launch" aria-label={label} aria-haspopup="dialog" disabled={disabled||!entries.length}
   onClick={e=>{setTitle(label||e.currentTarget.closest('label')?.querySelector(':scope>span')?.textContent||'选择项目');setQuery('');setOpen(true);}}>
   <span>{selected?.label||value||'请选择'}</span><ListFilter size={15} aria-hidden/></button>
   <Modal open={open} onClose={()=>setOpen(false)} title={title}><div className="picker-panel">
     {entries.length>6&&<label className="picker-search"><Search size={16}/><input aria-label="搜索选项" placeholder="搜索选项" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
     <div className="picker-options">{matches.map((o:any)=><button type="button" key={o.value} aria-pressed={String(o.value)===String(value)} disabled={o.disabled} onClick={()=>choose(o.value)}><span>{o.label}</span>{String(o.value)===String(value)&&<Check size={16}/>}</button>)}
       {!matches.length&&<p role="status">没有匹配的选项</p>}</div></div></Modal></>;
}
export function DetailDialog({title,children,wide=false,icon}:{title:string;children:React.ReactNode;wide?:boolean;icon?:React.ReactNode}){
 const [open,setOpen]=useState(false);
 return <><button type="button" className="small-action detail-launch" aria-haspopup="dialog" onClick={()=>setOpen(true)}>{icon}{title}<ArrowUpRight size={14}/></button>
   <Modal open={open} title={title} onClose={()=>setOpen(false)} wide={wide}><div className="detail-dialog-content">{children}</div></Modal></>;
}
function ActionList({items,close}:{items:any[];close:()=>void}){
 return <div className="picker-options">{items.filter(i=>!i.separator).map(i=><button type="button" key={i.label} className={i.danger?'danger':''} disabled={i.disabled} aria-pressed={i.checked} onClick={()=>{close();void perform(i.action);}}>
   {i.icon&&<i.icon size={16}/>}<span>{i.label}{i.detail&&<small>{i.detail}</small>}</span>{i.checked&&<Check size={16}/>}</button>)}</div>;
}
export function Dropdown({trigger,items}:any){
 const [open,setOpen]=useState(false);
 return <>{React.cloneElement(trigger,{'aria-haspopup':'dialog',onClick:()=>setOpen(true)})}<Modal open={open} onClose={()=>setOpen(false)} title={trigger.props['aria-label']||'可用操作'}>
   <ActionList items={items} close={()=>setOpen(false)}/></Modal></>;
}
export function Toggle({checked,onChange,label,description,disabled=false}:any){return <label className="toggle-row"><span><strong>{label}</strong>{description&&<small>{description}</small>}</span><button role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={()=>void perform(()=>onChange(!checked))} className={'toggle '+(checked?'on':'')}><i/></button></label>}
export function ContextMenu({children,items}:any){
 const [open,setOpen]=useState(false);
 const show=(e:any)=>{if(!children.props.disabled){e.preventDefault();e.stopPropagation();setOpen(true);}};
 return <>{React.cloneElement(children,{onContextMenu:show,onKeyDown:(e:any)=>{children.props.onKeyDown?.(e);if(!e.defaultPrevented&&(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'))show(e);}})}
   <Modal open={open} onClose={()=>setOpen(false)} title="实例操作"><ActionList items={items} close={()=>setOpen(false)}/></Modal></>;
}
export function Field({label,hint,children}:any){
 if(React.isValidElement<any>(children)&&children.type===Select)return <div className="field"><span>{label}</span>{React.cloneElement(children,{label:children.props.label||label})}{hint&&<small>{hint}</small>}</div>;
 return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}
export function Empty({icon:Icon,title,children,action}:any){return <div className="empty">{Icon&&<Icon size={35} strokeWidth={1.4}/>}<h3>{title}</h3>{children&&<p>{children}</p>}{action}</div>}
export function PageTitle({eyebrow,title,children,actions,tabs}:any){return <header className="page-title page-header"><div className="page-header-row"><div className="page-header-title">{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{children&&<p>{children}</p>}</div><div className="actions page-header-actions">{actions}<div className="page-header-card-tools"/></div></div>{tabs&&<nav className="workspace-tabs page-header-tabs" aria-label={title+'栏目'}>{tabs}</nav>}</header>}
export function Avatar({name='',image,size=32}:any){const [failed,setFailed]=useState(''),show=useContentImages();return <span className="avatar" style={{width:size,height:size}}>{show&&image&&image!==failed?<img src={image} alt={name+'的头像'} onError={()=>setFailed(image)}/>:(name?.slice(0,1)||'旅')}</span>}
export function CoverImage({src,alt='',fallback=null}: {src?:string;alt?:string;fallback?:React.ReactNode}) {
 const [failed,setFailed]=useState('');
 return src&&src!==failed?<RefineImage src={src} alt={alt} loading="lazy" decoding="async" onError={()=>setFailed(src)}/>:fallback;
}
export function Segments({value,onChange,items}:any){const group=useChoiceGlide(value);return <div ref={group} className="segments">{items.map((i:any)=><button key={i.id} aria-pressed={value===i.id} className={value===i.id?'selected':''} onClick={()=>onChange(i.id)}>{i.icon&&<i.icon size={16}/>}<span>{i.label}</span>{i.count!=null&&<small>{i.count}</small>}</button>)}<i className="choice-glide" aria-hidden hidden/></div>}
export const date=(n:any)=>new Date(n).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
