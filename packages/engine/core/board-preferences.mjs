// Both generations use board.wide / board.compact and the same stable card IDs.
export function boardCards(specs,saved){
  const byId=new Map((saved?.items||[]).map(item=>[item.i,item]));
  const active=specs.map((spec,index)=>{
    const item=byId.get(spec.id);
    const storedFixed=!!saved?.fixed?.includes(spec.id),manualHeight=item?.manualHeight===true;
    return {...spec,storedFixed,manualHeight,column:item?.x??spec.x,w:item?.w??spec.w??12,h:item?.h??spec.h??14,order:item?item.y*13+item.x:100000+index,
      visible:!saved?.hidden?.includes(spec.id),locked:!!saved?.locked?.includes(spec.id),fixed:storedFixed&&(!spec.fit||manualHeight)};
  });
  return active.sort((a,b)=>a.order-b.order);
}

export function updateBoard(specs,saved,instruction){
  const rows=boardCards(specs,saved),index=rows.findIndex(row=>row.id===instruction.id);
  if(index<0)throw Error('卡片已不在这个页面');
  for(const position of instruction.positions||[]){
    const current=rows.find(item=>item.id===position.id);
    if(current&&Number.isInteger(position.x)&&Number.isInteger(position.w)){
      current.column=position.x;current.w=position.w;
    }
  }
  const row=rows[index];
  if(row.locked&&instruction.op!=='lock')throw Error('请先解锁这张卡片');
  switch(instruction.op){
    case 'place':
    case 'move': {
      const to=rows.findIndex(other=>other.id===instruction.to);
      if(instruction.op==='place')row.column=Math.max(0,Math.min(12-row.w,Math.round(instruction.x)));
      if(to<0||to===index)break;
      if(rows.slice(Math.min(index,to),Math.max(index,to)+1).some(other=>other.locked))throw Error('请先解锁相邻卡片再调整顺序');
      if(instruction.op==='place'){
        const target=rows[to];rows.splice(index,1);rows.splice(rows.indexOf(target)+(instruction.after?1:0),0,row);
      }else{
        const other=rows[to];[row.column,other.column]=[other.column,row.column];
        rows.splice(index,1);rows.splice(to,0,row);
      }
      break;
    }
    case 'size':
      if(Number.isFinite(instruction.w))row.w=Math.max(4,Math.min(12,Math.round(instruction.w)));
      if(Number.isFinite(instruction.h)){row.storedFixed=true;row.manualHeight=true;row.h=Math.max(5,Math.min(100,Math.round(instruction.h)));}break;
    case 'width': row.w=Math.max(2,Math.min(12,Math.round(instruction.value)||12));break;
    case 'height': row.storedFixed=instruction.value!==0;row.manualHeight=row.storedFixed;if(row.storedFixed)row.h=Math.max(5,Math.min(100,instruction.value));break;
    case 'visible':row.visible=!!instruction.value;break;
    case 'lock':row.locked=!!instruction.value;break;
    default:throw Error('无法识别卡片操作');
  }
  const ids=new Set(rows.map(r=>r.id));
  const extras=(list=[])=>list.filter(id=>!ids.has(id));
  let nextColumn=0;
  const items=rows.map((r,order)=>{
    const x=Number.isFinite(r.column)?Math.max(0,Math.min(12-r.w,r.column)):nextColumn+r.w>12?0:nextColumn;
    nextColumn=(x+r.w)%12;
    return {i:r.id,x,y:order,w:r.w,h:r.h,...(r.manualHeight?{manualHeight:true}:{})};
  });
  return {...saved,items:[...items,...(saved?.items||[]).filter(r=>!ids.has(r.i))],
    hidden:[...extras(saved?.hidden),...rows.filter(r=>!r.visible).map(r=>r.id)],
    locked:[...extras(saved?.locked),...rows.filter(r=>r.locked).map(r=>r.id)],
    fixed:[...extras(saved?.fixed),...rows.filter(r=>r.storedFixed).map(r=>r.id)]};
}
