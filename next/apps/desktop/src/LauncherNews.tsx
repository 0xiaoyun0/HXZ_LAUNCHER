import {useState} from 'react';
import {ArrowRight,RefreshCw} from 'lucide-react';
import {invoke,desktop} from './model';
import {Button,Modal} from './ui';
import {useData} from './data';
import {Link} from 'react-router-dom';
import {CardBoard} from './CardBoard';
import './home-dashboard.css';
const releaseItems=(value:any)=>Array.isArray(value)?value:value?.items||value?.releases||[];
function ReleaseBody({body}:{body:string}){return <div className="launcher-release-body">{String(body||'暂无详细说明').split(/\r?\n/).filter(line=>line.trim()).map((line,i)=>{const text=line.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*\*([^*]+)\*\*/g,'$1');return /^#{1,6}\s/.test(line)?<h3 key={i}>{text.replace(/^#{1,6}\s*/,'')}</h3>:<p key={i} className={/^\s*[-*]\s/.test(line)?'release-list-item':''}>{text.replace(/^\s*[-*]\s*/,'')}</p>;})}</div>;}
export function LauncherUpdates(){
 const result=useData(()=>desktop?invoke('launcher.releases'):Promise.resolve([]),[]),items=releaseItems(result.data);
 return <div className="launcher-updates"><div className="launcher-updates-toolbar"><Link className="button" to="/settings?tab=download">检查与安装更新</Link><Button icon={RefreshCw} disabled={result.loading} onClick={result.reload}>刷新更新日志</Button></div>{result.error&&<p className="inline-note">暂时未能获取最新更新，可稍后刷新。{items.length?'下方保留已读取的日志。':''}</p>}{!items.length?<p className="muted">{result.loading?'正在获取启动器更新…':'暂无更新日志'}</p>:<CardBoard id="launcher-updates" cards={items.slice(0,8).map((release:any,index:number)=>({id:'release-'+(release.version||release.tag_name||index),title:release.title||release.name||'幻想镇启动器 '+(release.version||release.tag_name||''),w:12,minW:4,content:<article><time className="launcher-release-date">{release.date||release.published_at?new Date(release.date||release.published_at).toLocaleDateString('zh-CN'):''}</time><ReleaseBody body={release.body||release.notes||release.releaseNotes}/></article>}))}/>}</div>;
}
export function LauncherNews(){
 const result=useData(()=>desktop?invoke('launcher.releases'):Promise.resolve([]),[]),[open,setOpen]=useState(false);
 const latest=Array.isArray(result.data)?result.data[0]:null;
 const highlights=String(latest?.body||'').split(/\r?\n/).map(line=>line.replace(/^\s*(?:#{1,6}|[-*]|\d+[.)、])\s*/,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*`]/g,'').trim()).filter(Boolean).slice(0,3);
 return <div className="home-release">
  {latest?<><div className="home-release-meta"><strong>{latest.title||'幻想镇 '+latest.version}</strong>{latest.date&&<time>{new Date(latest.date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}</time>}</div><ul>{highlights.map((line,i)=><li key={i}>{line}</li>)}</ul><button className="text-link" onClick={()=>setOpen(true)}>查看更新说明 <ArrowRight size={14}/></button></>:<div className="home-release-empty"><p className="muted">{result.loading?'正在获取最新更新…':result.error?'暂时未能获取更新公告':'暂无更新公告'}</p><Button icon={RefreshCw} disabled={result.loading} onClick={result.reload}>刷新</Button></div>}
  <Modal open={open} onClose={()=>setOpen(false)} title="启动器更新" wide>{(result.data||[]).slice(0,5).map((release:any)=><article className="home-release-detail" key={release.version}><h3>{release.title||release.version}</h3><div className="prose">{release.body||'暂无详细说明'}</div></article>)}</Modal>
 </div>;
}

