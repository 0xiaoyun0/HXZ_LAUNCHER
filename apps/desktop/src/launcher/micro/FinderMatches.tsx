import {useLayoutEffect,useRef,useState,type KeyboardEvent} from 'react';
import {ChevronRight,Search,type LucideIcon} from 'lucide-react';

type Match={id:string;label:string;icon:LucideIcon;path:string};
function mark(label:string,term:string){
  const at=term?label.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()):-1;
  return at<0?label:<>{label.slice(0,at)}<mark>{label.slice(at,at+term.length)}</mark>{label.slice(at+term.length)}</>;
}

export function FinderMatches({query,update,items,open,empty}:{query:string;update:(q:string)=>void;items:Match[];open:(path:string)=>void;empty:string}){
  const field=useRef<HTMLInputElement>(null),list=useRef<HTMLDivElement>(null),spot=useRef<HTMLSpanElement>(null);
  const [selected,select]=useState('');
  const current=items.findIndex(item=>item.id===selected);
  const key=JSON.stringify(items.map(item=>item.id));
  useLayoutEffect(()=>{
    const root=list.current,indicator=spot.current,button=root?.querySelectorAll('button')[current];
    if(!root||!indicator||!button)return;
    const place=()=>{
      indicator.style.setProperty('--finder-y',button.offsetTop+'px');
      indicator.style.blockSize=button.offsetHeight+'px';
    };
    place();const observer=new ResizeObserver(place);observer.observe(root);observer.observe(button);
    return ()=>observer.disconnect();
  },[current,key]);
  function keyboard(e:KeyboardEvent,fromField:boolean){
    if(e.nativeEvent.isComposing||e.keyCode===229||e.altKey||e.ctrlKey||e.metaKey||!items.length)return;
    if(fromField&&e.key==='Enter'){e.preventDefault();open(items[Math.max(0,current)].path);return;}
    let next:number;
    if(e.key==='ArrowDown')next=Math.min(items.length-1,current+1);
    else if(e.key==='ArrowUp'){
      if(!fromField&&current===0){e.preventDefault();field.current?.focus();return;}
      next=current<0?items.length-1:Math.max(0,current-1);
    }else if(!fromField&&e.key==='Home')next=0;
    else if(!fromField&&e.key==='End')next=items.length-1;
    else return;
    e.preventDefault();select(items[next].id);
    const button=list.current?.querySelectorAll('button')[next];
    button?.focus({preventScroll:true});button?.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  return <><label className="finder-input"><Search size={17}/><input ref={field} autoFocus value={query} onChange={e=>{select('');update(e.target.value);}} onKeyDown={e=>keyboard(e,true)} placeholder="搜索实例或功能"/></label>
    <div className="finder-results guided-results" ref={list} onKeyDown={e=>keyboard(e,false)} onPointerLeave={()=>{if(!list.current?.contains(document.activeElement))select('');}}>
      <span ref={spot} className="finder-spot" data-visible={current>=0} aria-hidden/>
      {items.map(({id,label,icon:Icon,path},index)=><button key={id} data-selected={current===index||undefined} onFocus={()=>select(id)} onPointerMove={()=>select(id)} onClick={()=>open(path)}>
        <Icon size={16}/><span>{mark(label,query.trim())}</span><ChevronRight size={14}/></button>)}
      {!items.length&&<p role="status">{empty}</p>}
    </div></>;
}
