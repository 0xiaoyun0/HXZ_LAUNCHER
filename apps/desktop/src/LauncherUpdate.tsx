import {useEffect,useState,type ReactNode} from 'react';
import {Download,RefreshCw} from 'lucide-react';
import {Button} from './ui';
import {invoke,perform} from './model';
import {PreferenceSwitch} from './launcher/ChoiceControls';
import {TransferMeter} from './launcher/micro/Feedback';
import {SettingsSection} from './launcher/SettingsSection';
import {version} from '../../../package.json';

export function LauncherUpdate({enabled,onChange,links}:{
  enabled:boolean;onChange:(value:boolean)=>unknown;links?:ReactNode;
}){
  const [status,setStatus]=useState<any>({phase:'正在读取版本信息'}),[busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!window.launcher){setStatus({phase:'界面预览'});return;}
    void invoke('app-update.status').then(setStatus).catch(e=>setStatus({phase:e.message}));
    return window.launcher.subscribe(event=>{if(event.type==='app-update')setStatus(event);});
  },[]);
  function act(action:string){
    return perform(async()=>{
      setBusy(true);
      try{setStatus(await invoke(action));}finally{setBusy(false);}
    });
  }
  return <SettingsSection title="启动器版本" detail={version+' · '+(status.distribution==='setup'?'本机安装版':'便携版')}>
    {status.installed&&<PreferenceSwitch name="自动检查启动器更新" caption="启动后检查签名版本清单，由你决定何时下载和安装。"
      checked={enabled} change={async value=>{await onChange(value);}}/>}
    <div className="settings-content">
      <p className="settings-description" role="status">{status.installed?status.phase:'可使用下一版完整包升级。账号、设置和游玩记录保存在独立的用户目录。'}</p>
      {status.percent>0&&!status.ready&&<TransferMeter label="启动器下载进度" value={status.percent} running={busy}/>}
      {(status.installed||links)&&<div className="settings-actions">
        {status.installed&&<Button icon={RefreshCw} disabled={busy} onClick={()=>act('app-update.check')}>检查更新</Button>}
        {status.available&&!status.ready&&<Button icon={Download} disabled={busy} onClick={()=>act('app-update.download')}>下载更新</Button>}
        {status.ready&&<Button tone="solid" onClick={()=>act('app-update.install')}>重启并安装</Button>}
        {links}
      </div>}
    </div>
  </SettingsSection>;
}
