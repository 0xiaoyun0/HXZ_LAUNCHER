import {useRef,useState,type CSSProperties} from 'react';
import {LoaderCircle,Play,Square} from 'lucide-react';
import {useSnapshot} from 'valtio';
import {progressPercent} from '../../../../../packages/engine/core/task-progress.mjs';
import {perform,startOrStopInstance,state,task,ui} from '../../model';

export function LaunchAction({id,running,label,className,disabled}:{id:string;running:boolean;label:string;className:string;disabled:boolean}){
  const u=useSnapshot(ui),t=useSnapshot(task),root=useSnapshot(state).settings.gameRoot;
  const submitting=useRef(false),[holding,setHolding]=useState(false);
  const mine=u.launchOrigin?.id===id&&u.launchOrigin.root===root;
  const mode=running?'running':mine?'preparing':'ready',pct=mine&&t.busy?progressPercent(t):null;
  const description=mine&&!running?(t.busy?t.phase:'准备启动'):label;
  async function activate(){
    if(submitting.current)return;
    submitting.current=true;setHolding(true);
    try{await perform(()=>startOrStopInstance(id));}
    finally{submitting.current=false;setHolding(false);}
  }
  return <button className={className+' launch-motion'} data-launch-state={mode} aria-label={description}
    aria-busy={mode==='preparing'} disabled={disabled||holding||mode==='preparing'} onClick={activate} title={description}>
    {mode==='preparing'&&<i className="launch-fill" data-known={pct!==null||undefined} aria-hidden style={{'--phase-fill':(pct??0)/100} as CSSProperties}/>}
    <span className="launch-symbol" key={mode} aria-hidden>{running?<Square/>:mine?<LoaderCircle/>:<Play/>}</span>
    <span className="launch-label" key={mode+'-'+description}>{description}</span>
  </button>;
}
