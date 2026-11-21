import {lazy,Suspense,useEffect,useState,type ReactNode} from 'react';
import {Link,NavLink,Route,Routes,useLocation,useNavigate,useSearchParams} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {account,state,ui} from '../model';
import {LayoutGrid} from 'lucide-react';
import {Modal} from '../ui';
import {IssueHelp} from '../IssueHelp';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';
import {community,connect} from '../../../../packages/community/client';
import {communityPages} from './community-pages';


const Chat=lazy(()=>import('../Community').then(m=>({default:m.Chat})));
const Forum=lazy(()=>import('../Community').then(m=>({default:m.Forum})));
const Voice=lazy(()=>import('../Community').then(m=>({default:m.Voice})));
const Inbox=lazy(()=>import('../Inbox').then(m=>({default:m.InboxPage})));
const Guild=lazy(()=>import('../Guild').then(m=>({default:m.GuildPage})));
const Linking=lazy(()=>import('../Linking').then(m=>({default:m.Linking})));
const Calendar=lazy(()=>import('../PlayCalendar').then(m=>({default:m.PlayCalendar})));
const Hub=lazy(()=>import('../Hub').then(m=>({default:m.HubPage})));
const Blueprints=lazy(()=>import('../Blueprints').then(m=>({default:m.Blueprints})));
const Ranking=lazy(()=>import('./PointsRanking').then(m=>({default:m.PointsRanking})));
const Board=lazy(()=>import('./BoardGames').then(m=>({default:m.BoardRoute})));
const TankRoom=lazy(()=>import('../TankRoom').then(m=>({default:m.TankRoom})));
const Werewolf=lazy(()=>import('../Werewolf').then(m=>({default:m.Werewolf})));
const Wallet=lazy(()=>import('./Wallet').then(m=>({default:m.Wallet})));
const Inventory=lazy(()=>import('../Inventory').then(m=>({default:m.InventoryContents})));
const Shop=lazy(()=>import('../Shop').then(m=>({default:m.Shop})));

export function CommunityNavigation(){
  const [directory,setDirectory]=useState(false);
  const frequent=communityPages.filter(p=>p.group==='常用');
  const groups=['常用','交流与活动','小游戏联机','记录与收藏','账户与服务'] as const;
  return <>
    <nav className="social-sections" aria-label="社区导航">{frequent.map(p=><NavLink key={p.path} to={p.path} end={p.path==='/community'}><p.icon size={16} aria-hidden/>{p.label}</NavLink>)}
      <button type="button" className="directory-launch" aria-label="全部栏目" title="全部栏目" aria-haspopup="dialog" aria-expanded={directory} onClick={()=>setDirectory(true)}><LayoutGrid size={16} aria-hidden/><span>全部栏目</span></button>
    </nav>
    <Modal open={directory} onClose={()=>setDirectory(false)} title="社区栏目">
      <div className="community-directory">{groups.map(name=><section key={name}><h3>{name}</h3><div>{communityPages.filter(p=>p.group===name).map(p=><NavLink key={p.path} to={p.path} end={p.path==='/community'} onClick={()=>setDirectory(false)}><p.icon size={16} aria-hidden/>{p.label}</NavLink>)}</div></section>)}</div>
    </Modal>
  </>;
}

export function CommunityHeading({title}:{title:string}){
  return <header className="launch-title community-page-heading"><h1>{title}</h1><CommunityNavigation/></header>;
}

export function Social({worldsContent}:{worldsContent?:ReactNode}){
  const s=useSnapshot(state),c=useSnapshot(community),role=account(s),location=useLocation(),navigate=useNavigate(),[params]=useSearchParams();
  const active=communityPages.find(p=>p.path===location.pathname)||(location.pathname.startsWith('/community/forum/')?communityPages[1]:undefined);
  const title=active?.path==='/community'?'社区聊天':active?.path==='/community/forum'?'社区论坛':active?.label||'社区';
  const member=role?.authenticated&&!!role.uuid;
  const guild=location.pathname==='/community/guild',archive=location.pathname==='/community/linking',arcade=location.pathname.startsWith('/community/arcade/');
  const connection=!c.connected&&<div className="social-connection" role="status">{c.connecting?'正在连接社区…':<><IssueHelp issue={playerError(c.error||'社区连接已断开','community.connect')}/><button className="small-action" onClick={()=>void connect()}>重新连接</button></>}</div>;
  useEffect(()=>{if(member)void connect();},[member,role?.id,role?.uuid,s.settings.communityUrl]);
  return <section className={'social-workspace'+(member&&archive?' social-archive':member&&active?.path==='/community'?' social-conversation':'')}>
    {!member?<div className="launch-page login-gate"><CommunityHeading title={title}/><p>{role?.authenticated?'请先选择游戏角色。':'使用幻想镇账号登录后即可参与社区。'}</p>{role?.authenticated?<Link to="/account" className="small-action">选择角色</Link>:<button className="launch-primary" onClick={()=>ui.dialog='account'}>登录账号</button>}</div>:
        <div key={[role.id,role.uuid,s.settings.communityUrl].join(':')} className={archive?'archive-viewport':guild?'guild-viewport':'social-content'}>
          {!guild&&<><CommunityHeading title={arcade?'小游戏联机':title}/>{connection}</>}
          {arcade&&<Link className="small-action arcade-return" to="/arcade">返回小游戏厅</Link>}
          <Suspense fallback={<p role="status">正在打开…</p>}>
          <Routes><Route index element={<Chat/>}/><Route path="forum" element={<Forum/>}/><Route path="forum/:id" element={<Forum/>}/><Route path="voice" element={<Voice/>}/><Route path="inbox" element={<Inbox/>}/>
            <Route path="guild" element={<Guild navigation={<CommunityNavigation/>} status={connection}/>}/><Route path="linking" element={<Linking/>}/>
            <Route path="playtime" element={<Calendar initialSource="server" initialWeek={params.has('week')?Number(params.get('week'))||0:undefined}/>}/>
            <Route path="worlds" element={<>{worldsContent}<Hub area="worlds"/></>}/><Route path="blueprints" element={<section className="catalog-panel" aria-label="社区蓝图目录"><Blueprints/></section>}/>
            <Route path="ranking" element={<Ranking/>}/><Route path="arcade/board/:id" element={<Board/>}/>
            <Route path="arcade/social/werewolf" element={<Werewolf/>}/><Route path="arcade/coop/tanks" element={<TankRoom solo={()=>navigate('/arcade/play/tanks')}/>}/>
            <Route path="wallet" element={<Wallet/>}/><Route path="shop" element={<><div className="arcade-links shop-wallet-links"><Link className="small-action" to="/community/wallet">我的积分</Link><Link className="small-action" to="/community/trades">玩家交易</Link></div><Shop/></>}/><Route path="trades" element={<Hub area="trades"/>}/><Route path="backpack" element={<Inventory/>}/>
            <Route path="saved" element={<Hub area="personal"/>}/><Route path="events" element={<Hub area="events"/>}/><Route path="appeals" element={<Hub area="support"/>}/>
            <Route path="*" element={<p>这个社区页面已归档。<Link to="/community">返回社区聊天</Link></p>}/>
          </Routes></Suspense></div>}</section>;
}
export default Social;
