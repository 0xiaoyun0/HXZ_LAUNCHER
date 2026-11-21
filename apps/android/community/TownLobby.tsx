import {useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {ArrowLeft,Box,ChevronRight,Globe,MessageSquare,Megaphone,Play,RefreshCw} from 'lucide-react';
import {CommunityHeading} from '../../desktop/src/launcher/Social';
import {SectionHeading} from '../../desktop/src/SectionHeading';
import {invoke} from '../../desktop/src/model';

export type TownServer={id:string;group:string;name:string;address:string;version:string;loader:string;loaderVersion:string;enabled:boolean};
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
function versionLabel(server:TownServer,showBuild=false){
  const loader=({neoforge:'NeoForge',fabric:'Fabric',quilt:'Quilt',forge:'Forge'} as Record<string,string>)[server.loader]||server.loader;
  return [server.version||'随整合包匹配',loader,showBuild&&server.loaderVersion].filter(Boolean).join(' · ');
}
export function WorldList({directory}:{directory:Directory}){
  return <section className="desk-card"><SectionHeading title={<><Globe size={17}/> 社区服务器</>} actions={<button className="icon-button" aria-label="刷新服务器" onClick={directory.refresh}><RefreshCw size={16}/></button>}/>
    <div className="town-list">{directory.servers.map(server=><Link to={detail(server.id)} key={server.id} className="town-item">
    {server.group==='survival'?<Globe size={20}/>:<Box size={20}/>}<span><strong>{server.name}</strong><small>{versionLabel(server)}</small></span><span className="town-tail">{!server.enabled&&'暂未开放'}<ChevronRight size={16}/></span></Link>)}</div>
    {!directory.servers.length&&<p className="desk-empty" role="status">{directory.serverStatus==='offline'?'暂时读不到服务器目录。':'正在读取服务器…'}</p>}
  </section>;
}
export function TownLobby({directory}:{directory:Directory}){
  return <section className="launch-page town-content"><CommunityHeading title="社区大厅"/>
    <div className="town-grid"><WorldList directory={directory}/><div className="town-stack"><section className="desk-card"><SectionHeading title={<><Megaphone size={17}/> 服务器公告</>} actions={<button className="icon-button" aria-label="刷新公告" onClick={directory.refresh}><RefreshCw size={16}/></button>}/>
    <div className="town-list">{directory.notices.map(n=><Link key={n.id} className="town-item town-article" to={detail(n.serverId)+'?notice='+encodeURIComponent(n.id)}><span><small>{directory.servers.find(s=>s.id===n.serverId)?.name||'社区公告'}</small><strong>{n.title}</strong></span><ChevronRight size={16}/></Link>)}</div>
    {!directory.notices.length&&<p className="desk-empty" role="status">{directory.newsStatus==='loading'?'正在读取公告…':directory.newsStatus==='offline'?'暂时连不上公告服务。':'目前没有服务器公告。'}</p>}</section>
    <section className="desk-card"><SectionHeading title={<><MessageSquare size={17}/> 近期讨论</>} actions={<Link className="text-action" to="/community/forum">论坛<ChevronRight size={15}/></Link>}/>
    <div className="town-list">{directory.topics.map(t=><Link className="town-item town-article" key={t.id} to={'/community/forum/'+encodeURIComponent(t.id)}><span><strong>{t.title}</strong><small>{t.name} · {t.replies} 条回复</small></span><ChevronRight size={16}/></Link>)}</div>
    {!directory.topics.length&&<p className="desk-empty" role="status">{directory.topicStatus==='loading'?'正在读取讨论…':directory.topicStatus==='offline'?'暂时连不上论坛。':'还没有公开讨论。'}</p>}</section></div></div></section>;
}
export function TownWorld({directory,member,identityReady,joining,join,children}:{directory:Directory;member:boolean;identityReady:boolean;joining:boolean;join:(server:TownServer)=>void;children?:React.ReactNode}){
  const {id}=useParams(),[query]=useSearchParams();
  const server=directory.servers.find(s=>s.id===id);
  const reports=directory.notices.filter(n=>n.serverId===id);
  const selected=reports.find(n=>n.id===query.get('notice'));
  return <section className="launch-page town-content"><Link to="/town" className="quiet-link"><ArrowLeft size={16}/>社区大厅</Link>
    {server?<><CommunityHeading title={server.name}/><div className="town-stack"><section className="desk-card">
      <SectionHeading title={selected?.title||'入服信息'}/>{selected&&<p className="town-copy">{selected.body}</p>}
      <dl className="detail-rows"><div><dt>服务器地址</dt><dd>{server.address}</dd></div><div><dt>游戏版本</dt><dd>{versionLabel(server,true)}</dd></div></dl>
      <div className="desk-actions"><button className="launch-primary" disabled={!server.enabled||!identityReady||joining} onClick={()=>join(server)}><Play size={16}/>{!server.enabled?'暂未开放':!identityReady?'正在读取角色…':joining?'正在准备…':member?'进入服务器':'登录并进入服务器'}</button></div>
    </section>{children}{reports.some(n=>n.id!==selected?.id)&&<section className="desk-card"><SectionHeading title="同服公告"/><div className="town-list">{reports.filter(n=>n.id!==selected?.id).map(n=><Link key={n.id} className="town-item town-article" to={detail(server.id)+'?notice='+encodeURIComponent(n.id)}><strong>{n.title}</strong><ChevronRight size={16}/></Link>)}</div></section>}</div></>:
      <p role="status">{directory.serverStatus==='loading'?'正在读取服务器…':'没有找到这个社区服务器。'}</p>}</section>;
}
