import {el,beijing} from './dom.mjs';
import {HUB_KINDS,HUB_STATES} from '../../server/shared/hub-catalog.mjs';

export async function deskUI(ctx,parent,filter){
 const {surface,api}=ctx,{button,row,empty}=surface;
 const value=await api('desk?category='+(filter.category||'action')+'&offset='+filter.offset);
 if(!ctx.alive())return;
 const tabs=el('nav','','hub-desk-tabs');tabs.setAttribute('aria-label','办事进度');
 for(const [key,label] of [['action','待我处理'],['waiting','等待结果'],['progress','进行中'],['done','已办结']]){
  const b=button('',()=>{filter.category=key;filter.offset=0;return ctx.refresh();});
  b.append(el('span',label),el('strong',String(value.counts[key])));b.setAttribute('aria-current',String(value.category===key));tabs.append(b);
 }
 const tools=el('div','','hub-actions');tools.append(button('刷新待办',ctx.refresh),button('收件箱',()=>ctx.navigate('/community/inbox')));
 if(ctx.manager)tools.append(button('管理待审事项',()=>ctx.choose('workbench')));
 parent.append(tabs,tools);
 const list=el('div','','hub-desk-list');parent.append(list);
 const states={...HUB_STATES,invited:'等待接受邀请',pending:'设备待办',joined:'正在参与'};
 for(const item of value.items){
  const card=row(item.title,(HUB_KINDS[item.section]?.label||({social:'好友与小队',devices:'多端接续'})[item.section]||'社区')+' · '+(states[item.state]||item.state));
  card.append(el('small',beijing(item.updated)),button(value.category==='action'?'打开处理':'查看进度',()=>item.record?ctx.openRecord(item.record):ctx.choose(item.section),value.category==='action'));
  list.append(card);
 }
 if(!value.items.length)empty(list,({action:'暂时没有需要你处理的事项。',waiting:'没有等待审核或回复的内容。',progress:'暂时没有进行中的活动或项目。',done:'办结的内容会保留在这里。'})[value.category]);
 const pages=el('div','','hub-actions');pages.append(el('small','共 '+value.total+' 项'));
 if(filter.offset)pages.append(button('上一页',()=>{filter.offset=Math.max(0,filter.offset-24);return ctx.refresh();}));
 if(filter.offset+24<value.total)pages.append(button('下一页',()=>{filter.offset+=24;return ctx.refresh();}));parent.append(pages);
}
