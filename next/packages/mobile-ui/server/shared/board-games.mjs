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
function xiangqiTargets(s,from){const x=from%9,y=Math.floor(from/9),p=s.board[from],type=p[1],out=[];const add=(dx,dy)=>{const tx=x+dx,ty=y+dy;if(tx>=0&&tx<9&&ty>=0&&ty<10)out.push(ty*9+tx);};
if(type==='r'||type==='c'){for(let i=0;i<9;i++)if(i!==x)out.push(y*9+i);for(let i=0;i<10;i++)if(i!==y)out.push(i*9+x);}
else if(type==='h'){for(const [dx,dy] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]])add(dx,dy);}
else if(type==='a'||type==='e'){const d=type==='a'?1:2;for(const dx of [-d,d])for(const dy of [-d,d])add(dx,dy);}
else if(type==='k'){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])add(dx,dy);const enemy=s.board.indexOf(opponent(p[0])+'k');if(enemy>=0&&!out.includes(enemy))out.push(enemy);}
else{add(0,p[0]==='a'?-1:1);add(1,0);add(-1,0);}return out;}
function threatened(s,who){const king=s.board.indexOf(who+'k');if(king<0)return true;return s.board.some((p,i)=>color(p)===opponent(who)&&xiangqiPseudo(s,i,king));}
export function legalMoves(s){
  if(s.winner)return [];
  if(s.game==='gomoku')return s.board.flatMap((p,to)=>p?[]:[{to}]);
  if(s.game==='chess')return new Chess(s.fen).moves({verbose:true}).map(m=>({from:index(m.from),to:index(m.to),...(m.promotion?{promotion:m.promotion}:{})}));
  const moves=[];
  for(let from=0;from<90;from++)if(color(s.board[from])===s.turn)for(const to of xiangqiTargets(s,from))if(xiangqiPseudo(s,from,to)){
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
