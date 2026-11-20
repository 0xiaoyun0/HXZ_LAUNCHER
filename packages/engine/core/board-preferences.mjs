// Both generations use board.wide / board.compact and the same stable card IDs.
export function boardCards(specs,saved){
  const byId=new Map((saved?.items||[]).map(item=>[item.i,item]));
  const active=specs.map((spec,index)=>{
    const item=byId.get(spec.id);
    return {...spec,w:item?.w??spec.w??12,h:item?.h??spec.h??14,order:item?item.y*13+item.x:100000+index,
      visible:!saved?.hidden?.includes(spec.id),locked:!!saved?.locked?.includes(spec.id),fixed:!!saved?.fixed?.includes(spec.id)};
  });
  return active.sort((a,b)=>a.order-b.order);
}

export function updateBoard(specs,saved,instruction){
  const rows=boardCards(specs,saved),index=rows.findIndex(row=>row.id===instruction.id);
  if(index<0)throw Error('卡片已不在这个页面');
  const row=rows[index];
  if(row.locked&&instruction.op!=='lock')throw Error('请先解锁这张卡片');
  switch(instruction.op){
    case 'move': {
      const to=rows.findIndex(other=>other.id===instruction.to);
      if(to<0||to===index)return saved;
      if(rows.slice(Math.min(index,to),Math.max(index,to)+1).some(other=>other.locked))throw Error('请先解锁相邻卡片再调整顺序');
      rows.splice(index,1);rows.splice(to,0,row);break;
    }
    case 'size':
      if(Number.isFinite(instruction.w))row.w=Math.max(4,Math.min(12,Math.round(instruction.w)));
      row.fixed=true;row.h=Math.max(5,Math.min(100,Math.round(instruction.h)||14));break;
    case 'width': row.w=Math.max(2,Math.min(12,Math.round(instruction.value)||12));break;
    case 'height': row.fixed=instruction.value!==0;if(row.fixed)row.h=Math.max(5,Math.min(100,instruction.value));break;
    case 'visible':row.visible=!!instruction.value;break;
    case 'lock':row.locked=!!instruction.value;break;
    default:throw Error('无法识别卡片操作');
  }
  const ids=new Set(rows.map(r=>r.id));
  const extras=(list=[])=>list.filter(id=>!ids.has(id));
  let x=0,y=0;
  const items=rows.map(r=>{if(x+r.w>12){y++;x=0;}const item={i:r.id,x,y,w:r.w,h:r.h};x+=r.w;return item;});
  return {...saved,items:[...items,...(saved?.items||[]).filter(r=>!ids.has(r.i))],
    hidden:[...extras(saved?.hidden),...rows.filter(r=>!r.visible).map(r=>r.id)],
    locked:[...extras(saved?.locked),...rows.filter(r=>r.locked).map(r=>r.id)],
    fixed:[...extras(saved?.fixed),...rows.filter(r=>r.fixed).map(r=>r.id)]};
}
