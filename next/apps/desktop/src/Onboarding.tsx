import {useState,useEffect} from 'react';
import {useSnapshot} from 'valtio';
import {useNavigate,useLocation} from 'react-router-dom';
import {ArrowRight,ArrowLeft,Compass,X,Check,ChevronDown,ChevronUp} from 'lucide-react';
import {guideEntries,GUIDE_VERSION} from '../../../packages/onboarding/catalog.mjs';
import {community} from '../../../packages/community/client';
import {state,ui,saveSettings,perform,notify} from './model';
import {Modal,Button,IconButton} from './ui';
import './onboarding.css';

export function Onboarding(){
 const s=useSnapshot(state),u=useSnapshot(ui),c=useSnapshot(community),navigate=useNavigate(),location=useLocation();
 const entries=guideEntries({admin:!!c.user?.admin}),[step,setStep]=useState(0),[tour,setTour]=useState(false),[folded,setFolded]=useState(false);
 const open=s.ready&&(!s.settings.onboardingDone||!!u.onboarding),entry=entries[Math.min(step,entries.length-1)];
 useEffect(()=>{if(!open){setTour(false);setStep(0);}},[open]);
 useEffect(()=>{setStep(index=>Math.min(index,entries.length-1));},[entries.length]);
 const finish=()=>perform(async()=>{await saveSettings({onboardingDone:true,onboardingVersion:GUIDE_VERSION});ui.onboarding=false;setTour(false);});
 function visit(index:number){const i=Math.max(0,Math.min(entries.length-1,index));if(location.pathname!==entries[i].desktop&&(ui.unsaved||ui.layoutUnsaved)){notify('请先保存或放弃当前页面的更改，再继续引导');return;}setStep(i);setTour(true);setFolded(false);navigate(entries[i].desktop);}
 if(!open)return null;
 if(tour)return <aside className={'guided-tour '+(folded?'folded':'')} aria-label="功能导览" data-testid="guided-tour"><header><span><Compass size={17}/>{entry.group} · {step+1}/{entries.length}</span><div><IconButton icon={folded?ChevronUp:ChevronDown} label={folded?'展开引导':'收起引导'} onClick={()=>setFolded(v=>!v)}/><IconButton icon={X} label="结束引导" onClick={finish}/></div></header>{!folded&&<><h2>{entry.title}</h2><p>{entry.body}</p><small>{entry.tip}</small>{location.pathname!==entry.desktop&&<Button onClick={()=>visit(step)}>返回本步页面</Button>}<footer><Button icon={ArrowLeft} disabled={step===0} onClick={()=>visit(step-1)}>上一步</Button><Button tone="solid" icon={step===entries.length-1?Check:ArrowRight} onClick={step===entries.length-1?finish:()=>visit(step+1)}>{step===entries.length-1?'完成导览':'下一步'}</Button></footer><button className="tour-index-link" onClick={()=>setTour(false)}>查看所有功能</button></>}</aside>;
 return <Modal open title="认识你的幻想镇" wide onClose={finish}><div className="guide-introduction"><Compass size={28}/><div><h2>随时开始，按需探索。</h2><p>挑选一个功能，直接走进它的页面。你可以收起引导自由操作，也可以稍后从设置重新查看。</p></div></div><div className="guide-directory">{[...new Set(entries.map(e=>e.group))].map(group=><section key={group}><h3>{group}</h3>{entries.map((item,i)=>item.group===group?<button key={item.id} onClick={()=>visit(i)}><span>{item.title}</span><ArrowRight size={15}/></button>:null)}</section>)}</div><footer className="modal-actions"><Button onClick={finish}>我先自己看看</Button><Button tone="solid" icon={ArrowRight} onClick={()=>visit(0)}>从开始游戏看起</Button></footer></Modal>;
}
