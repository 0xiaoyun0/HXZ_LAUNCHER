import {Fragment,useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {ArrowLeft,Box,Boxes,ChevronRight,Globe,MessageSquare,Megaphone,Play,RefreshCw,SlidersHorizontal} from 'lucide-react';
import {SectionHeading} from '../../desktop/src/SectionHeading';
import {invoke} from '../../desktop/src/model';
import {useLocalMedia,type Personalization} from './personalization';
import type {AppearanceSection} from './TownAppearance';
import {TownPullRefresh} from './TownInteractions';
import {LatticeGlyph} from '../../desktop/src/launcher/micro/Feedback';
import {Modal} from '../../desktop/src/ui';

export type TownServer={id:string;group:string;name:string;address:string;version:string;loader:string;loaderVersion:string;enabled:boolean;profileSource?:string;profileState?:'preset'|'cached'|'fresh'};
type Topic={id:string;title:string;name:string;replies:number};
type Notice={id:string;serverId:string;title:string;body:string};
function NoticeArticle({notice}:{notice:Notice}){
  const [open,setOpen]=useState(false);
  const long=notice.body.length>180||notice.body.split('\n').length>4;
  return <article className="desk-card town-notice-story"><SectionHeading title={<><Megaphone size={18}/> {notice.title}</>}/>
    {notice.body&&<p className={'town-copy'+(long?' town-excerpt':'')}>{notice.body}</p>}
    {long&&<><button type="button" className="text-action" onClick={()=>setOpen(true)}>阅读全文<ChevronRight size={15}/></button>
      <Modal open={open} title={notice.title} onClose={()=>setOpen(false)}><p className="town-copy">{notice.body}</p></Modal></>}
  </article>;
}
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
  const refreshing=[serverStatus,newsStatus,topicStatus].includes('loading');
  return {servers,notices,topics,serverStatus,newsStatus,topicStatus,refreshing,refresh:()=>{if(!refreshing)setTick(x=>x+1);}};
}
type Directory=ReturnType<typeof useDirectory>;
const detail=(id:string)=>'/town/world/'+encodeURIComponent(id);
function ServerMark({group}:{group:string}){
  const Icon=group==='mod-1'?Box:group==='mod-2'?Boxes:Globe;
  return <span className="town-server-mark" aria-hidden="true"><Icon size={20}/></span>;
}
function versionLabel(server:TownServer,showBuild=false){
  const loader=({neoforge:'NeoForge',fabric:'Fabric',quilt:'Quilt',forge:'Forge'} as Record<string,string>)[server.loader]||server.loader;
  return [server.version||'随整合包匹配',loader,showBuild&&server.loaderVersion].filter(Boolean).join(' · ');
}
function Refresh({directory,label}:{directory:Directory;label:string}){
  return <button type="button" className="icon-button town-refresh" aria-label={label} disabled={directory.refreshing} onClick={directory.refresh}>
    {directory.refreshing?<LatticeGlyph/>:<RefreshCw size={16}/>}</button>;
}
export function WorldList({directory}:{directory:Directory}){
  return <section className="desk-card town-server-card" data-home-card="servers">
    <SectionHeading title="社区服务器" actions={<Refresh directory={directory} label="刷新服务器"/>}/>
    <div className="town-list">{directory.servers.map(server=><Link to={detail(server.id)} key={server.id} className="town-item">
    <ServerMark group={server.group}/><span><strong>{server.name}</strong><small>{versionLabel(server)}</small></span><span className="town-tail">{!server.enabled&&'暂未开放'}<ChevronRight size={16}/></span></Link>)}</div>
    {!!directory.servers.length&&directory.serverStatus==='offline'&&<p className="town-cache-note" role="status">暂时无法更新，显示本机服务器目录。</p>}
    {!directory.servers.length&&<p className="desk-empty" role="status">{directory.serverStatus==='offline'?'暂时读不到服务器目录。':'正在读取服务器…'}</p>}
  </section>;
}
export function TownLobby({directory,personal,edit}:{directory:Directory;personal:Personalization;edit:(section:AppearanceSection)=>void}){
  const {layout,media}=personal,custom=useLocalMedia(layout.cover==='custom'?media.cover?.blob:undefined);
  const cover=layout.cover==='scene'?'./media/town/town-hall.webp':custom;
  const cards={
    servers:<WorldList directory={directory}/>,
    notices:<section className="desk-card" data-home-card="notices"><SectionHeading title={<><Megaphone size={18}/> 服务器公告</>} actions={<Refresh directory={directory} label="刷新公告"/>}/>
    <div className="town-list">{directory.notices.map(n=><Link key={n.id} className="town-item town-article" to={detail(n.serverId)+'?notice='+encodeURIComponent(n.id)}><span><small className="town-source">{directory.servers.find(s=>s.id===n.serverId)?.name||'社区公告'}</small><strong>{n.title}</strong></span><ChevronRight size={16}/></Link>)}</div>
    {!directory.notices.length&&<p className="desk-empty" role="status">{directory.newsStatus==='loading'?'正在读取公告…':directory.newsStatus==='offline'?'暂时连不上公告服务。':'目前没有服务器公告。'}</p>}</section>,
    topics:<section className="desk-card" data-home-card="topics"><SectionHeading title={<><MessageSquare size={17}/> 近期讨论</>} actions={<Link className="text-action" to="/community/forum">论坛<ChevronRight size={15}/></Link>}/>
    <div className="town-list">{directory.topics.map(t=><Link className="town-item town-article" key={t.id} to={'/community/forum/'+encodeURIComponent(t.id)}><span><strong>{t.title}</strong><small>{t.name} · {t.replies} 条回复</small></span><ChevronRight size={16}/></Link>)}</div>
    {!directory.topics.length&&<p className="desk-empty" role="status">{directory.topicStatus==='loading'?'正在读取讨论…':directory.topicStatus==='offline'?'暂时连不上论坛。':'还没有公开讨论。'}</p>}</section>
  };
  const visible=layout.order.filter(id=>!layout.hidden.includes(id));
  return <section className="launch-page town-content town-lobby">
    <TownPullRefresh busy={directory.refreshing} refresh={directory.refresh}/>
    <header className="launch-title community-page-heading town-lobby-heading">
      <div className={cover?'town-hall-cover':'town-hall-title'}>
        {cover&&<img src={cover} alt="" style={{objectPosition:'50% '+layout.coverFocus+'%'}}/>}
        <div className="town-hall-title-row"><h1>社区大厅</h1><button type="button" className="town-home-edit" aria-label="自定义社区大厅" onClick={()=>edit('cover')}><SlidersHorizontal size={16}/>自定义</button></div>
      </div>
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
    {server&&profile?<><header className="launch-title town-world-title"><ServerMark group={server.group}/><h1>{server.name}</h1></header><div className="town-stack">
      {selected&&<NoticeArticle key={selected.id} notice={selected}/>}
      <section className="desk-card town-join-card">
      <SectionHeading title={<><Globe size={17}/> 入服信息</>}/>
      <dl className="detail-rows"><div><dt>游戏角色</dt><dd>{!identityReady?'正在读取…':member?playerName||'已登录角色':'尚未登录'}</dd></div><div><dt>服务器地址</dt><dd>{server.address}</dd></div><div><dt>游戏版本</dt><dd>{profile.version?versionLabel(profile,true):checkProfile&&profileStatus==='loading'?'正在读取…':'等待整合包版本'}</dd></div>
        {checkProfile&&<div><dt>整合包更新</dt><dd><span role="status">HXZUP · {updateStatus}</span>{offline&&profileStatus!=='loading'&&<button className="text-action" aria-label="重新核对整合包" onClick={()=>setRefreshCount(n=>n+1)}><RefreshCw size={15}/>重试</button>}</dd></div>}</dl>
      <div className="desk-actions"><button className="launch-primary" disabled={!server.enabled||!identityReady||joining} onClick={()=>join(server)}><Play size={16}/>{!server.enabled?'暂未开放':!identityReady?'正在读取角色…':joining?'正在准备…':member?'进入服务器':'登录并进入服务器'}</button></div>
    </section>{children}{reports.some(n=>n.id!==selected?.id)&&<section className="desk-card"><SectionHeading title="同服公告"/><div className="town-list">{reports.filter(n=>n.id!==selected?.id).map(n=><Link key={n.id} className="town-item town-article" to={detail(server.id)+'?notice='+encodeURIComponent(n.id)}><strong>{n.title}</strong><ChevronRight size={16}/></Link>)}</div></section>}</div></>:
      <p role="status">{directory.serverStatus==='loading'?'正在读取服务器…':'没有找到这个社区服务器。'}</p>}</section>;
}
