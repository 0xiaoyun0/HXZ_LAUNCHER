import {lazy,Suspense,useEffect} from 'react';
import {NavLink,Route,Routes,useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {BookOpen,MessageCircle,MessagesSquare,ScrollText} from 'lucide-react';
import {account,state,ui} from '../model';
import {IssueHelp} from '../IssueHelp';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';
import {community,connect,disconnect} from '../../../../packages/community/client';

const Chat=lazy(()=>import('../Community').then(m=>({default:m.Chat})));
const Forum=lazy(()=>import('../Community').then(m=>({default:m.Forum})));
const Guild=lazy(()=>import('../Guild').then(m=>({default:m.GuildPage})));
const Linking=lazy(()=>import('../Linking').then(m=>({default:m.Linking})));
const sections=[
  {url:'/community',label:'聊天',title:'社区聊天',icon:MessageCircle},
  {url:'/community/forum',label:'论坛',title:'社区论坛',icon:MessagesSquare},
  {url:'/community/guild',label:'冒险者协会',title:'冒险者协会',icon:ScrollText},
  {url:'/community/linking',label:'LINKING',title:'LINKING 档案馆',icon:BookOpen}
];
export function Social(){
  const s=useSnapshot(state),c=useSnapshot(community),role=account(s),location=useLocation();
  const active=[...sections].reverse().find(x=>location.pathname===x.url||location.pathname.startsWith(x.url+'/'))||sections[0];
  const member=role?.authenticated&&!!role.uuid;
  useEffect(()=>{if(!member)return;void connect();return ()=>disconnect();},[member,role?.id,role?.uuid,s.settings.communityUrl]);
  return <section className={'social-workspace'+(active.label==='LINKING'?' social-archive':'')}>
    <nav className="social-sections" aria-label="社区导航">{sections.map(p=><NavLink key={p.url} to={p.url} end={p.url==='/community'}><p.icon aria-hidden size={16}/>{p.label}</NavLink>)}</nav>
    {!member?<div className="launch-page login-gate"><h1>{active.title}</h1><p>{role?.authenticated?'请先在账号页选择游戏角色。':'使用启动器的幻想镇账号，即可参与社区。'}</p>{role?.authenticated?<NavLink to="/account" className="small-action">选择角色</NavLink>:<button className="launch-primary" onClick={()=>ui.dialog='account'}>登录账号</button>}</div>:
    <>{!c.connected&&<div className="social-connection" role="status">{c.connecting?<span>正在连接社区…</span>:<IssueHelp issue={playerError(c.error||'社区连接已断开','community.connect')}/>}{!c.connecting&&<button className="small-action" onClick={()=>void connect()}>重新连接</button>}</div>}
    <Suspense fallback={<p className="launch-page" role="status">正在打开…</p>}><Routes><Route index element={<section className="social-content"><h1>社区聊天</h1><Chat/></section>}/><Route path="forum" element={<section className="social-content"><h1>社区论坛</h1><Forum/></section>}/><Route path="forum/:id" element={<section className="social-content"><h1>社区论坛</h1><Forum/></section>}/><Route path="guild" element={<Guild/>}/><Route path="linking" element={<Linking/>}/></Routes></Suspense></>}</section>;
}

export default Social;
