import {useEffect,useRef,useState} from 'react';
import {perform} from '../model';

type SliderProps={label:string;value:number;min:number;max:number;unit:string;preview?:string;save:(value:number)=>Promise<unknown>};
export function AppearanceSlider({label,value,min,max,unit,preview,save}:SliderProps){
  const [draft,setDraft]=useState(value),pending=useRef<number|null>(null);
  useEffect(()=>{if(pending.current===null)setDraft(value);},[value]);
  useEffect(()=>()=>{if(preview)document.documentElement.style.removeProperty(preview);},[preview]);
  function commit(){
    const n=pending.current;if(n===null)return;
    pending.current=null;
    void perform(async()=>{try{await save(n);}finally{if(pending.current===null&&preview)document.documentElement.style.removeProperty(preview);}});
  }
  return <label className="appearance-range"><span>{label}</span><output>{draft}{unit}</output>
    <input aria-label={label} type="range" value={draft} min={min} max={max}
      onChange={e=>{const n=Number(e.target.value);pending.current=n;setDraft(n);if(preview)document.documentElement.style.setProperty(preview,unit===' px'?n+'px':String(n/100));}}
      onPointerUp={commit} onPointerCancel={commit} onKeyUp={commit} onBlur={commit}/></label>;
}
