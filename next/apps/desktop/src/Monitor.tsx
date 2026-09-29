import {useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw,Activity} from 'lucide-react';
import {desktop,invoke} from './model';
import {Button,Modal,Empty} from './ui';
const source='http://uptime.hxzmc.top/status/hxz';
function beatTime(time:any){if(!time)return 0;return Date.parse(time.includes('T')?time:time.replace(' ','T')+'Z');}
function signal(m:any,failed:boolean){if(failed||!beatTime(m.time)||Date.now()-beatTime(m.time)>300000)return {name:'待确认',className:'unknown'};return m.status===1?{name:'正常',className:'up'}:m.status===0?{name:'异常',className:'down'}:m.status===3?{name:'维护',className:'maintenance'}:{name:'待确认',className:'unknown'};}
export function ServerMonitor(){
  const [data,setData]=useState<any>(null),[loading,setLoading]=useState(false),[open,setOpen]=useState(false),alive=useRef(true),pending=useRef(false);
  const load=async()=>{if(pending.current)return;pending.current=true;setLoading(true);try{const value=await invoke('monitor.status');if(alive.current)setData(value);}catch(e:any){if(alive.current)setData((v:any)=>({...v,error:e.message}));}finally{pending.current=false;if(alive.current)setLoading(false);}};
  useEffect(()=>{alive.current=true;if(desktop)void load();const refresh=()=>{if(!document.hidden&&desktop)void load();};const timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);return()=>{alive.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[]);
  const groups=data?.groups||[],monitors=groups.flatMap((g:any)=>g.monitors),ok=monitors.filter((m:any)=>signal(m,!!data.error).className==='up').length;
  const row=(m:any)=>{const s=signal(m,!!data.error);return <div key={m.id} className="monitor-row"><span><i className={s.className}/>{m.name}</span><b className={s.className}>{s.name}</b></div>;};
  return <><div className="monitor-summary"><span><Activity size={18}/>{monitors.length?`${ok} / ${monitors.length} 项正常`:desktop?'正在获取监控':'桌面版连接实时监控'}</span><button onClick={()=>setOpen(true)}>详情 →</button></div>
    {data?.error&&<p className="monitor-warning">{data.error}{monitors.length?' · 显示上次记录':''}</p>}
    <div className="monitor-mini">{monitors.slice(0,4).map(row)}</div>
    <Modal open={open} onClose={()=>setOpen(false)} title="服务器监控" wide><div className="monitor-tools"><p>沿用监控后台的分组与名称</p><Button icon={RefreshCw} disabled={loading} onClick={load}>刷新</Button><Button icon={ExternalLink} onClick={()=>invoke('external.open',{url:source})}>监控站</Button></div>
      {data?.error&&<p className="inline-error">{data.error}，暂不能确认实时状态。</p>}
      {groups.length?groups.map((g:any)=><section className="monitor-group" key={g.name}><h3>{g.name}</h3>{g.monitors.map((m:any)=>{const s=signal(m,!!data.error);return <div className="monitor-detail-row" key={m.id}>{row(m)}<small>{m.uptime24==null?'暂无可用率':`24 小时可用率 ${(m.uptime24*100).toFixed(2)}%`}</small><small>{m.time?new Date(beatTime(m.time)).toLocaleTimeString('zh-CN'):'无近期记录'}</small></div>;})}</section>):<Empty icon={Activity} title="暂未取得监控数据"/>}
      <small>最近获取：{data?.fetchedAt?new Date(data.fetchedAt).toLocaleString('zh-CN'):'尚未获取'} · 状态来自监控探测，不代表玩家网络延迟。</small>
    </Modal></>;
}
