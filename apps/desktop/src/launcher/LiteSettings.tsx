import {CloudDownload,Image,Monitor,Palette,UserRound} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {state} from '../model';
import {GameRuntimeSettings,Identity,InterfaceTuning,AfterLaunchSetting} from './Preferences';
import {DownloadPolicy,SettingSwitch} from './GamePreferences';
import {WallpaperSettings} from './WallpaperSettings';
import {SettingsSection} from './SettingsSection';
import {StartupPreference} from './Workspaces';
import {GuideLink} from './DesktopGuide';

const sections=[
  {path:'/lite/settings',label:'游戏与 Java',icon:Monitor},
  {path:'/lite/settings/downloads',label:'下载',icon:CloudDownload},
  {path:'/lite/settings/account',label:'账号与角色',icon:UserRound},
  {path:'/lite/settings/launcher',label:'启动器',icon:Palette}
];
export function LiteSettings(){
  const {pathname}=useLocation(),{settings}=useSnapshot(state);
  const wallpaper=pathname==='/lite/settings/wallpaper';
  const section=wallpaper?sections[3]:sections.find(item=>item.path===pathname)||sections[0];
  return <section className="launch-page lite-settings-page"><header className="launch-title"><h1>启动设置</h1></header>
    <div className="settings-layout"><nav className="settings-rail" aria-label="极简设置分类">
      {sections.map(item=><Link key={item.path} to={item.path} aria-current={item===section?'page':undefined}><item.icon size={16}/>{item.label}</Link>)}
    </nav><div className="settings-sections">
      {section===sections[0]&&<><GameRuntimeSettings/><SettingsSection title="启动行为"><AfterLaunchSetting/><SettingSwitch field="promptJavaDownload" label="缺少适配 Java 时询问下载"/></SettingsSection></>}
      {section===sections[1]&&<SettingsSection title="下载"><DownloadPolicy/></SettingsSection>}
      {section===sections[2]&&<Identity minimal/>}
      {section===sections[3]&&(wallpaper?<><Link className="text-action lite-settings-back" to="/lite/settings/launcher">返回启动器设置</Link><WallpaperSettings/></>:
        <><SettingsSection title="外观"><div className="setting-line"><strong>启动页背景</strong><Link className="small-action" to="/lite/settings/wallpaper"><Image size={15}/>更换背景</Link></div><InterfaceTuning settings={settings}/></SettingsSection>
        <StartupPreference/><SettingsSection title="帮助"><div className="setting-line"><span>学习启动和下载游戏</span><GuideLink lite/></div></SettingsSection></>)}
    </div></div></section>;
}
