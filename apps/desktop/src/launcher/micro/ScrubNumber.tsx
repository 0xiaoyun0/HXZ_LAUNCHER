import {useEffect,useRef} from 'react';

type Props={label:string;value:string;min:number;max:number;disabled?:boolean;onChange:(value:string)=>void};
type Drag={id:number;x:number;start:string;base:number;changed:boolean};

// The number field remains editable. Its unit is a second, relative pointer input for the same draft.
export function ScrubNumber({label,value,min,max,disabled,onChange}:Props){
  const unit=useRef<HTMLSpanElement>(null),drag=useRef<Drag|null>(null),change=useRef(onChange);
  change.current=onChange;
  function release(cancel:boolean){
    const current=drag.current;if(!current)return;
    drag.current=null;
    if(cancel&&current.changed)change.current(current.start);
    const el=unit.current;
    if(el){delete el.dataset.scrubbing;if(el.hasPointerCapture(current.id))el.releasePointerCapture(current.id);}
  }
  useEffect(()=>{
    const cancel=()=>release(true),key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&drag.current){e.preventDefault();e.stopImmediatePropagation();cancel();}};
    window.addEventListener('blur',cancel);window.addEventListener('keydown',key,true);
    return()=>{window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);};
  },[]);
  return <label className="scrub-number"><input aria-label={label} type="number" min={min} max={max} value={value} disabled={disabled}
    onChange={e=>onChange(e.target.value)}/><span ref={unit} className="scrub-unit" data-hint="左右拖动调整内存 · Alt 微调" aria-hidden="true"
      onPointerDown={e=>{
        if(disabled||drag.current||e.button!==0||!e.isPrimary)return;
        e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
        drag.current={id:e.pointerId,x:e.clientX,start:value,base:Math.min(max,Math.max(min,Number(value)||min)),changed:false};
      }}
      onPointerMove={e=>{
        const d=drag.current;if(!d||d.id!==e.pointerId)return;
        const dx=e.clientX-d.x;if(!d.changed&&Math.abs(dx)<4)return;
        const next=Math.max(min,Math.min(max,d.base+Math.round(dx/5)*(e.altKey?16:128)));
        d.changed=true;e.currentTarget.dataset.scrubbing='true';onChange(String(next));
      }}
      onPointerUp={e=>{if(drag.current?.id===e.pointerId)release(false);}}
      onPointerCancel={()=>release(true)} onLostPointerCapture={()=>release(true)}>MB</span></label>;
}
