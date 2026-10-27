// One deterministic catalog is used by desktop and Android web UI. Keeping
// ordering and art selection here prevents newly added games from reusing a
// number or silently requesting the wrong image format.
const ORDER=['runner','blocks','breakout','danmaku','maze','fighter','garden','tanks','merge','snake','mines','swarm','deck','dungeon','dice','caravan','orbit','supply','rhythm','alchemy','gomoku','xiangqi','chess','werewolf'];
const SVG_COVERS=new Set(['orbit','supply','rhythm','alchemy']);
const orderOf=(id,index)=>{const fixed=ORDER.indexOf(id);return fixed<0?1000+index:fixed+1;};
export function coverFor(id,prefix='./media/games/'){
 const root=String(prefix||'./media/games/').replace(/\/?$/,'/');
 return root+encodeURIComponent(String(id))+ (SVG_COVERS.has(id)?'.svg':'.webp');
}
export function createArcadeCatalog(games=[],boards=[],social=null){
 const values=[...games.map((item,index)=>({...item,board:false,social:false,sortOrder:orderOf(item.id,index)})),...boards.map((item,index)=>({...item,board:true,social:false,sortOrder:orderOf(item.id,games.length+index)}))];
 if(social)values.push({...social,board:false,social:true,sortOrder:orderOf(social.id,games.length+boards.length)});
 return values.sort((a,b)=>a.sortOrder-b.sortOrder||String(a.id).localeCompare(String(b.id))).map((item,index)=>({...item,number:index+1}));
}
