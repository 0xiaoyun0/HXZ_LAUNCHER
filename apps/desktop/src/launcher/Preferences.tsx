import {useSearchParams} from 'react-router-dom';
import {settingsTabs,SettingsLayout} from './SettingsLayout';
import {MemorySetting} from './MemorySetting';
import {SkinConnection} from './SkinConnection';
import {useState} from 'react';
import {useSnapshot} from 'valtio';
import {FolderOpen,ChevronRight} from 'lucide-react';
import {account,chooseRoot,invoke,notify,perform,reload,saveSettings,state,ui} from '../model';
import {LauncherUpdate} from '../LauncherUpdate';
import {Avatar} from '../ui';
export function Preferences(){
 const s=useSnapshot(state),settings=s.settings,[busy,setBusy]=useState(false);
 const action=(fn:()=>Promise<unknown>)=>perform(async()=>{setBusy(true);try{await fn();}finally{setBusy(false);}});
 const [query]=useSearchParams(),current=settingsTabs.find(tab=>tab.key===query.get('section')&&tab.key!=='extensions')?.key||'game';
 return <SettingsLayout current={current}>
 {current==='game'&&<section className="preference-section"><h2>游戏与 Java</h2>
  <div className="setting-line"><span><strong>游戏目录</strong><small>{settings.gameRoot||'尚未选择目录'}</small></span><button className="small-action" disabled={busy} onClick={()=>action(chooseRoot)}><FolderOpen size={15}/>选择目录</button></div>
  <div className="setting-line"><span><strong>Java 运行环境</strong><small>{settings.javaPath||'根据实例版本自动匹配'}</small></span>{settings.javaPath&&<button className="small-action" disabled={busy} onClick={()=>action(()=>saveSettings({javaPath:''}))}>恢复自动</button>}<button className="small-action" disabled={busy} onClick={()=>action(async()=>{const path=await invoke('java.choose');if(path)await saveSettings({javaPath:path});})}>选择 Java</button></div><MemorySetting/></section>}
 {current==='appearance'&&<section className="preference-section"><h2>外观与启动器</h2>
  <label className="setting-line"><strong>外观</strong><select value={settings.theme} onChange={e=>{const theme=e.target.value;void action(()=>saveSettings({theme}));}}><option value="light">浅色</option><option value="dark">深色</option></select></label>
  <div className="setting-line"><span><strong>工作台背景</strong><small>{settings.backgroundImage?'已使用本地图片':'使用主题底色'}</small></span>{settings.backgroundImage&&<button className="small-action" onClick={()=>action(()=>saveSettings({backgroundImage:''}))}>恢复底色</button>}<button className="small-action" disabled={busy} onClick={()=>action(async()=>{const img=await invoke('background.choose');if(img)await saveSettings({backgroundImage:img});})}>选择图片</button></div>
  <label className="setting-line"><strong>启动游戏后</strong><select value={settings.gameWindowAction||'minimize'} onChange={e=>{const gameWindowAction=e.target.value;void action(()=>saveSettings({gameWindowAction}));}}><option value="minimize">最小化启动器</option><option value="keep">保留窗口</option><option value="hide">隐藏到托盘</option></select></label></section>}
 {current==='downloads'&&<section className="preference-section"><h2>下载与更新</h2>
  <label className="setting-line"><strong>下载并发数</strong><select aria-label="下载并发数" value={settings.downloadConcurrency} onChange={e=>{const v=Number(e.target.value);void action(()=>saveSettings({downloadConcurrency:v}));}}>{Array.from(new Set([4,8,16,32,settings.downloadConcurrency])).sort((a,b)=>a-b).map(v=><option key={v}>{v}</option>)}</select></label>
  <LauncherUpdate enabled={settings.autoCheckUpdates!==false} onChange={v=>void action(()=>saveSettings({autoCheckUpdates:v}))}/></section>}
 {current==='migration'&&<section className="preference-section"><h2>资料迁移</h2><div className="setting-line"><span><strong>导入 0.9.2 的设置与游玩记录</strong><small>选择旧资料中的 settings.json，启动器会保留原文件和导入前的备份。</small></span><button className="small-action" disabled={busy} onClick={()=>action(async()=>{const result=await invoke('profile.import');if(!result.cancelled){await reload();notify('已导入 '+result.count+' 项偏好');}})}>导入设置</button></div></section>}
 </SettingsLayout>;
}
export function Identity(){
 const s=useSnapshot(state),selected=account(s);
 return <section className="launch-page"><header className="launch-title"><h1>账号与角色</h1><button className="small-action" onClick={()=>ui.dialog='account'}>{selected?'添加账号':'登录账号'}</button></header><div className="instance-lines">
 {s.accounts.map((a:any)=><div className="setting-line" key={a.id}><Avatar name={a.name||a.username} image={a.avatar} size={38}/><span><strong>{a.name||a.username}</strong><small>{a.id===selected?.id?'当前账号':'已保存的账号'}</small></span>{a.id!==selected?.id&&<button className="small-action" onClick={()=>perform(()=>saveSettings({selectedAccount:a.id}))}>切换账号</button>}{a.id===selected?.id&&a.profiles?.length>0&&<select aria-label="选择角色" value={a.uuid} onChange={e=>{const uuid=e.target.value;void perform(async()=>{await invoke('account.profile',{id:a.id,uuid});await reload();});}}>{!a.uuid&&<option value="" disabled>选择角色</option>}{a.profiles.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}<button className="small-action" onClick={()=>{ui.confirm={title:'退出这个账号？',message:'此设备上的登录状态将被移除。',action:async()=>{await invoke('account.remove',{id:a.id});await reload();}};}}>退出</button></div>)}
 {!selected&&<div className="setting-line">使用幻想镇皮肤站账号登录，并选择游戏角色。</div>}</div><SkinConnection/></section>;
}
