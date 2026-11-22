import {useCallback,useEffect,useRef,type CSSProperties,type PointerEvent} from 'react';
import {X} from 'lucide-react';
import {useSnapshot} from 'valtio';
import {holdNotice,ui} from '../model';
import {StatusMark} from './micro/Feedback';

export function DesktopNotice(){
  const u=useSnapshot(ui),id=u.toastId;
  const node=useRef<HTMLDivElement>(null),holds=useRef(new Set<string>());
  const gesture=useRef<{id:number;x:number;y:number}|null>(null);
  const pause=useCallback((reason:string,hold:boolean)=>{
    if(hold)holds.current.add(reason);else holds.current.delete(reason);
    node.current?.toggleAttribute('data-paused',holds.current.size>0);
    holdNotice(id,reason,hold);
  },[id]);
  useEffect(()=>{
    const visibility=()=>pause('hidden',document.hidden);
    visibility();document.addEventListener('visibilitychange',visibility);
    return()=>{
      document.removeEventListener('visibilitychange',visibility);
      for(const reason of holds.current)holdNotice(id,reason,false);
    };
  },[id,pause]);
  function end(el:HTMLDivElement){
    const start=gesture.current;if(!start)return;
    gesture.current=null;delete el.dataset.swiping;el.style.removeProperty('--notice-offset');
    if(el.hasPointerCapture(start.id))el.releasePointerCapture(start.id);
    pause('drag',false);
  }
  function move(e:PointerEvent<HTMLDivElement>){
    const start=gesture.current;if(!start||start.id!==e.pointerId)return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if(Math.abs(dy)>Math.abs(dx)+6){end(e.currentTarget);return;}
    if(Math.abs(dx)>4){e.currentTarget.dataset.swiping='true';e.currentTarget.style.setProperty('--notice-offset',dx+'px');}
  }
  return <div ref={node} className={'third-toast '+(u.toastError?'error':'')} role={u.toastError?'alert':'status'}
    style={{'--notice-life':u.toastDuration+'ms'} as CSSProperties}
    onPointerEnter={e=>{if(e.pointerType!=='touch')pause('hover',true);}}
    onPointerLeave={()=>pause('hover',false)} onFocusCapture={()=>pause('focus',true)}
    onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))pause('focus',false);}}
    onPointerDown={e=>{
      if(!e.isPrimary||e.button!==0||(e.target as Element).closest('button'))return;
      gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY};
      pause('drag',true);e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={move} onPointerCancel={e=>end(e.currentTarget)} onLostPointerCapture={e=>end(e.currentTarget)}
    onPointerUp={e=>{
      const start=gesture.current,dx=start?e.clientX-start.x:0,threshold=Math.min(90,e.currentTarget.offsetWidth*.28);
      const dismiss=start?.id===e.pointerId&&e.currentTarget.dataset.swiping&&Math.abs(dx)>=threshold;
      end(e.currentTarget);if(dismiss)ui.toast='';
    }}>
    <StatusMark status={u.toastError?'failed':'done'}/><span>{u.toast}</span>
    {u.toastError&&u.issue&&<button onClick={()=>{ui.issueOpen=true;ui.toast='';}}>处理方法</button>}
    <button aria-label="关闭提示" onClick={()=>ui.toast=''}><X size={14}/></button>
    <i className="notice-fuse" aria-hidden="true"/>
  </div>;
}
