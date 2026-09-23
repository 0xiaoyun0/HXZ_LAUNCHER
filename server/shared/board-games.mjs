import { Chess } from 'chess.js';
import { BOARD_GAMES } from './board-catalog.mjs';
export { BOARD_GAMES, DIFFICULTIES } from './board-catalog.mjs';
const coord=i=>'abcdefgh'[i%8]+(8-Math.floor(i/8));
const index=s=>(8-Number(s[1]))*8+'abcdefgh'.indexOf(s[0]);
const color=p=>p?.[0]||'';
export function createBoard(game){
  if(!BOARD_GAMES.some(g=>g.id===game))throw Error('棋类不存在');
  const s={game,turn:'a',winner:'',ply:0,quiet:0,last:null,positions:{},board:[],fen:''};
  if(game==='gomoku')s.board=Array(225).fill('');
  if(game==='xiangqi'){
    s.board=Array(90).fill('');
    ['r','h','e','a','k','a','e','h','r'].forEach((p,x)=>{s.board[x]='b'+p;s.board[81+x]='a'+p;});
    for(const i of [19,25])s.board[i]='bc';for(const i of [64,70])s.board[i]='ac';
    for(const x of [0,2,4,6,8]){s.board[27+x]='bp';s.board[54+x]='ap';}
  }
  if(game==='chess')syncChess(s,new Chess());
  s.positions[position(s)]=1;return s;
}
function syncChess(s,c){s.fen=c.fen();s.board=c.board().flat().map(p=>p?(p.color==='w'?'a':'b')+p.type:'');s.turn=c.turn()==='w'?'a':'b';}
function position(s){return s.game==='chess'?s.fen.split(' ').slice(0,4).join(' '):s.turn+':'+s.board.join(',');}
function opponent(c){return c==='a'?'b':'a';}
function between(board,from,to,width){const x=from%width,y=Math.floor(from/width),dx=Math.sign(to%width-x),dy=Math.sign(Math.floor(to/width)-y);let n=0,cx=x+dx,cy=y+dy;while(cy*width+cx!==to){if(board[cy*width+cx])n++;cx+=dx;cy+=dy;}return n;}
function xiangqiPseudo(s,from,to){
  const piece=s.board[from],target=s.board[to];if(!piece||from===to||color(piece)===color(target))return false;
  const who=color(piece),type=piece[1],x=from%9,y=Math.floor(from/9),tx=to%9,ty=Math.floor(to/9),dx=tx-x,dy=ty-y,ax=Math.abs(dx),ay=Math.abs(dy);
  const palace=tx>=3&&tx<=5&&(who==='a'?ty>=7:ty<=2);
  if(type==='r')return (dx===0||dy===0)&&between(s.board,from,to,9)===0;
  if(type==='c')return (dx===0||dy===0)&&between(s.board,from,to,9)===(target?1:0);
  if(type==='h')return ax===2&&ay===1&&!s.board[y*9+x+Math.sign(dx)]||ax===1&&ay===2&&!s.board[(y+Math.sign(dy))*9+x];
  if(type==='e')return ax===2&&ay===2&&(who==='a'?ty>=5:ty<=4)&&!s.board[(y+dy/2)*9+x+dx/2];
  if(type==='a')return ax===1&&ay===1&&palace;
  if(type==='k')return ax+ay===1&&palace||dx===0&&target===opponent(who)+'k'&&between(s.board,from,to,9)===0;
  if(type==='p')return dx===0&&dy===(who==='a'?-1:1)||dy===0&&ax===1&&(who==='a'?y<=4:y>=5);
  return false;
}
function threatened(s,who){const king=s.board.indexOf(who+'k');if(king<0)return true;return s.board.some((p,i)=>color(p)===opponent(who)&&xiangqiPseudo(s,i,king));}
export function legalMoves(s){
  if(s.winner)return [];
  if(s.game==='gomoku')return s.board.flatMap((p,to)=>p?[]:[{to}]);
  if(s.game==='chess')return new Chess(s.fen).moves({verbose:true}).map(m=>({from:index(m.from),to:index(m.to),...(m.promotion?{promotion:m.promotion}:{})}));
  const moves=[];
  for(let from=0;from<90;from++)if(color(s.board[from])===s.turn)for(let to=0;to<90;to++)if(xiangqiPseudo(s,from,to)){
    const moved=s.board[from],taken=s.board[to];s.board[to]=moved;s.board[from]='';
    const check=threatened(s,s.turn);s.board[from]=moved;s.board[to]=taken;
    if(!check)moves.push({from,to});
  }
  return moves;
}
export function sameMove(a,b){return a.from===b.from&&a.to===b.to&&(a.promotion||'q')===(b.promotion||'q');}
function five(board,to,who){const x=to%15,y=Math.floor(to/15);for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){let n=1;for(const sign of [-1,1])for(let k=1;k<5;k++){const xx=x+dx*k*sign,yy=y+dy*k*sign;if(xx<0||xx>=15||yy<0||yy>=15||board[yy*15+xx]!==who)break;n++;}if(n>=5)return true;}return false;}
export function playMove(s,move,validate=true){
  if(s.winner)throw Error('本局已结束');
  if(validate&&!legalMoves(s).some(m=>sameMove(m,move)))throw Error('这一步不符合棋规');
  const n={...s,board:[...s.board],positions:{...s.positions},ply:s.ply+1,last:{...move}},who=s.turn;
  if(s.game==='chess'){
    const c=new Chess(s.fen);c.move({from:coord(move.from),to:coord(move.to),promotion:move.promotion||'q'});syncChess(n,c);
    if(c.isCheckmate())n.winner=who;else if(c.isDraw()||c.isStalemate())n.winner='draw';
  }else if(s.game==='gomoku'){
    n.board[move.to]=who;n.turn=opponent(who);
    if(five(n.board,move.to,who))n.winner=who;else if(n.ply===225)n.winner='draw';
  }else{
    const taken=n.board[move.to];n.board[move.to]=n.board[move.from];n.board[move.from]='';n.turn=opponent(who);n.quiet=taken?0:s.quiet+1;
    if(taken===n.turn+'k'||!legalMoves(n).length)n.winner=who;
    else if(n.quiet>=120)n.winner='draw';
  }
  const key=position(n);n.positions[key]=(n.positions[key]||0)+1;
  if(!n.winner&&(n.positions[key]>=3||n.ply>=600))n.winner='draw';
  return n;
}
const values={p:100,n:320,h:320,b:330,e:200,a:180,r:520,c:360,q:950,k:20000};
function gomokuPoint(board,to,who){
  const x=to%15,y=Math.floor(to/15);let score=0;
  for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){
    let count=1,open=0;
    for(const sign of [-1,1])for(let k=1;k<=5;k++){
      const xx=x+dx*k*sign,yy=y+dy*k*sign;if(xx<0||xx>=15||yy<0||yy>=15)break;
      const piece=board[yy*15+xx];if(piece===who)count++;else{if(!piece)open++;break;}
    }
    score+=count>=5?1000000:([0,1,15,220,9000][count]||0)*(open===2?4:open);
  }
  return score;
}
function candidates(s,level){
  if(s.game!=='gomoku')return legalMoves(s).sort((a,b)=>(values[s.board[b.to]?.[1]]||0)-(values[s.board[a.to]?.[1]]||0));
  if(!s.ply)return [{to:112}];
  const choices=[];
  for(let i=0;i<225;i++)if(!s.board[i]){
    const x=i%15,y=Math.floor(i/15);let nearby=false;
    for(let dy=-2;dy<=2&&!nearby;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<15&&y+dy>=0&&y+dy<15&&s.board[(y+dy)*15+x+dx]){nearby=true;break;}
    if(nearby)choices.push({to:i,priority:gomokuPoint(s.board,i,s.turn)*1.12+gomokuPoint(s.board,i,opponent(s.turn))});
  }
  return choices.sort((a,b)=>b.priority-a.priority).slice(0,6+level*3).map(({to})=>({to}));
}
function evaluate(s,who){
  if(s.winner)return s.winner==='draw'?0:s.winner===who?10000000-s.ply:-10000000+s.ply;
  if(s.game==='gomoku'){
    const choices=candidates(s,1);let own=0,enemy=0;
    for(const {to} of choices){own=Math.max(own,gomokuPoint(s.board,to,who));enemy=Math.max(enemy,gomokuPoint(s.board,to,opponent(who)));}
    return own-enemy*1.08;
  }
  const width=s.game==='chess'?8:9;
  return s.board.reduce((total,p,i)=>{if(!p)return total;const center=width/2-Math.abs(i%width-(width-1)/2);const advance=p[0]==='a'?(s.board.length/width-1-Math.floor(i/width)):Math.floor(i/width);return total+(p[0]===who?1:-1)*((values[p[1]]||0)+center*4+(p[1]==='p'?advance*6:0));},0);
}
// Called only in a worker. Iterative deepening keeps a legal fallback on a time budget.
export function botMove(state,level=1){
  level=Math.max(1,Math.min(5,Math.trunc(level)||1));
  const deadline=Date.now()+[55,140,300,600,1000][level-1],who=state.turn;
  let best=candidates(state,level)[0],nodes=0;
  if(!best)return null;
  const timeout={};
  function search(s,depth,alpha,beta){
    if(++nodes%16===0&&Date.now()>deadline)throw timeout;
    if(depth===0||s.winner)return evaluate(s,who);
    const maximize=s.turn===who;let value=maximize?-Infinity:Infinity;
    for(const m of candidates(s,level)){
      const score=search(playMove(s,m,false),depth-1,alpha,beta);
      value=maximize?Math.max(value,score):Math.min(value,score);
      if(maximize)alpha=Math.max(alpha,value);else beta=Math.min(beta,value);
      if(beta<=alpha)break;
    }
    return Number.isFinite(value)?value:evaluate(s,who);
  }
  for(let depth=1;depth<=level;depth++){
    let next=best,score=-Infinity;
    try{for(const m of candidates(state,level)){const n=search(playMove(state,m,false),depth-1,-Infinity,Infinity);if(n>score){score=n;next=m;}if(Date.now()>deadline)throw timeout;}best=next;}
    catch(e){if(e!==timeout)throw e;break;}
  }
  return best;
}
