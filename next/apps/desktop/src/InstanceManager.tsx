import {PanelGroup} from './CardBoard';
import {useState, useEffect} from 'react';
import {useSnapshot} from 'valtio';
import {Link} from 'react-router-dom';
import {Play, Plus, Search, Settings2, FolderOpen, Star, MoreHorizontal, PackageOpen, RefreshCw, Square, Layers, Download, Image, FileUp, Trash2, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Box, Cpu, Folder, Camera, Terminal, CheckCircle2, UserRound} from 'lucide-react';
import {state, ui, task, cfg, selected, account, perform, invoke, saveSettings, selectInstance, launch, importPack, reload, chooseRoot, bytes} from './model';
import {Button, IconButton, Dropdown, Avatar, Select, Toggle, Empty} from './ui';
import {InstanceConfig, Mods} from './Dialogs';
import {connect, disconnect} from '../../../packages/community/client';

const installed = (i:any) => !!i && (i.installed ?? (!i.builtin && !i.error));
const versionLabel = (i:any) => [i?.version === '跟随整合包' ? '由整合包指定' : i?.version, i?.loader==='跟随整合包'?'':i?.loader].filter(Boolean).join(' · ');
function GameIcon({game, size=24}:any) {
  const index = game?.id?.includes('mod-1') ? 1 : game?.id?.includes('mod-2') ? 2 : 0;
  const Icon = game?.builtin ? [Box, Settings2, Layers][index] : PackageOpen;
  return <span className={'instance-symbol type-'+(game?.builtin ? index : 'local')}><Icon size={size} strokeWidth={1.7}/></span>;
}

export function InstanceManager() {
  const s=useSnapshot(state), t=useSnapshot(task), u=useSnapshot(ui);
  const active=selected(s), current=cfg(active?.id||'',s), role=account(s), locked=t.busy||s.running;
  const [query,setQuery]=useState(''), [tab,setTab]=useState('overview'), [officialOpen,setOfficialOpen]=useState(true), [cover,setCover]=useState('');
  const collapsed=!!s.settings.instancesCollapsed;
  useEffect(()=>{let live=true;setCover('');
    if(active?.id && s.settings.showCover && (current.coverMedia || s.settings.defaultCover)) {
      if(window.launcher) invoke('instance.cover',{id:active.id}).then(v=>{if(live)setCover(v||state.settings.defaultCover||'');}).catch(()=>{});
      else setCover(current.coverMedia || s.settings.defaultCover);
    }
    return()=>{live=false;};
  },[active?.id,current.coverMedia,s.settings.defaultCover,s.settings.showCover,u.dialog]);
  const open=(name:string,id=active?.id)=>{ui.instance=id;ui.dialog=name;};
  const save=async(patch:any)=>{await saveSettings({instance:{id:active.id,...cfg(active.id),...patch}});};
  const menus=active ? [
    {label:'编辑头图',icon:Image,action:()=>open('cover')},
    {label:current.favorite?'取消收藏':'收藏实例',icon:Star,disabled:locked,action:async()=>{await invoke('instance.favorite',{id:active.id,favorite:!current.favorite});await reload();}},
    {label:'手动检查 HXZ UP',icon:RefreshCw,action:()=>launch(active.id,true),disabled:locked||!installed(active)},
    {label:'导出整合包',icon:FileUp,action:()=>invoke('instance.export',{id:active.id}),disabled:locked||!installed(active)},
    {separator:true}, {label:active.builtin?'默认服务器不可删除':'删除实例',icon:Trash2,danger:true,disabled:active.builtin||locked,action:()=>open('delete')}
  ] : [];
  return <div className="instance-manager">
    {active ? <section className="instance-workspace" aria-label="当前实例">
      <header className="instance-header"><GameIcon game={active} size={31}/><div><div className="instance-title-line"><h2 title={active.name}>{active.name}</h2><span className={'installation-badge '+(installed(active)?'ready':'')}>{active.placeholder?'尚未开放':installed(active)?'已安装':'待安装'}</span></div><p>{versionLabel(active)||'游戏版本由整合包提供'}{active.builtin&&<span>默认服务器</span>}</p></div><div className="instance-header-actions"><IconButton icon={FolderOpen} label="打开版本文件夹" disabled={!installed(active)} onClick={()=>invoke('instance.folder',{id:active.id,kind:'versions'})}/><Dropdown trigger={<button className="button icon-button" aria-label="更多实例操作"><MoreHorizontal size={20}/></button>} items={menus}/></div></header>
      <nav className="instance-tabs" aria-label="实例操作">{[{id:'overview',name:'概览',icon:Box},{id:'mods',name:'模组',icon:Layers},{id:'config',name:'配置',icon:Settings2},{id:'logs',name:'日志',icon:Terminal}].map(v=><button key={v.id} className={tab===v.id?'active':''} aria-current={tab===v.id?'page':undefined} disabled={v.id==='mods'&&!installed(active)} onClick={()=>setTab(v.id)}><v.icon size={16}/>{v.name}</button>)}<button className="tab-refresh" disabled={locked} onClick={()=>perform(reload)} title="刷新实例状态"><RefreshCw size={15}/></button></nav>
      <div className="instance-content" key={active.id}>
        {tab==='overview'&&<>
          {cover&&<div className="instance-custom-cover">{/\.(mp4|webm)$/i.test(cover)?<video src={cover} autoPlay muted loop playsInline style={{objectPosition:`${current.coverPositionX}% ${current.coverPositionY}%`,transform:`scale(${current.coverZoom})`}}/>:<img src={cover} alt="自定义实例头图" style={{objectPosition:`${current.coverPositionX}% ${current.coverPositionY}%`,transform:`scale(${current.coverZoom})`}}/>}<IconButton icon={Image} label="调整头图" onClick={()=>open('cover')}/></div>}
          <PanelGroup id="instance-overview" names={["安装状态","更新与进服","实例文件","运行环境"]} widths={[8,8,8,4]} heights={[7,16,7,23]} positions={[[0,0],[0,7],[0,23],[8,0]]}>
            <>
              <section className="instance-block install-state-block"><div className={'install-state-icon '+(installed(active)?'ready':'')}>{installed(active)?<CheckCircle2 size={24}/>:<Download size={24}/>}</div><div><h3>{active.error?'实例需要修复':active.placeholder?'服务器尚未开放':installed(active)?'游戏文件已安装':'首次启动将自动安装'}</h3><p>{active.error|| (installed(active)?(current.autoUpdate?'启动时检查整合包更新。':'可以直接启动，也可手动检查更新。'):'在游戏库点击“安装并启动”即可。')}</p>{!installed(active)&&!active.placeholder&&<div className="install-sequence"><span>游戏本体</span><ChevronRight size={12}/><span>加载器与依赖</span><ChevronRight size={12}/><span>整合包</span></div>}</div></section>
              <section className="instance-block"><div className="instance-block-title"><h3><RefreshCw size={17}/>整合包更新</h3><button onClick={()=>setTab('config')}>详细配置<ChevronRight size={13}/></button></div><Toggle label="启动前检查更新" checked={current.autoUpdate} disabled={locked||current.updateRequired} onChange={(v:boolean)=>perform(()=>save({autoUpdate:v}))}/>{current.updateRequired&&<p className="runtime-hint">此服务器由管理员要求更新后进入。</p>}<div className="instance-endpoint"><span>HXZ UP</span><code title={current.updateUrls?.join('\n')}>{current.updateUrls?.[0]||'尚未配置'}</code>{current.updateUrls?.length>1&&<small>+{current.updateUrls.length-1}</small>}</div><div className="instance-block-divider"/><Toggle label="启动后自动进服" checked={current.autoJoin} disabled={locked||!current.serverAddress} onChange={(v:boolean)=>perform(()=>save({autoJoin:v}))}/><div className="instance-endpoint"><span>服务器</span><code title={current.serverAddress}>{current.serverAddress||'未设置 · 启动至游戏主菜单'}</code></div></section>
              <section className="instance-block file-shortcuts"><h3>实例文件</h3><div>{[{kind:'versions',name:'版本目录',icon:FolderOpen},{kind:'saves',name:'存档',icon:Folder},{kind:'screenshots',name:'截图',icon:Camera}].map(v=><Button key={v.kind} icon={v.icon} disabled={!installed(active)} onClick={()=>invoke('instance.folder',{id:active.id,kind:v.kind})}>{v.name}</Button>)}</div></section>
            </><section className="instance-block runtime-block"><div className="instance-block-title"><h3><Cpu size={17}/>运行配置</h3><button onClick={()=>setTab('config')}>全部<ChevronRight size={13}/></button></div><label className="runtime-field"><span>Java 运行环境</span><Select label="实例 Java 模式" value={current.javaMode} disabled={locked} options={[{value:'inherit',label:'跟随全局'},{value:'auto',label:'自动匹配版本'},{value:'custom',label:'指定 Java…'}]} onChange={(v:string)=>perform(async()=>{if(v==='custom'){const path=await invoke('java.choose');if(path)await save({javaMode:v,javaPath:path});}else await save({javaMode:v});})}/></label><p className="runtime-hint" title={current.javaMode==='custom'?current.javaPath:s.settings.javaPath}>{current.javaMode==='custom'?current.javaPath:current.javaMode==='inherit'&&s.settings.javaPath?s.settings.javaPath:'启动时选择适配当前版本的 Java'}</p><label className="runtime-field"><span>内存分配</span><Select label="实例内存模式" disabled={locked} value={current.memoryMode} options={[{value:'inherit',label:'跟随全局'},{value:'auto',label:'自动分配'},{value:'manual',label:'手动设置…'}]} onChange={(v:string)=>perform(async()=>{if(v==='manual'){await save({memoryMode:v});setTab('config');}else await save({memoryMode:v});})}/></label><div className="memory-meter"><span style={{width:`${s.system.memoryMB ? Math.max(0,Math.min(100,(1-s.system.freeMemoryMB/s.system.memoryMB)*100)) : 0}%`}}/></div><p className="runtime-hint">{s.system.memoryMB?`可用 ${(s.system.freeMemoryMB/1024).toFixed(1)} GB / 总计 ${Math.round(s.system.memoryMB/1024)} GB`:'将根据本机可用内存分配'}{current.memoryMode==='manual'&&<><br/>此实例上限 {current.memoryMB} MB</>}</p><div className="instance-block-divider"/><div className="runtime-summary"><span>游戏窗口</span><strong>{current.fullscreen?'全屏':`${current.width} × ${current.height}`}</strong></div><div className="runtime-summary"><span>实例隔离</span><strong>{current.isolated?'开启':'关闭'}</strong></div><button className="runtime-edit" onClick={()=>setTab('config')}><Settings2 size={15}/>编辑完整配置</button></section>
          </PanelGroup>
        </>}
        {tab==='config'&&<div className="inline-instance-config"><InstanceConfig key={active.id} id={active.id} inline onDone={()=>setTab('overview')} disabled={locked}/></div>}
        {tab==='mods'&&<div className="inline-instance-mods"><Mods key={active.id} id={active.id}/></div>}
        {tab==='logs'&&<InstanceLogs/>}
      </div>
    </section>:<Empty icon={PackageOpen} title="添加游戏实例" action={<Link className="button solid" to="/workshop/install">安装 Minecraft</Link>}>也可以拖入整合包，或选择已有的 .minecraft 目录。</Empty>}
  </div>;
}

function InstanceLogs(){const t=useSnapshot(task);const [search,setSearch]=useState('');const lines=t.logs.filter((v:string)=>v.toLowerCase().includes(search.toLowerCase()));return <div className="instance-log-panel"><div className="toolbar"><div className="search"><Search size={16}/><input placeholder="查找日志" value={search} onChange={e=>setSearch(e.target.value)}/></div><Button onClick={()=>ui.tasks=true}>展开任务详情</Button><Button icon={Download} onClick={()=>invoke('logs.export')}>导出</Button></div><small>当前任务 · {t.phase} · 保留最近 {t.logs.length} 行</small><pre>{lines.join('\n')||'启动游戏或安装整合包后，在这里查看运行日志。'}</pre></div>;}
