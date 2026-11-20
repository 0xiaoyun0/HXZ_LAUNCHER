import {useEffect,useId,useState} from 'react';
import {useSnapshot} from 'valtio';
import {DOWNLOAD_CONCURRENCY,DOWNLOAD_SPEED_STEPS} from '../../../../packages/engine/core/download-settings.mjs';
import {invoke,notify,perform,reload,saveSettings,state} from '../model';
import {ChoiceGroup,StepChoice,PreferenceSwitch} from './ChoiceControls';
import {RunningGames} from '../RunningGames';
import {HxzreRuntime} from '../HxzreRuntime';
import {SettingsSection} from './SettingsSection';

export function SettingSwitch({field,label}:{field:string;label:string}){
  const {settings}=useSnapshot(state);
  return <PreferenceSwitch name={label} checked={!!settings[field]} change={value=>saveSettings({[field]:value})}/>;
}

export function RemovedInstances(){
  const [items,setItems]=useState<{id:string}[]|null>(null),[busy,setBusy]=useState(false);
  const read=async()=>setItems(await invoke('instance.deleted'));
  async function act(id?:string){
    setBusy(true);
    try{
      if(id){await invoke('instance.restore',{id});await reload();notify('已恢复到游戏库');}
      await read();
    }finally{setBusy(false);}
  }
  return <section className="preference-section"><h2>已移除实例</h2>
    <div className="setting-line"><span>找回从当前游戏库移除、仍保留在磁盘上的实例。</span><button className="small-action" disabled={busy} onClick={()=>perform(()=>act())}>查看已移除实例</button></div>
    {items?.map(item=><div className="setting-line" key={item.id}><strong>{item.id}</strong><button className="small-action" disabled={busy} onClick={()=>perform(()=>act(item.id))}>恢复到游戏库</button></div>)}
    {items?.length===0&&<p className="muted" role="status">当前目录没有可恢复的实例。</p>}
  </section>;
}

export function DownloadPolicy(){
  const {settings}=useSnapshot(state);
  return <><div className="setting-line"><span><strong>默认下载来源</strong><small>官方节点失败后会自动尝试镜像。</small></span><ChoiceGroup label="默认下载来源" value={settings.downloadMode||'official'} options={[['official','官方优先'],['domestic','国内镜像优先']]} onChange={downloadMode=>perform(()=>saveSettings({downloadMode}))}/></div>
    <div className="setting-line"><strong>下载并发数</strong><ChoiceGroup label="下载并发数" value={settings.downloadConcurrency} options={DOWNLOAD_CONCURRENCY.map((n:number)=>[n,String(n)] as const)} onChange={v=>perform(()=>saveSettings({downloadConcurrency:Number(v)}))}/></div>
    <div className="setting-line"><span><strong>下载总限速</strong><small>游戏文件与内置整合包更新共用这个上限。</small></span><StepChoice label="下载总限速" value={settings.downloadSpeedMBps||0} options={DOWNLOAD_SPEED_STEPS.map((n:number)=>[n,n?n+' MiB/s':'不限速'] as const)} onChange={v=>saveSettings({downloadSpeedMBps:Number(v)})}/></div></>;
}

export function RuntimePreferences(){
  return <><section className="preference-section"><h2>游戏运行与兼容</h2><div className="module-options">
    <SettingSwitch field="promptJavaDownload" label="缺少适配 Java 时询问下载"/><SettingSwitch field="chinesePaths" label="中文路径兼容"/>
    <SettingSwitch field="keepLauncherAvailable" label="游戏运行时继续操作启动器"/><SettingSwitch field="gameSleep" label="游戏时让启动器休眠"/>
    <SettingSwitch field="memoryOptimization" label="休眠时释放界面缓存"/></div><button className="small-action" onClick={()=>perform(async()=>{await invoke('memory.compact');notify('已释放可回收的界面缓存');})}>立即释放界面缓存</button></section><RunningGames/></>;
}

export function NetworkPreferences(){
  const {settings}=useSnapshot(state);
  const addressId=useId();
  const [url,setUrl]=useState(String(settings.communityUrl));
  useEffect(()=>setUrl(String(settings.communityUrl)),[settings.communityUrl]);
  async function save(value:string){await saveSettings({communityUrl:value});setUrl(String(state.settings.communityUrl));notify('社区地址已保存');}
  return <>
    <SettingsSection title="联机连接">
      <form className="setting-line settings-field" onSubmit={e=>{e.preventDefault();void perform(()=>save(url.trim()));}}>
        <label htmlFor={addressId}>社区服务地址</label>
        <div className="settings-control-line">
          <input id={addressId} type="url" required value={url} onChange={e=>setUrl(e.target.value)}/>
          <div className="settings-actions">
            <button className="small-action" disabled={!url.trim()||url.trim()===settings.communityUrl}>保存地址</button>
            <button type="button" className="small-action" onClick={()=>perform(()=>save('https://qqbot.hxzmc.top'))}>恢复官方地址</button>
          </div>
        </div>
      </form>
      <SettingSwitch field="communityRelayEnabled" label="允许社区中继作为备用通道"/>
    </SettingsSection>
    <HxzreRuntime enabled={settings.fecEnabled!==false} onChange={v=>saveSettings({fecEnabled:v})}/>
  </>;
}
