import {useEffect,useState} from 'react';
import {Activity,RefreshCw,Square} from 'lucide-react';
import {PanelGroup} from './CardBoard';
import {Button} from './ui';
import {invoke} from './model';
import './download-sources.css';

const labels:Record<string,string>={unprobed:'尚未检测',probing:'正在检测',reachable:'样本可达',error:'本次失败',cancelled:'已取消'};
export function DownloadSources(){
  const [nodes,setNodes]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[filter,setFilter]=useState('all');
  useEffect(()=>{let live=true;const refresh=()=>invoke('download.sources').then(value=>{if(live)setNodes(value);}).catch(e=>{if(live)setError(e.message);});void refresh();const timer=setInterval(refresh,2000);return()=>{live=false;clearInterval(timer);};},[]);
  const probe=async(ids?:string[])=>{setError('');setBusy(true);try{setNodes(await invoke('download.probe',{ids}));}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  const files=nodes.filter(node=>node.purpose==='file'),metadata=nodes.length-files.length;
  const visible=nodes.filter(node=>filter==='all'||(filter==='metadata'?node.purpose==='metadata':node.purpose==='file'&&(filter==='files'||(filter==='official'?node.type.startsWith('官方'):node.type.startsWith('镜像')))));
  return <PanelGroup id="download-nodes" names={['下载节点状态']} widths={[12]}><section data-card="nodes" className="download-sources">
    <div className="download-source-toolbar"><div><p>默认先连接官方，故障后按文件类型依次切换同一文件的备用来源。</p><p className="muted">{files.length} 个文件来源端点，另有 {metadata} 个元数据端点。它们分属不同用途，不能全部用于同一个文件；地区镜像可能共享运营方。</p><p className="muted">检测使用公共样本，延迟是收到响应头的时间。单个样本可达不代表全部文件可用，未检测节点仍可作为备用。</p></div><div className="actions"><Button icon={RefreshCw} disabled={busy} onClick={()=>probe()}>检测节点</Button>{busy&&<Button icon={Square} onClick={()=>invoke('download.probe.cancel')}>停止检测</Button>}</div></div>
    <div className="download-source-filters" aria-label="来源分类">{[['all','全部'],['files','文件来源'],['official','官方文件'],['mirror','镜像文件'],['metadata','元数据']].map(([value,label])=><Button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</Button>)}</div>
    {error&&<p role="alert" className="inline-error">{error}</p>}
    <div className="download-source-grid">{visible.map(node=><article className="download-source-node" key={node.id} data-state={node.state}><header><Activity size={18}/><strong>{node.name}</strong><span className="pill">{node.type}</span></header><small>{node.purpose==='metadata'?'元数据 · 不计入文件来源':'文件来源'}</small><p className="muted">{node.scope}</p><small className="download-source-host">{node.host}</small><div className="download-source-result"><span>{labels[node.state]||node.state}</span><b>{node.latencyMs==null?'—':`${node.latencyMs} ms`}</b></div>{node.reason&&<p className="download-source-reason">{node.reason}</p>}<footer><small>{node.checkedAt?`${node.checkKind==='transfer'?'最近文件请求':'样本检测'} · ${new Date(node.checkedAt).toLocaleTimeString()}`:'点击检测以查看当前网络结果'}</small><Button disabled={busy} onClick={()=>probe([node.id])}>检测</Button></footer></article>)}</div>
  </section></PanelGroup>;
}
