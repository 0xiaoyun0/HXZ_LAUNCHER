import {Link,useSearchParams} from 'react-router-dom';
import {settingsTabs,SettingsLayout} from './SettingsLayout';
import {SettingsSection} from './SettingsSection';
import {ArchiveSignalPreference} from '../ArchiveSignal';
import {AppearanceSettings} from './AppearanceSettings';
import {ChoiceGroup,StepChoice} from './ChoiceControls';
import {MusicMigration} from './MusicMigration';
import {MemorySetting} from './MemorySetting';
import {SkinConnection} from './SkinConnection';
import {useState} from 'react';
import {useSnapshot} from 'valtio';
import {BookOpen,FolderOpen,ChevronRight,LifeBuoy} from 'lucide-react';
import {account,chooseRoot,invoke,notify,perform,reload,saveSettings,state,ui} from '../model';
import {DownloadPolicy,NetworkPreferences,RemovedInstances,RuntimePreferences} from './GamePreferences';
import {LauncherUpdate} from '../LauncherUpdate';
import {Avatar,Select} from '../ui';
export function GameRuntimeSettings(){
 const settings=useSnapshot(state).settings,[busy,setBusy]=useState(false);
 const action=(fn:()=>Promise<unknown>)=>perform(async()=>{setBusy(true);try{await fn();}finally{setBusy(false);}});
 return <section className="preference-section"><h2>游戏与 Java</h2>
  <div className="setting-line"><span><strong>游戏目录</strong><small>{settings.gameRoot||'尚未选择目录'}</small></span><button className="small-action" disabled={busy} onClick={()=>action(chooseRoot)}><FolderOpen size={15}/>选择目录</button></div>
  <div className="setting-line"><span><strong>Java 运行环境</strong><small>{settings.javaPath||'根据实例版本自动匹配'}</small></span>{settings.javaPath&&<button className="small-action" disabled={busy} onClick={()=>action(()=>saveSettings({javaPath:''}))}>恢复自动</button>}<button className="small-action" disabled={busy} onClick={()=>action(async()=>{const path=await invoke('java.choose');if(path)await saveSettings({javaPath:path});})}>选择 Java</button></div><MemorySetting/></section>;
}
export function Preferences(){
 const s=useSnapshot(state),settings=s.settings,[busy,setBusy]=useState(false);
 const action=(fn:()=>Promise<unknown>)=>perform(async()=>{setBusy(true);try{await fn();}finally{setBusy(false);}});
 const [query]=useSearchParams(),current=settingsTabs.find(tab=>tab.key===query.get('section')&&tab.key!=='extensions')?.key||'game';
 return <SettingsLayout current={current}>
 {current==='game'&&<><GameRuntimeSettings/><RuntimePreferences/><RemovedInstances key={settings.gameRoot}/></>}
 {current==='appearance'&&<><AppearanceSettings/><section className="preference-section"><h2>显示与启动行为</h2>
  <ArchiveSignalPreference/><div className="setting-line"><strong>明暗模式</strong><ChoiceGroup label="明暗模式" value={settings.theme} options={[['light','浅色'],['dark','深色']]} onChange={theme=>action(()=>saveSettings({theme}))}/></div>
  <div className="setting-line"><strong>界面字号</strong><StepChoice label="界面字号" value={settings.fontSize||16} options={Array.from({length:10},(_,i)=>[13+i,(13+i)+' px'] as const)} onChange={v=>saveSettings({fontSize:Number(v)})}/></div>
  <div className="setting-line"><strong>动画速度</strong><StepChoice label="动画速度" value={settings.animationSpeed??1} options={[[0,'减少动效'],[.5,'舒缓'],[1,'标准'],[1.5,'敏捷'],[2,'快速']]} onChange={v=>saveSettings({animationSpeed:Number(v)})}/></div>

  <div className="setting-line"><strong>启动游戏后</strong><ChoiceGroup label="启动游戏后" value={settings.gameWindowAction||'minimize'} options={[['minimize','最小化'],['keep','保留窗口'],['hide','隐藏到托盘']]} onChange={gameWindowAction=>action(()=>saveSettings({gameWindowAction}))}/></div></section></>}
 {current==='downloads'&&<>
   <SettingsSection title="下载策略"><DownloadPolicy/></SettingsSection>
   <LauncherUpdate enabled={settings.autoCheckUpdates!==false} onChange={v=>saveSettings({autoCheckUpdates:v})}
     links={<><Link className="small-action" to="/updates"><BookOpen size={16}/>启动器更新公告</Link>
       <Link className="small-action" to="/support"><LifeBuoy size={16}/>帮助与反馈</Link></>}/>
 </>}
 {current==='network'&&<NetworkPreferences/>}
 {current==='migration'&&<section className="preference-section"><h2>资料迁移</h2><div className="setting-line"><span><strong>导入 0.9.2 的设置与游玩记录</strong><small>选择旧资料中的 settings.json，启动器会保留原文件和导入前的备份。</small></span><button className="small-action" disabled={busy} onClick={()=>action(async()=>{const result=await invoke('profile.import');if(!result.cancelled){await reload();notify('已导入 '+result.count+' 项偏好');}})}>导入设置</button></div><MusicMigration/></section>}
 </SettingsLayout>;
}
export function Identity({minimal=false}:{minimal?:boolean}={}){
 const s=useSnapshot(state),selected=account(s);
 return <section className="launch-page"><header className="launch-title"><h1>账号与角色</h1><button className="small-action" onClick={()=>ui.dialog='account'}>{selected?'添加账号':'登录账号'}</button></header><div className="instance-lines">
 {s.accounts.map((a:any)=><div className="setting-line" key={a.id}><Avatar name={a.name||a.username} image={a.avatar} size={38}/><span><strong>{a.name||a.username}</strong><small>{a.id===selected?.id?'当前账号':'已保存的账号'}</small></span>{a.id!==selected?.id&&<button className="small-action" onClick={()=>perform(()=>saveSettings({selectedAccount:a.id}))}>切换账号</button>}{a.id===selected?.id&&a.profiles?.length>0&&<Select label="选择角色" value={a.uuid} options={a.profiles.map((p:any)=>({value:p.id,label:p.name}))} onChange={async(uuid:string)=>{await invoke('account.profile',{id:a.id,uuid});await reload();}}/>}<button className="small-action" onClick={()=>{ui.confirm={title:'退出这个账号？',message:'此设备上的登录状态将被移除。',action:async()=>{await invoke('account.remove',{id:a.id});await reload();}};}}>退出</button></div>)}
 {!selected&&<div className="setting-line">使用幻想镇皮肤站账号登录，并选择游戏角色。</div>}</div><SkinConnection/>{!minimal&&<div className="desk-actions"><Link className="small-action" to="/support">我的工单</Link>{selected?.authenticated&&<><Link className="small-action" to="/community/wallet">我的积分</Link><Link className="small-action" to="/community/backpack">我的背包</Link></>}</div>}</section>;
}
