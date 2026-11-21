import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ArrowLeft,ArrowRight,Check,ChevronRight,Download,FolderOpen,GalleryVerticalEnd,Image,LayoutGrid,Play,Search,Settings2,Square,UserRound} from 'lucide-react';
import {resumeTarget} from '../../../../packages/engine/core/resume.mjs';
import {PackIcon} from '../GameLibrary';
import {account,chooseRoot,perform,selectInstance,startOrStopInstance,state,task,ui} from '../model';
import {Avatar,Modal} from '../ui';

type Game={id:string;name:string;version?:string;loader?:string;installed?:boolean;placeholder?:boolean;error?:string};
function description(game:Game){
  return [game.version,game.loader,game.installed?'已安装':'可安装'].filter(Boolean).join(' · ');
}

function InstancePicker({games,current,initialSearch,close}:{games:readonly Game[];current?:string;initialSearch:string;close:()=>void}){
  const root=useSnapshot(state).settings.gameRoot;
  const [search,setSearch]=useState(initialSearch),[page,setPage]=useState(0),[saving,setSaving]=useState(false);
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
  return <Modal open title="版本选择" onClose={close}>
    <label className="finder-input"><Search size={17}/><input autoFocus aria-label="查找游戏实例" placeholder="搜索名称、版本或加载器" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label>
    <div className="lite-picker-results">{matches.slice(index*pageSize,(index+1)*pageSize).map(game=>
      <button key={game.id} type="button" disabled={saving} aria-pressed={game.id===current} onClick={()=>perform(()=>choose(game.id))}>
        <PackIcon game={game}/><span><strong>{game.name}</strong><small>{description(game)}</small></span>{game.id===current&&<Check size={17} aria-label="当前实例"/>}
      </button>)}</div>
    {!matches.length&&<p role="status">没有找到匹配的实例。可以换一个名称或版本号。</p>}
    <div className="lite-picker-directory"><span><strong>游戏目录</strong><small>{root||'尚未选择'}</small></span><button className="small-action" disabled={saving} onClick={()=>perform(chooseRoot)}><FolderOpen size={15}/>{root?'更换目录':'选择目录'}</button></div>
    {pages>1&&<nav className="lite-pagination" aria-label="实例分页"><button className="small-action" aria-label="上一页" disabled={index===0} onClick={()=>setPage(index-1)}><ArrowLeft size={15}/></button><span>{index+1} / {pages}</span><button className="small-action" aria-label="下一页" disabled={index+1===pages} onClick={()=>setPage(index+1)}><ArrowRight size={15}/></button></nav>}
  </Modal>;
}

export function LiteHome(){
  const s=useSnapshot(state),u=useSnapshot(ui),t=useSnapshot(task),role=account(s);
  const [query,setQuery]=useSearchParams(),picking=query.has('versions');
  const setPicking=(open:boolean)=>setQuery(current=>{const next=new URLSearchParams(current);if(open)next.set('versions','');else next.delete('versions');return next;},{replace:true});
  const games:Game[]=s.instances.filter((game:Game)=>!game.placeholder&&!game.error);
  const resumed=resumeTarget(games,s.settings,u.liteSelection);
  const game=resumed?.game||games.find(g=>g.installed)||games[0];
  const running=game&&s.sessions.some((row:any)=>row.instance===game.id&&row.root===s.settings.gameRoot);
  const canChange=!t.busy&&!(s.running&&s.settings.keepLauncherAvailable===false);
  const previous=resumed?.reason==='last'&&resumed.game.id===game?.id;
  const caption=running?'游戏运行中':previous?'上次游玩':'当前实例';
  const action=running?'停止游戏':!game?.installed?'安装并启动':previous?'继续游玩':'启动游戏';
  return <section className="lite-workspace" aria-labelledby="lite-title">
    <div className="lite-rail">
      <header className="lite-rail-heading"><h1 id="lite-title">极简启动</h1></header>
      <div className="lite-identity">
        <Avatar name={role?.name||'旅'} image={role?.avatar} size={54}/>
        <strong>{role?.name||'本地游客'}</strong>
        {role?.authenticated?<Link className="text-action" to="/lite/account"><UserRound size={14}/>管理角色</Link>
        :<button className="text-action" onClick={()=>{ui.dialog='account';}}><UserRound size={14}/>登录幻想镇账号</button>}
      </div>
      <section className="lite-game" aria-label="版本与启动">
        <div className="lite-version-info">
          {game&&<PackIcon game={game}/>}
          <div><span className="lite-caption">{game?caption:'游戏实例'}</span>
            <h2>{game?.name||'还没有游戏实例'}</h2>
            <p>{game?description(game):'选择游戏目录或下载一个版本。'}</p></div>
        </div>
        {game?<button className="launch-primary lite-launch" aria-label={action} disabled={!!t.busy||(!running&&!canChange)} onClick={()=>perform(()=>startOrStopInstance(game.id))}>
          {running?<Square size={18}/>:<Play size={18}/>} {action}</button>
        :<Link className="launch-primary lite-launch" to="/lite/download"><Download size={17}/>下载游戏</Link>}
        <div className="lite-version-actions">
          <button className="small-action" disabled={!canChange} onClick={()=>setPicking(true)}><GalleryVerticalEnd size={15}/>版本选择</button>
          <button className="small-action" disabled={!game||!canChange} onClick={()=>{if(game){ui.instance=game.id;ui.dialog='instance';}}}><Settings2 size={15}/>版本设置</button>
        </div>
      </section>
    </div>
    <div className="lite-scene"><Link className="small-action" to="/lite/settings/wallpaper"><Image size={15}/>更换背景</Link></div>
    {picking&&<InstancePicker initialSearch={query.get('versions')||''} games={games} current={game?.id} close={()=>setPicking(false)}/>}
  </section>;
}

export function LiteMore(){
  return <section className="launch-page lite-more"><header className="launch-title"><h1>更多功能</h1></header>
    <nav aria-label="极简版工具">
      <Link to="/lite?versions="><GalleryVerticalEnd size={19}/><span>版本选择</span><ChevronRight size={15}/></Link>
      <Link to="/lite/points"><LayoutGrid size={19}/><span>我的积分</span><ChevronRight size={15}/></Link>
      <Link to="/lite/account"><UserRound size={19}/><span>账号与角色</span><ChevronRight size={15}/></Link>
      <Link to="/lite/settings/wallpaper"><Image size={19}/><span>玩家壁纸</span><ChevronRight size={15}/></Link>
    </nav>
    <section className="lite-workspace-exit"><div><h2>完整工作台</h2><p>联机大厅、社区、小游戏和音乐播放器可在完整工作台中使用。</p></div>
      <Link to="/" className="small-action"><LayoutGrid size={16}/>切换到完整工作台</Link></section>
  </section>;
}
