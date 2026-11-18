import {el,beijing} from './dom.mjs';
const colors=[['blue','蓝色'],['green','绿色'],['rose','粉色'],['yellow','黄色']];
export function projectUI(ctx,parent,value,change){
 const {surface,uid,api}=ctx,{button,field,select,row,dialog,confirm}=surface;
 const preferences=ctx.projectPreferences||(ctx.projectPreferences=new Map()),prefs=preferences.get(value.id)||{filter:'all',view:ctx.platform==='android'?'list':'canvas'};preferences.set(value.id,prefs);
 const members=[{uid:value.owner,name:value.members.find(m=>m.uid===value.owner)?.name||'项目负责人'},...value.members.filter(m=>m.uid!==value.owner)];
 const tasks=row('任务与材料'),tools=el('div','','hub-actions');tasks.append(el('p',value.tasks.filter(t=>t.done===t.quantity).length+' / '+value.tasks.length+' 项已完成','hub-muted'),tools);
 const filter=select(tools,'查看任务',[['all','全部任务'],['mine','分配给我'],['open','尚未完成']],prefs.filter),list=el('div','','hub-project-tasks');tasks.append(list);parent.append(tasks);
 function editTask(task){
  const d=dialog(task?'更新任务':'新建任务'),canEdit=value.editable;
  const title=field(d.content,'任务或材料',task?.title||''),grid=el('div','','hub-form-grid');d.content.append(grid);title.disabled=!canEdit;
  const quantity=field(grid,'所需数量',task?.quantity||1,'number'),done=field(grid,'已完成数量',task?.done||0,'number'),assignee=select(grid,'负责人',[['','未分配'],...members.map(m=>[m.uid,m.name])],task?.assignee||'');
  quantity.min='1';quantity.max='1000000';done.min='0';done.max=String(task?.quantity||1000000);quantity.disabled=!canEdit;grid.querySelector('.hub-select').disabled=!canEdit;
  const requestId=task?.id||crypto.randomUUID();
  d.footer.append(button('取消',d.close),button('保存任务',async()=>{await change('tasks',{id:requestId,revision:task?.revision||0,title:title.value,quantity:Number(quantity.value),done:Number(done.value),assignee:assignee.value});d.close();},true));
 }
 function drawTasks(){list.replaceChildren();const shown=value.tasks.filter(t=>filter.value==='all'||filter.value==='mine'&&t.assignee===uid||filter.value==='open'&&t.done<t.quantity);
  for(const task of shown){const item=row(task.title),progress=el('progress','','hub-progress'),actions=el('div','','hub-actions');progress.max=task.quantity;progress.value=task.done;item.append(el('span',task.done===task.quantity?'已完成':task.done?'进行中':'未开始','hub-chip'),el('small',(members.find(m=>m.uid===task.assignee)?.name||'未分配')+' · '+task.done+' / '+task.quantity),progress,actions);
   if(value.editable||task.assignee===uid)actions.append(button('更新进度',()=>editTask(task)));
   if(value.editable)actions.append(button('移除',()=>confirm('移除任务？',task.title,()=>change('tasks',{id:task.id,revision:task.revision,deleted:true}))));list.append(item);
  }if(!shown.length)surface.empty(list,'这里还没有任务。');
 }
 filter.onchange=()=>{prefs.filter=filter.value;drawTasks();};if(value.editable)tools.append(button('添加任务 / 材料',()=>editTask(),true));drawTasks();
 const notes=row('协作画布'),noteTools=el('div','','hub-actions');notes.append(noteTools);parent.append(notes);
 const view=select(noteTools,'显示方式',[['list','便签列表'],['canvas','自由画布']],prefs.view),area=el('div');notes.append(area);
 function editNote(note){
  const d=dialog(note?'编辑便签':'添加便签'),text=field(d.content,'便签内容',note?.value.text||'','textarea'),color=select(d.content,'颜色',colors,note?.value.color||'blue');text.maxLength=1000;
  const id=note?.id||crypto.randomUUID(),next=value.canvas.length;
  d.footer.append(button('保存便签',async()=>{await change('canvas',{id,revision:note?.revision||0,value:{text:text.value,color:color.value,x:note?.value.x??(next%3)*240,y:note?.value.y??Math.floor(next/3)*200}});d.close();},true));
 }
 if(value.editable)noteTools.append(button('添加便签',()=>editNote(),true));noteTools.append(button('刷新项目',async()=>{await change('refresh');}));
 function drawNotes(){
  area.replaceChildren();area.className=view.value==='canvas'?'hub-canvas-scroll':'hub-project-tasks';
  if(!value.canvas.length){area.className='hub-project-tasks';surface.empty(area,'用便签记录想法、分区与阶段计划。');return;}
  const board=view.value==='canvas'?el('div','','hub-project-canvas'):area;if(board!==area){board.style.width=Math.min(5300,Math.max(740,...value.canvas.map(n=>n.value.x+240)))+'px';board.style.height=Math.min(5300,Math.max(400,...value.canvas.map(n=>n.value.y+200)))+'px';area.append(board);area.setAttribute('aria-label','协作画布，可横向和纵向滚动');}
  for(const note of value.canvas){
   const tile=el('article','','hub-project-note'),head=el('header'),text=el('div',note.value.text,'hub-note-text'),actions=el('div','','hub-actions');tile.dataset.color=note.value.color;tile.dataset.note=note.id;tile.append(head,text,actions);
   if(board!==area){tile.style.left=note.value.x+'px';tile.style.top=note.value.y+'px';}
   head.append(el('span','便签','hub-muted'));
   if(value.editable){
    actions.append(button('编辑',()=>editNote(note)),button('移除',()=>confirm('移除便签？','其他成员刷新项目后会看到这项更改。',()=>change('canvas',{id:note.id,revision:note.revision,deleted:true}))));
    if(board!==area){const handle=button('移动',()=>{});handle.classList.add('hub-note-handle');head.append(handle);let drag;
     handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,scrollX:area.scrollLeft,scrollY:area.scrollTop};handle.setPointerCapture(e.pointerId);tile.classList.add('moving');};
     handle.onpointermove=e=>{if(!drag||e.pointerId!==drag.id)return;tile.style.left=Math.max(0,Math.min(5000,Math.round(note.value.x+e.clientX-drag.x+area.scrollLeft-drag.scrollX)))+'px';tile.style.top=Math.max(0,Math.min(5000,Math.round(note.value.y+e.clientY-drag.y+area.scrollTop-drag.scrollY)))+'px';};
     handle.onpointerup=async e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;tile.classList.remove('moving');handle.releasePointerCapture(e.pointerId);const x=parseInt(tile.style.left),y=parseInt(tile.style.top);if(x===note.value.x&&y===note.value.y)return;handle.disabled=true;try{await change('canvas',{id:note.id,revision:note.revision,value:{...note.value,x,y}});}catch(error){tile.style.left=note.value.x+'px';tile.style.top=note.value.y+'px';surface.report(error,parent);}finally{handle.disabled=false;}};
     handle.onpointercancel=handle.onlostpointercapture=()=>{if(!drag)return;drag=null;tile.classList.remove('moving');tile.style.left=note.value.x+'px';tile.style.top=note.value.y+'px';};
    }
   }board.append(tile);
  }
  if(!value.canvas.length)surface.empty(area,'用便签记录想法、分区与阶段计划。');
 }
 view.onchange=()=>{prefs.view=view.value;drawNotes();};drawNotes();const sync=el('small','协作更新已同步','hub-muted');sync.dataset.hubSync='true';notes.append(sync);
 if(value.editable)notes.append(button('项目操作记录',async()=>{const history=await api('records/'+value.id+'/project-history'),d=dialog('项目操作记录');for(const event of history.items)d.content.append(row(event.description,event.name+' · '+beijing(event.created)));if(!history.items.length)surface.empty(d.content,'尚无操作记录');}));
 const outcomes=row('阶段成果');parent.append(outcomes);if(value.editable)outcomes.append(button('发布阶段成果',()=>{
  const d=dialog('记录阶段成果'),title=field(d.content,'阶段标题'),note=field(d.content,'完成了什么','','textarea'),search=field(d.content,'查找已公开作品'),list=el('div','','hub-list'),picked=el('p','尚未选择作品','hub-muted'),key=crypto.randomUUID();let work='';d.content.append(picked,list);
  const load=async()=>{const found=await api('records?kind=work&scope=public&q='+encodeURIComponent(search.value)+'&offset=0');if(!d.node.isConnected)return;list.replaceChildren();for(const item of found.items){const card=row(item.title,item.summary);card.append(button('引用这件作品',()=>{work=item.id;picked.textContent='已选择 · '+item.title;list.replaceChildren();}));list.append(card);}if(!found.items.length)surface.empty(list,'没有找到公开作品。请先在作品展厅投稿并完成审核。');};d.footer.append(button('查找作品',load),button('发布成果',async()=>{if(!work)throw Error('请先选择一件公开作品');await change('outcome',{id:key,work,title:title.value,note:note.value});d.close();},true));void load().catch(e=>surface.report(e,d.content));
 }));
 for(const outcome of value.outcomes||[]){const card=row(outcome.title,outcome.note),actions=el('div','','hub-actions');card.append(el('small',(outcome.name||'负责人')+' · '+beijing(outcome.created)+' · 引用作品第 '+outcome.work_revision+' 版'),actions);if(outcome.available)actions.append(button('查看作品',()=>ctx.openRecord(outcome.work)));else card.append(el('small','引用的作品目前未公开'));if(value.editable)actions.append(button('移除成果',()=>confirm('移除此阶段成果？','作品本身仍然保留。',()=>change('outcome',{id:outcome.id,remove:true}))));outcomes.append(card);}if(!value.outcomes?.length)surface.empty(outcomes,'完成一个阶段后，可关联已公开的作品作为成果。');
}
