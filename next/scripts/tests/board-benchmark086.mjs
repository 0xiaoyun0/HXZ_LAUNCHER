import fs from 'node:fs/promises';
import {createBoard,playMove,legalMoves,sameMove} from '../../apps/community-server/shared/board-games.mjs';
import {botMove as current} from '../../apps/community-server/src/board-engine.mjs';
import {botMove as previous} from '../../release/0.8.5/server/幻想镇社区服务端/src/board-engine.mjs';

const opening=game=>playMove(createBoard(game),game==='chess'?{from:52,to:36}:game==='xiangqi'?{from:64,to:65}:{to:112});
const midgame=game=>{
 let s=createBoard(game);
 if(game==='chess')for(const [from,to] of [[52,36],[12,28],[62,45],[1,18],[61,34],[6,21]])s=playMove(s,{from,to});
 else if(game==='gomoku')for(const to of [112,113,97,127,96,128,110,114])s=playMove(s,{to});
 else for(let ply=0;ply<8;ply++){const moves=legalMoves(s);s=playMove(s,moves[(ply*7+3)%moves.length]);}
 return s;
};
const result={date:new Date().toISOString(),node:process.version,platform:process.platform,method:'One cold subprocess per deterministic fixture / level; wall clock includes startup; single sample per row, not a cross-machine guarantee.',rows:[]};
for(const game of ['chess','xiangqi','gomoku'])for(const [fixture,state] of [['opening',opening(game)],['midgame',midgame(game)]])for(let level=1;level<=5;level++){
 const row={game,fixture,level};
 for(const [name,analyse] of [['before',previous],['after',current]]){
  const start=performance.now(),move=await analyse(state,level);row[name+'Ms']=Math.round(performance.now()-start);
  if(!legalMoves(state).some(m=>sameMove(m,move)))throw Error(game+' illegal '+name);
 }
 result.rows.push(row);console.log(JSON.stringify(row));
}
await fs.mkdir('docs/evidence',{recursive:true});
await fs.writeFile('docs/evidence/0.8.6-board-benchmark.json',JSON.stringify(result,null,2)+'\n');
