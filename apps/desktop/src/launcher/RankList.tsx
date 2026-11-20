type RankRow={uid:string;name:string;rank?:number;score?:number;points?:string};
type Results={items:RankRow[];self?:RankRow|null;label?:string};
export function RankList({data,error,onRetry}:{data?:Results|null;error?:string;onRetry:()=>unknown}){
  if(error)return <div className="rank-message" role="alert"><p>{error}</p><button className="small-action" onClick={onRetry}>重试读取榜单</button></div>;
  if(!data)return <p className="rank-message" role="status">正在读取榜单…</p>;
  return <div className="rank-results">
    {data.label&&<small className="rank-period">{data.label}</small>}
    {data.items.length?<ol className="rank-list">{data.items.map((row,i)=><li key={row.uid}><b>{row.rank??i+1}</b><span>{row.name}</span><strong>{row.score??row.points}{'\u00a0分'}</strong></li>)}</ol>:<p className="rank-message">这一期还没有上榜记录。</p>}
    <div className="my-rank"><span>我的排名</span><strong>{data.self?.rank?'第 '+data.self.rank+' 名':'暂未上榜'}</strong>{data.self&&<span>{data.self.score??data.self.points} 分</span>}</div>
  </div>;
}
