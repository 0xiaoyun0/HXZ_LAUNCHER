import {useRef,type PointerEvent} from 'react';
import {AlertCircle,Check,X} from 'lucide-react';
import {useSnapshot} from 'valtio';
import {ui} from '../model';

export function DesktopNotice(){
  const u=useSnapshot(ui);
  const gesture=useRef<{id:number;x:number;y:number}|null>(null);
  function end(node:HTMLDivElement){
    gesture.current=null;delete node.dataset.swiping;node.style.removeProperty('--notice-offset');
  }
  function move(e:PointerEvent<HTMLDivElement>){
    const start=gesture.current;
    if(!start||start.id!==e.pointerId)return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if(Math.abs(dy)>Math.abs(dx)+6){end(e.currentTarget);return;}
    if(Math.abs(dx)>4){e.currentTarget.dataset.swiping='true';e.currentTarget.style.setProperty('--notice-offset',dx+'px');}
  }
  return <div className={'third-toast '+(u.toastError?'error':'')} role={u.toastError?'alert':'status'}
    onPointerDown={e=>{
      if(!e.isPrimary||e.button!==0||(e.target as Element).closest('button'))return;
      gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);
    }}
    onPointerMove={move} onPointerCancel={e=>end(e.currentTarget)} onLostPointerCapture={e=>end(e.currentTarget)}
    onPointerUp={e=>{
      const start=gesture.current,dx=start?e.clientX-start.x:0,threshold=Math.min(90,e.currentTarget.offsetWidth*.28);
      const dismiss=start?.id===e.pointerId&&e.currentTarget.dataset.swiping&&Math.abs(dx)>=threshold;
      end(e.currentTarget);if(dismiss)ui.toast='';
    }}>
    {u.toastError?<AlertCircle size={16}/>:<Check size={15} className="status-saved"/>}<span>{u.toast}</span>
    {u.toastError&&u.issue&&<button onClick={()=>{ui.issueOpen=true;ui.toast='';}}>处理方法</button>}
    <button aria-label="关闭提示" onClick={()=>ui.toast=''}><X size={14}/></button>
  </div>;
}
