/* SPDX-License-Identifier: GPL-3.0-or-later
 * JSON protocol adapter. Search/evaluation are compiled from the cited upstream Java. */
const engine=require('./engine.cjs');
function fenOf(s){return Array.from({length:10},(_,y)=>{
 let row='',empty=0;for(let x=0;x<9;x++){const p=s.board[y*9+x];if(!p){empty++;continue;}if(empty){row+=empty;empty=0;}let c=({h:'n',e:'b'})[p[1]]||p[1];row+=p[0]==='a'?c.toUpperCase():c;}return row+(empty||'');
}).join('/')+' '+(s.turn==='a'?'w':'b');}
function convert(game,n){if(game==='gomoku')return {to:n};const from=game==='chess'?n&127:n&255,to=game==='chess'?n>>7:n>>8;
 const index=sq=>game==='chess'?(sq>>4)*8+(sq&15)-4:((sq>>4)-3)*9+(sq&15)-3;
 return {from:index(from),to:index(to),...(game==='chess'?{promotion:'q'}:{})};}
let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',v=>{input+=v;if(input.length>65536)process.exit(2);});
process.stdin.on('end',()=>{try{
 const {state:s,level:raw=1}=JSON.parse(input),level=Math.max(1,Math.min(5,Math.trunc(raw)||1));
 if(!['chess','xiangqi','gomoku'].includes(s.game))throw Error('Unknown engine');
 const emit=(type,move)=>process.stdout.write(JSON.stringify({type,move})+'\n');
 emit('ready');
 if(s.game==='gomoku'){
  const board=s.board.map(p=>p==='a'?'1':p==='b'?'2':'0').join(''),last=s.last?.to??-1;
  // Each completed upstream search supplies a valid fallback before deeper analysis.
  let move;for(const depth of [1,2,4,6,8].slice(0,level)){
   move=convert(s.game,engine.gomoku(board,last,depth,[4,6,8,10,12][level-1],0));emit('candidate',move);
  }emit('done',move);
 }else{
  const fen=s.game==='chess'?s.fen:fenOf(s),depth=[1,2,4,6,9][level-1],budget=[60,160,400,750,1200][level-1];
  let move=convert(s.game,engine[s.game](fen,1,40));emit('candidate',move);
  if(level>1)move=convert(s.game,engine[s.game](fen,depth,budget));emit('done',move);
 }
 }catch(e){process.stdout.write(JSON.stringify({type:'error',message:String(e.message||e)})+'\n');process.exitCode=1;}});
