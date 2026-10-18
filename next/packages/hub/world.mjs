import {el,beijing} from './dom.mjs';

export function worldUI(ctx,parent,record){
 const {surface,api,uid}=ctx,{button,field,select,dialog,row,confirm}=surface,lease=record.lease;
 const status=row('世界交接',lease?'正在由 '+(lease.name||lease.uid)+' 接力，至 '+beijing(lease.expires):'当前没有接力占用');parent.append(status);
 if(record.data.relay){const release=!!lease&&(lease.uid===uid||record.editable),action=button(release?'结束当前接力':lease?'已有玩家接力中':'开始 24 小时接力',()=>confirm(release?'确认结束接力？':'开始接力？',release?'请先确认玩家已导出并提交本次修改后的世界快照。':'接力期间其他玩家不能占用同一世界。到期后会自动释放，请及时提交快照。',async()=>{await api('records/'+record.id+'/lease','POST',{release});await ctx.refresh();}),true);action.disabled=!!lease&&!release;status.append(action);}
 const actions=el('div','','hub-actions');status.append(actions);
 if(ctx.worldPlan){actions.append(button('导入独立实例',async()=>{
  const d=dialog('导入社区世界');const plan=await ctx.worldPlan(record.id);if(!d.node.isConnected)return;
  const item=plan.record,name=field(d.content,'新实例名称',('世界-'+item.title).replace(/[\\/:*?"<>|]/g,' ').slice(0,70));name.maxLength=80;
  d.content.append(el('p','Minecraft '+item.data.version+' · '+(item.data.loader||'原版')+' '+(item.data.loaderVersion||''),'hub-muted'));
  let template;if(item.data.loader&&(item.data.packageType||'world')==='world'){
   d.content.append(el('p','作者提供的是地图。请选择包含所需模组的实例作为运行模板；只复制模组和配置，不复制模板中的存档和截图。'));
   if(!plan.templates.length){surface.empty(d.content,'还没有版本匹配的隔离实例。请先安装作者指定的整合包，再回来导入地图。');return;}
   template=select(d.content,'运行模板',plan.templates.map(v=>[v.id,v.name]));
   d.content.append(el('small','已核对游戏与加载器版本。具体模组仍需与你要体验的地图一致。'));
  }else d.content.append(el('p',item.data.packageType==='modpack'?'将校验并安装作者提供的完整整合包。':'将下载对应原版游戏，并把地图放进新的独立实例。'));
  d.content.append(el('small','现有存档不被覆盖。导入后，从游戏的「单人游戏」选择地图。'));
  d.footer.append(button('取消',d.close),button('确认导入',async()=>{const input={record:item.id,revision:item.revision,name:name.value,template:template?.value,confirmed:true};surface.close();await ctx.importWorld(input);},true));
 },true));}
 else status.append(el('small','此世界可在电脑端导入为独立实例；手机端可阅读要求及提交接力记录。'));
 if(lease?.uid===uid||record.editable)actions.append(button('提交新快照',()=>{
  const d=dialog('提交世界快照'),source=field(d.content,'已上传的 ZIP 或整合包地址'),sha256=field(d.content,'文件 SHA-256'),version=field(d.content,'地图版本'),note=field(d.content,'本次修改','', 'textarea');
  d.content.prepend(el('p','关闭游戏后，在实例「维护」导出世界快照；将文件上传到可下载的存储，再填写地址。负责人审核后才替换公开版本。','hub-muted'));
  d.footer.append(button('提交审核',async()=>{await api('records/'+record.id+'/world-snapshot','POST',{revision:record.revision,source:source.value,sha256:sha256.value,mapVersion:version.value,note:note.value});d.close();await ctx.refresh();},true));
 }));
 if(record.snapshots?.length){const list=row('快照版本');for(const item of record.snapshots){const entry=row(item.mapVersion||'未命名版本',item.name+' · '+beijing(item.created)+' · '+({review:'待审核',accepted:'已采用',rejected:'已退回'}[item.status]||item.status));entry.append(el('p',item.note||'没有填写修改说明','hub-prose'));if(record.editable&&item.status==='review'){const controls=el('div','','hub-actions');controls.append(button('退回',()=>review(item,false)),button('采用快照',()=>review(item,true),true));entry.append(controls);}list.append(entry);}parent.append(list);}
 function review(item,accept){return confirm(accept?'采用这个世界快照？':'退回这个快照？',accept?'公开下载地址将切换到该快照，旧版本及交接记录会保留。':'提交人可以重新提交修订后的快照。',async()=>{await api('records/'+record.id+'/world-review','POST',{snapshot:item.id,revision:record.revision,accept});await ctx.refresh();});}
}
