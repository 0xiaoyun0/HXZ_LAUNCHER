import {useSyncExternalStore} from 'react';
import {Boxes,ListChecks,MessageCircle} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';

const bottomBar = window.matchMedia('(max-width: 42rem) and (min-height: 30rem)');
function subscribe(listener:()=>void){
  bottomBar.addEventListener('change',listener);
  return ()=>bottomBar.removeEventListener('change',listener);
}
export const useBottomNavigation=()=>useSyncExternalStore(subscribe,()=>bottomBar.matches,()=>false);

const destinations=[
  {path:'/town',label:'社区',icon:MessageCircle},
  {path:'/town/games',label:'游戏库',icon:Boxes},
  {path:'/town/tasks',label:'游戏任务',icon:ListChecks},
] as const;

export function TownNavigation({bottom,working}:{bottom:boolean;working:boolean}){
  const {pathname}=useLocation();
  const selected=destinations.find(item=>item.path===pathname)?.path??'/town';
  return <nav className={'town-nav '+(bottom?'town-nav-bottom':'town-nav-top')} aria-label="主导航">
    {destinations.map(({path,label,icon:Icon})=><Link key={path} to={path} aria-current={selected===path?'page':undefined}>
      <span className="town-nav-icon"><Icon size={19} aria-hidden/>{working&&path==='/town/tasks'&&<i aria-hidden/>}</span>
      <span>{label}</span>
    </Link>)}
  </nav>;
}
