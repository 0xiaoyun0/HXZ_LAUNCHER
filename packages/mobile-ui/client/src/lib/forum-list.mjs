const modes=new Set(['newest','oldest','likes','replies','active']);
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const date=value=>typeof value==='number'?value:(Date.parse(value)||0);
export function sortForumPosts(items,mode){
  return [...items].sort((a,b)=>number(b.pinned)-number(a.pinned)||
    (mode==='oldest'?date(a.created)-date(b.created):
      mode==='likes'?number(b.likes)-number(a.likes):
      mode==='replies'?number(b.replies)-number(a.replies):
      mode==='active'?date(b.updated)-date(a.updated):0)||
    date(b.created)-date(a.created)||String(b.id).localeCompare(String(a.id)));
}

// Old community servers accept the query but silently ignore sort. Sort the
// complete result before pagination; sorting just the visible page loses posts.
export async function loadForumPage(request,{sort='newest',q='',category='',offset=0,isCurrent=()=>Boolean(true)}={}){
  if(!modes.has(sort))sort='newest';
  offset=Math.max(0,Number(offset)||0);
  const read=position=>request('/api/forum/posts?'+new URLSearchParams({sort,q,category,offset:String(position),limit:'24'}));
  const first=await read(offset);
  if(!isCurrent()||first.sortVersion>=1&&first.sort===sort)return first;
  const total=Math.max(0,number(first.total));
  if(total>1000)throw Error('当前社区服务端未支持完整排序，请管理员升级服务端至 0.5.2 后重试');
  const all=[...(first.items||[])],positions=[];
  for(let start=0;start<total;start+=24)if(start!==offset)positions.push(start);
  for(let i=0;i<positions.length&&isCurrent();i+=3){
    const pages=await Promise.all(positions.slice(i,i+3).map(read));
    for(const page of pages)all.push(...(page.items||[]));
  }
  const unique=[...new Map(all.map(item=>[item.id,item])).values()];
  if(isCurrent()&&unique.length<total)throw Error('帖子列表刚刚发生变化，请刷新后重新排序');
  return {items:sortForumPosts(unique,sort).slice(offset,offset+24),total};
}
