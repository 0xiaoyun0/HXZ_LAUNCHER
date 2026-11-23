import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {community} from '../../../../packages/community/client';
import {request,useData} from '../data';
import {notify,perform} from '../model';
import {date} from '../ui';

export function Wallet(){
  const [offset,setOffset]=useState(0),[code,setCode]=useState(''),[busy,setBusy]=useState(false);
  const session=useSnapshot(community);
  const wallet=useData(()=>request('/api/points?offset='+offset),[offset,session.connected,session.user?.uid],true);
  const ledger=wallet.data?.ledger||[],total=wallet.data?.total||0;
  async function redeem(){
    setBusy(true);
    try{
      await request('/api/points/redeem','POST',{code:code.trim()});
      setCode('');if(offset===0)await wallet.reload();else setOffset(0);notify('兑换成功');
    }finally{setBusy(false);}
  }
  return <div className="wallet-layout">
    <section className="desktop-panel"><h2>可用余额</h2>
      <div className="desktop-panel-body wallet-balance"><div><strong>{(wallet.error?undefined:wallet.data?.balance)??'—'}</strong> 积分</div>
        <div className="desk-actions"><Link className="small-action" to="/community/ranking">积分排行榜</Link><Link className="small-action" to="/community/shop">积分商城</Link><Link className="small-action" to="/community/backpack">我的背包</Link></div>
        <form className="music-find" onSubmit={e=>{e.preventDefault();void perform(redeem);}}>
          <input aria-label="积分兑换码" placeholder="输入积分兑换码" value={code} onChange={e=>setCode(e.target.value)}/>
          <button className="small-action" disabled={busy||!session.connected||!code.trim()}>兑换</button>
        </form>
      </div>
    </section>
    <section className="desktop-panel"><h2>收支记录</h2>
      {wallet.error?<p className="wallet-message" role="alert">暂时无法读取积分。 <button className="small-action" onClick={wallet.reload}>重试</button></p>
        :ledger.length?ledger.map((row:any)=><div className="setting-line" key={row.id}><span>{row.reason}<small>{date(row.created)}</small></span><b>{row.amount}</b></div>)
        :<p className="wallet-message" role="status">{wallet.loading?'正在读取积分…':'暂无收支记录'}</p>}
      {(offset>0||total>30)&&<div className="pagination"><button className="small-action" disabled={!offset} onClick={()=>setOffset(v=>Math.max(0,v-30))}>上一页</button>
        <span>第 {1+offset/30} 页</span><button className="small-action" disabled={offset+30>=total} onClick={()=>setOffset(v=>v+30)}>下一页</button></div>}
    </section>
  </div>;
}
