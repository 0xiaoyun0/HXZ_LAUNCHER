import {projectUI} from './project.mjs';
import {storyEditor} from './story-editor.mjs';
import {memberPicker} from './people.mjs';
import {knowledgeUI} from './knowledge.mjs';
import {sharedMediaUI} from './shared-media.mjs';
import {worldUI} from './world.mjs';
import {eventUI,eventPassport} from './events.mjs';
import {productionDialog} from './production.mjs';
import {assetLibrary} from './asset-library.mjs';
import {el,beijing,timeValue,parseTime} from './dom.mjs';
import {HUB_KINDS,HUB_STATES,HUB_SERVERS} from '../../server/shared/hub-catalog.mjs';
import {communityImage} from '../community/image-upload.mjs';
import {isActiveHubKind} from '../../server/shared/hub-visibility.mjs';

const appealStates={draft:'草稿',review:'待处理',published:'处理中',closed:'已解决',rejected:'待补充',archived:'已归档'};
const recordState=v=>v.kind==='appeal'?appealStates[v.status]:HUB_STATES[v.status];
export function recordUI(ctx){
 const polls=new Set();
 const coverObservers=new Set();let covers=[],coverActive=0,coverGeneration=0;
 const knowledge=knowledgeUI(ctx);
 const sharedMedia=sharedMediaUI(ctx);
 const assets=assetLibrary(ctx,edit);
 const {api,request,surface,uid,navigate,refresh}=ctx,{button,field,select,dialog,confirm,row,empty}=surface;
 function queueCover(parent,url){const ticket=coverGeneration;const observer=new IntersectionObserver(entries=>{if(!entries.some(v=>v.isIntersecting))return;observer.disconnect();coverObservers.delete(observer);covers.push({parent,url,ticket});drainCovers();},{rootMargin:'150px'});coverObservers.add(observer);observer.observe(parent);}
 function drainCovers(){while(coverActive<3&&covers.length){const item=covers.shift();if(!ctx.alive()||item.ticket!==coverGeneration||!item.parent.isConnected)continue;coverActive++;void request(item.url+'/data').then(value=>{if(!ctx.alive()||item.ticket!==coverGeneration||!item.parent.isConnected)return;const image=el('img');image.src=value.image;image.alt='';image.decoding='async';item.parent.replaceChildren(image);}).catch(()=>{if(item.parent.isConnected)item.parent.textContent='封面暂时未载入';}).finally(()=>{coverActive--;drainCovers();});}}
 async function pictures(parent,urls){for(const url of urls||[]){const tile=el('div');parent.append(tile);try{const value=await request(url+'/data');if(!ctx.alive()||!parent.isConnected)return;const img=el('img');img.src=value.image;img.alt='内容图片';img.className='hub-cover';img.onclick=()=>{const d=dialog('图片');const full=img.cloneNode();full.style.maxHeight='70vh';full.style.objectFit='contain';d.content.append(full);};tile.append(img);}catch{tile.append(el('small','图片未载入'));}}}
 function uploader(parent,initial=[],max=6){const urls=[...initial],container=el('div','','hub-images'),input=field(parent,'图片 · 最多 '+max+' 张','','file');input.accept='image/png,image/jpeg,image/webp';input.multiple=true;parent.append(container);
  const preview=url=>{const tile=el('div');container.append(tile);void pictures(tile,[url]);tile.append(button('移除',()=>{urls.splice(urls.indexOf(url),1);tile.remove();parent.dispatchEvent(new Event('change',{bubbles:true}));}));};urls.forEach(preview);
  input.onchange=async()=>{input.disabled=true;try{for(const file of input.files){if(urls.length>=max)throw Error('最多上传 '+max+' 张图片');const v=await request('/api/media/upload','POST',{scope:'hub',image:await communityImage(file)});urls.push(v.url);preview(v.url);}}catch(e){surface.report(e,parent);}finally{input.value='';input.disabled=false;}};return urls;
 }
 function edit(kind,record={}){
  if(!isActiveHubKind(kind))return;
  const requestId=crypto.randomUUID(),spec=HUB_KINDS[kind],d=dialog((record.id?'编辑':'新建')+spec.singular),form=el('form','','hub-surface');d.content.append(form);
  const title=field(form,'标题',record.title||''),summary=field(form,'摘要',record.summary||''),body=field(form,'正文',record.body||'','textarea'),grid=el('div','','hub-form-grid');form.append(grid);
  title.maxLength=120;summary.maxLength=300;body.maxLength=30000;
  const inputs={};for(const [key,label,type,options] of spec.fields){
   let value=record.data?.[key];if(Array.isArray(value)){if(key==='ingredients')value=value.map(v=>v.item+'='+v.quantity).join('\n');else if(key==='choices')value=value.join('\n');else value=JSON.stringify(value,null,2);}
   if(kind==='story'&&key==='nodes'){inputs[key]=storyEditor(ctx,form,value);continue;}
   if(type==='select'||type==='server')inputs[key]=select(grid,label,type==='server'?HUB_SERVERS:options.split(',').map(v=>{const index=v.indexOf(':');return [v.slice(0,index),v.slice(index+1)];}),value);
   else if(type==='boolean')inputs[key]=field(grid,label,value===true,'checkbox');
   else if(type==='time')inputs[key]=field(grid,label+'（北京时间）',timeValue(value),'datetime-local');
   else inputs[key]=field(type==='multiline'?form:grid,label,value??(key==='capacity'?20:key==='quantity'?1:''),type==='multiline'?'textarea':type==='number'?'number':'text');
  }
  const keywords=field(form,'标签 · 用逗号分隔',(record.tags||[]).join('，'));
  const visibility=spec.private?{value:'private'}:select(form,'可见范围',[['community','社区'],['private','仅自己与项目成员']],record.visibility||'community');
  const images=uploader(form,record.images||[]);let dirty=false;form.oninput=form.onchange=()=>dirty=true;
  d.onClose(close=>dirty?confirm('放弃未保存的内容？','已填写的内容尚未保存。',close):close());
  async function save(status){
   const data={};for(const [key,,type] of spec.fields){const input=inputs[key];data[key]=type==='boolean'?input.checked:type==='number'?Number(input.value):type==='time'?parseTime(input.value):input.value;}
   if(kind==='program'&&data.format==='bilibili')data.source=(await api('media/resolve','POST',{source:data.source})).source;
   const saved=await api('records'+(record.id?'/'+record.id:''),record.id?'PUT':'POST',{requestId,kind,revision:record.revision||0,title:title.value,summary:summary.value,body:body.value,data,visibility:visibility.value,tags:keywords.value.split(/[,，]/).map(v=>v.trim()).filter(Boolean),images,status});dirty=false;d.close();await refresh();await detail(saved.id);
  }
  form.onsubmit=e=>{e.preventDefault();};d.footer.append(button('保存草稿',()=>save('draft')),button(spec.moderated||spec.private?'提交审核':'发布',()=>save('review'),true));
 }
 async function detail(id){
  const d=dialog('正在读取内容');let value,sequence=0,changing=false,nextPoll=0,polling=false;
  const editing=()=>changing||[...document.querySelectorAll('dialog[open]')].at(-1)!==d.node||!!d.content.querySelector('.moving')||d.content.contains(document.activeElement)&&document.activeElement.matches('input,textarea,[contenteditable=true]');
  async function load(background=false){const ticket=++sequence,next=await api('records/'+id);if(!ctx.alive()||!d.node.isConnected||ticket!==sequence||background&&editing())return;if(background&&JSON.stringify(next)===JSON.stringify(value))return;
   const scroll=d.node.scrollTop,canvas=d.content.querySelector('.hub-canvas-scroll'),position=canvas?[canvas.scrollLeft,canvas.scrollTop]:null;value=next;d.node.querySelector('h2').textContent=value.title;d.content.replaceChildren();d.footer.replaceChildren();render();d.node.scrollTop=scroll;const updated=d.content.querySelector('.hub-canvas-scroll');if(position&&updated){updated.scrollLeft=position[0];updated.scrollTop=position[1];}
  }
  const change=async(action,input={})=>{changing=true;try{if(action!=='refresh')await api('records/'+id+'/'+action,'POST',input);await load();await refresh();}finally{changing=false;}};
  function render(){
   const v=value;if(!isActiveHubKind(v.kind)){d.node.querySelector('h2').textContent='历史内容';d.node.setAttribute('aria-label','历史内容');empty(d.content,'这个功能已归档，历史记录仍保留。请从主导航使用现有功能。');d.footer.hidden=true;return;}
   if(v.invitation){empty(d.content,'这份历史邀请已归档。');return;}
   const spec=HUB_KINDS[v.kind],meta=el('div','','hub-tags');meta.append(el('span',recordState(v),'hub-chip'),el('span','第 '+v.revision+' 版','hub-chip'));v.tags.forEach(t=>meta.append(el('span',t,'hub-chip')));d.content.append(meta);
   if(v.summary)d.content.append(el('p',v.summary,'hub-muted'));if(v.body)d.content.append(el('div',v.body,'hub-prose'));
   const images=el('div','','hub-images');d.content.append(images);void pictures(images,v.images);
   const info=el('div','','hub-form-grid hub-record-facts');for(const [key,label,type,options]of spec.fields){if(['nodes','ingredients','choices'].includes(key))continue;const data=v.data[key];if(data!==''&&data!==undefined&&(data!==0||type==='number')&&(data!==false||type==='boolean')){const cell=el('div');const text=type==='time'?beijing(data):type==='boolean'?(data?'已开启':'未开启'):type==='server'?HUB_SERVERS.find(s=>s[0]===data)?.[1]||data:type==='select'?(options.split(',').map(v=>{const i=v.indexOf(':');return [v.slice(0,i),v.slice(i+1)];}).find(v=>v[0]===data)?.[1]||data):String(data);cell.append(el('small',label),el('p',text));info.append(cell);}}d.content.append(info);
   const actions=el('div','','hub-actions');d.content.append(actions);
   if(!ctx.adminMode)actions.append(button('收藏',()=>api('saved','POST',{id:v.id,title:v.title,kind:v.kind,url:'/community/hub?section='+v.kind+'&item='+v.id,tags:v.tags})));
   if(!ctx.adminMode&&v.owner!==uid)actions.append(button('关注作者',()=>api('follow','POST',{uid:v.owner,followed:true})));
   if(v.editable){actions.append(button('编辑',()=>{d.close();edit(v.kind,v);}),button('修改历史',async()=>{const history=await api('records/'+v.id+'/history'),h=dialog('修改历史');for(const item of history.items){const card=row('第 '+item.revision+' 版',beijing(item.created));card.append(button('查看',()=>{const preview=dialog(item.value.title);preview.content.append(el('pre',JSON.stringify(item.value,null,2),'hub-prose'));}));h.content.append(card);}}));}
   if(v.kind==='event'||v.kind==='project'){
    if(!ctx.adminMode&&v.status==='published'&&!v.activity?.tournament)actions.append(button(v.joined?'退出参与':v.kind==='event'?'报名参加':'加入项目',()=>v.joined?confirm('退出参与？','退出后将释放报名位置。',async()=>{await api('records/'+v.id+'/leave','POST',{});d.close();await refresh();}):change('join'),!v.joined));
    if(v.activity?.tournament)actions.append(el('span','参赛名单已锁定 · 退赛请联系负责人','hub-muted'));
    const members=row('参与成员 · '+v.members.length);members.append(el('p',v.members.map(m=>m.name).join('、')||'还没有成员','hub-muted'));d.content.append(members);
    if((v.mine||v.manage)&&!v.activity?.tournament){const invite=memberPicker(ctx,members,'邀请玩家'),role=select(members,'权限',[['member','参与者'],['editor','可编辑']], 'member');members.append(button('邀请成员',()=>change('members',{uid:invite.value,role:role.value})));for(const person of v.members)if(person.uid!==v.owner)members.append(button('移除 '+person.name,()=>confirm('移除成员？',person.name,()=>change('members',{uid:person.uid,action:'remove'}))));}
   }
   if(v.kind==='event'){
    eventUI(ctx,d.content,v,change,{pictures,uploader});
    if(!['hunt','tournament'].includes(v.data.format)){const results=row('活动结果');for(const item of v.results)results.append(el('p',item.name+' · '+item.score+' · '+item.note));if(!v.results.length)empty(results,'尚未公布成绩');
    if(v.editable){const who=select(results,'参与者',v.members.map(m=>[m.uid,m.name])),score=field(results,'成绩',0,'number'),note=field(results,'说明');results.append(button('登记结果',()=>change('result',{uid:who.value,score:Number(score.value),note:note.value})));}d.content.append(results);}
   }
   if(v.kind==='project')projectUI(ctx,d.content,v,change);
   if(v.kind==='work'&&!ctx.adminMode){if(v.discussion&&!v.discussion.hidden)actions.append(button('讨论与评论',()=>{d.close();navigate('/community/forum/'+v.discussion.id);},true));else if(v.discussion?.hidden)actions.append(el('span','作品讨论已由管理员处理','hub-muted'));else if(v.editable&&v.status==='published'&&v.visibility==='community')actions.append(button('开启论坛讨论',()=>confirm('为作品开启讨论？','将在论坛创建一篇作品讨论，回复、点赞和通知沿用现有论坛功能。',async()=>{const result=await api('records/'+v.id+'/discussion','POST',{});d.close();navigate('/community/forum/'+result.post);})));}
   if(v.kind==='appeal'){const thread=row('沟通与处理','仅本人和社区管理员可见。处理结果不会自动扣款或退款。');for(const message of v.messages||[])thread.append(row(message.name+' · '+beijing(message.created),message.body));if(v.messages?.length===100)thread.append(el('small','显示最近 100 条沟通记录'));if(v.status!=='archived'){const text=field(thread,v.manage?'处理说明':'补充说明','','textarea'),status=v.manage?select(thread,'处理状态',[['published','处理中'],['closed','已解决'],['rejected','需要补充']],['published','closed','rejected'].includes(v.status)?v.status:'published'):null,requestId=crypto.randomUUID();thread.append(button(v.manage?'回复并保存处理':'发送补充说明',()=>change('reply',{requestId,revision:v.revision,body:text.value,...status?{status:status.value}:{}}),true));}d.content.append(thread);}
   if(v.kind==='ledger')d.content.append(el('p','这是管理员公开的收支记录，独立于玩家的个人积分余额。','hub-muted'));
   if(v.kind==='proposal'){const total=v.votes.reduce((n,r)=>n+r.count,0);v.data.choices.forEach((label,index)=>{const count=v.votes.find(r=>r.choice===index)?.count||0,b=button(label+' · '+count+' 票'+(v.voted===index?' · 已选择':''),()=>change('vote',{choice:index}),v.voted===index);b.disabled=Date.now()>=v.data.ends||v.status!=='published';d.content.append(b);});d.content.append(el('small','共 '+total+' 人投票 · 每人保留一个选择'));}
   if(v.kind==='story'){const node=v.data.nodes.find(n=>n.id===v.progress.node);if(node){const scene=row('互动作品',node.text);for(const item of node.choices)scene.append(button(item.label,()=>change('play',{choice:node.choices.indexOf(item)}),true));if(!node.choices.length)scene.append(el('p','已抵达结局'));scene.append(button('重新开始',()=>change('play',{restart:true})));d.content.append(scene);}}
   if(v.kind==='recipe'){const plan=row('单批材料');plan.append(...v.data.ingredients.map(i=>el('p',i.item+' × '+i.quantity)));if(v.status==='published'&&v.visibility==='community')plan.append(button('制定生产计划',()=>productionDialog(ctx,v),true));d.content.append(plan);}
   if(v.kind==='world')worldUI({...ctx,refresh:async()=>{await load();await refresh();}},d.content,v);
   if(v.kind==='program'&&v.status==='published'&&v.visibility==='community'){actions.append(button('打开共同放映',()=>sharedMedia.lobby(v),true));}
   if(v.manage&&v.status==='review'&&v.kind!=='appeal'){const note=field(d.content,'审核说明');d.footer.append(button('退回修改',()=>change('review',{revision:v.revision,status:'rejected',note:note.value})),button('审核通过',()=>change('review',{revision:v.revision,status:'published',note:note.value}),true));}
   if(v.editable&&v.status==='published')d.footer.append(button('结束',()=>confirm('结束当前内容？','已报名和完成记录会保留。',()=>change('close',{revision:v.revision}))));
   if(v.editable)d.footer.append(button('归档',()=>confirm('归档内容？','公开列表将不再显示此内容，记录会保留。',async()=>{await api('records/'+v.id,'DELETE');d.close();await refresh();})));
  }
  try{await load();if(value?.kind==='project'){
   const timer=setInterval(async()=>{if(!ctx.alive()||!d.node.isConnected){clearInterval(timer);polls.delete(timer);return;}if(polling||document.hidden||editing()||Date.now()<nextPoll)return;polling=true;nextPoll=Date.now()+8000;try{await load(true);const status=d.content.querySelector('[data-hub-sync]');if(status)status.textContent='协作更新已同步';}catch{nextPoll=Date.now()+30000;const status=d.content.querySelector('[data-hub-sync]');if(status)status.textContent='自动同步暂不可用，可手动刷新';}finally{polling=false;}},8000);polls.add(timer);d.node.addEventListener('close',()=>{clearInterval(timer);polls.delete(timer);},{once:true});
  }}catch(e){surface.report(e,d.content);d.content.append(button('重试',()=>load()));}
 }
 async function list(parent,section,filter){
  if(!isActiveHubKind(section)){empty(parent,'这个功能已归档，历史记录仍保留。');return;}
  coverGeneration++;covers=[];for(const observer of coverObservers)observer.disconnect();coverObservers.clear();
  const spec=HUB_KINDS[section];if(spec.private)filter.scope=filter.scope==='review'?'review':'mine';
  if(section==='article'){const offline=el('div','','hub-actions');offline.append(knowledge.button());parent.append(offline);}
  if(section==='work'&&!ctx.adminMode){const tools=el('div','','hub-actions');tools.append(assets.button());parent.append(tools);}
  if(section==='program'){const watch=el('div','','hub-actions');watch.append(button('正在放映的房间',()=>sharedMedia.lobby()));parent.append(watch);}
  if(section==='event'){const tools=el('div','','hub-actions');tools.append(eventPassport(ctx));parent.append(tools);}
  let data;try{data=await api('records?category='+encodeURIComponent(filter.category||'')+'&kind='+section+'&scope='+filter.scope+'&q='+encodeURIComponent(filter.query)+'&offset='+filter.offset+(section==='article'?'&server='+encodeURIComponent(filter.server||'')+'&version='+encodeURIComponent(filter.version||''):''));}catch(error){if(!['article','work'].includes(section))throw error;surface.report(error,parent);empty(parent,section==='article'?'在线资料暂时无法读取，已下载的正文仍可在离线知识库阅读。':'作品暂时无法读取，本机素材仍可整理和编辑。');return;}if(!ctx.alive())return;
  const title=el('div','','hub-toolbar-title');if(!ctx.sectionTitleInCard)title.append(el('h2',spec.label));else title.classList.add('hub-toolbar-actions');const quick=parent.querySelector(':scope > .hub-actions');if(quick){title.append(...quick.children);quick.replaceWith(title);}else parent.append(title);title.append(button('新建'+spec.singular,()=>edit(section),true));
  const tools=el('form','','hub-tools'),search=field(tools,'搜索',filter.query),scope=select(tools,'范围',[[spec.private?'mine':'public',spec.private?'我的提交':'社区公开'],...spec.private?[]:[['mine','我的内容']],...data.manager?[['review','待审核']]:[]],filter.scope);parent.append(tools);scope.onchange=value=>{filter.scope=value;filter.offset=0;refresh();};
  let version;if(section==='article'){const server=select(tools,'适用服务器',HUB_SERVERS,filter.server||'');version=field(tools,'适用版本',filter.version||'');server.onchange=()=>{filter.server=server.value;filter.query=search.value;filter.version=version.value;filter.offset=0;refresh();};search.placeholder='标题、标签或正文';}
  if(section==='work'){const categories=HUB_KINDS.work.fields.find(v=>v[0]==='category')[3].split(',').map(v=>v.split(':')),category=select(tools,'作品分类',[['','全部作品'],...categories],filter.category||'');category.onchange=()=>{filter.category=category.value;filter.query=search.value;filter.offset=0;return refresh();};}
  const find=()=>{filter.query=search.value;if(version)filter.version=version.value;filter.offset=0;return refresh();};tools.onsubmit=e=>{e.preventDefault();void find().catch(e=>surface.report(e,parent));};tools.append(button('查找',find));
  const grid=el('div','','hub-grid');parent.append(grid);for(const item of data.items){const tile=row(item.title,item.summary||''),meta=el('div','','hub-tags');meta.append(el('span',recordState(item),'hub-chip'),el('small',item.name+' · '+beijing(item.updated)));tile.prepend(meta);if(section==='work'){const cover=el('div','','hub-work-cover');tile.prepend(cover);if(item.images?.[0])queueCover(cover,item.images[0]);else{cover.classList.add('hub-work-placeholder');cover.append(el('span','作品留影'));}}tile.append(button('查看'+spec.singular,()=>detail(item.id)));grid.append(tile);}
  if(!data.items.length)empty(grid,'这里还没有内容。');const pager=el('div','','hub-actions');if(filter.offset>0)pager.append(button('上一页',()=>{filter.offset=Math.max(0,filter.offset-24);return refresh();}));if(filter.offset+24<data.total)pager.append(button('下一页',()=>{filter.offset+=24;return refresh();}));pager.append(el('small','共 '+data.total+' 项'));parent.append(pager);
 }
 return {list,detail,edit,pictures,dispose:async()=>{coverGeneration++;covers=[];for(const observer of coverObservers)observer.disconnect();coverObservers.clear();for(const timer of polls)clearInterval(timer);polls.clear();await sharedMedia.close();await knowledge.close();await assets.close();}};
}
