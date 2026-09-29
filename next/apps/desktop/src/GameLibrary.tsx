import {useState} from 'react';
import {useSnapshot} from 'valtio';
import {Link} from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {Play, Plus, Search, Settings2, FolderOpen, Star, MoreHorizontal, PackageOpen, RefreshCw, Square, Layers, Download, FileUp, Trash2, ChevronDown, X, UserRound, ArrowDownToLine, ListFilter, Check, ArrowUpRight} from 'lucide-react';
import {state,ui,task,account,selected,cfg,perform,invoke,saveSettings,selectInstance,launch,importPack,reload,chooseRoot,bytes} from './model';
import {Avatar,Button,IconButton,Dropdown,Select,Empty} from './ui';
import {InstanceManager} from './InstanceManager';
import {disconnect,connect} from '../../../packages/community/client';

const ready=(game:any)=>game.installed??(!game.builtin&&!game.error);
const version=(game:any)=>game.version==='跟随整合包'?'跟随整合包':game.version;

export function PackIcon({game}:any){
 const type=game.id.includes('mod-1')?1:game.id.includes('mod-2')?2:game.builtin?0:3;
 return <div className={'pack-emblem emblem-'+type}>
  <svg viewBox="0 0 112 112" aria-hidden="true">
   <defs><linearGradient id={'top-'+type} x2="0" y2="1"><stop stopColor="currentColor"/><stop offset="1" stopColor="currentColor" stopOpacity=".6"/></linearGradient></defs>
   {type===0?<><path d="M56 19 95 41 56 63 17 41Z" fill="#80c7ad"/><path d="M17 41 56 63 56 103 17 81Z" fill="#416e62"/><path d="M95 41 56 63 56 103 95 81Z" fill="#599a82"/><path d="m17 41 39 22 39-22v13L56 76 17 54Z" fill="#84cbae"/><path d="m30 33 13 8-13 8-13-8Z" fill="#a1dcc6"/><path d="m56 19 13 7-13 8-13-8Z" fill="#bce6d5"/><path d="m69 42 13-8 13 7-13 8Z" fill="#69b993"/><path d="m30 69 13 7v11l-13-7Z" fill="#72957b"/><path d="m68 80 13-8v11l-13 8Z" fill="#6fac91"/></>:type===1?<><path d="M24 86h68v10H24z" fill="#ad8861"/><path d="M49 51h14v37H49z" fill="#8c6b4d"/><path d="M48 15h16l3 12 11 6 12-3 8 14-9 9v13l9 10-8 14-13-4-10 6-3 11H48l-3-11-11-6-12 4-8-14 9-10V53l-9-9 8-14 12 3 11-6Z" transform="translate(8,-1) scale(.86)" fill="#dcb484"/><circle cx="56" cy="50" r="23" fill="#8c6b4d"/><circle cx="56" cy="50" r="15" fill="#f4d8b4"/><circle cx="56" cy="50" r="6" fill="#b78d5b"/><path d="M51 32h10" stroke="#fff0d2" strokeWidth="3" strokeLinecap="round"/></>:type===2?<><path d="m56 15 38 22-38 22-38-22Z" fill="#bbb3ef"/><path d="m18 37 38 22v38L18 75Z" fill="#7970b8"/><path d="m94 37-38 22v38l38-22Z" fill="#948aca"/><path d="m56 28 16 9-16 9-16-9Z" fill="#f0eaff"/><path d="m29 51 17 10v20L29 71Z" fill="#bfb4ed"/><path d="m65 65 18-10v14L65 79Z" fill="#ded4ff"/><path d="m35 14-8 4M88 87l8 5" stroke="#b4abe2" strokeWidth="3" strokeLinecap="round"/></>:<><path d="m56 19 37 21-37 22-37-22Z" fill="#94b1df"/><path d="m19 40 37 22v39L19 79Z" fill="#5b759f"/><path d="m93 40-37 22v39l37-22Z" fill="#7596c5"/><path d="m39 29 35 21v19l9-5V45L49 23Z" fill="#d2e2f7"/></>}
  </svg>
 </div>;
}

export function GameLibrary(){
 const s=useSnapshot(state),t=useSnapshot(task),role=account(s);
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[manager,setManager]=useState(false),[order,setOrder]=useState('default');
 const locked=t.busy||s.running;
 const games=s.instances.filter((game:any)=>(game.name+' '+game.version).toLowerCase().includes(query.toLowerCase())&&(filter==='all'||filter==='official'&&game.builtin||filter==='local'&&!game.builtin||filter==='favorites'&&cfg(game.id,s).favorite)).slice().sort((a:any,b:any)=>Number(!!b.builtin)-Number(!!a.builtin)||(order==='name'?a.name.localeCompare(b.name,'zh-CN'):Number(cfg(b.id,s).favorite)-Number(cfg(a.id,s).favorite)));
 const openManager=async(game:any)=>{await selectInstance(game.id);setManager(true);};
 const start=async(game:any)=>{if(locked){ui.tasks=true;return;}await selectInstance(game.id);await launch(game.id);};
 const menu=(game:any)=>[
  {label:'管理实例',icon:Settings2,disabled:locked,action:()=>openManager(game)},
  {label:'打开版本文件夹',icon:FolderOpen,disabled:!ready(game),action:()=>invoke('instance.folder',{id:game.id,kind:'versions'})},
  {label:cfg(game.id,s).favorite?'取消收藏':'收藏',icon:Star,disabled:locked,action:async()=>{await invoke('instance.favorite',{id:game.id,favorite:!cfg(game.id,s).favorite});await reload();}},
  {label:'导出整合包',icon:FileUp,disabled:locked||!ready(game),action:()=>invoke('instance.export',{id:game.id})},
  {separator:true},{label:game.builtin?'默认服务器不可删除':'删除实例',icon:Trash2,danger:true,disabled:game.builtin||locked,action:()=>{ui.instance=game.id;ui.dialog='delete';}}
 ];
 return <div className="play-library">
  <header className="play-library-toolbar"><div className="library-location"><h1>我的游戏</h1><button onClick={()=>perform(chooseRoot)} title={s.settings.gameRoot||'选择游戏目录'}><FolderOpen size={15}/><span>{s.settings.gameRoot||'选择已有游戏目录'}</span><ChevronDown size={12}/></button></div>
   <div className="library-profile">{role?<Dropdown trigger={<button className="library-account"><Avatar name={role.name} image={role.avatar} size={33}/><span><small>当前角色</small><strong>{role.name||role.username}</strong></span><ChevronDown size={14}/></button>} items={[...s.accounts.map((a:any)=>({label:a.name||a.username,detail:a.id===role.id?'当前':'',action:async()=>{disconnect();await saveSettings({selectedAccount:a.id});void connect();}})),{separator:true},{label:'管理账号与角色',action:()=>location.hash='/account'},{label:'添加账号',icon:Plus,action:()=>ui.dialog='account'}]}/>:<Button icon={UserRound} onClick={()=>ui.dialog='account'}>登录角色</Button>}</div>
  </header>
  <div className="play-library-filter"><nav aria-label="游戏分类">{[{id:'all',label:'全部游戏'},{id:'official',label:'默认服务器'},{id:'local',label:'本地实例'},{id:'favorites',label:'收藏'}].map(f=><button key={f.id} aria-pressed={filter===f.id} className={filter===f.id?'active':''} onClick={()=>setFilter(f.id)}>{f.label}{f.id==='all'&&<small>{s.instances.length}</small>}</button>)}</nav><div className="play-library-actions"><div className="search"><Search size={16}/><input placeholder="搜索游戏" aria-label="搜索游戏" value={query} onChange={e=>setQuery(e.target.value)}/></div><Dropdown trigger={<button className="button icon-button" aria-label="排序与刷新"><ListFilter size={17}/></button>} items={[{label:'默认顺序',detail:order==='default'?'✓':'',action:()=>setOrder('default')},{label:'按名称排序',detail:order==='name'?'✓':'',action:()=>setOrder('name')},{separator:true},{label:'刷新游戏库',icon:RefreshCw,disabled:locked,action:reload}]}/><Button icon={PackageOpen} disabled={locked} onClick={()=>importPack()}>导入</Button><Link className="button solid" to="/workshop/install"><Plus size={16}/>安装游戏</Link></div></div>
  <div className="play-library-scroll">
   <div className="direct-game-grid">{games.map((game:any)=>{
    const running=s.running&&selected(s)?.id===game.id,busy=t.busy&&selected(s)?.id===game.id;
    return <article className={'direct-game-card '+(running||busy?'game-active':'')} key={game.id}>
     <div className="game-card-head"><span className={'game-source '+(game.builtin?'official':'')}>{game.builtin?'幻想镇 · 默认服务器':'本地实例'}</span><Dropdown trigger={<button className="card-menu" aria-label={game.name+'的更多操作'}><MoreHorizontal size={19}/></button>} items={menu(game)}/></div>
     <button className="game-identity" disabled={locked} onClick={()=>perform(()=>openManager(game))} aria-label={'管理 '+game.name}><PackIcon game={game}/><span><h2>{game.name}</h2><span className="game-version-tags"><small>{version(game)}</small>{game.loader&&game.loader!=='跟随整合包'&&<small>{game.loader}</small>}</span></span></button>
     <div className="game-card-status"><i className={running?'running':game.error?'broken':ready(game)?'ready':''}/><span>{running?'游戏运行中':busy?t.phase:game.placeholder?'尚未开放':game.error?'需要修复':ready(game)?'已安装，可直接启动':'尚未安装'}</span>{cfg(game.id,s).favorite&&<Star size={13} className="card-favorite"/>}{cfg(game.id,s).autoUpdate&&<small title="启动前自动检查 HXZ UP 更新"><RefreshCw size={11}/>自动更新</small>}</div>
     <div className="game-card-bottom"><Button tone={running?'danger':'solid'} className="card-launch" icon={running?Square:busy?Layers:ready(game)?Play:ArrowDownToLine} disabled={game.placeholder||(locked&&!running&&!busy)} onClick={()=>running?invoke('game.stop'):start(game)}>{running?'结束游戏':busy?'查看任务':ready(game)?'启动游戏':'安装并启动'}</Button><Button className="card-manage" icon={Settings2} disabled={locked} onClick={()=>openManager(game)}>管理</Button></div>
    </article>;
   })}
   {!query&&<Link className="add-game-card" to="/workshop/install"><span><Plus size={25}/></span><strong>添加游戏</strong><small>安装新版本或导入整合包</small></Link>}
   </div>
   {!games.length&&query&&<Empty title="没有找到匹配的游戏">试试其他名称或版本号。</Empty>}
   <div className="library-drop-hint"><PackageOpen size={15}/><span>支持拖入整合包，也可选择其他启动器的 .minecraft 目录。</span></div>
  </div>
  {t.busy&&<button className="library-current-task" onClick={()=>ui.tasks=true}><RefreshCw size={18} className="spin"/><span><strong>{t.phase}</strong><small>{t.total?`${t.completed} / ${t.total} ${t.unit} · ${bytes(t.speed)}/s`:'正在准备任务'}</small></span>{t.total>0&&<progress value={t.completed} max={t.total}/>}<span>查看详情<ArrowUpRight size={15}/></span></button>}
  <Dialog.Root open={manager} onOpenChange={setManager}><Dialog.Portal><Dialog.Overlay className="instance-manager-overlay"/><Dialog.Content className="instance-manager-drawer" aria-describedby={undefined}><header><Dialog.Title>实例管理</Dialog.Title><Dialog.Close asChild><IconButton icon={X} label="返回游戏库"/></Dialog.Close></header><InstanceManager/></Dialog.Content></Dialog.Portal></Dialog.Root>
 </div>;
}
