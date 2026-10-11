import {useEffect,useState} from 'react';
import './hxzup-cards.css';
import {useSnapshot} from 'valtio';import {Download,Layers,Check,AlertCircle,Clock3,HardDriveDownload} from 'lucide-react';import {ui,task,state,bytes} from './model';import {Modal,Button} from './ui';import {progressPercent} from '../../../packages/engine/core/task-progress.mjs';
export function HxzUpdate(){
 const u=useSnapshot(ui),t=useSnapshot(task),s=useSnapshot(state),pct=progressPercent(t),open=!!u.hxzup?.open&&!u.hxzup?.hidden&&!u.decision,[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!open||!t.busy)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[open,t.busy]);
 const hide=()=>ui.hxzup={...ui.hxzup,hidden:true},Icon=t.failed?AlertCircle:t.busy?Download:Check,elapsed=t.started?Math.max(0,Math.floor(((t.ended||now)-t.started)/1000)):0;
 return <Modal open={open} title="HXZ UP · 整合包更新" onClose={hide} wide><div className="hxzup-cards">
  <section className={'hxzup-summary '+(t.failed?'failed':'')}><div className="hxzup-symbol"><Icon size={26}/></div><div><span className="muted">{s.instances.find((i:any)=>i.id===u.hxzup?.id)?.name||u.hxzup?.id}</span><h3>{t.phase}</h3></div><strong>{pct===null?(t.busy?'进行中':t.failed?'未完成':'已完成'):pct.toFixed(1)+'%'}</strong><progress aria-label="HXZ UP 当前步骤" value={pct===null?undefined:t.completed} max={t.total||1}/><span className="hxzup-measure">{t.total>0?(t.unit==='bytes'?bytes(t.completed)+' / '+bytes(t.total):t.completed+' / '+t.total+' '+t.unit):'正在等待当前步骤的进度数据'}<small>当前步骤</small></span>{t.detail&&<p className="hxzup-file">{t.detail}</p>}</section>
  <section className="hxzup-metric"><HardDriveDownload size={20}/><span>已接收</span><strong>{bytes(t.traffic||t.received)}</strong><small>{t.busy&&t.speed>0?bytes(t.speed)+'/s':'等待传输或正在校验'}</small></section>
  <section className="hxzup-metric"><Clock3 size={20}/><span>本次用时</span><strong>{elapsed>=60?Math.floor(elapsed/60)+' 分 ':''}{elapsed%60} 秒</strong><small>关闭此窗口后任务继续</small></section>
  <section className="hxzup-record"><details className="technical-log"><summary>连接与校验记录</summary><pre>{t.logs.slice(-30).join('\n')||'暂无记录'}</pre></details></section>
 </div><footer className="modal-actions"><Button icon={Layers} onClick={()=>{hide();ui.tasks=true;}}>查看任务详情</Button><Button tone="solid" onClick={hide}>{t.busy?'后台继续':'完成'}</Button></footer></Modal>;
}
