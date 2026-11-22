import {NavLink,Route,Routes} from 'react-router-dom';
import {Install,Packs} from '../Workshop';
import {ResourceBrowser} from './ResourceBrowser';

export function LiteTools(){
  return <section className="launch-page lite-tools-page"><header className="launch-title"><h1>下载安装</h1></header>
    <nav className="download-sections" aria-label="下载分类"><NavLink end to="/lite/download">游戏版本</NavLink><NavLink to="/lite/download/packs">整合包</NavLink><NavLink to="/lite/download/addons">模组与资源</NavLink></nav>
    <Routes><Route index element={<Install minimal/>}/><Route path="packs" element={<section className="catalog-panel"><Packs/></section>}/><Route path="addons" element={<ResourceBrowser/>}/></Routes>
  </section>;
}
