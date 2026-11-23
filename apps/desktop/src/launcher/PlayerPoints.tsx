import {useState} from 'react';
import {useSnapshot} from 'valtio';
import {account,invoke,state,ui} from '../model';
import {useData} from '../data';
export function PlayerPoints(){
  const s=useSnapshot(state),role=account(s),[retry,setRetry]=useState(0);
  const result=useData(()=>role?.authenticated?invoke('points.overview'):Promise.resolve(null),[role?.id,role?.uuid,s.settings.communityUrl,retry]);
  return <section className="launch-page"><header className="launch-title"><h1>我的积分</h1></header><section className="preference-section"><h2>{role?.name||'幻想镇账号'}</h2>
    {!role?.authenticated?<div className="setting-line"><span>登录后可查看角色余额和本周排名。</span><button className="small-action" onClick={()=>ui.dialog='account'}>登录账号</button></div>:result.error?<div className="setting-line" role="alert"><span>暂时无法读取积分，请检查社区连接。</span><button className="small-action" onClick={()=>setRetry(v=>v+1)}>重新读取</button></div>:result.data?<><div className="setting-line"><strong>可用余额</strong><span>{result.data.balance} 积分</span></div><div className="setting-line"><strong>本周积分</strong><span>{result.data.weekly} · {result.data.rank?'第 '+result.data.rank+' 名':'尚未上榜'}</span></div>{result.data.ledger?.slice(0,8).map((row:any)=><div className="setting-line" key={row.id}><span>{row.reason}</span><strong>{row.amount}</strong></div>)}</>:<p role="status">正在读取积分…</p>}
    {result.data&&<><h2>本周积分排行</h2>{result.data.leaders.length?result.data.leaders.map((p:any)=><div className="setting-line" key={p.uid}><span>{p.rank} · {p.name}</span><strong>{p.points} 积分</strong></div>):<p>本周还没有上榜的角色。</p>}</>}
    <p>默认服的游玩奖励由服务器按角色核验。两种工作区和安卓端共用同一账户账本。</p></section></section>;
}
