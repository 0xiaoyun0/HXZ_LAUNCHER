import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowDown,ArrowUp,Check,Play,Plus,Trash2} from 'lucide-react';
import {FLOW_ACTIONS,normalizeWorkflow,runWorkflow} from '../../../packages/engine/core/card-workflow.mjs';
import {leaveVoice} from '../../../packages/community/client';
import {stopMusic} from './music-player';
import {account,invoke,launch,notify,selected,state,task,ui} from './model';
import {Button,IconButton,Modal,Select} from './ui';
import './workflow-card.css';
export function WorkflowCard({item,draft,editing,onChange}:any){
 const navigate=useNavigate(),[open,setOpen]=useState(false),[running,setRunning]=useState(false),[events,setEvents]=useState<any>({}),[choice,setChoice]=useState('pause-music'),[error,setError]=useState(''),control=useRef<AbortController|null>(null);
 useEffect(()=>()=>control.current?.abort(),[]);
 const steps=normalizeWorkflow(editing?draft.steps:item.steps),name=(id:string)=>FLOW_ACTIONS.find(v=>v[0]===id)?.[1]||id;
 const change=(values:string[])=>onChange({...draft,steps:normalizeWorkflow(values)});
 const move=(index:number,direction:number)=>{const next=[...steps];[next[index],next[index+direction]]=[next[index+direction],next[index]];change(next);};
 async function execute(action:string){
  if(action==='pause-music')stopMusic();
  if(action==='leave-voice')await leaveVoice();
  if(action==='instance-folder'){const instance=selected();if(!instance?.installed)throw Error('请先选择一个已安装的实例');await invoke('instance.folder',{id:instance.id,kind:'versions'});}
  if(action==='launch-instance'){
   if(task.busy||state.running)throw Error('请等待当前任务完成或先关闭游戏');
   if(!selected())throw Error('请先选择实例');if(!account())throw Error('请先登录皮肤站角色');await launch();
  }
  if(action==='open-tasks')ui.tasks=true;
  const page=FLOW_ACTIONS.find(v=>v[0]===action)?.[2];if(page){control.current=null;navigate(page);}
 }
 async function run(){
  const controller=new AbortController();control.current=controller;setRunning(true);setError('');setEvents({});
  try{await runWorkflow(item.steps,execute,{signal:controller.signal,progress:value=>setEvents((before:any)=>({...before,[value.index]:value}))});setOpen(false);notify('流程已完成');}
  catch(error:any){if(controller.signal.aborted)setError('已停止后续步骤。已开始的游戏任务可在任务详情中查看。');else setError(error.message);}
  finally{setRunning(false);control.current=null;}
 }
 return <div className="workflow-card">
  {steps.length?<ol>{steps.map((action,index)=><li key={action}><span>{index+1}</span><strong>{name(action)}</strong>{editing&&<div><IconButton icon={ArrowUp} label={'上移 '+name(action)} disabled={!index||action.startsWith('page-')} onClick={()=>move(index,-1)}/><IconButton icon={ArrowDown} label={'下移 '+name(action)} disabled={index===steps.length-1||steps[index+1]?.startsWith('page-')} onClick={()=>move(index,1)}/><IconButton icon={Trash2} label={'移除 '+name(action)} onClick={()=>change(steps.filter((_,i)=>i!==index))}/></div>}</li>)}</ol>:<p className="muted">进入卡片编辑模式，添加你常用的操作顺序。</p>}
  {editing?<><div className="workflow-add"><Select label="流程步骤" value={choice} options={FLOW_ACTIONS.map(([value,label])=>({value,label}))} onChange={setChoice}/><Button icon={Plus} disabled={steps.length>=8||steps.includes(choice)} onClick={()=>change([...steps,choice])}>添加</Button></div><small className="muted">最多 8 步；页面跳转放在最后。不会自动运行或执行脚本。</small></>:<Button icon={Play} tone="solid" disabled={!steps.length} onClick={()=>{setError('');setEvents({});setOpen(true);}}>运行流程</Button>}
  <Modal open={open} title={item.title||'运行流程'} onClose={()=>{if(!running)setOpen(false);}}>
   <div className="workflow-confirm"><p>当前实例：{selected()?.name||'尚未选择'}</p><ol>{normalizeWorkflow(item.steps).map((action,index)=><li key={action} data-status={events[index]?.status||''}>{events[index]?.status==='done'?<Check size={17}/>:<span>{index+1}</span>}<strong>{name(action)}</strong><small>{events[index]?.status==='running'?'正在执行':events[index]?.status==='failed'?'未完成':''}</small></li>)}</ol>{error&&<p className="workflow-error" role="alert">{error}</p>}<div className="workflow-confirm-actions">{running?<Button onClick={()=>control.current?.abort()}>停止后续步骤</Button>:<><Button onClick={()=>setOpen(false)}>取消</Button><Button tone="solid" onClick={run}>确认运行</Button></>}</div></div>
  </Modal>
 </div>;
}
