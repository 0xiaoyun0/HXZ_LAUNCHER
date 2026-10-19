import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useSnapshot} from 'valtio';
import {useNavigate,useSearchParams,Link,Navigate} from 'react-router-dom';
import {community} from '../../../packages/community/client';
import {mountHub,hubSectionName} from '../../../packages/hub/ui.mjs';
import {HUB_AREAS,hubDestination,resolveHubTarget} from '../../../packages/hub/navigation.mjs';
import {exportAsset} from '../../../packages/hub/asset-export.mjs';
import '../../../packages/hub/style.css';
import {request} from './data';
import {CardBoard} from './CardBoard';
import {PageTitle} from './ui';
import {LibraryTabs,AccountTabs} from './HubNavigation';
import {account,chooseRoot,invoke,reload,state,task,ui,notify} from './model';

function Region({node}:{node:HTMLElement}){
 const host=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{host.current?.append(node);return()=>node.remove();},[node]);
 return <div ref={host}/>;
}
export function HubPage({area='events'}:{area?:string}){
 const [params]=useSearchParams(),section=params.get('section');
 if(['people','creation','knowledge','games'].includes(area)||area==='legacy'&&['social','work','article','recipe','landmark','challenges','desk'].includes(section||'desk'))return <Navigate replace to={area==='games'||section==='challenges'?'/arcade':'/community'}/>;
 return <ActiveHubPage area={area}/>;
}
function ActiveHubPage({area:areaKey='events'}:{area?:string}){
 const communityState=useSnapshot(community),snapshot=useSnapshot(state),user=communityState.user,uid=user?.uid||account(snapshot)?.uuid,navigate=useNavigate(),[params]=useSearchParams();
 if(areaKey==='legacy'){areaKey=resolveHubTarget('/community/hub?'+params.toString())?.area||'events';if(areaKey==='all')areaKey='events';}
 const scoped=true,area=scoped?(HUB_AREAS[areaKey]||HUB_AREAS.events):{sections:['desk',...Object.values(HUB_AREAS).flatMap((v:any)=>v.sections)]},candidate=params.get('section'),section=area.sections.includes(candidate)?candidate!:area.sections[0],item=params.get('item')||'',showSummary=!scoped||areaKey==='people';
 const regions=useMemo(()=>Object.fromEntries(['nav','summary','board'].map(key=>[key,document.createElement('section')])) as Record<string,HTMLElement>,[]);
 useEffect(()=>mountHub(regions.board,{request,uid,server:snapshot.settings.communityUrl,platform:'desktop',section,item,regions,area:scoped?areaKey:undefined,showSummary,sectionTitleInCard:true,
  onSection:(next:string)=>navigate(hubDestination(next)),
  navigate:(url:string)=>{const target=resolveHubTarget(url);return /^https?:\/\//.test(url)?invoke('external.open',{url}):navigate(target?(scoped?hubDestination(target.section,target.item):'/community/hub?section='+encodeURIComponent(target.section)+(target.item?'&item='+encodeURIComponent(target.item):'')):url);},
  worldPlan:async(record:string)=>invoke('world.plan',{record}),
  exportAsset:(blob:Blob,name:string)=>exportAsset((input:any)=>invoke('asset.export',input),blob,name),
  importWorld:async(input:any)=>{if(task.busy||state.running)throw Error('请等待当前任务或游戏结束');if(!state.settings.gameRoot&&!await chooseRoot())throw Error('尚未选择游戏目录');ui.tasks=true;await invoke('world.import',input);await reload();notify('世界已导入，可以在游戏实例中启动');},
  downloadServer:async(id:string)=>{
   if(!['HXZ-survival','HXZ-mod-1','HXZ-mod-2'].includes(id))throw Error('不支持这个服务器实例');
   if(task.busy||state.running)throw Error('请等待当前任务或游戏结束后再安装');
   if(!account()){ui.dialog='account';throw Error('请先选择登录角色');}
   if(!state.settings.gameRoot&&!await chooseRoot())throw Error('尚未选择游戏目录，待办已保留');
   ui.tasks=true;await invoke('game.update',{id});await reload();
  }
 }),[regions,uid,snapshot.settings.communityUrl,section,item,navigate,areaKey,showSummary,scoped]);
 return <div className="hub-page">{scoped&&<Region node={regions.nav}/>}<CardBoard id={scoped?'hub-'+areaKey:'community-hub'} label="" cards={[
  ...(showSummary?[{id:'profile',title:'我的同行',x:0,y:0,w:3,minW:3,minH:9,content:<Region node={regions.summary}/>}]:[]),
  ...(!scoped?[{id:'navigation',title:'办事导航',x:0,y:10,w:3,minW:3,minH:10,content:<Region node={regions.nav}/>}]:[]),
  {id:'content',title:hubSectionName(section),x:showSummary?3:0,y:0,w:showSummary?9:12,minW:5,minH:16,content:<Region node={regions.board}/>},
 ]}/></div>;
}
export function HubStandalone({area}:{area:string}){const spec=HUB_AREAS[area]||HUB_AREAS.events,c=useSnapshot(community);return <div className="standard-page"><PageTitle title={area==='worlds'?'我的游戏':area==='personal'?'账号与积分':spec.title} tabs={area==='worlds'?<LibraryTabs/>:area==='personal'?<AccountTabs/>:undefined} actions={area==='support'?<Link className="button" to="/settings?tab=support">返回帮助与反馈</Link>:undefined}/>{area==='admin'&&!c.user?.admin?<p className="muted">此入口仅向社区管理员开放。</p>:<HubPage area={area}/>}</div>;}
