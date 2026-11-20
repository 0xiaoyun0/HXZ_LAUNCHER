import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ArrowRight,Download,FileUp,FolderOpen,Layers3,Palette,Play,Search,Square} from 'lucide-react';
import {resumeTarget} from '../../../../packages/engine/core/resume.mjs';
import {chooseRoot,importPack,invoke,launch,perform,selectInstance,state,task} from '../model';
import {CardBoard,CardMenu} from '../CardBoard';
import {PackIcon} from '../GameLibrary';
import {HomeRole,HomeServers,InstanceSummary,PlayCalendar} from './HomeSidebar';

export function Home(){
  const s=useSnapshot(state),t=useSnapshot(task),[query,setQuery]=useState(''),[focus,setFocus]=useState('');
  const previous=resumeTarget(s.instances,s.settings),last=previous?.game,term=query.trim().toLowerCase();
  const games=useMemo(()=>[...s.instances].filter(game=>!game.placeholder).sort((a,b)=>
    Number(b.id===last?.id)-Number(a.id===last?.id)||Number(!!s.settings.instanceSettings[b.id]?.favorite)-Number(!!s.settings.instanceSettings[a.id]?.favorite)||
    Number(!!b.installed)-Number(!!a.installed)),[s.instances,last?.id,s.settings.instanceSettings]);
  const matches=games.filter(g=>[g.name,g.id,g.version,g.loader].some(value=>String(value||'').toLowerCase().includes(term)));
  const focused=games.find(g=>g.id===focus)||last||games[0];
  async function start(game:any){
    const session=s.sessions?.find((row:any)=>row.instance===game.id&&row.root===s.settings.gameRoot);
    if(session){await invoke('game.stop',{key:session.key});return;}
    await selectInstance(game.id);await launch(game.id);
  }
  const instances=<><header><h2><Layers3 size={16}/>游戏实例</h2>{!s.settings.gameRoot&&<button className="text-action" onClick={()=>perform(chooseRoot)}><FolderOpen size={15}/>选择游戏目录</button>}<CardMenu/></header>
        <div className="instance-toolbar"><label><Search size={16}/><input aria-label="搜索实例" placeholder="搜索实例" value={query} onChange={event=>setQuery(event.target.value)}/></label>
          <button className="small-action" onClick={()=>perform(()=>importPack())}><FileUp size={15}/>导入</button><Link className="small-action" to="/workshop/install"><Download size={15}/>下载</Link></div>
        <div className="desk-instance-list">{matches.slice(0,4).map(game=>{
          const isLast=game.id===last?.id,running=s.sessions?.some((r:any)=>r.instance===game.id&&r.root===s.settings.gameRoot);
          return <article key={game.id} className={'home-instance-row'+(focused?.id===game.id?' focused':'')+(isLast?' resume-panel':'')}>
            <button className="instance-info" aria-label={'查看 '+game.name+' 的详情'} onClick={()=>setFocus(game.id)}><PackIcon game={game}/><span><strong>{game.name}</strong>
            <small>{[game.version===game.id?'本地实例':game.version,game.loader,isLast&&previous?.reason==='last'?'上次游玩':game.installed?'已安装':'待安装'].filter(Boolean).join(' · ')}</small></span></button>
            <button className={isLast?'launch-primary':'small-action'} disabled={t.busy||game.placeholder} onClick={()=>perform(()=>start(game))}>{running?<Square size={15}/>:<Play size={15}/>}
              {running?'停止游戏':game.installed?(isLast&&previous?.reason==='last'?'继续游玩':'启动'):'安装并启动'}</button></article>;
        })}{!matches.length&&<p className="desk-empty">{term?'没有匹配的实例。':'还没有可用实例。可以选择游戏目录，或下载第一个游戏。'}</p>}</div>
        <footer><small>{term?'找到 '+matches.length+' 个匹配实例':games.filter(g=>g.installed).length+' 个已安装'}</small><Link to={'/library'+(term?'?q='+encodeURIComponent(query):'')}>管理实例 <ArrowRight size={14}/></Link></footer>
      </>;
  return <section className="launch-page game-home"><CardBoard id="home" label="启动游戏" home pageTitle actions={<Link className="small-action appearance-shortcut" to="/settings?section=appearance"><Palette size={15}/>外观</Link>} cards={[
    {id:'library',title:'游戏实例',w:8,className:'instances-card',content:instances,native:true},
    {id:'roles',title:'我的角色',w:4,className:'home-role-card',content:<HomeRole/>,native:true},
    {id:'monitor',title:'默认服务器',w:4,className:'home-servers-card',content:<HomeServers/>,native:true},
    {id:'playtime',title:'游玩日历',w:8,className:'calendar-card',content:<PlayCalendar/>,native:true},
    {id:'launch',title:'实例详情',w:4,className:'home-detail-card',content:<InstanceSummary game={focused}/>,native:true}
  ]}/></section>;
}
