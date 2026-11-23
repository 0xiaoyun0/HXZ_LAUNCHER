import {useCallback,useLayoutEffect,useRef} from 'react';
import {chatView} from '../../../packages/community/client';

/** Layout-induced scrolling must not be mistaken for the user reading history. */
export function useChatScroll(latest:unknown) {
 const list=useRef<HTMLDivElement|null>(null),cleanup=useRef<()=>void>(()=>{}),frame=useRef(0),intent=useRef(0),dragging=useRef(false);
 const align=useCallback(()=>{
  cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>{const el=list.current;if(el&&chatView.atBottom){el.scrollTop=el.scrollHeight;chatView.scrollTop=el.scrollTop;}});
 },[]);
 const attach=useCallback((el:HTMLDivElement|null)=>{
  cleanup.current();list.current=el;if(!el)return;
  chatView.atBottom=true;intent.current=0;dragging.current=false;
  const resize=new ResizeObserver(align);resize.observe(el);if(el.firstElementChild)resize.observe(el.firstElementChild);
  const mutation=new MutationObserver(align);mutation.observe(el,{subtree:true,childList:true,characterData:true});
  const release=()=>{if(!dragging.current)return;dragging.current=false;intent.current=performance.now()+200;};
  window.addEventListener('pointerup',release);el.addEventListener('load',align,true);align();
  cleanup.current=()=>{resize.disconnect();mutation.disconnect();cancelAnimationFrame(frame.current);window.removeEventListener('pointerup',release);el.removeEventListener('load',align,true);};
 },[align]);
 useLayoutEffect(()=>{align();},[latest,align]);
 useLayoutEffect(()=>()=>cleanup.current(),[]);
 const toLatest=()=>{intent.current=0;chatView.atBottom=true;align();};
 return {list,attach,toLatest,
  onWheel:(e:React.WheelEvent)=>{intent.current=performance.now()+350;if(e.deltaY<0)chatView.atBottom=false;},
  onPointerDown:()=>{dragging.current=true;intent.current=performance.now()+350;},
  onKeyDown:(e:React.KeyboardEvent)=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)){intent.current=performance.now()+350;if(['ArrowUp','PageUp','Home'].includes(e.key))chatView.atBottom=false;}},
  onScroll:()=>{const el=list.current;if(!el)return;chatView.scrollTop=el.scrollTop;if(dragging.current||performance.now()<intent.current)chatView.atBottom=el.scrollHeight-el.clientHeight-el.scrollTop<48;else if(chatView.atBottom)align();}
 };
}
