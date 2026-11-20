import {useEffect,useId,useRef,useState} from 'react';
import {perform} from '../model';

export function PreferenceSwitch({name,caption,checked,disabled=false,change}:{name:string;caption?:string;checked:boolean;disabled?:boolean;change:(on:boolean)=>Promise<unknown>}){
  const [pending,setPending]=useState<boolean|null>(null);
  return <label className="module-setting"><span><strong>{name}</strong>{caption&&<small>{caption}</small>}</span>
    <input type="checkbox" role="switch" aria-label={name} checked={pending??checked} disabled={disabled||pending!==null} onChange={e=>{
      const next=e.target.checked;setPending(next);void perform(async()=>{try{await change(next);}finally{setPending(null);}});
    }}/></label>;
}
type Option=readonly [string|number,string];
type ChoiceProps={label:string;value:string|number;options:ReadonlyArray<Option>;disabled?:boolean;onChange:(value:string)=>unknown};
export function ChoiceGroup({label,value,options,disabled,onChange}:ChoiceProps){
  const name=useId();
  return <div className="choice-group" role="radiogroup" aria-label={label}>
    {options.map(([id,title])=><label className="choice-option" key={id}><input type="radio" name={name} value={id} checked={String(id)===String(value)}
      disabled={disabled} onChange={()=>onChange(String(id))}/><span>{title}</span></label>)}
  </div>;
}
export function StepChoice({label,value,options,onChange}:Omit<ChoiceProps,'disabled'>){
  const at=Math.max(0,options.findIndex(([id])=>String(id)===String(value)));
  const [draft,setDraft]=useState(at),pending=useRef<number|null>(null);
  const persisted=useRef(at),lastSave=useRef(0),saving=useRef(false);
  useEffect(()=>{
    persisted.current=at;
    if(!saving.current&&pending.current===null)setDraft(at);
  },[at]);
  function commit(){
    const next=pending.current;if(next===null)return;pending.current=null;
    const request=++lastSave.current;
    saving.current=true;
    void perform(async()=>{
      try{await onChange(String(options[next][0]));}
      catch(error){
        if(lastSave.current===request&&pending.current===null)setDraft(persisted.current);
        throw error;
      }finally{
        if(lastSave.current===request)saving.current=false;
      }
    });
  }
  return <div className="step-choice"><input type="range" aria-label={label} aria-valuetext={options[draft][1]} min={0} max={options.length-1} step={1} value={draft}
    onChange={e=>{const next=Number(e.target.value);pending.current=next;setDraft(next);}} onPointerUp={commit} onPointerCancel={commit} onKeyUp={commit} onBlur={commit}/>
    <output>{options[draft][1]}</output></div>;
}
