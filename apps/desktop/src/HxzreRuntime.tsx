import {useEffect,useState} from 'react';
import {AlertTriangle,Network,RefreshCw,ShieldCheck} from 'lucide-react';
import {invoke} from './model';
import {Button} from './ui';
import {PreferenceSwitch} from './launcher/ChoiceControls';
import {SettingsSection} from './launcher/SettingsSection';

type ModuleStatus={embedded?:boolean;verified?:boolean;available?:boolean;version?:string;error?:string};
type ConnectionTest={id:string;name:string;ok:boolean;detail:string;latency?:number};

export function HxzreRuntime({enabled,onChange,cardTitle}:{
  enabled:boolean;onChange:(value:boolean)=>unknown;cardTitle?:string;
}){
  const [status,setStatus]=useState<ModuleStatus|null>(null);
  const [tests,setTests]=useState<ConnectionTest[]>([]),[testing,setTesting]=useState(false);
  async function read(){
    if(!window.launcher){setStatus({error:'请在桌面启动器中检查 HXZRE 状态'});return;}
    try{setStatus(await invoke('hxzre.status'));}
    catch(error){setStatus({error:error instanceof Error?error.message:String(error)});}
  }
  useEffect(()=>{void read();},[]);
  async function checkConnections(){
    setTesting(true);
    try{setTests((await invoke('hxzre.test')).items);}
    catch{setTests([{id:'error',name:'连接检查',ok:false,detail:'暂时无法完成检测，请稍后重试。'}]);}
    finally{setTesting(false);}
  }
  const healthy=status?.embedded&&status.verified;
  const title=!status?'正在检查本地模块…':healthy?'HXZRE 已内嵌并通过校验':status.embedded?'HXZRE 模块校验未通过':'HXZRE 状态暂不可用';
  const detail=healthy?(status.available?'当前平台可用。':'当前平台会使用常规连接。'):
    status?'可以继续使用常规连接。刷新后仍有问题，可在帮助与反馈中联系管理员。':'';
  const StatusIcon=healthy?ShieldCheck:status?AlertTriangle:RefreshCw;
  return <SettingsSection title="HXZRE 运行时" cardTitle={cardTitle} detail={status?.version}>
    <PreferenceSwitch name="启用 HXZRE 前向纠错补偿" caption="服务器支持时，补发上传途中丢失的数据，帮助保持联机稳定。"
      checked={enabled} change={async value=>{await onChange(value);}}/>
    <div className="settings-content">
      <div className="settings-status" role="status"><StatusIcon size={18}/><div><strong>{title}</strong>{detail&&<small>{detail}</small>}</div></div>
      <div className="settings-actions">
        <Button icon={RefreshCw} onClick={read}>刷新 HXZRE 状态</Button>
        <Button icon={Network} disabled={testing||!status?.available} onClick={checkConnections}>{testing?'正在验证数据传输…':'检查三个服务器的实际连接'}</Button>
      </div>
      {status?.error&&<details><summary>技术详情</summary><p>{status.error}</p></details>}
      {tests.length>0&&<ul className="settings-results" aria-label="服务器连接结果">{tests.map(item=>
        <li key={item.id} data-error={!item.ok||undefined}><strong>{item.name}</strong> {item.detail}{item.latency!=null?' · '+item.latency+' ms':''}</li>)}</ul>}
    </div>
  </SettingsSection>;
}
