// Small, bounded preferences shared by the renderer and the settings store.
const keyPattern = /^[a-zA-Z0-9._-]{1,80}$/;
// Frozen pre-0.6.4 order: new games must never change an existing player's card IDs.
const legacyGames=['runner','blocks','breakout','gomoku','xiangqi','chess','danmaku','maze','fighter','tanks','garden','werewolf','merge','snake','mines'];
const stableCardId=(page,id)=>/^games\.(wide|compact)$/.test(page)&&/^panel-\d+$/.test(id)&&legacyGames[Number(id.slice(6))]?'game-'+legacyGames[Number(id.slice(6))]:id;
const integer = (value, fallback, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
export function normalizeCardLayouts(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [page, data] of Object.entries(value).slice(0, 80)) {
    if (!keyPattern.test(page) || ['__proto__','constructor','prototype'].includes(page) || !data || typeof data !== 'object') continue;
    const used = new Set();
    const items = [];
    for (const original of (Array.isArray(data.items) ? data.items : []).slice(0, 48)) {
      const item=original&&{...original,i:stableCardId(page,original.i)};
      if (!item || typeof item.i !== 'string' || !keyPattern.test(item.i) || used.has(item.i)) continue;
      used.add(item.i);
      const w = integer(item.w, 6, 2, 12);
      items.push({ i: item.i, x: integer(item.x, 0, 0, 12 - w), y: integer(item.y, 0, 0, 500), w, h: integer(item.h, 14, 5, 100) });
    }
    const ids = list => [...new Set((Array.isArray(list) ? list : []).filter(id => typeof id === 'string' && keyPattern.test(id)).map(id=>stableCardId(page,id)))].slice(0, 48);
    result[page] = { items, hidden: ids(data.hidden), locked: ids(data.locked), fixed: ids(data.fixed) };
  }
  return result;
}
// Filtering changes only the temporary positions. Width, size mode, locks and hidden cards survive.
export function filteredCardLayout(saved,initial){
  if(!saved)return undefined;
  let x=0,y=0,row=0;
  const hidden=saved.hidden||[];
  const items=initial.map(base=>{
    const previous=saved.items.find(item=>item.i===base.i),item={...base,...previous};
    if(hidden.includes(item.i))return item;
    if(x+item.w>12){x=0;y+=row;row=0;}
    item.x=x;item.y=y;x+=item.w;row=Math.max(row,item.h);return item;
  });
  const visibleIds=new Set(initial.map(item=>item.i));
  return {...saved,items,hidden:hidden.filter(id=>visibleIds.has(id)),locked:(saved.locked||[]).filter(id=>visibleIds.has(id)),fixed:(saved.fixed||[]).filter(id=>visibleIds.has(id))};
}
export function normalizeCardStyle(value) {
  return {
    color: /^#[a-f0-9]{6}$/i.test(value?.color) ? value.color : '',
    opacity: Number.isFinite(value?.opacity) ? Math.max(.2, Math.min(1, value.opacity)) : 1,
    gap: integer(value?.gap, 14, 8, 24),
    radius: integer(value?.radius, 10, 4, 20),
  };
}
