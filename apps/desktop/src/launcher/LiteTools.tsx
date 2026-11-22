import {Link,NavLink,Route,Routes} from 'react-router-dom';
import {Image,UserRound} from 'lucide-react';
import {Install,Packs} from '../Workshop';
import {GameRuntimeSettings} from './Preferences';
import {WallpaperSettings} from './WallpaperSettings';
import {StartupPreference} from './Workspaces';
import {ResourceBrowser} from './ResourceBrowser';

export function LiteTools({page}:{page:'download'|'settings'|'wallpaper'}){
  const title=page==='download'?'下载安装':page==='settings'?'启动设置':'玩家壁纸';
  return <section className="launch-page lite-tools-page"><header className="launch-title"><h1>{title}</h1></header>
    {page==='download'?<>
      <nav className="download-sections" aria-label="下载分类"><NavLink end to="/lite/download">游戏版本</NavLink><NavLink to="/lite/download/packs">整合包</NavLink><NavLink to="/lite/download/addons">模组与资源</NavLink></nav>
      <Routes><Route index element={<Install minimal/>}/><Route path="packs" element={<section className="catalog-panel"><Packs/></section>}/><Route path="addons" element={<ResourceBrowser/>}/></Routes>
    </>:page==='wallpaper'?<div className="settings-sections"><WallpaperSettings/></div>:
      <div className="settings-sections"><StartupPreference/><section className="preference-section"><h2>玩家</h2><div className="setting-line"><span>皮肤站账号与游戏角色</span><Link className="small-action" to="/lite/settings/account"><UserRound size={15}/>账号与角色</Link></div></section><GameRuntimeSettings/><section className="preference-section"><h2>外观</h2><div className="setting-line"><span>启动页背景</span><Link className="small-action" to="/lite/settings/wallpaper"><Image size={15}/>更换背景</Link></div></section></div>}
  </section>;
}
