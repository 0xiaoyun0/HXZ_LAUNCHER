import {useState,useSyncExternalStore,type CSSProperties} from 'react';
import {Archive,AudioLines,Boxes,Compass,Gamepad2,LayoutGrid,ListChecks,MessageCircle,MessagesSquare,Users,UserRound} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import {CommunityDirectory} from '../../desktop/src/launcher/Social';

const bottomBar = window.matchMedia('(max-width: 42rem)');
function subscribe(listener:()=>void){
  bottomBar.addEventListener('change',listener);
  return ()=>bottomBar.removeEventListener('change',listener);
}
export const useBottomNavigation=()=>useSyncExternalStore(subscribe,()=>bottomBar.matches,()=>false);

export const destinations=[
  {path:'/community',label:'聊天',icon:MessageCircle},
  {path:'/town',label:'社区',icon:Users},
  {path:'/town/games',label:'游戏',icon:Gamepad2},
  {path:'/community/linking',label:'LINKING',icon:Archive},
  {path:'/town/me',label:'我的',icon:UserRound},
] as const;

export function destinationIndex(path:string){
  if(path==='/community'||path==='/community/voice')return 0;
  if(path==='/community/linking')return 3;
  if(path==='/town/me'||path==='/town/devices'||['wallet','ranking','playtime','inbox','backpack','shop','saved','trades','appeals'].some(page=>path==='/community/'+page))return 4;
  if(path==='/town/games'||path==='/town/tasks'||path==='/arcade'||path.startsWith('/arcade/')||path.startsWith('/community/arcade/'))return 2;
  return 1;
}

const communityTabs=[{path:'/town',label:'大厅',icon:Users},{path:'/community/forum',label:'论坛',icon:MessagesSquare},{path:'/community/guild',label:'委托',icon:Compass}];
const chatTabs=[{path:'/community',label:'文字大厅',icon:MessageCircle},{path:'/community/voice',label:'语音房',icon:AudioLines}];
const gameTabs=[{path:'/town/games',label:'游戏库',icon:Boxes},{path:'/arcade',label:'小游戏',icon:Gamepad2},{path:'/town/tasks',label:'游戏任务',icon:ListChecks}];

export function TownSectionBar({membersToolbar}:{membersToolbar?: (node:HTMLDivElement|null)=>void}){
  const {pathname}=useLocation(),section=destinationIndex(pathname),[open,setOpen]=useState(false);
  const community=section===1&&!pathname.startsWith('/town/world/');
  const game=section===2&&gameTabs.some(tab=>tab.path===pathname);
  return <div className="town-section-slot">
    {(community||game||section===0)&&<nav className="town-section-bar" aria-label={community?'社区导航':game?'游戏内容':'聊天频道'}>
      {(community?communityTabs:game?gameTabs:chatTabs).map(({path,label,icon:Icon})=><Link key={path} to={path}
        aria-current={pathname===path||(path==='/community/forum'&&pathname.startsWith(path+'/'))?'page':undefined}><Icon size={17} aria-hidden/>{label}</Link>)}
      {community&&<button type="button" aria-label="全部栏目" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><LayoutGrid size={17} aria-hidden/>栏目</button>}
      {membersToolbar&&pathname==='/community'&&<div className="town-members-slot" ref={membersToolbar}/>}
    </nav>}
    <CommunityDirectory open={open} close={()=>setOpen(false)}/>
  </div>;
}

export function TownNavigation({bottom,working}:{bottom:boolean;working:boolean}){
  const {pathname}=useLocation();
  const selected=destinationIndex(pathname);
  return <nav className={'town-nav '+(bottom?'town-nav-bottom':'town-nav-top')} aria-label="主导航"
    style={{'--tab-index':selected,'--tab-count':destinations.length} as CSSProperties}>
    <span className="town-nav-track" aria-hidden="true"><i><b key={selected}/></i></span>
    {destinations.map(({path,label,icon:Icon},index)=><Link key={path} to={path} aria-label={label} aria-current={selected===index?'page':undefined}>
      <span className="town-nav-icon"><Icon size={19} aria-hidden/>{working&&path==='/town/games'&&<i aria-hidden/>}</span>
      <span>{label}</span>
    </Link>)}
  </nav>;
}
