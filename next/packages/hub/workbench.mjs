import {resolveHubTarget} from './navigation.mjs';
import {el,beijing} from './dom.mjs';
const labels={content:'内容与申请',proof:'活动凭证',world:'世界快照',feedback:'问题反馈',blueprint:'机械动力蓝图',guild:'协会委托',linking:'LINKING 手记'};
const actions={'create':'新建内容','edit':'修改内容','close':'结束内容','archive':'归档内容','review:published':'通过审核','review:rejected':'退回修改','event:bracket':'生成赛程','event:match':'登记赛果','event:checkpoint':'编辑检查点','event:claim':'提交探索进度','event:review':'审核探索凭证','world:submit':'提交世界快照','world:review':'审核世界快照','project:task':'更新项目任务','project:note':'更新项目便签'};
export async function workbenchUI(ctx,parent,filter){
 const {surface,api,refresh}=ctx,{button,field,select,row,empty}=surface;
 if(!ctx.manager){empty(parent,'社区管理员登录后可在此集中处理待办。');return;}
 const category=filter.category||'all',value=await api('workbench?category='+category+'&q='+encodeURIComponent(filter.query)+'&offset='+filter.offset);if(!ctx.alive())return;
 const metrics=el('div','','hub-workbench-metrics');for(const [label,count] of [['当前在线成员',value.stats.online],['近七天发布 / 更新',value.stats.publishedWeek]]){const tile=row(label);tile.append(el('strong',String(count)));metrics.append(tile);}parent.append(metrics);
 const categories=el('div','','hub-workbench-categories');for(const [key,label]of [['all','全部待办'],...Object.entries(labels)]){const count=key==='all'?Object.values(value.counts).reduce((n,v)=>n+v,0):value.counts[key],b=button('',()=>{filter.category=key;filter.offset=0;return refresh();},category===key);b.append(el('span',label),el('strong',String(count)));b.setAttribute('aria-pressed',String(category===key));categories.append(b);}parent.append(categories);
 const compact=el('div','','hub-workbench-compact'),choice=select(compact,'待办分类',[['all','全部待办 · '+Object.values(value.counts).reduce((n,v)=>n+v,0)],...Object.entries(labels).map(([key,label])=>[key,label+' · '+value.counts[key]])],category);choice.onchange=key=>{filter.category=key;filter.offset=0;return refresh();};parent.append(compact);
 const tools=el('form','','hub-tools'),query=field(tools,'标题或提交人',filter.query);const search=()=>{filter.query=query.value;filter.offset=0;return refresh();};tools.onsubmit=e=>{e.preventDefault();void search();};tools.append(button('查找',search),button('刷新待办',refresh));parent.append(tools);
 const queue=el('div','','hub-workbench-queue');parent.append(queue);
 for(const item of value.items){if(resolveHubTarget(item.target)?.retired)continue;const tile=row(item.title,item.name+' · '+beijing(item.created)),meta=el('span',labels[item.category],'hub-chip');tile.prepend(meta);tile.append(button('打开处理',()=>{if(item.target.startsWith('/community/hub?'))return ctx.openRecord(new URL(item.target,'https://local.invalid').searchParams.get('item'));if(item.category==='feedback')return feedback(ctx,item.id);return ctx.navigate(item.target);},true));queue.append(tile);}if(!value.items.length)empty(queue,'这个队列暂时没有待处理内容。');
 const pages=el('div','','hub-actions');pages.append(el('small','共 '+value.total+' 项 · 最早提交的优先显示'));if(filter.offset)pages.append(button('上一页',()=>{filter.offset=Math.max(0,filter.offset-24);return refresh();}));if(filter.offset+24<value.total)pages.append(button('下一页',()=>{filter.offset+=24;return refresh();}));parent.append(pages);
 const recent=el('details','','hub-workbench-audit');recent.append(el('summary','最近的管理操作'));const list=el('div','','hub-list');for(const entry of value.audit){const tile=row(actions[entry.action]||'社区操作',entry.name+' · '+beijing(entry.created));if(entry.detail)tile.append(el('p',entry.detail,'hub-prose'));list.append(tile);}if(!value.audit.length)empty(list,'尚无操作记录。');recent.append(list);parent.append(recent);
}

async function feedback(ctx,id){
 const {dialog,field,select,button,row,confirm}=ctx.surface,d=dialog('处理问题反馈');let ticket;
 async function load(){const value=await ctx.request('/api/feedback/'+id);if(!ctx.alive()||!d.node.isConnected)return;ticket=value.item;d.node.querySelector('h2').textContent=ticket.title;d.content.replaceChildren();d.footer.replaceChildren();d.content.append(el('small',ticket.name+' · '+beijing(ticket.created)),el('p',ticket.body,'hub-prose'));
  if(ticket.report){const report=el('details');report.append(el('summary','查看附带诊断'),el('pre',ticket.report,'hub-prose'));d.content.append(report);}
  const replies=el('div','','hub-list');for(const reply of value.replies)replies.append(row(reply.name+' · '+beijing(reply.created),reply.body));d.content.append(replies);
  const status=select(d.content,'处理状态',[['open','待处理'],['working','处理中'],['resolved','已解决'],['archived','已归档']],ticket.status),body=field(d.content,'回复或处理说明','','textarea');d.footer.append(button('保存处理',async()=>{await ctx.request('/api/feedback/'+id,'POST',{updated:ticket.updated,status:status.value,body:body.value});await load();await ctx.refresh();},true));
  if(['resolved','archived'].includes(ticket.status))d.footer.append(button('删除记录',()=>confirm('永久删除这条反馈？','反馈正文与回复将删除，审计记录保留。',async()=>{await ctx.request('/api/feedback/'+id,'DELETE',{updated:ticket.updated});d.close();await ctx.refresh();})));
 }
 await load();
}
