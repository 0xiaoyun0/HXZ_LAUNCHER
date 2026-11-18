import {el,beijing} from './dom.mjs';
import {createKnowledgeCache} from './knowledge-cache.mjs';
import {HUB_SERVERS} from '../../server/shared/hub-catalog.mjs';

export function knowledgeUI(ctx){
 const {surface,api}=ctx,{button,dialog,select,field,row,empty}=surface;
 const cache=createKnowledgeCache((ctx.server||'community')+'|'+ctx.uid);
 async function manager(){
  const d=dialog('离线知识库'),tools=el('div','','hub-form-grid');d.content.append(tools);
  const server=select(tools,'服务器',HUB_SERVERS,''),search=field(tools,'搜索离线资料'),status=el('p','','hub-muted'),list=el('div','','hub-list'),actions=el('div','','hub-actions');d.content.append(status,actions,list);
  let current=null,sequence=0,saving=false;
  function draw(){
   const query=search.value.trim().toLocaleLowerCase(),items=(current?.items||[]).filter(v=>(v.title+' '+v.body+' '+v.data.version).toLocaleLowerCase().includes(query));list.replaceChildren();
   if(!current){status.textContent='还没有保存这组资料。联网时点击下载，之后可离线阅读正文。';empty(list,'尚无离线资料');return;}
   status.textContent='保存于 '+beijing(current.generated)+' · '+current.items.length+' 篇'+(current.total>current.items.length?' · 仅保存最近 200 篇':'')+' · 不含远程图片';
   for(const item of items){const card=row(item.title,item.summary),meta=el('small',(HUB_SERVERS.find(v=>v[0]===item.data.server)?.[1]||'全部服务器')+' · '+(item.data.version||'未指定版本')+' · 第 '+item.revision+' 版');card.prepend(meta);card.append(button('离线阅读',()=>{const text=dialog(item.title);text.content.append(el('p','离线副本 · '+beijing(item.updated)+' · 适用 '+(item.data.version||'未指定版本'),'hub-muted'),el('div',item.body,'hub-prose'));text.footer.append(button('查看在线原文',()=>ctx.openRecord(item.id)),button('复制引用',async()=>{await navigator.clipboard.writeText('《'+item.title+'》 · 第 '+item.revision+' 版 · /community/hub?section=article&item='+encodeURIComponent(item.id));}));}));list.append(card);}
   if(!items.length)empty(list,'没有找到匹配资料');
  }
  async function load(){const ticket=++sequence,value=await cache.load(server.value);if(ticket!==sequence||!d.node.isConnected)return;current=value;draw();}
  server.onchange=load;search.oninput=draw;
  const download=button('下载 / 更新离线包',async()=>{
   if(saving)return;saving=true;const selected=server.value;let items=[],value;
   try{
    for(let offset=0;offset<200;offset+=40){status.textContent='正在保存正文 · '+items.length+' 篇';value=await api('knowledge/export?server='+encodeURIComponent(selected)+'&offset='+offset);if(!ctx.alive()||!d.node.isConnected)return;items.push(...value.items);if(!value.hasMore)break;}
    await cache.save(selected,{...value,items});if(server.value===selected)await load();
   }finally{saving=false;}
  },true);
  actions.append(download,button('清除这一组缓存',()=>surface.confirm('清除离线资料？','联网文章不会删除，之后可重新下载。',async()=>{await cache.remove(server.value);await load();})));
  d.onClose(close=>{if(saving){surface.report(Error('正在保存离线正文，请稍候'),d.content);return;}close();});await load();
 }
 return {button:()=>button('离线知识库',manager),close:()=>cache.close()};
}
