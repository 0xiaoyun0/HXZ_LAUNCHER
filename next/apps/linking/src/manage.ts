import {api,setNavigationGuard} from './host-api';
import {ask,button,element,field,notice,selectField} from './activity-ui';
import {formatDate,t} from './localization';
type Draft={id:string;title:string;subtitle:string;order:number;opensAt:string;closesAt:string;locale:string;archives:any[];tasks:any[]};
const id=(prefix:string)=>prefix+'-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
const localDate=(iso:string)=>iso?new Date(Date.parse(iso)+8*3600000).toISOString().slice(0,16):'';
const dateValue=(value:string)=>value?new Date(value+':00+08:00').toISOString():'';
export async function startManagement(root:HTMLElement){
  let dirty=false;
  const guard=async()=>!dirty||await ask(t('unsaved'));
  setNavigationGuard(guard);
  async function home(tab='chapters'){
    if(!await guard())return;dirty=false;
    const value=await api('/api/admin/linking');root.replaceChildren();const editor=element('div','','activity-editor'),tabs=element('nav','','activity-admin-tabs');
    for(const [key,label]of [['chapters','章节与档案'],['submissions','待审核任务'],['settings','活动设置']]){const b=button(label,()=>home(key));b.setAttribute('aria-selected',String(tab===key));tabs.append(b);}editor.append(tabs);root.append(editor);
    if(tab==='settings'){
      const config=value.config,card=element('section','','activity-card');card.append(element('h2','活动设置'));
      selectField(card,'活动状态',String(config.enabled),[['true','开放'],['false','维护中 · 暂停玩家访问']],v=>{config.enabled=v==='true';dirty=true;});
      field(card,'活动名称',config.title,v=>{config.title=v;dirty=true;});field(card,'活动介绍',config.intro,v=>{config.intro=v;dirty=true;},{area:true});
      card.append(button('保存活动设置',async()=>{const result=await api('/api/admin/linking/config','PUT',config);config.revision=result.revision;dirty=false;notice('活动设置已保存');},'primary'));editor.append(card);return;
    }
    if(tab==='submissions'){
      const value=await api('/api/admin/linking/submissions');editor.append(element('h1','任务审核'),element('p',`${value.total} 份待审核提交。每页最多显示 50 份。`));
      for(const item of value.items){const card=element('article','','activity-card');card.append(element('h2',item.name),element('small',`${item.chapter} / ${item.task} · ${formatDate(item.created)}`),element('div',item.body,'activity-prose'));let note='';field(card,'审核说明（未通过时必填）','',v=>note=v,{area:true});const actions=element('div','','activity-row');for(const [status,label]of [['approved','通过审核'],['rejected','退回修改']])actions.append(button(label,async()=>{await api('/api/admin/linking/submissions/'+item.id,'POST',{status,note,updated:item.updated});notice('审核结果已保存');await home('submissions');},status==='approved'?'primary':''));card.append(actions);editor.append(card);}if(!value.items.length)editor.append(element('section','暂时没有待审核的任务。','activity-card'));return;
    }
    const header=element('div','','activity-row');header.append(element('h1','章节与档案'),button('新建章节',()=>edit({chapter:{id:id('chapter'),title:'新的章节',subtitle:'',order:value.chapters.length,opensAt:'',closesAt:'',locale:'zh-CN',archives:[{id:id('archive'),title:'第一份档案',en:'',category:'探索记录',department:'',date:'',lead:'',summary:'',body:'请在这里编写档案正文。',notes:[],requires:[]}],tasks:[]},revision:0,liveRevision:0,published:false}),'primary'));editor.append(header);
    const grid=element('div','','activity-grid');for(const c of value.chapters){const card=element('article','','activity-card');card.append(element('h2',c.title),element('p',c.archived?'已归档':!c.published?'未发布':c.revision===c.liveRevision?'已发布':'有未发布的修改'),element('small','更新于 '+formatDate(c.updated)),button('编辑章节',async()=>edit(await api('/api/admin/linking/chapters/'+c.id))));grid.append(card);}editor.append(grid);
    editor.append(element('p','草稿不会影响在线玩家。发布后内容才会生效；归档会关闭章节入口，但保留全部进度。请保留已有档案和任务标识；改变玩法含义时创建新任务。','activity-muted'));
  }
  async function edit(document:any){
    if(!await guard())return;dirty=false;let draft:Draft=document.chapter,revision:number=document.revision;
    const changed=()=>dirty=true;
    function render(){
      root.replaceChildren();const editor=element('div','','activity-editor');root.append(editor);
      const heading=element('div','','activity-row');heading.append(button('返回章节列表',()=>home()),element('h1','编辑章节'));editor.append(heading);
      const card=element('section','','activity-card');card.append(element('small','固定标识：'+draft.id));const meta=element('div','','activity-form-grid');
      field(meta,'章节标题',draft.title,v=>{draft.title=v;changed();});field(meta,'排序（越小越靠前）',String(draft.order),v=>{draft.order=Number(v);changed();},{type:'number'});
      field(meta,'开放时间（北京时间，留空即随发布开放）',localDate(draft.opensAt),v=>{draft.opensAt=dateValue(v);changed();},{type:'datetime-local'});field(meta,'结束时间（北京时间，留空长期开放）',localDate(draft.closesAt),v=>{draft.closesAt=dateValue(v);changed();},{type:'datetime-local'});card.append(meta);field(card,'章节简介',draft.subtitle,v=>{draft.subtitle=v;changed();},{area:true});editor.append(card);
      const archiveHead=element('div','','activity-row');archiveHead.append(element('h2',`档案 · ${draft.archives.length}`),button('添加档案',()=>{draft.archives.push({id:id('archive'),title:'新档案',en:'',category:'探索记录',department:'',date:'',lead:'',summary:'',body:'',notes:[],requires:[]});changed();render();}));editor.append(archiveHead);
      draft.archives.forEach((archive,index)=>{
        const details=element('details');details.open=draft.archives.length<4;details.append(element('summary',`${index+1}. ${archive.title}`),element('small','固定标识：'+archive.id));const grid=element('div','','activity-form-grid');
        for(const [key,label]of [['title','档案标题'],['en','英文标题（可选）'],['category','分类'],['department','所属部门 / 小组'],['date','记录日期 / 阶段'],['lead','作者 / 相关人物']])field(grid,label,archive[key],v=>{archive[key]=v;changed();});details.append(grid);
        field(details,'目录摘要（未解锁时也可见）',archive.summary,v=>{archive.summary=v;changed();},{area:true});field(details,'档案正文（只有解锁后下发）',archive.body,v=>{archive.body=v;changed();},{area:true});field(details,'档案补记（每行一项）',archive.notes.join('\n'),v=>{archive.notes=v.split('\n').filter(Boolean);changed();},{area:true});requirements(details,archive.requires,draft.tasks,changed);
        const controls=element('div','','activity-row');if(index)controls.append(button('上移',()=>{[draft.archives[index-1],draft.archives[index]]=[draft.archives[index],draft.archives[index-1]];changed();render();}));controls.append(button('移除档案',async()=>{if(await ask('移除此档案？相关的阅读任务也需要调整，已有进度会保留。')){draft.archives.splice(index,1);changed();render();}}));details.append(controls);editor.append(details);
      });
      const taskHead=element('div','','activity-row');taskHead.append(element('h2',`任务 · ${draft.tasks.length}`),button('添加任务',()=>{draft.tasks.push({id:id('task'),title:'新任务',description:'',type:'read',archiveId:draft.archives[0]?.id||'',requires:[]});changed();render();}));editor.append(taskHead);
      draft.tasks.forEach((task,index)=>{
        const details=element('details');details.append(element('summary',`${index+1}. ${task.title}`),element('small','固定标识：'+task.id));details.open=draft.tasks.length<4;
        field(details,'任务名称',task.title,v=>{task.title=v;changed();});field(details,'任务说明',task.description,v=>{task.description=v;changed();},{area:true});selectField(details,'完成方式',task.type,[['read','阅读指定档案'],['code','输入验证口令'],['manual','提交内容，由管理员审核'],['guild','完成协会委托'],['stat','达成服务器统计']],v=>{task.type=v;changed();render();});
        if(task.type==='read')selectField(details,'需要阅读的档案',task.archiveId||'',[['','请选择档案'],...draft.archives.map(a=>[a.id,a.title] as [string,string])],v=>{task.archiveId=v;changed();});
        if(task.type==='code')field(details,task.answerConfigured?'新的验证口令（留空保留现有答案）':'验证口令',task.answer||'',v=>{task.answer=v;changed();},{type:'password'});
        if(task.type==='guild')field(details,'协会委托任务标识',task.guildId||'',v=>{task.guildId=v;changed();});
        if(task.type==='stat'){selectField(details,'服务器',task.server||'survival',[['survival','原版生存群组'],['mod-1','模组一服'],['mod-2','模组二服']],v=>{task.server=v;changed();});task.server||='survival';field(details,'统计项（例如 minecraft:custom/minecraft:play_time）',task.metric||'',v=>{task.metric=v;changed();});field(details,'目标数值',String(task.value||1),v=>{task.value=Number(v);changed();},{type:'number'});task.value||=1;}
        requirements(details,task.requires,draft.tasks.filter(t=>t.id!==task.id),changed);details.append(button('移除任务',async()=>{if(await ask('移除此任务？引用它的解锁条件也需要调整，已有完成记录会保留。')){draft.tasks.splice(index,1);changed();render();}}));editor.append(details);
      });
      const actions=element('section','','activity-card'),row=element('div','','activity-row');row.append(button(t('save'),save,'primary'),button(t('publish'),async()=>{if(!await ask('发布当前内容？玩家同步后将看到本次修改。'))return;await save();await api('/api/admin/linking/chapters/'+draft.id+'/publish','POST',{revision});notice(t('published'));await home();}));
      if(document.published)row.append(button(t('archive'),async()=>{if(!await ask('归档后玩家暂时无法进入本章，已有进度会完整保留。'))return;await api('/api/admin/linking/chapters/'+draft.id+'/archive','POST',{revision});dirty=false;await home();}));actions.append(row,element('small','保存与发布会检查重复标识、失效引用及循环解锁条件。请先保存草稿，再正式开放活动。'));editor.append(actions);
    }
    async function save(){const result=await api('/api/admin/linking/chapters/'+draft.id,'PUT',{chapter:draft,revision});revision=result.revision;draft=result.chapter;dirty=false;notice(t('saved'));}
    render();
  }
  await home();
}
function requirements(root:HTMLElement,value:string[],tasks:any[],changed:()=>void){
  const group=element('fieldset'),legend=element('legend','前置任务（全部完成后开放；不选则直接开放）');group.append(legend);
  for(const task of tasks){const label=element('label','','activity-check'),input=document.createElement('input');input.type='checkbox';input.checked=value.includes(task.id);input.onchange=()=>{const i=value.indexOf(task.id);if(input.checked&&i<0)value.push(task.id);else if(!input.checked&&i>=0)value.splice(i,1);changed();};label.append(input,document.createTextNode(task.title));group.append(label);}if(!tasks.length)group.append(element('small','暂无可选前置任务'));root.append(group);
}
