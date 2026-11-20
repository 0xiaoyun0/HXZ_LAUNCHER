import {forwardRef,useCallback,useEffect,useRef,useState,type TextareaHTMLAttributes} from 'react';
import {useSnapshot} from 'valtio';
import {community,communityAvatar} from '../../../packages/community/client';
import {request} from './data';
import {Avatar,Modal} from './ui';
type Props=Omit<TextareaHTMLAttributes<HTMLTextAreaElement>,'value'>&{value:string;onValueChange:(value:string)=>void};

export const MentionTextarea=forwardRef<HTMLTextAreaElement,Props>(function MentionTextarea({value,onValueChange,onKeyDown,onChange,onSelect,...props},forwarded){
 const c=useSnapshot(community),el=useRef<HTMLTextAreaElement|null>(null);
 const [cursor,setCursor]=useState(0),[range,setRange]=useState<{start:number;end:number}|null>(null),[query,setQuery]=useState('');
 const [items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const match=value.slice(0,cursor).match(/(?:^|\s)@([^\s@]{0,40})$/u);
 const ref=useCallback((node:HTMLTextAreaElement|null)=>{el.current=node;if(typeof forwarded==='function')forwarded(node);else if(forwarded)forwarded.current=node;},[forwarded]);
 function open(){
   if(!match||!c.connected)return;
   setQuery(match[1]);setRange({start:cursor-match[1].length-1,end:cursor});
 }
 useEffect(()=>{
   if(!range||!c.connected)return;
   let current=true;setError('');setLoading(true);setItems([]);
   const timer=setTimeout(()=>{void request('/api/members/search?q='+encodeURIComponent(query)).then(r=>{
     if(current)setItems([...(c.user?.admin&&('全体'.includes(query)||!query)?[{uid:'@all',name:'全体',all:true}]:[]),...r.items]);
   }).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setLoading(false);});},100);
   return ()=>{current=false;clearTimeout(timer);};
 },[range,query,c.connected,c.user?.admin]);
 function pick(item:any){
   if(!range)return;
   const next=value.slice(0,range.start)+'@'+item.name+' '+value.slice(range.end),position=range.start+item.name.length+2;
   if(props.maxLength&&next.length>props.maxLength){setError('这条消息已达到字数上限');return;}
   onValueChange(next);setRange(null);requestAnimationFrame(()=>{el.current?.focus({preventScroll:true});el.current?.setSelectionRange(position,position);setCursor(position);});
 }
 return <><textarea {...props} ref={ref} value={value} onSelect={e=>{setCursor(e.currentTarget.selectionStart);onSelect?.(e);}} onChange={e=>{setCursor(e.target.selectionStart);onValueChange(e.target.value);onChange?.(e);}}
   onKeyDown={e=>{if(match&&c.connected&&e.key==='ArrowDown'&&!e.nativeEvent.isComposing){e.preventDefault();open();}else onKeyDown?.(e);}}/>
   {match&&c.connected&&<button type="button" className="small-action mention-browse" onClick={open} aria-haspopup="dialog">选择提及成员</button>}
   <Modal open={!!range} title="提及成员" onClose={()=>setRange(null)}><div className="picker-panel"><input aria-label="搜索成员" placeholder="搜索成员" value={query} onChange={e=>setQuery(e.target.value)}/>
     <div className="picker-options">{items.map(item=><button type="button" key={item.uid} onClick={()=>pick(item)}><Avatar size={27} name={item.name} image={item.all?'':communityAvatar(item.uid,item.avatarVersion)}/>{item.all?'全体成员':item.name}</button>)}</div>
     {error?<p role="alert">{error}</p>:loading||!items.length?<p role="status">{!c.connected?'社区连接已断开':loading?'查找成员中…':'没有匹配的成员'}</p>:null}</div></Modal></>;
});
