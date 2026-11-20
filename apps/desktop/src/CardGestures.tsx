import {useRef,useState,type PointerEvent} from 'react';
import {GripVertical,Scaling} from 'lucide-react';
type Action={id:string;op:string;to?:string;w?:number;h?:number};
export function CardGestures({id,title,compact,onEdit,onChoose}:{id:string;title:string;compact:boolean;onEdit:(action:Action)=>void;onChoose:()=>void}){
  const start=useRef<{x:number;y:number;width:number;height:number;step:number;grid:HTMLElement;kind:string}|null>(null);
  const [hint,setHint]=useState('');
  function down(e:PointerEvent<HTMLButtonElement>,kind:string){
    if(e.button!==0)return;const card=e.currentTarget.closest<HTMLElement>('[data-card-id]')!,grid=card.parentElement!,rect=card.getBoundingClientRect();
    start.current={x:e.clientX,y:e.clientY,width:rect.width,height:rect.height,step:(grid.clientWidth+parseFloat(getComputedStyle(grid).columnGap||'0'))/12,grid,kind};
    e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();
  }
  function target(e:PointerEvent<HTMLElement>){
    const card=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-card-id]');
    return card?.parentElement===start.current?.grid?card:null;
  }
  function size(e:PointerEvent<HTMLElement>){
    const p=start.current!;return {w:Math.max(4,Math.min(12,Math.round((p.width+e.clientX-p.x)/p.step))),h:Math.max(8,Math.min(100,Math.round((p.height+e.clientY-p.y)/22)))};
  }
  function move(e:PointerEvent<HTMLButtonElement>){
    const p=start.current;if(!p)return;
    if(p.kind==='size'){const {w,h}=size(e);setHint((compact?'整行':w+'/12 宽')+' · '+h*22+' px');}
    else {
      const el=target(e);p.grid.querySelector('[data-drop]')?.removeAttribute('data-drop');if(el&&el.dataset.cardId!==id)el.dataset.drop='true';
      const main=p.grid.closest('main'),bounds=main?.getBoundingClientRect();if(main&&bounds){if(e.clientY<bounds.top+28)main.scrollBy(0,-22);if(e.clientY>bounds.bottom-28)main.scrollBy(0,22);}
    }
  }
  function cancel(){start.current?.grid.querySelector('[data-drop]')?.removeAttribute('data-drop');start.current=null;setHint('');}
  function up(e:PointerEvent<HTMLButtonElement>){
    const p=start.current;if(!p)return;
    if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>4){
      if(p.kind==='size'){const dims=size(e);onEdit({id,op:'size',...dims,w:compact?undefined:dims.w});}
      else {const to=target(e)?.dataset.cardId;if(to&&to!==id)onEdit({id,op:'move',to});}
    }
    cancel();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function grip(kind:string,label:string,icon:React.ReactNode){
    return <button type="button" className={'canvas-grip '+kind} aria-label={label+title} title={label+title} onPointerDown={e=>down(e,kind)} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}
      onKeyDown={e=>{if(e.key==='Escape')cancel();if(e.key==='Enter'||e.key===' '){e.preventDefault();onChoose();}}}>{icon}</button>;
  }
  return <>{grip('move','拖动',<GripVertical size={16}/>)}{grip('size','调整大小',<Scaling size={15}/>)}{hint&&<output className="size-hint">{hint}</output>}</>;
}
