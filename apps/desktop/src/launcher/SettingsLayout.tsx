import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {Download,FolderClock,LifeBuoy,Monitor,Network,Palette,Puzzle} from 'lucide-react';
export const settingsTabs=[
  {key:'game',path:'/settings',label:'游戏与 Java',icon:Monitor},
  {key:'appearance',path:'/settings?section=appearance',label:'外观与启动器',icon:Palette},
  {key:'downloads',path:'/settings?section=downloads',label:'下载与更新',icon:Download},
  {key:'network',path:'/settings?section=network',label:'联机连接',icon:Network},
  {key:'migration',path:'/settings?section=migration',label:'资料迁移',icon:FolderClock},
  {key:'extensions',path:'/settings/extensions',label:'扩展',icon:Puzzle}
];
export function SettingsLayout({current,children}:{current:string;children:ReactNode}){

 return <section className="launch-page"><header className="launch-title"><h1>设置</h1></header><div className="settings-layout">
  <nav className="settings-rail" aria-label="设置分类">{settingsTabs.map(tab=><Link key={tab.key} to={tab.path} aria-current={current===tab.key?'page':undefined}><tab.icon size={16}/>{tab.label}</Link>)}<Link to="/support"><LifeBuoy size={16}/>帮助与反馈</Link></nav>
  <div className="settings-sections">{children}</div></div></section>;
}
