import {lazy,Suspense,useEffect,useState} from 'react';
import {Link,NavLink,Route,Routes,useLocation,useSearchParams} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {account,state,ui,watchSettings} from '../model';
import {LayoutGrid} from 'lucide-react';
import {Modal} from '../ui';
import {IssueHelp} from '../IssueHelp';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';
import {community,connect,disconnect} from '../../../../packages/community/client';
import {communityPages} from './community-pages';

// Keep voice connected across desktop pages and release it on identity changes.
watchSettings(()=>[state.settings.selectedAccount,account()?.uuid,state.settings.communityUrl],disconnect);

const Chat=lazy(()=>import('../Community').then(m=>({default:m.Chat})));
const Forum=lazy(()=>import('../Community').then(m=>({default:m.Forum})));
const Voice=lazy(()=>import('../Community').then(m=>({default:m.Voice})));
const Inbox=lazy(()=>import('../Inbox').then(m=>({default:m.InboxPage})));
const Guild=lazy(()=>import('../Guild').then(m=>({default:m.GuildPage})));
const Linking=lazy(()=>import('../Linking').then(m=>({default:m.Linking})));
const Calendar=lazy(()=>import('../PlayCalendar').then(m=>({default:m.PlayCalendar})));
const Hub=lazy(()=>import('../Hub').then(m=>({default:m.HubPage})));
const Blueprints=lazy(()=>import('../Blueprints').then(m=>({default:m.Blueprints})));
const Wallet=lazy(()=>import('./Wallet').then(m=>({default:m.Wallet})));
const Inventory=lazy(()=>import('../Inventory').then(m=>({default:m.InventoryContents})));
const Shop=lazy(()=>import('../Shop').then(m=>({default:m.Shop})));

export function Social(){
  const s=useSnapshot(state),c=useSnapshot(community),role=account(s),location=useLocation(),[params]=useSearchParams();
  const active=communityPages.find(p=>p.path===location.pathname)||(location.pathname.startsWith('/community/forum/')?communityPages[1]:undefined);
  const title=active?.path==='/community'?'社区聊天':active?.path==='/community/forum'?'社区论坛':active?.label||'社区';
  const member=role?.authenticated&&!!role.uuid;
  useEffect(()=>{if(member)void connect();},[member,role?.id,role?.uuid,s.settings.communityUrl]);
  const [directory,setDirectory]=useState(false);
  const frequent=communityPages.filter(p=>p.group==='常用');
  const groups=['交流与活动','记录与收藏','账户与服务'] as const;
  const secondary=active&&!frequent.some(p=>p.path===active.path);
  return <section className={'social-workspace'+(active?.path==='/community/linking'?' social-archive':'')}>
    <nav className="social-sections" aria-label="社区导航">{frequent.map(p=><NavLink key={p.path} to={p.path} end={p.path==='/community'}><p.icon size={16} aria-hidden/>{p.label}</NavLink>)}
      <button type="button" className="small-action directory-launch" aria-haspopup="dialog" onClick={()=>setDirectory(true)}><LayoutGrid size={16}/>全部栏目</button>
      {secondary&&<span className="social-current" aria-current="page"><active.icon size={16}/>{active.label}</span>}</nav>
    <Modal open={directory} onClose={()=>setDirectory(false)} title="社区栏目">
      <div className="community-directory">{groups.map(name=><section key={name}><h3>{name}</h3><div>{communityPages.filter(p=>p.group===name).map(p=><NavLink key={p.path} to={p.path} onClick={()=>setDirectory(false)}><p.icon size={16}/>{p.label}</NavLink>)}</div></section>)}</div>
    </Modal>
    {!member?<div className="launch-page login-gate"><h1>{title}</h1><p>{role?.authenticated?'请先选择游戏角色。':'使用幻想镇账号登录后即可参与社区。'}</p>{role?.authenticated?<Link to="/account" className="small-action">选择角色</Link>:<button className="launch-primary" onClick={()=>ui.dialog='account'}>登录账号</button>}</div>:
    <>{!c.connected&&<div className="social-connection" role="status">{c.connecting?'正在连接社区…':<><IssueHelp issue={playerError(c.error||'社区连接已断开','community.connect')}/><button className="small-action" onClick={()=>void connect()}>重新连接</button></>}</div>}
      <Suspense fallback={<p className="launch-page" role="status">正在打开…</p>}>
        <div className={location.pathname==='/community/linking'?'archive-viewport':location.pathname==='/community/guild'?'guild-viewport':'social-content'}>{!['/community/guild','/community/linking'].includes(location.pathname)&&<h1>{title}</h1>}
          <Routes><Route index element={<Chat/>}/><Route path="forum" element={<Forum/>}/><Route path="forum/:id" element={<Forum/>}/><Route path="voice" element={<Voice/>}/><Route path="inbox" element={<Inbox/>}/>
            <Route path="guild" element={<Guild/>}/><Route path="linking" element={<Linking/>}/>
            <Route path="playtime" element={<Calendar initialSource="server" initialWeek={params.has('week')?Number(params.get('week'))||0:undefined}/>}/>
            <Route path="worlds" element={<Hub area="worlds"/>}/><Route path="blueprints" element={<section className="catalog-panel" aria-label="社区蓝图目录"><Blueprints/></section>}/>
            <Route path="wallet" element={<Wallet/>}/><Route path="shop" element={<Shop/>}/><Route path="backpack" element={<Inventory/>}/>
            <Route path="saved" element={<Hub area="personal"/>}/><Route path="events" element={<Hub area="events"/>}/><Route path="appeals" element={<Hub area="support"/>}/>
            <Route path="*" element={<p>这个社区页面已归档。<Link to="/community">返回社区聊天</Link></p>}/>
          </Routes></div></Suspense></>}</section>;
}
export default Social;
