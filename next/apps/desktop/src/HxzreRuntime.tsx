import {useEffect,useState} from 'react';
import {RefreshCw,ShieldCheck,AlertTriangle} from 'lucide-react';
import {invoke,perform} from './model';
import {Button,Toggle} from './ui';

export function HxzreRuntime({enabled,onChange,cardTitle}:{enabled:boolean;onChange:(value:boolean)=>void;cardTitle?:string}){
 const [status,setStatus]=useState<any>({phase:'等待检查'});
 const read=async()=>{if(!window.launcher){setStatus({embedded:false,available:false,verified:false,error:'请在桌面启动器中检查 HXZRE 状态'});return;}try{setStatus(await invoke('hxzre.status'));}catch(error:any){setStatus({embedded:false,available:false,verified:false,error:error.message});}};
 useEffect(()=>{void read();},[]);
 const healthy=status.embedded&&status.verified;
 return <div className="setting-group runtime-module-group" data-card-title={cardTitle||'HXZRE 运行时'}><h3>HXZRE 运行时</h3><p>HXZRE 是上传链路的可选前向纠错模块：服务器配置后，它会在丢包时补发冗余数据，帮助保持联机稳定。是否使用由你决定。</p><Toggle label="启用 HXZRE 前向纠错补偿" description="关闭后使用原始连接；开启后仅在 Windows x64 且服务器提供 HXZRE 服务时生效。" checked={enabled} onChange={onChange}/><div className="runtime-module-status" role="status">{healthy?<ShieldCheck size={18}/>:<AlertTriangle size={18}/>}<span><strong>{healthy?'HXZRE 已内嵌并通过校验':status.embedded?'HXZRE 已内嵌，等待服务器配置':'HXZRE 状态暂不可用'}</strong><small>{status.embedded?`${status.id||'hxzre'} ${status.version||''} · ${status.available?'当前平台可用':'当前平台将使用原始连接'}`:(status.error||'请点击刷新状态')}</small></span></div><Button icon={RefreshCw} onClick={()=>perform(read)}>刷新 HXZRE 状态</Button></div>;
}
