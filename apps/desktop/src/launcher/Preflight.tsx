import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ArrowLeft,CheckCircle2,CircleHelp,Info,RefreshCw,TriangleAlert} from 'lucide-react';
import {account,chooseRoot,invoke,perform,selected,state,ui} from '../model';
type Row={id:string;title:string;status:'ok'|'needs'|'info'|'unknown';detail:string;action?:string};
const symbols={ok:CheckCircle2,needs:TriangleAlert,info:Info,unknown:CircleHelp};
export function Preflight(){
 const s=useSnapshot(state),[query]=useSearchParams(),navigate=useNavigate(),id=query.get('id')||selected(s)?.id,role=account(s);
 const [result,setResult]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),generation=useRef(0);
 const run=useCallback(async()=>{const token=++generation.current;setError('');setResult(null);if(!id){setBusy(false);return;}setBusy(true);try{const v=await invoke('instance.preflight',{id});if(token===generation.current)setResult(v);}catch(e:any){if(token===generation.current)setError(e.message);}finally{if(token===generation.current)setBusy(false);}},[id,s.settings.gameRoot,s.settings.javaPath,role?.id,role?.uuid]);
 useEffect(()=>{void run();return()=>{generation.current++;};},[run]);
 const labels:Record<string,string>={memory:'内存设置',directory:'选择目录',java:'Java 设置',account:role?.authenticated?'管理角色':'登录账号',library:'查看实例',install:'查看安装选项'};
 const act=(key:string)=>perform(async()=>{if(key==='directory'){if(await chooseRoot())await run();}else if(key==='account'){if(role?.authenticated)navigate('/account');else ui.dialog='account';}else if(key==='java'||key==='memory')navigate('/settings?tab=game');else navigate('/library?q='+encodeURIComponent(id||''));});
 return <section className="launch-page"><Link className="quiet-link" to="/">〈 返回首页</Link><header className="launch-title"><div><h1>启动前检查</h1><p>{result?.name||id||'先在游戏库选择实例'}</p></div><button className="small-action" onClick={run} disabled={busy||!id}><RefreshCw size={15}/>重新检查</button></header>
 {busy&&<p role="status">正在读取本机文件并匹配 Java…</p>}{error&&<p className="inline-error" role="alert">{error}</p>}
 {result&&<div className="check-list">{result.checks.map((c:Row)=>{const Icon=symbols[c.status];return <div key={c.id} className={'check-row '+c.status}><Icon size={19}/><div><strong>{c.title}</strong><p>{c.detail}</p></div>{c.action&&c.status!=='ok'&&c.status!=='unknown'&&<button className="small-action" onClick={()=>act(c.action!)}>{labels[c.action]}</button>}</div>;})}</div>}
 </section>;
}
