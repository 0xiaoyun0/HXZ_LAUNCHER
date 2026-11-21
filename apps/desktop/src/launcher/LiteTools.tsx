import {Link} from 'react-router-dom';
import {Image} from 'lucide-react';
import {Install} from '../Workshop';
import {GameRuntimeSettings} from './Preferences';
import {WallpaperSettings} from './WallpaperSettings';
import {StartupPreference} from './Workspaces';

export function LiteTools({page}:{page:'download'|'settings'|'wallpaper'}){
  const title=page==='download'?'下载安装':page==='settings'?'启动设置':'玩家壁纸';
  return <section className="launch-page lite-tools-page"><header className="launch-title"><h1>{title}</h1></header>
    {page==='download'?<Install minimal/>:page==='wallpaper'?<div className="settings-sections"><WallpaperSettings/></div>:
      <div className="settings-sections"><GameRuntimeSettings/><StartupPreference/><section className="preference-section"><h2>外观</h2><div className="setting-line"><span>启动页背景</span><Link className="small-action" to="/lite/settings/wallpaper"><Image size={15}/>更换背景</Link></div></section></div>}
  </section>;
}
