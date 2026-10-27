import {useEffect,useState} from 'react';
import {RefreshCw,ShieldCheck,AlertTriangle} from 'lucide-react';
import {invoke,perform} from './model';
import {Button,Toggle} from './ui';

export function HxzreRuntime({enabled,onChange}:{enabled:boolean;onChange:(value:boolean)=>void}){
 const [status,setStatus]=useState<any>({phase:'正在读取内嵌模块'});
 const read=async()=>{if(!window.launcher){setStatus({phase:'界面预览'});return;}try{setStatus(await invoke('hxzre.status'));}catch(error:any){setStatus({embedded:false,available:false,verified:false,error:error.message});}};
 useEffect(()=>{void read();},[]);
 const healthy=status.embedded&&status.verified;
 return <div className="setting-group"><h3>HXZRE 运行时</h3><p>HXZRE 与 HXZUP 同级，由启动器携带并校验；它负责在已配置的服务器上承载 FEC 传输。模块本身不属于联机大厅功能。</p><Toggle label="允许启动器使用 hxzre FEC" description="关闭后所有服务器直接使用原始连接；开启后仅在 Windows x64、服务端已配置 origin 与令牌时接管。" checked={enabled} onChange={onChange}/><div className="runtime-module-status" role="status">{healthy?<ShieldCheck size={18}/>:<AlertTriangle size={18}/>}<span><strong>{status.phase|| (healthy?'HXZRE 已内嵌并通过校验':'HXZRE 未就绪')}</strong><small>{status.embedded?`${status.id||'mc-tcp-fec'} ${status.version||''} · ${status.available?'当前平台可用':'当前平台自动回退原连接'}`:(status.error||'未找到内嵌模块')}</small></span></div><Button icon={RefreshCw} onClick={()=>perform(read)}>刷新模块状态</Button></div>;
}
