import {lazy,Suspense} from 'react';
import {Route,Routes,Link,useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {LockKeyhole} from 'lucide-react';
import {state,ui,account,desktop,invoke,perform,reload,notify} from '../model';
import {community} from '../../../../packages/community/client';
import {Explore} from './Explore';
import {currentDestination} from './destinations';
import {PageSkeleton} from '../PageFeedback';
const Library=lazy(()=>import('../GameLibrary').then(m=>({default:m.GameLibrary})));
const Workbench=lazy(()=>import('../HomeDashboard').then(m=>({default:m.Home})));
const Multiplayer=lazy(()=>import('../Multiplayer').then(m=>({default:m.MultiplayerPage})));
const Community=lazy(()=>import('../Community').then(m=>({default:m.CommunityPage})));
const Workshop=lazy(()=>import('../Workshop').then(m=>({default:m.Workshop})));
const Arcade=lazy(()=>import('../Arcade').then(m=>({default:m.ArcadePage})));
const Guild=lazy(()=>import('../Guild').then(m=>({default:m.GuildPage})));
const Linking=lazy(()=>import('../Linking').then(m=>({default:m.Linking})));
const Music=lazy(()=>import('../Music').then(m=>({default:m.MusicPage})));
const Identity=lazy(()=>import('../AccountCards').then(m=>({default:m.AccountPage})));
const Inventory=lazy(()=>import('../Inventory').then(m=>({default:m.InventoryPage})));
const Feedback=lazy(()=>import('../FeedbackPage').then(m=>({default:m.FeedbackPage})));
const Settings=lazy(()=>import('../Settings').then(m=>({default:m.SettingsPage})));
const Hub=lazy(()=>import('../Hub').then(m=>({default:m.HubStandalone})));
const Plugins=lazy(()=>import('../Plugins').then(m=>({default:m.Plugins})));
export function WorkspaceRoutes({location}:{location?:string}){
 const point=useLocation(),path=location||point.pathname,entry=currentDestination(path);
 const s=useSnapshot(state),c=useSnapshot(community);
 if(entry?.member&&!account(s)?.authenticated)return <section className="third-page member-gate"><LockKeyhole size={30}/><h1>{entry.name}</h1><p>使用幻想镇皮肤站账号登录后，即可进入{entry.name}。</p><button className="primary-action" onClick={()=>ui.dialog='account'}>登录账号</button><Link to="/">返回启动台</Link></section>;
 if(entry?.admin&&!c.user?.admin)return <section className="third-page"><h1>社区管理</h1><p>此入口需要社区管理员身份。</p><Link to="/">返回启动台</Link></section>;
 return <Suspense fallback={<PageSkeleton/>}><Routes location={location}>
  <Route path="/" element={<Workbench/>}/><Route path="/explore" element={<Explore/>}/><Route path="/library" element={<Library/>}/><Route path="/workbench" element={<Workbench/>}/>
  <Route path="/library/worlds" element={<Hub area="worlds"/>}/><Route path="/multiplayer" element={<Multiplayer/>}/><Route path="/community/*" element={<Community/>}/>
  <Route path="/workshop/*" element={<Workshop/>}/><Route path="/arcade/*" element={<Arcade/>}/><Route path="/account/backpack" element={<Inventory/>}/><Route path="/account/community" element={<Hub area="personal"/>}/><Route path="/account/*" element={<Identity/>}/>
  <Route path="/guild" element={<Guild/>}/><Route path="/linking" element={<Linking/>}/><Route path="/music/*" element={<Music/>}/><Route path="/settings/appeals" element={<Hub area="support"/>}/>
  <Route path="/feedback" element={<Feedback/>}/><Route path="/settings/*" element={<Settings/>}/><Route path="/manage" element={<Hub area="admin"/>}/>
  <Route path="/cards" element={<section className="third-page"><h1>首页插件</h1><Plugins/></section>}/><Route path="*" element={<section className="third-page"><h1>页面不存在</h1><Link to="/explore">查看全部功能</Link></section>}/>
 </Routes></Suspense>;
}
