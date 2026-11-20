import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {DOWNLOAD_CONCURRENCY,DOWNLOAD_SPEED_STEPS} from '../../../../packages/engine/core/download-settings.mjs';
import {invoke,notify,perform,reload,saveSettings,state} from '../model';
import {RunningGames} from '../RunningGames';
import {HxzreRuntime} from '../HxzreRuntime';

export function SettingSwitch({field,label}:{field:string;label:string}){
  const {settings}=useSnapshot(state);
  return <label className="setting-line"><span>{label}</span><input type="checkbox" checked={!!settings[field]} onChange={e=>{const value=e.target.checked;void perform(()=>saveSettings({[field]:value}));}}/></label>;
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
  return <><label className="setting-line"><strong>默认下载来源</strong><select value={settings.downloadMode||'official'} onChange={e=>{const v=e.target.value;void perform(()=>saveSettings({downloadMode:v}));}}><option value="official">官方优先，失败后切换镜像</option><option value="domestic">国内镜像优先</option></select></label>
    <label className="setting-line"><strong>下载并发数</strong><select value={settings.downloadConcurrency} onChange={e=>{const v=Number(e.target.value);void perform(()=>saveSettings({downloadConcurrency:v}));}}>{DOWNLOAD_CONCURRENCY.map((v:number)=><option key={v}>{v}</option>)}</select></label>
    <label className="setting-line"><span><strong>下载总限速</strong><small>游戏文件及内置整合包更新共用，单位为 MiB/s。</small></span><select aria-label="下载总限速" value={settings.downloadSpeedMBps||0} onChange={e=>{const v=Number(e.target.value);void perform(()=>saveSettings({downloadSpeedMBps:v}));}}>{[0,...DOWNLOAD_SPEED_STEPS.filter((v:number)=>v>0)].map(v=><option key={v} value={v}>{v?v+' MiB/s':'不限速'}</option>)}</select></label></>;
}

export function RuntimePreferences(){
  return <><details className="preference-section"><summary>游戏运行与兼容</summary>
    <SettingSwitch field="promptJavaDownload" label="缺少适配 Java 时询问下载"/><SettingSwitch field="chinesePaths" label="中文路径兼容"/>
    <SettingSwitch field="keepLauncherAvailable" label="游戏运行时继续操作启动器"/><SettingSwitch field="gameSleep" label="游戏时让启动器休眠"/>
    <SettingSwitch field="memoryOptimization" label="休眠时释放界面缓存"/><button className="small-action" onClick={()=>perform(async()=>{await invoke('memory.compact');notify('已释放可回收的界面缓存');})}>立即释放界面缓存</button></details><RunningGames/></>;
}

export function NetworkPreferences(){
  const {settings}=useSnapshot(state);
  const [url,setUrl]=useState(String(settings.communityUrl));
  useEffect(()=>setUrl(String(settings.communityUrl)),[settings.communityUrl]);
  async function save(value:string){await saveSettings({communityUrl:value});notify('社区地址已保存');}
  return <section className="preference-section"><h2>联机连接</h2>
    <form className="setting-line" onSubmit={e=>{e.preventDefault();void perform(()=>save(url.trim()));}}><label>社区服务地址<input type="url" aria-label="社区服务地址" required value={url} onChange={e=>setUrl(e.target.value)}/></label><button className="small-action" disabled={!url.trim()||url===settings.communityUrl}>保存地址</button><button type="button" className="small-action" onClick={()=>perform(()=>save('https://qqbot.hxzmc.top'))}>恢复官方地址</button></form><SettingSwitch field="communityRelayEnabled" label="允许社区中继作为备用通道"/>
    <HxzreRuntime enabled={settings.fecEnabled!==false} onChange={v=>void perform(()=>saveSettings({fecEnabled:v}))}/></section>;
}
