import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import * as Dialog from '@radix-ui/react-dialog';
import {X,Search,Download,Check,LoaderCircle,AlertCircle,Clock3} from 'lucide-react';
import {ui,task,invoke,bytes} from './model';
import {Button,IconButton,date} from './ui';
import {progressPercent} from '../../../packages/engine/core/task-progress.mjs';

const duration=(ms:number)=>{const s=Math.max(0,Math.floor(ms/1000));return s>=60?`${Math.floor(s/60)} 分 ${s%60} 秒`:`${s} 秒`;};
const count=(t:any)=>t.unit==='bytes'?`${bytes(t.completed)} / ${bytes(t.total)}`:`${t.completed.toLocaleString()} / ${t.total.toLocaleString()} ${t.unit}`;
export function TaskDrawer(){
 const u=useSnapshot(ui),t=useSnapshot(task);
 const [query,setQuery]=useState(''),[errors,setErrors]=useState(false),[jobs,setJobs]=useState<any[]>([]),[now,setNow]=useState(Date.now());
 useEffect(()=>{if(u.tasks&&window.launcher)invoke('install.list').then(setJobs).catch(()=>{});},[u.tasks,t.busy]);
 useEffect(()=>{if(!u.tasks||!t.busy)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[u.tasks,t.busy]);
 const matches=(v:string)=>v.toLowerCase().includes(query.toLowerCase()),logs=t.logs.filter((line:string)=>matches(line)&&(!errors||/error|exception|failed|失败|错误|异常/i.test(line)));
 const percent=progressPercent(t),idle=Math.max(0,now-t.changed),speed=t.busy&&now-t.sampled<4000?t.speed:0;
 return <Dialog.Root open={u.tasks} modal={false} onOpenChange={v=>ui.tasks=v}><Dialog.Portal><Dialog.Content className="task-drawer" aria-describedby={undefined}>
  <header><div><span className="eyebrow">任务中心</span><Dialog.Title>安装进度与日志</Dialog.Title></div><IconButton icon={X} label="收起任务" onClick={()=>ui.tasks=false}/></header>
  <div className="task-scroll">
   <section className="task-live-card"><div className="task-stage-heading"><span>{t.busy?'当前步骤':t.failed?'任务未完成':t.started?'任务已结束':'等待任务'}</span><b>{percent!==null?`${percent.toFixed(2)}%`:t.busy?'处理中':'—'}</b></div><h3>{t.phase}</h3>
    {(t.busy||percent!==null)&&<progress aria-label="当前步骤进度" value={percent!==null?t.completed:undefined} max={t.total||1}/>}
    <div className="task-count">{percent!==null?count(t):t.busy?'此步骤未提供总量，完成后继续下一步':'开始安装或启动游戏后查看进度'}</div>
    <div className="task-stats"><div><small>下载速度</small><strong>{bytes(speed)}/s</strong></div><div><small>本次接收</small><strong>{bytes(t.traffic)}</strong></div><div><small>已用时间</small><strong>{t.started?duration((t.ended||now)-t.started):'—'}</strong></div></div>
    {t.detail&&<p className="task-source" title={t.detail}>{t.detail}</p>}
    {t.busy&&idle>=15000&&<p className="task-waiting">已 {duration(idle)} 未收到进度变化，任务仍在运行。展开文件和日志可查看当前处理位置。</p>}
   </section>
   {t.failure&&<div className="error-box">{t.failure}</div>}
   {jobs.map(j=><div className="recovery" key={j.id}><strong>{j.id}</strong><small>安装尚未完成 · 已校验的文件可继续使用</small><div><Button onClick={()=>invoke('install.resume',{id:j.id})} disabled={t.busy}>继续安装</Button><Button disabled={t.busy} onClick={()=>{ui.instance=j.id;ui.dialog='discard';}}>清理</Button></div></div>)}
   <div className="search"><Search size={17}/><input placeholder="查找步骤、文件或错误" value={query} onChange={e=>setQuery(e.target.value)}/></div>
   <details className="task-section" open><summary>执行步骤 · {t.steps.filter((v:any)=>v.status==='done').length} 已完成</summary><ol className="task-stage-list">{t.steps.filter((v:any)=>matches(v.phase)).map((v:any,i:number)=>{const pct=progressPercent(v),Icon=v.status==='done'?Check:v.status==='failed'?AlertCircle:v.status==='cancelled'?Clock3:LoaderCircle;return <li key={v.time+'-'+i} data-status={v.status}><Icon size={17} className={v.status==='running'?'spin':''}/><div><div className="task-step-title"><strong>{v.phase}</strong><b>{v.status==='failed'?'失败':v.status==='cancelled'?'已取消':pct!==null?`${pct.toFixed(2)}%`:v.status==='done'?'完成':'处理中'}</b></div>{v.total>0&&<progress aria-label={v.phase+'进度'} value={v.completed} max={v.total}/>}<small>{v.total>0&&<span>{count(v)}</span>}<span>{duration((v.ended||now)-v.time)}</span><span>{date(v.time)}</span></small></div></li>;})}</ol></details>
   {t.activeFiles.length>0&&<details className="task-section" open><summary>正在处理的文件 · 显示最多 8 项</summary><ul className="task-file-list">{t.activeFiles.filter(matches).map((file:string)=><li key={file} title={file}>{file}</li>)}</ul></details>}
   <details className="task-section" open><summary>运行日志 · {logs.length} 行</summary><label className="task-error-filter"><input type="checkbox" checked={errors} onChange={e=>setErrors(e.target.checked)}/>仅显示错误</label><pre className="log-output">{logs.join('\n')||'暂无匹配的日志'}</pre></details>
  </div><footer><Button icon={Download} onClick={()=>invoke('logs.export')}>导出日志</Button>{t.busy&&<Button tone="danger" onClick={()=>invoke('task.cancel')}>取消任务</Button>}</footer>
 </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
