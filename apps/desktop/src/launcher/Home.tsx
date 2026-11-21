import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ArrowRight,Download,FileUp,FolderOpen,History,Layers3,Music2,Network,Palette,Play,Search,Square} from 'lucide-react';
import {resumeTarget} from '../../../../packages/engine/core/resume.mjs';
import {wallpaperSource} from '../../../../packages/engine/core/desktop-wallpaper.mjs';
import {homeLayoutKey,workspaceLayout,workspaceModules} from '../../../../packages/engine/core/desktop-workspace.mjs';
import {chooseRoot,importPack,invoke,launch,perform,selectInstance,state,task} from '../model';
import {CardBoard,CardHeading} from '../CardBoard';
import {PackIcon} from '../GameLibrary';
import {HomeRole,HomeServers,InstanceSummary,PlayCalendar} from './HomeSidebar';

const quickLinks=[{to:'/workshop/install',name:'安装游戏',icon:Download},{to:'/multiplayer',name:'联机大厅',icon:Network},{to:'/music',name:'音乐播放器',icon:Music2}];
export function Home(){
  const s=useSnapshot(state),t=useSnapshot(task),[query,setQuery]=useState(''),[focus,setFocus]=useState(''),[filter,setFilter]=useState('all');
  const layout=workspaceLayout(s.settings.workspaceLayout).id,modules=workspaceModules(s.settings.workspaceModules);
  const previous=resumeTarget(s.instances,s.settings),last=previous?.game,term=query.trim().toLowerCase();
  const games=useMemo(()=>[...s.instances].filter(game=>!game.placeholder).sort((a,b)=>
    Number(b.id===last?.id)-Number(a.id===last?.id)||Number(!!s.settings.instanceSettings[b.id]?.favorite)-Number(!!s.settings.instanceSettings[a.id]?.favorite)||
    Number(!!b.installed)-Number(!!a.installed)),[s.instances,last?.id,s.settings.instanceSettings]);
  const libraryFilter=layout==='library'?filter:'all';
  const filtered=games.filter(g=>libraryFilter==='all'||(libraryFilter==='installed'?g.installed:s.settings.instanceSettings[g.id]?.favorite));
  const matches=filtered.filter(g=>[g.name,g.id,g.version,g.loader].some(value=>String(value||'').toLowerCase().includes(term)));
  const focused=games.find(g=>g.id===focus)||last||games[0],featured=modules.featured&&!term&&libraryFilter==='all'&&last;
  const count=layout==='library'?7:layout==='journal'?2:4;
  const rows=matches.filter(g=>!featured||g.id!==last.id).slice(0,featured?count-1:count);
  async function start(game:any){
    const session=s.sessions?.find((row:any)=>row.instance===game.id&&row.root===s.settings.gameRoot);
    if(session){await invoke('game.stop',{key:session.key});return;}
    await selectInstance(game.id);await launch(game.id);
  }
  function gameRow(game:any,feature=false){
    const isLast=game.id===last?.id,running=s.sessions?.some((r:any)=>r.instance===game.id&&r.root===s.settings.gameRoot);
    const version=game.version===game.id?'本地实例':game.version;
    const meta=[version,game.loader,game.installed?'已安装':'可安装'].filter(Boolean).join(' · ');
    const cover=feature&&modules.coverArt&&s.settings.showCover!==false&&(wallpaperSource({wallpaperMode:'image',backgroundImage:s.settings.instanceSettings[game.id]?.coverMedia||s.settings.defaultCover})?.url||'./media/hero.webp');
    return <article data-cover={cover?true:undefined} key={game.id} className={['home-instance-row',focused?.id===game.id?'focused':'',isLast?'resume-panel':'',feature?'featured-game':''].join(' ')}>
      {cover&&<img className="feature-illustration" alt="" src={cover} onError={e=>{e.currentTarget.hidden=true;}}/>}
      <button className="instance-info" aria-label={'查看 '+game.name+' 的详情'} onClick={()=>setFocus(game.id)}>
        <PackIcon game={game}/><span>{feature&&<span className="resume-caption"><History size={13}/>{previous?.reason==='last'?'上次游玩':'当前实例'}</span>}
          <strong>{game.name}</strong><small>{meta}</small></span></button>
      <button className={isLast?'launch-primary':'small-action'} disabled={t.busy||game.placeholder} onClick={()=>perform(()=>start(game))}>
        {running?<Square size={15}/>:<Play size={15}/>}<span>{running?'停止游戏':game.installed?(isLast&&previous?.reason==='last'?'继续游玩':'启动'):'安装并启动'}</span></button>
    </article>;
  }
  const instances=<><CardHeading title={<><Layers3 size={16}/>游戏实例</>}>{!s.settings.gameRoot&&<button className="text-action" onClick={()=>perform(chooseRoot)}><FolderOpen size={15}/>选择游戏目录</button>}</CardHeading>
    {featured&&gameRow(featured,true)}
    <div className="instance-toolbar"><label><Search size={16}/><input aria-label="搜索实例" placeholder="搜索实例" value={query} onChange={event=>setQuery(event.target.value)}/></label>
      <button className="small-action" onClick={()=>perform(()=>importPack())}><FileUp size={15}/>导入</button><Link className="small-action" to="/workshop/install"><Download size={15}/>下载</Link></div>
    {layout==='library'&&<div className="instance-filters" aria-label="实例范围">{[['all','全部'],['installed','已安装'],['favorites','收藏']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>}
    <div className="desk-instance-list">{rows.map(game=>gameRow(game))}
      {!matches.length&&<p className="desk-empty">{term?'没有匹配的实例。':libraryFilter==='favorites'?'还没有收藏的实例。可以在游戏库中收藏常玩的游戏。':libraryFilter==='installed'?'当前目录还没有安装游戏。':'还没有可用实例。可以选择游戏目录，或下载第一个游戏。'}</p>}</div>
    <footer><small>{term||libraryFilter!=='all'?'找到 '+matches.length+' 个匹配实例':games.filter(g=>g.installed).length+' 个已安装'}</small><Link to={'/library'+(term?'?q='+encodeURIComponent(query):'')}>管理实例 <ArrowRight size={14}/></Link></footer></>;
  return <section className="launch-page game-home"><CardBoard id="home" layoutKey={homeLayoutKey(layout)} columns={workspaceLayout(layout).columns} label={layout==='journal'?'游玩手记':layout==='library'?'实例控制台':'启动游戏'} home pageTitle
    actions={<Link className="small-action appearance-shortcut" to="/settings?section=appearance"><Palette size={15}/>外观</Link>}
    beforeCards={modules.quickLinks&&<nav className="home-quick-links" aria-label="首页快捷入口">{quickLinks.map(({to,name,icon:Icon})=><Link to={to} key={to}><Icon size={16}/>{name}<ArrowRight size={13}/></Link>)}</nav>}
    cards={[
      {id:'library',title:'游戏实例',w:8,className:'instances-card',content:instances,native:true},
      {id:'roles',title:'我的角色',w:4,className:'home-role-card',content:<HomeRole/>,native:true},
      {id:'monitor',title:'默认服务器',w:4,className:'home-servers-card',content:<HomeServers/>,native:true},
      {id:'playtime',title:'游玩日历',w:8,className:'calendar-card',content:<PlayCalendar journal={layout==='journal'}/>,native:true},
      {id:'launch',title:'实例详情',w:4,className:'home-detail-card',content:<InstanceSummary game={focused}/>,native:true}
    ]}/></section>;
}
