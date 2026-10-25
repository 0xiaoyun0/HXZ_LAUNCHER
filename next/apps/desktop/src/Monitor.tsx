import {useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw,Activity} from 'lucide-react';
import {desktop,invoke} from './model';
import {Button,Modal,Empty} from './ui';

const source='http://uptime.hxzmc.top/status/hxz';
type Latency={id:string;state:string;ms?:number;address?:string;measuredAt?:number};
function beatTime(time:any){if(!time)return 0;return Date.parse(time.includes('T')?time:time.replace(' ','T')+'Z');}
function signal(m:any,failed:boolean){if(failed||!beatTime(m.time)||Date.now()-beatTime(m.time)>300000)return {name:'待确认',className:'unknown'};return m.status===1?{name:'正常',className:'up'}:m.status===0?{name:'异常',className:'down'}:m.status===3?{name:'维护',className:'maintenance'}:{name:'待确认',className:'unknown'};}
function LocalLatency({value,loading}:{value?:Latency;loading:boolean}){
  const names:Record<string,string>={timeout:'本机超时',unreachable:'本机不可达',dns:'本机解析失败',unknown:'未公开地址',unavailable:'暂不支持探测'};
  const label=value?.state==='ok'?`本机 ${value.ms} ms`:names[value?.state||'']||(loading?'检测中…':'待检测');
  const detail=value?.state==='unknown'?'监控未公开地址，无法测量本机延迟':value?.state==='unavailable'?'仅检测公开服务地址':`本机 TCP 连接耗时（含域名解析），不代表游戏内延迟${value?.address?' · '+value.address:''}${value?.measuredAt?' · '+new Date(value.measuredAt).toLocaleTimeString('zh-CN'):''}`;
  return <span className={'monitor-latency '+(value?.state==='ok'?'measured':'')} title={detail} aria-label={label+'，'+detail}>{label}</span>;
}

export function ServerMonitor({limit=4}:{limit?:number}={}){
  const [data,setData]=useState<any>(null),[loading,setLoading]=useState(false),[open,setOpen]=useState(false);
  const [latencies,setLatencies]=useState<Record<string,Latency>>({}),[latencyError,setLatencyError]=useState('');
  const root=useRef<HTMLDivElement>(null),reload=useRef<()=>Promise<void>>(async()=>{});
  useEffect(()=>{
    if(!desktop)return;
    let disposed=false,visible=open,busy=false,generation=0,requestId='';
    const cancel=()=>{generation++;busy=false;const id=requestId;requestId='';if(id)void invoke('monitor.cancel',{requestId:id}).catch(()=>{});if(!disposed)setLoading(false);};
    const load=async()=>{
      if(disposed||!visible||document.hidden||busy)return;
      busy=true;setLoading(true);setLatencyError('');const version=++generation;
      requestId='monitor-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
      const current=()=>!disposed&&version===generation;
      try{
        const value=await invoke('monitor.status');if(!current())return;setData(value);
        const ids=(value?.groups||[]).flatMap((group:any)=>group.monitors.map((m:any)=>String(m.id))).slice(0,32);
        if(ids.length)try{
          const result=await invoke('monitor.latency',{ids,requestId});
          if(current())setLatencies(Object.fromEntries((result.items||[]).map((item:Latency)=>[item.id,item])));
        }catch(error:any){if(current())setLatencyError('本机延迟检测暂不可用，稍后可刷新重试');}
      }catch(error:any){if(current())setData((value:any)=>({...value,error:error.message}));}
      finally{if(current()){busy=false;requestId='';setLoading(false);}}
    };
    reload.current=load;
    const visibility=()=>{if(document.hidden)cancel();else void load();};
    const observer=new IntersectionObserver(entries=>{visible=open||entries.some(e=>e.isIntersecting);if(visible)void load();else cancel();});
    if(root.current)observer.observe(root.current);
    if(open)void load();
    const timer=setInterval(()=>void load(),60000);
    document.addEventListener('visibilitychange',visibility);
    return()=>{disposed=true;cancel();observer.disconnect();clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
  },[open]);
  const groups=data?.groups||[],monitors=groups.flatMap((g:any)=>g.monitors),ok=monitors.filter((m:any)=>signal(m,!!data?.error).className==='up').length;
  const row=(m:any)=>{const s=signal(m,!!data?.error);return <div key={m.id} className="monitor-row"><span className="monitor-name"><i className={s.className}/><span>{m.name}</span></span><div className="monitor-readings"><b className={s.className}>{s.name}</b><LocalLatency value={latencies[m.id]} loading={loading}/></div></div>;};
  return <div className="service-monitor" ref={root}>
    <div className="monitor-summary"><span><Activity size={18}/>{monitors.length?`${ok} / ${monitors.length} 项正常`:data?.error?'暂未取得监控':desktop?'正在获取监控':'桌面版连接实时监控'}</span><button onClick={()=>setOpen(true)}>详情 →</button></div>
    {data?.error&&<p className="monitor-warning">{data.error}{monitors.length?' · 显示上次记录':''}</p>}
    <div className="monitor-mini">{monitors.slice(0,limit).map(row)}</div>
    {latencyError&&<p className="monitor-warning">{latencyError}</p>}
    <Modal open={open} onClose={()=>setOpen(false)} title="服务器监控" wide>
      <div className="monitor-tools"><p>服务状态与本机连接</p><Button icon={RefreshCw} disabled={loading} onClick={()=>reload.current()}>刷新</Button><Button icon={ExternalLink} onClick={()=>invoke('external.open',{url:source})}>监控站</Button></div>
      {data?.error&&<p className="inline-error">{data.error}，暂不能确认实时状态。</p>}
      {latencyError&&<p className="monitor-warning">{latencyError}</p>}
      {groups.length?groups.map((g:any)=><section className="monitor-group" key={g.name}><h3>{g.name}</h3>{g.monitors.map((m:any)=><div className="monitor-detail-row" key={m.id}>{row(m)}<small>{m.uptime24==null?'暂无可用率':`24 小时可用率 ${(m.uptime24*100).toFixed(2)}%`}</small><small>{m.time?new Date(beatTime(m.time)).toLocaleTimeString('zh-CN'):'无近期记录'}</small></div>)}</section>):<Empty icon={Activity} title="暂未取得监控数据"/>}
      <p className="monitor-explanation">本机延迟为此设备建立 TCP 连接的耗时，含域名解析；服务状态来自监控站。可见时每分钟检测，关闭页面后停止。</p>
      <small className="muted">监控记录更新：{data?.fetchedAt?new Date(data.fetchedAt).toLocaleString('zh-CN'):'尚未获取'}</small>
    </Modal>
  </div>;
}
