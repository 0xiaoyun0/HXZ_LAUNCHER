import {useEffect,useState} from 'react';
import {Download,RefreshCw} from 'lucide-react';
import {Button,Toggle} from './ui';
import {invoke,perform} from './model';
export function LauncherUpdate({enabled,onChange}:{enabled:boolean,onChange:(v:boolean)=>void}){
 const [status,setStatus]=useState<any>({phase:'正在读取版本信息'}),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!window.launcher){setStatus({phase:'界面预览'});return;}void invoke('app-update.status').then(setStatus).catch(e=>setStatus({phase:e.message}));return window.launcher.subscribe(event=>{if(event.type==='app-update')setStatus(event);});},[]);
 const act=(action:string)=>perform(async()=>{setBusy(true);try{setStatus(await invoke(action));}finally{setBusy(false);}});
 return <div className="setting-group"><h3>启动器版本</h3><p>0.6.4 · {status.installed?'安装版':'便携版'}</p>{status.installed?<><Toggle label="自动检查并安装启动器更新" checked={enabled} onChange={onChange} description="从 GitHub 与镜像获取签名更新，任务结束后安装"/><p className="muted" role="status">{status.phase}</p>{status.percent>0&&!status.ready&&<progress style={{width:'100%'}} max={100} value={status.percent}/>}<div className="toolbar"><Button icon={RefreshCw} disabled={busy} onClick={()=>act('app-update.check')}>检查更新</Button>{status.available&&!status.ready&&<Button icon={Download} disabled={busy} onClick={()=>act('app-update.download')}>下载更新</Button>}{status.ready&&<Button tone="solid" onClick={()=>act('app-update.install')}>重启并安装</Button>}</div></>:<p className="muted">便携版请下载完整包升级并保留 profile；游戏与 HXZ UP 更新正常可用。</p>}</div>;
}
