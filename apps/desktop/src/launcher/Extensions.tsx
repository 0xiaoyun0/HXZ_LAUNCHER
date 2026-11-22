import {lazy,Suspense,useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {proxy,useSnapshot} from 'valtio';
import {ChevronLeft,Download,Package,RotateCcw} from 'lucide-react';
import {StatusMark,LatticeGlyph} from './micro/Feedback';
import {PageSkeleton} from '../PageFeedback';
import {communityPages} from './community-pages';
import {SettingsLayout} from './SettingsLayout';
import {desktop,invoke,state,task} from '../model';
import {IssueHelp} from '../IssueHelp';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';

export type ModuleId='community'|'music'|'arcade';
type ModuleStatus={available:boolean;installed:boolean;active:boolean;safeMode:boolean;incompatible:boolean;version:string;size:number;entry:string;css:readonly string[]};
const names:Record<ModuleId,string>={community:'社区',music:'音乐播放器',arcade:'小游戏'};
const missing:ModuleStatus={available:false,active:false,installed:false,safeMode:false,incompatible:false,entry:'',css:[],version:'',size:0};
export const extension=proxy({ready:false,available:false,active:false,safeMode:false,installed:false,incompatible:false,version:'',size:0,entry:'',css:[] as string[],modules:{} as Partial<Record<ModuleId,ModuleStatus>>});
export async function refreshExtension(){
  if(!desktop){extension.ready=true;return;}
  try{Object.assign(extension,await invoke('extension.status'));}finally{extension.ready=true;}
}
async function loadOfficial(id:ModuleId){
  const info=extension.modules[id]||(id==='community'?extension:missing);
  if(!info.active)throw Error(names[id]+'扩展尚未启用');
  for(const file of info.css){
    const url=new URL('/'+file,location.origin).href;
    if(![...document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')].some(l=>l.href===url)){
      const link=document.createElement('link');link.rel='stylesheet';link.href=url;document.head.append(link);
    }
  }
  return import(/* @vite-ignore */ new URL('/'+info.entry,location.origin).href);
}
const Community=lazy(()=>loadOfficial('community'));
const Music=lazy(()=>loadOfficial('music')),Arcade=lazy(()=>loadOfficial('arcade'));
const Mini=lazy(()=>loadOfficial('music').then(m=>({default:m.MiniPlayer})));
const RoomPlayer=lazy(()=>loadOfficial('music').then(m=>({default:m.RoomPlayer})));
export function OptionalRoomPlayer(){
  const status=useSnapshot(extension);
  return status.modules.music?.active?<Suspense fallback={null}><RoomPlayer/></Suspense>:null;
}
export function OfficialModule({id,mini=false}:{id:'arcade'|'music';mini?:boolean}){
  const e=useSnapshot(extension);
  const opening=mini?null:<PageSkeleton title={names[id]} label={'正在打开'+names[id]}/>;
  if(!e.ready)return opening;
  if(!e.modules[id]?.active)return mini?null:<section className="launch-page"><h1>{names[id]}</h1><p>在扩展设置中安装{names[id]}，重启后即可使用。</p><Link className="small-action" to="/settings/extensions">打开扩展设置</Link></section>;
  const Component=id==='arcade'?Arcade:mini?Mini:Music;
  return <Suspense fallback={opening}><Component/></Suspense>;
}
export function CommunitySlot(){
  const e=useSnapshot(extension),{pathname}=useLocation();
  const page=communityPages.find(p=>p.path===pathname);
  const opening=<PageSkeleton title={page?.label||'社区'} label="正在打开社区"/>;
  if(!e.ready)return opening;
  if(!e.active)return <section className="launch-page"><h1>{page?.path==='/community'?'社区':page?.label||'社区插件'}</h1><div className="desktop-panel"><div className="desktop-panel-body"><p>{e.safeMode?'本次启动跳过了社区插件，正常重启后可以使用。':e.incompatible?'社区插件需要更新，请在扩展设置里安装匹配的版本。':e.installed?'社区插件已下载，重启启动器后可以打开。':'此功能由社区插件提供，在扩展设置中安装并重启后即可使用。'}</p><div className="arcade-links"><Link className="small-action" to="/settings/extensions">打开扩展设置</Link>{(pathname.includes('/arcade/')||['/community/wallet','/community/shop','/community/ranking'].includes(pathname))&&<Link className="small-action" to="/arcade">返回小游戏厅</Link>}</div></div></div></section>;
  return <Suspense fallback={opening}><Community/></Suspense>;
}
const descriptions:Record<ModuleId,string>={community:'聊天、论坛、冒险者协会、LINKING、积分商城与联机对局',music:'本地音乐、歌单、歌词和底栏播放控制',arcade:'小游戏大厅、本机练习与个人最好成绩'};
function ModuleSetting({id}:{id:ModuleId}){
  const all=useSnapshot(extension),s=useSnapshot(state),t=useSnapshot(task),e=all.modules[id]||(id==='community'?all:missing);
  const [busy,setBusy]=useState(false),[error,setError]=useState<any>(null);
  const pending=e.active!==e.installed;
  async function change(action:string){
    if(busy)return;setBusy(true);setError(null);
    try{await invoke('extension.'+action,{id});await refreshExtension();}
    catch(cause){setError(playerError(cause,'extension.'+action));}finally{setBusy(false);}
  }
  const status=!e.available?'当前构建缺少扩展清单':e.incompatible?'版本不匹配或文件损坏，请重新安装':e.safeMode&&e.installed?'本次已跳过':pending?(e.installed?'已下载 · 重启后启用':'已停用 · 重启后移除'):e.active?'已启用':'未安装';
  return <section className="preference-section"><h2><StatusMark status={busy?'running':error||e.incompatible?'failed':e.active?'done':'pending'}/> {id==='community'?'社区插件':names[id]}</h2>
    <div className="setting-line"><span><strong>{status}</strong><small>{descriptions[id]} · {e.version||'—'}{e.size?' · '+(e.size<1048576?Math.ceil(e.size/1024)+' KB':(e.size/1048576).toFixed(1)+' MB'):''}</small></span></div>
    <div className="desk-actions extension-actions">
      {e.installed?<button className="small-action" disabled={busy} onClick={()=>change('disable')}>{pending?'取消启用':id==='community'?'停用插件':'移除'+names[id]}</button>:<>
        <button className="small-action" disabled={busy||!e.available} onClick={()=>change('install')}><Download size={15}/>{busy?'正在处理…':id==='community'?'下载社区插件':'安装'+names[id]}</button>
        <button className="small-action" aria-label={'从本地安装'+names[id]} disabled={busy||!e.available} onClick={()=>change('import')}>从本地安装</button></>}
      {pending&&!e.safeMode&&<button className="launch-primary" disabled={busy||s.running||t.busy} onClick={()=>change('restart')}><RotateCcw size={15}/>重启启动器</button>}
    </div>{error&&<div className="setting-line"><IssueHelp issue={error}/></div>}
  </section>;
}
const CardManager=lazy(()=>import('./UserCards'));
export function Extensions(){
  return <SettingsLayout current="extensions"><ModuleSetting id="community"/><ModuleSetting id="music"/><ModuleSetting id="arcade"/>
    <Suspense fallback={null}><CardManager/></Suspense></SettingsLayout>;
}
