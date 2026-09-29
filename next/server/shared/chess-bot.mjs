import {Chess} from 'chess.js';
const values={p:100,n:320,b:335,r:510,q:950,k:20000};
const square=s=>(8-Number(s[1]))*8+'abcdefgh'.indexOf(s[0]);
export function chessBot(fen,level){
 const chess=new Chess(fen),deadline=Date.now()+[100,300,750,1600,3200][level-1],limit=[1,2,3,4,6][level-1],table=new Map();
 let nodes=0;const timeout={};
 const check=()=>{if((++nodes&7)===0&&Date.now()>=deadline)throw timeout;};
 function evaluate(){let score=0,bishops={w:0,b:0};for(const row of chess.board())for(const p of row)if(p){const x='abcdefgh'.indexOf(p.square[0]),y=Number(p.square[1]),advance=p.color==='w'?y-2:7-y,center=3.5-Math.abs(3.5-x),vertical=3.5-Math.abs(4.5-y);let bonus=0;if(p.type==='p')bonus=advance*8+center*3;if(p.type==='n'||p.type==='b')bonus=(center+vertical)*10;if(p.type==='r')bonus=advance>4?18:0;if(p.type==='k')bonus=(y===1||y===8)&&[1,2,6].includes(x)?28:-advance*8;if(p.type==='b')bishops[p.color]++;score+=(p.color==='w'?1:-1)*(values[p.type]+bonus);}score+=(bishops.w>=2?30:0)-(bishops.b>=2?30:0);return score*(chess.turn()==='w'?1:-1);}
 const moveKey=m=>m.from+m.to+(m.promotion||'');
 function order(moves,pv){return moves.sort((a,b)=>(moveKey(b)===pv?1e7:0)+(b.captured?values[b.captured]*10-values[b.piece]:0)+(b.promotion?900:0)-(moveKey(a)===pv?1e7:0)-(a.captured?values[a.captured]*10-values[a.piece]:0)-(a.promotion?900:0));}
 function search(depth,alpha,beta,ply,qdepth=0){
  check();const key=chess.fen().split(' ').slice(0,4).join(' '),cached=table.get(key),original=alpha;
  if(depth>0&&cached?.depth>=depth){if(cached.flag==='exact')return cached.score;if(cached.flag==='lower')alpha=Math.max(alpha,cached.score);if(cached.flag==='upper')beta=Math.min(beta,cached.score);if(alpha>=beta)return cached.score;}
  const inCheck=chess.isCheck();let moves=chess.moves({verbose:true});if(!moves.length)return inCheck?-1e7+ply:0;
  if(chess.isInsufficientMaterial()||chess.isThreefoldRepetition()||chess.isDrawByFiftyMoves())return 0;
  if(depth<=0){const stand=evaluate();if(qdepth>=3)return stand;if(!inCheck){if(stand>=beta)return stand;alpha=Math.max(alpha,stand);moves=moves.filter(m=>m.captured||m.promotion);}}
  let best=depth<=0&&!inCheck?alpha:-Infinity,pv='';
  for(const m of order(moves,cached?.move)){chess.move(m);let score;try{score=-search(depth-1,-beta,-alpha,ply+1,depth<=0?qdepth+1:0);}finally{chess.undo();}if(score>best){best=score;pv=moveKey(m);}alpha=Math.max(alpha,score);if(alpha>=beta)break;}
  if(depth>0&&table.size<18000)table.set(key,{depth,score:best,move:pv,flag:best<=original?'upper':best>=beta?'lower':'exact'});return best;
 }
 const root=order(chess.moves({verbose:true}));let best=root[0];if(!best)return null;
 for(let depth=1;depth<=limit;depth++){
  let next=best,alpha=-Infinity;try{for(const m of order(root,moveKey(best))){check();chess.move(m);let score;try{score=-search(depth-1,-Infinity,-alpha,1);}finally{chess.undo();}if(score>alpha){alpha=score;next=m;}if(Date.now()>deadline)throw timeout;}best=next;if(alpha>9999000)break;}catch(e){if(e!==timeout)throw e;break;}
 }
 return {from:square(best.from),to:square(best.to),...(best.promotion?{promotion:best.promotion}:{})};
}
