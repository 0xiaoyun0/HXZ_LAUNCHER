import {memo,useEffect,useLayoutEffect,useRef,useState,type ComponentPropsWithoutRef} from 'react';

type Props=Omit<ComponentPropsWithoutRef<'input'>,'type'|'value'|'min'|'max'> & {min:number;max:number;value:number};
const Bars=memo(function Bars({count}:{count:number}){
  return <>{Array.from({length:count},(_,i)=><i key={i}/>)}</>;
});

// React Bits Wake Slider. Its velocity-shaped cosine wake decorates a native range input.
export function WakeRange({min,max,value,onInput,...input}:Props){
  const track=useRef<HTMLSpanElement>(null),last=useRef<{fraction:number;at:number}|null>(null);
  const settle=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const [count,setCount]=useState(28);
  const fraction=(n:number)=>max>min?Math.max(0,Math.min(1,(n-min)/(max-min))):0;
  useLayoutEffect(()=>{
    const el=track.current;if(!el)return;
    const resize=new ResizeObserver(([entry])=>setCount(Math.max(16,Math.min(76,Math.round(entry.contentRect.width/6)))));
    resize.observe(el);return()=>resize.disconnect();
  },[]);
  useLayoutEffect(()=>{
    const cells=track.current?.children;if(!cells)return;
    const head=Math.round(fraction(value)*(count-1));
    for(let i=0;i<cells.length;i++)cells[i].toggleAttribute('data-lit',i<=head);
  },[value,min,max,count]);
  useEffect(()=>()=>clearTimeout(settle.current),[]);
  function wake(next:number){
    const el=track.current;if(!el)return;
    const now=performance.now(),head=fraction(next),from=last.current;
    last.current={fraction:head,at:now};
    if(!from||document.documentElement.dataset.motion!=='on'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const speed=(head-from.fraction)*1000/Math.max(8,now-from.at);
    const strength=Math.min(1,Math.abs(speed)*.7);
    for(let i=0;i<el.children.length;i++){
      const distance=i-head*(count-1),reach=distance*speed<0?5+4*strength:3;
      const crest=Math.abs(distance)<reach?strength*Math.cos(Math.PI*distance/(2*reach))**2:0;
      (el.children[i] as HTMLElement).style.setProperty('--wake-height',String(.26+.74*crest));
    }
    clearTimeout(settle.current);
    settle.current=setTimeout(()=>{for(const cell of el.children)(cell as HTMLElement).style.removeProperty('--wake-height');},95);
  }
  return <span className="wake-range" data-disabled={input.disabled||undefined}>
    <span className="wake-bars" ref={track} aria-hidden="true"><Bars count={count}/></span>
    <input {...input} type="range" min={min} max={max} value={value}
      onPointerDown={e=>{last.current={fraction:fraction(value),at:performance.now()};input.onPointerDown?.(e);}}
      onKeyDown={e=>{last.current=null;input.onKeyDown?.(e);}}
      onInput={e=>{wake(e.currentTarget.valueAsNumber);onInput?.(e);}}/>
  </span>;
}
