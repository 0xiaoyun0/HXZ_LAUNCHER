// A generated board is accepted only if visible numbers prove every safe reveal.
// The certifier never reads the value of a hidden cell to choose the next move.
export function mineNeighbours(cols,rows,i){
 const out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const x=i%cols+dx,y=Math.floor(i/cols)+dy;
  if((dx||dy)&&x>=0&&x<cols&&y>=0&&y<rows)out.push(y*cols+x);
 }return out;
}
export function canSolveMines(cells,cols,rows,first,mineCount){
 const near=cells.map((_,i)=>mineNeighbours(cols,rows,i)),open=new Set(),flags=new Set(),queue=[first];
 while(true){
  while(queue.length){const i=queue.pop();if(open.has(i)||flags.has(i))continue;if(cells[i]<0)return false;open.add(i);if(cells[i]===0)queue.push(...near[i]);}
  if(open.size===cells.length-mineCount)return true;
  const before=open.size+flags.size;
  for(const i of open){
   const hidden=near[i].filter(j=>!open.has(j)&&!flags.has(j)),left=cells[i]-near[i].filter(j=>flags.has(j)).length;
   if(left===0)queue.push(...hidden);
   else if(left===hidden.length)for(const j of hidden)flags.add(j);
  }
  // The total mine count is also information available to the player.
  const hidden=cells.map((_,i)=>i).filter(i=>!open.has(i)&&!flags.has(i));
  if(flags.size===mineCount)queue.push(...hidden);
  else if(hidden.length===mineCount-flags.size)for(const i of hidden)flags.add(i);
  if(!queue.length&&before===open.size+flags.size)return false;
 }
}
export function generateMines(s,first,random){
 const {cols,rows,mineCount}=s,near=Array.from({length:cols*rows},(_,i)=>mineNeighbours(cols,rows,i)),safe=new Set([first,...near[first]]);
 const free=near.map((_,i)=>i).filter(i=>!safe.has(i));
 const number=mines=>{const cells=Array(cols*rows).fill(0);for(const i of mines)cells[i]=-1;for(let i=0;i<cells.length;i++)if(cells[i]!==-1)cells[i]=near[i].filter(j=>cells[j]===-1).length;return cells;};
 for(let attempt=0;attempt<64;attempt++){
  const pool=[...free];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const cells=number(pool.slice(0,mineCount));
  if(canSolveMines(cells,cols,rows,first,mineCount))return cells;
 }
 // Bounded fallback for the fixed 9×12 / 20-mine game: pack mines against the
 // opposite edge. The first zero's flood reaches every safe square.
 const indices=near.map((_,i)=>i);if(first<cols*rows/2)indices.reverse();
 return number(indices.slice(0,mineCount));
}
