import {Fragment,useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ChevronRight,Globe,MessageSquare,Megaphone,Play,RefreshCw,SlidersHorizontal} from 'lucide-react';
import {CommunityNavigation} from '../../desktop/src/launcher/Social';
import {SectionHeading} from '../../desktop/src/SectionHeading';
import {invoke} from '../../desktop/src/model';
import {useLocalMedia,type Personalization} from './personalization';
import type {AppearanceSection} from './TownAppearance';

export type TownServer={id:string;group:string;name:string;address:string;version:string;loader:string;loaderVersion:string;enabled:boolean;profileSource?:string;profileState?:'preset'|'cached'|'fresh'};
type Topic={id:string;title:string;name:string;replies:number};
type Notice={id:string;serverId:string;title:string;body:string};
export function useDirectory(){
  const [servers,setServers]=useState<TownServer[]>([]),[notices,setNotices]=useState<Notice[]>([]);
  const [topics,setTopics]=useState<Topic[]>([]),[topicStatus,setTopicStatus]=useState('');
  const [serverStatus,setServerStatus]=useState(''),[newsStatus,setNewsStatus]=useState(''),[tick,setTick]=useState(0);
  useEffect(()=>{
    let current=true;
    async function read<T,>(action:string,set:(value:T)=>void,status:(v:string)=>void){
      status('loading');
      try {
        const local=await invoke<T>(action);
        if(current)set(local);
        const fresh=await invoke<T>(action+'.refresh');
        if(current){set(fresh);status('ready');}
      } catch {if(current)status('offline');}
    }
    void read<TownServer[]>('android.directory',setServers,setServerStatus);
    void read<Notice[]>('android.notices',setNotices,setNewsStatus);
    void read<Topic[]>('android.topics',setTopics,setTopicStatus);
    return ()=>{current=false;};
  },[tick]);
  return {servers,notices,topics,serverStatus,newsStatus,topicStatus,refresh:()=>setTick(x=>x+1)};
}
type Directory=ReturnType<typeof useDirectory>;
const detail=(id:string)=>'/town/world/'+encodeURIComponent(id);
const serverIcons:Record<string,string>={survival:'survival','mod-1':'mod-1','mod-2':'mod-2'};
function ServerMark({group}:{group:string}){
  const icon=serverIcons[group];
  return icon?<img className="town-server-mark" width="44" height="44" alt="" src={'./media/town/'+icon+'.png'}/>:<Globe size={24} aria-hidden/>;
}
function versionLabel(server:TownServer,showBuild=false){
  const loader=({neoforge:'NeoForge',fabric:'Fabric',quilt:'Quilt',forge:'Forge'} as Record<string,string>)[server.loader]||server.loader;
  return [server.version||'随整合包匹配',loader,showBuild&&server.loaderVersion].filter(Boolean).join(' · ');
}
export function WorldList({directory}:{directory:Directory}){
  return <section className="desk-card" data-home-card="servers"><SectionHeading title={<><Globe size={17}/> 社区服务器</>} actions={<button className="icon-button" aria-label="刷新服务器" onClick={directory.refresh}><RefreshCw size={16}/></button>}/>
    <div className="town-list">{directory.servers.map(server=><Link to={detail(server.id)} key={server.id} className="town-item">
    <ServerMark group={server.group}/><span><strong>{server.name}</strong><small>{versionLabel(server)}</small></span><span className="town-tail">{!server.enabled&&'暂未开放'}<ChevronRight size={16}/></span></Link>)}</div>
    {!directory.servers.length&&<p className="desk-empty" role="status">{directory.serverStatus==='offline'?'暂时读不到服务器目录。':'正在读取服务器…'}</p>}
  </section>;
}
export function TownLobby({directory,personal,edit}:{directory:Directory;personal:Personalization;edit:(section:AppearanceSection)=>void}){
  const {layout,media}=personal,custom=useLocalMedia(layout.cover==='custom'?media.cover?.blob:undefined);
  const cover=layout.cover==='scene'?'./media/town/town-hall.webp':custom;
  const cards={
    servers:<WorldList directory={directory}/>,
    notices:<section className="desk-card" data-home-card="notices"><SectionHeading title={<><Megaphone size={17}/> 服务器公告</>} actions={<button className="icon-button" aria-label="刷新公告" onClick={directory.refresh}><RefreshCw size={16}/></button>}/>
    <div className="town-list">{directory.notices.map(n=><Link key={n.id} className="town-item town-article" to={detail(n.serverId)+'?notice='+encodeURIComponent(n.id)}><span><small>{directory.servers.find(s=>s.id===n.serverId)?.name||'社区公告'}</small><strong>{n.title}</strong></span><ChevronRight size={16}/></Link>)}</div>
    {!directory.notices.length&&<p className="desk-empty" role="status">{directory.newsStatus==='loading'?'正在读取公告…':directory.newsStatus==='offline'?'暂时连不上公告服务。':'目前没有服务器公告。'}</p>}</section>,
    topics:<section className="desk-card" data-home-card="topics"><SectionHeading title={<><MessageSquare size={17}/> 近期讨论</>} actions={<Link className="text-action" to="/community/forum">论坛<ChevronRight size={15}/></Link>}/>
    <div className="town-list">{directory.topics.map(t=><Link className="town-item town-article" key={t.id} to={'/community/forum/'+encodeURIComponent(t.id)}><span><strong>{t.title}</strong><small>{t.name} · {t.replies} 条回复</small></span><ChevronRight size={16}/></Link>)}</div>
    {!directory.topics.length&&<p className="desk-empty" role="status">{directory.topicStatus==='loading'?'正在读取讨论…':directory.topicStatus==='offline'?'暂时连不上论坛。':'还没有公开讨论。'}</p>}</section>
  };
  const visible=layout.order.filter(id=>!layout.hidden.includes(id));
  return <section className="launch-page town-content town-lobby">
    <header className="launch-title community-page-heading town-lobby-heading">
      <div className={cover?'town-hall-cover':'town-hall-title'}>
        {cover&&<img src={cover} alt="" style={{objectPosition:'50% '+layout.coverFocus+'%'}}/>}
        <div className="town-hall-title-row"><h1>社区大厅</h1><button type="button" className="town-home-edit" aria-label="自定义社区大厅" onClick={()=>edit('cover')}><SlidersHorizontal size={16}/>自定义</button></div>
      </div>
      <CommunityNavigation/>
    </header>
    <div className="town-home-cards">{visible.map(id=><Fragment key={id}>{cards[id]}</Fragment>)}</div>
    {!visible.length&&<button type="button" className="small-action" onClick={()=>edit('cards')}><SlidersHorizontal size={16}/>管理首页卡片</button>}
  </section>;
}
export function TownWorld({directory,member,playerName,identityReady,joining,join,children}:{directory:Directory;member:boolean;playerName?:string;identityReady:boolean;joining:boolean;join:(server:TownServer)=>void;children?:React.ReactNode}){
  const {id}=useParams(),[query]=useSearchParams();
  const server=directory.servers.find(s=>s.id===id);
  const [verified,setVerified]=useState<TownServer|null>(null);
  const [profileStatus,setProfileStatus]=useState<'loading'|'ready'|'offline'>('loading');
  const [refreshCount,setRefreshCount]=useState(0);
  const checkProfile=server?.enabled&&server.profileSource==='hxzup';
  useEffect(()=>{
    let current=true;
    setVerified(null);
    if(!checkProfile||!id)return;
    setProfileStatus('loading');
    invoke<TownServer>('android.server.profile',{server:id}).then(profile=>{
      if(current&&profile.id===id){setVerified(profile);setProfileStatus('ready');}
    }).catch(()=>{if(current)setProfileStatus('offline');});
    return ()=>{current=false;};
  },[id,checkProfile,refreshCount]);
  const reports=directory.notices.filter(n=>n.serverId===id);
  const selected=reports.find(n=>n.id===query.get('notice'));
  const profile=verified&&verified.id===id?verified:server;
  const offline=profileStatus==='offline'||profile?.profileState==='cached';
  const updateStatus=profileStatus==='loading'?'正在核对':offline?(profile?.version?'显示上次版本':'暂时无法核对'):'已核对';
  return <section className="launch-page town-content town-world"><Link to="/town" className="quiet-link town-back"><ArrowLeft size={16}/>社区大厅</Link>
    {server&&profile?<><header className="launch-title town-world-title"><ServerMark group={server.group}/><h1>{server.name}</h1></header><div className="town-stack"><section className="desk-card town-join-card">
      <SectionHeading title={<><Globe size={17}/> 入服信息</>}/>
      <dl className="detail-rows"><div><dt>游戏角色</dt><dd>{!identityReady?'正在读取…':member?playerName||'已登录角色':'尚未登录'}</dd></div><div><dt>服务器地址</dt><dd>{server.address}</dd></div><div><dt>游戏版本</dt><dd>{profile.version?versionLabel(profile,true):checkProfile&&profileStatus==='loading'?'正在读取…':'等待整合包版本'}</dd></div>
        {checkProfile&&<div><dt>整合包更新</dt><dd><span role="status">HXZUP · {updateStatus}</span>{offline&&profileStatus!=='loading'&&<button className="text-action" aria-label="重新核对整合包" onClick={()=>setRefreshCount(n=>n+1)}><RefreshCw size={15}/>重试</button>}</dd></div>}</dl>
      <div className="desk-actions"><button className="launch-primary" disabled={!server.enabled||!identityReady||joining} onClick={()=>join(server)}><Play size={16}/>{!server.enabled?'暂未开放':!identityReady?'正在读取角色…':joining?'正在准备…':member?'进入服务器':'登录并进入服务器'}</button></div>
    </section>{children}{selected&&<section className="desk-card"><SectionHeading title={<><Megaphone size={17}/> {selected.title}</>}/><p className="town-copy">{selected.body}</p></section>}{reports.some(n=>n.id!==selected?.id)&&<section className="desk-card"><SectionHeading title="同服公告"/><div className="town-list">{reports.filter(n=>n.id!==selected?.id).map(n=><Link key={n.id} className="town-item town-article" to={detail(server.id)+'?notice='+encodeURIComponent(n.id)}><strong>{n.title}</strong><ChevronRight size={16}/></Link>)}</div></section>}</div></>:
      <p role="status">{directory.serverStatus==='loading'?'正在读取服务器…':'没有找到这个社区服务器。'}</p>}</section>;
}
