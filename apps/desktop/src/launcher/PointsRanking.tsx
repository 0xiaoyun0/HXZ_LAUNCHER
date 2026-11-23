import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {Coins,Gamepad2} from 'lucide-react';
import {community} from '../../../../packages/community/client';
import {useData,request} from '../data';
import {Segments} from '../ui';
import {RankList} from './RankList';

export function PointsRanking(){
  const [period,setPeriod]=useState('week'),[offset,setOffset]=useState(0),session=useSnapshot(community);
  const board=useData(()=>request('/api/points/leaderboard?period='+period+'&offset='+offset),[period,offset,session.connected,session.user?.uid]);
  const weekly=period==='week',total=board.data?.total??0;
  return <section className="desktop-panel points-ranking">
    <div className="points-rank-heading"><Segments value={period} onChange={(next:string)=>{setOffset(0);setPeriod(next);}} items={[{id:'week',label:'本周积分'},{id:'annual',label:'年度总榜'}]}/>
      <div className="arcade-links"><Link className="small-action" to="/arcade"><Gamepad2 size={16}/>小游戏厅</Link><Link className="small-action" to="/community/wallet"><Coins size={16}/>我的积分</Link></div>
    </div>
    <div className="desktop-panel-body"><p className="rank-explanation">{weekly?'显示周积分前十名及你的名次。单项游戏前三名的预计奖励计入本周排名，每周结算后到账。':'按已结算的周积分和周榜奖励累计排名。商城消费只影响可用余额。'}</p>
      <RankList data={board.data} error={board.error?'暂时无法读取积分榜，请检查社区连接后重试。':''} onRetry={board.reload}/>
      {!weekly&&(offset>0||total>50)&&<div className="pagination"><button className="small-action" disabled={!offset||board.loading} onClick={()=>setOffset(o=>Math.max(0,o-50))}>上一页</button><span>第 {1+offset/50} 页</span><button className="small-action" disabled={board.loading||offset+50>=total} onClick={()=>setOffset(o=>o+50)}>下一页</button></div>}
    </div>
  </section>;
}
