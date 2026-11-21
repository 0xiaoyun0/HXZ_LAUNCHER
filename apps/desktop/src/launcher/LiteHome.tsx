import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ArrowLeft,ArrowRight,ArrowLeftRight,Check,Download,FolderOpen,Play,Search,Square,UserRound} from 'lucide-react';
import {resumeTarget} from '../../../../packages/engine/core/resume.mjs';
import {PackIcon} from '../GameLibrary';
import {account,chooseRoot,perform,selectInstance,startOrStopInstance,state,task,ui} from '../model';
import {Avatar,Modal} from '../ui';

type Game={id:string;name:string;version?:string;loader?:string;installed?:boolean;placeholder?:boolean;error?:string};
function description(game:Game){
  return [game.version,game.loader,game.installed?'已安装':'可安装'].filter(Boolean).join(' · ');
}

function InstancePicker({games,current,close}:{games:readonly Game[];current?:string;close:()=>void}){
  const [search,setSearch]=useState(''),[page,setPage]=useState(0),[saving,setSaving]=useState(false);
  const term=search.trim().toLowerCase(),matches=games.filter(game=>[game.name,game.id,game.version,game.loader].some(v=>String(v??'').toLowerCase().includes(term)));
  const pageSize=6,pages=Math.max(1,Math.ceil(matches.length/pageSize)),index=Math.min(page,pages-1);
  async function choose(id:string){
    setSaving(true);
    try{
      await selectInstance(id);
      if(state.settings.selectedInstance===id){
        ui.liteSelection={id,root:state.settings.gameRoot};
        close();
      }
    }finally{setSaving(false);}
  }
  return <Modal open title="切换实例" onClose={close}>
    <label className="finder-input"><Search size={17}/><input autoFocus aria-label="查找游戏实例" placeholder="搜索名称、版本或加载器" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label>
    <div className="lite-picker-results">{matches.slice(index*pageSize,(index+1)*pageSize).map(game=>
      <button key={game.id} type="button" disabled={saving} aria-pressed={game.id===current} onClick={()=>perform(()=>choose(game.id))}>
        <PackIcon game={game}/><span><strong>{game.name}</strong><small>{description(game)}</small></span>{game.id===current&&<Check size={17} aria-label="当前实例"/>}
      </button>)}</div>
    {!matches.length&&<p role="status">没有找到匹配的实例。可以换一个名称或版本号。</p>}
    {pages>1&&<nav className="lite-pagination" aria-label="实例分页"><button className="small-action" aria-label="上一页" disabled={index===0} onClick={()=>setPage(index-1)}><ArrowLeft size={15}/></button><span>{index+1} / {pages}</span><button className="small-action" aria-label="下一页" disabled={index+1===pages} onClick={()=>setPage(index+1)}><ArrowRight size={15}/></button></nav>}
  </Modal>;
}

export function LiteHome(){
  const s=useSnapshot(state),u=useSnapshot(ui),t=useSnapshot(task),role=account(s);
  const [picking,setPicking]=useState(false);
  const games:Game[]=s.instances.filter((game:Game)=>!game.placeholder&&!game.error);
  const resumed=resumeTarget(games,s.settings);
  const choice=u.liteSelection;
  const chosen=choice&&choice.root===s.settings.gameRoot&&choice.id===s.settings.selectedInstance?games.find(game=>game.id===choice.id):undefined;
  const game=chosen||resumed?.game||games.find(g=>g.installed)||games[0];
  const running=game&&s.sessions.some((row:any)=>row.instance===game.id&&row.root===s.settings.gameRoot);
  const canChange=!t.busy&&!(s.running&&s.settings.keepLauncherAvailable===false);
  const previous=resumed?.reason==='last'&&resumed.game.id===game?.id;
  const caption=running?'游戏运行中':previous?'上次游玩':'当前实例';
  const action=running?'停止游戏':!role?.authenticated?'登录账号':!game?.installed?'安装并启动':previous?'继续游玩':'启动游戏';
  return <section className="launch-page lite-page" aria-labelledby="lite-title">
    <header className="launch-title"><h1 id="lite-title">极简启动</h1></header>
    <div className="lite-workspace">
      <article className="lite-game lite-panel">
        <div className="lite-game-info">
          {game&&<PackIcon game={game}/>}
          <div><span className="lite-caption">{game?caption:'游戏实例'}</span><h2>{game?.name||'还没有游戏实例'}</h2><p>{game?description(game):'选择已有的游戏目录，或下载第一个实例。'}</p></div>
        </div>
        <div className="lite-actions">
          {game?<button className="launch-primary" disabled={!!t.busy||(!running&&!canChange)} onClick={()=>perform(()=>startOrStopInstance(game.id))}>
            {running?<Square size={17}/>:!role?.authenticated?<UserRound size={17}/>:<Play size={17}/>} {action}</button>
          :<Link className="launch-primary" to="/workshop/install"><Download size={17}/>下载游戏</Link>}
          {!!games.length&&<button className="small-action" disabled={!canChange} onClick={()=>setPicking(true)}><ArrowLeftRight size={16}/>切换实例</button>}
        </div>
      </article>
      <aside className="lite-profile lite-panel" aria-label="角色和游戏目录">
        <section><h2 className="lite-caption">当前角色</h2><div className="lite-role"><Avatar name={role?.name||'旅'} image={role?.avatar} size={38}/><div><strong>{role?.name||'本地游客'}</strong>
          <Link to="/account">{role?.authenticated?'管理角色':'账号与角色'} <ArrowRight size={13}/></Link></div></div></section>
        <section><h2 className="lite-caption">游戏目录</h2><p className="lite-path" title={s.settings.gameRoot}>{s.settings.gameRoot||'尚未选择目录'}</p>
          <button className="text-action" disabled={!canChange} onClick={()=>perform(chooseRoot)}><FolderOpen size={15}/>{s.settings.gameRoot?'更换目录':'选择游戏目录'}</button></section>
      </aside>
    </div>
    {picking&&<InstancePicker games={games} current={game?.id} close={()=>setPicking(false)}/>}
  </section>;
}
