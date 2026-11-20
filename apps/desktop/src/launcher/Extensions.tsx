import {lazy,Suspense,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {proxy,useSnapshot} from 'valtio';
import {ChevronLeft,Download,Package,RotateCcw} from 'lucide-react';
import {SettingsLayout} from './SettingsLayout';
import {desktop,invoke,state,task} from '../model';
import {IssueHelp} from '../IssueHelp';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';

export const extension=proxy({ready:false,available:false,active:false,safeMode:false,installed:false,incompatible:false,version:'',size:0,entry:'',css:[] as string[]});
export async function refreshExtension(){
  if(!desktop){extension.ready=true;return;}
  try{Object.assign(extension,await invoke('extension.status'));}finally{extension.ready=true;}
}
const Community=lazy(async()=>{
  if(!extension.active)throw Error('社区插件未启用');
  for(const file of extension.css){const url=new URL('/'+file,location.origin).href;
    if(![...document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet]')].some(l=>l.href===url)){
      const link=document.createElement('link');link.rel='stylesheet';link.href=url;document.head.append(link);
    }}
  const entry=new URL('/'+extension.entry,location.origin).href;
  return import(/* @vite-ignore */ entry);
});
export function CommunitySlot(){
  const e=useSnapshot(extension);
  if(!e.ready)return <p className="launch-page">正在读取扩展…</p>;
  if(!e.active)return <section className="launch-page"><h1>社区插件</h1><p>{e.installed?'插件已下载，重启启动器后可以打开。':'在扩展设置里安装并重启，即可打开语音、论坛、入服申请、背包、协会与 LINKING。'}</p><Link className="small-action" to="/settings/extensions">打开扩展设置</Link></section>;
  return <Suspense fallback={<p className="launch-page">正在打开社区…</p>}><Community/></Suspense>;
}
export function Extensions(){
  const e=useSnapshot(extension),s=useSnapshot(state),t=useSnapshot(task);
  const [busy,setBusy]=useState(false),[percent,setPercent]=useState(0),[error,setError]=useState<any>(null);
  useEffect(()=>window.launcher?.subscribe(event=>{if(event.type==='extension-progress')setPercent(event.percent);}),[]);
  const pending=e.active!==e.installed;
  async function change(action:string){
    if(busy)return;setBusy(true);setError(null);setPercent(0);
    try{await invoke('extension.'+action);await refreshExtension();}
    catch(cause){setError(playerError(cause,'extension.'+action));}finally{setBusy(false);}
  }
  const status=!e.available?'当前构建未配置扩展包':e.incompatible?'需要安装与本版本匹配的插件':e.safeMode&&e.installed?'本次已跳过社区插件':pending?(e.installed?'已下载 · 重启后启用':'已停用 · 重启后生效'):e.active?'已启用':'未安装';
  return <SettingsLayout current="extensions">
    <section className="preference-section"><h2><Package size={17}/> 社区插件</h2><div className="setting-line"><span><strong>{status}</strong><small>聊天、论坛、冒险者协会和 LINKING · {e.version||'—'}{e.size?' · '+(e.size/1048576).toFixed(1)+' MB':''}</small></span></div>
      <div className="setting-line extension-actions">
        {e.installed?<button className="small-action" disabled={busy} onClick={()=>change('disable')}>{pending?'取消启用':'停用插件'}</button>:<><button className="small-action" disabled={busy||!e.available} onClick={()=>change('install')}><Download size={15}/>{busy?'正在处理 '+percent+'%':e.active?'重新启用':'下载社区插件'}</button><button className="small-action" disabled={busy||!e.available} onClick={()=>change('import')}>从本地安装</button></>}
        {pending&&!e.safeMode&&<button className="launch-primary" disabled={busy||s.running||t.busy} onClick={()=>change('restart')}><RotateCcw size={15}/>重启启动器</button>}
      </div>{pending&&(s.running||t.busy)&&<p className="setting-line">游戏或任务正在运行，结束后即可重启。</p>}
      {e.safeMode&&e.installed&&<p>退出后正常打开启动器，即可启用已安装的社区插件。</p>}
      <details className="preference-more"><summary>社区打不开</summary><p>使用启动参数 <code>--disable-plugins</code> 可以临时跳过社区，随后可在这里停用或重新安装。</p></details>
      {error&&<div className="setting-line"><IssueHelp issue={error}/></div>}
    </section></SettingsLayout>;
}
