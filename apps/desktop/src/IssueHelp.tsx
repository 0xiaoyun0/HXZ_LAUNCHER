import {DetailDialog} from './ui';
import {useState,type ReactNode} from 'react';
import {useSnapshot} from 'valtio';
import {useNavigate,useLocation} from 'react-router-dom';
import {Copy} from 'lucide-react';
import {diagnosticSummary,supportAdvice} from '../../../packages/engine/core/player-errors.mjs';
import {version} from '../../../package.json';
import {state,ui} from './model';

export function IssueHelp({issue,details,children}:{issue:any;details?:string;children?:ReactNode}){
  const {system}=useSnapshot(state),navigate=useNavigate(),location=useLocation();
  const [copied,setCopied]=useState(''),[manual,setManual]=useState(false);
  const summary=diagnosticSummary(issue,version,system.arch||system.architecture);
  const share=issue.owner!=='player';
  async function copy(){
    try{await navigator.clipboard.writeText(summary);setCopied('已复制脱敏摘要');}
    catch{setManual(true);setCopied('请选择下方摘要并复制');}
  }
  return <section className="issue-help" role="alert">
    <h3>{issue.title}</h3><p className="issue-next">{issue.message}</p>{issue.code==='unknown'&&<small>{supportAdvice[issue.owner as keyof typeof supportAdvice]}</small>}
    <div className="actions">{children}{share&&<button className="small-action" onClick={copy}><Copy size={14}/> {issue.owner==='ai'?'复制排查摘要（可用于 AI）':'复制给管理员的摘要'}</button>}{share&&location.pathname!=='/support'&&<button className="small-action" onClick={()=>{ui.issueOpen=false;ui.tasks=false;ui.dialog='';navigate('/support',{state:{summary}});}}>联系管理员</button>}</div>
    {copied&&<small role="status">{copied}</small>}{manual&&<textarea aria-label="脱敏摘要" readOnly value={summary} onFocus={e=>e.currentTarget.select()}/>}
    {details&&<DetailDialog title="查看本机技术详情"><pre>{details}</pre></DetailDialog>}
  </section>;
}
