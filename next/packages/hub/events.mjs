import {el,beijing} from './dom.mjs';
import {HUB_SERVERS} from '../../server/shared/hub-catalog.mjs';

export function eventUI(ctx,parent,v,change,{pictures,uploader}){
 const {surface}=ctx,{button,field,select,dialog,confirm,row,empty}=surface,activity=v.activity||{},t=activity.tournament,points=activity.checkpoints||[];
 const open=v.status==='published'&&Date.now()>=v.data.starts&&Date.now()<v.data.ends;
 if(v.data.format==='tournament'){
  const area=row('比赛赛程');area.classList.add('hub-event-section');parent.append(area);
  if(!t){empty(area,'报名结束后，由负责人锁定名单并生成单淘汰赛程。');if(v.editable){area.append(el('small','支持 2–64 人。随机分组；轮空自动晋级，比赛成绩不自动发放积分。'));area.append(button('生成赛程',()=>confirm('锁定报名并生成赛程？',`当前有 ${v.members.length} 人参加。生成后不能增删参赛者，退赛由负责人登记弃权赛果。`,()=>change('event-bracket')),true));}return;}
  const name=uid=>t.players.find(p=>p.uid===uid)?.name||'等待晋级',header=el('div','','hub-event-overview');header.append(el('span',t.status==='complete'?'赛事结束':'比赛进行中','hub-chip'),el('span',`${t.entrants.length} 名选手 · ${t.rounds} 轮`));if(t.champion)header.append(el('strong','冠军 · '+name(t.champion)));area.append(header);
  const rounds=el('div','','hub-bracket');area.append(rounds);
  for(let n=0;n<t.rounds;n++){
   const round=el('section','','hub-bracket-round');round.append(el('h4',n===t.rounds-1?'决赛':'第 '+(n+1)+' 轮'));rounds.append(round);
   for(const m of t.matches.filter(m=>m.round===n)){
    const card=el('article','','hub-match');card.dataset.match=m.id;card.append(el('small',m.bye?'轮空晋级':m.status==='done'?'已结束':m.status==='ready'?'待比赛':'等待上一轮'));
    for(const uid of [m.a,m.b]){const player=el('div','','hub-match-player');player.append(el('span',uid?name(uid):m.bye?'轮空':'等待晋级'));if(uid&&m.winner===uid){player.classList.add('is-winner');player.append(el('small',t.champion===uid?'冠军':'晋级'));}card.append(player);}
    if(m.note)card.append(el('p',m.note,'hub-muted'));
    if(v.editable&&!m.bye&&m.status!=='waiting'&&v.status==='published'){
     const following=t.matches.find(x=>x.round===m.round+1&&x.slot===Math.floor(m.slot/2));
     if(m.status==='ready'||following?.status!=='done')card.append(button(m.status==='done'?'更正赛果':'登记赛果',()=>{
      const d=dialog(m.status==='done'?'更正赛果':'登记赛果'),winner=select(d.content,'获胜选手',[[m.a,name(m.a)],[m.b,name(m.b)]],m.winner||m.a),note=field(d.content,m.status==='done'?'更正原因':'赛果说明',m.note,'textarea');
      d.content.append(el('p','确认后推进后续对阵；已有后续赛果时不能修改本轮。','hub-muted'));d.footer.append(button('确认赛果',async()=>{await change('event-match',{revision:t.revision,match:m.id,winner:winner.value,note:note.value,correct:m.status==='done'});d.close();},true));
     }));
    }
    round.append(card);
   }
  }
  return;
 }
 if(v.data.format!=='hunt')return;
 const section=row('探索进度'),complete=points.filter(p=>p.progress?.status==='accepted').length;section.classList.add('hub-event-section');parent.append(section);
 const summary=el('div','','hub-event-overview');summary.append(el('strong',`${complete} / ${points.length} 个检查点`),el('span',open?'正在开放':Date.now()<v.data.starts?'尚未开始':'本期已结束','hub-chip'));section.append(summary);
 if(!v.joined)section.append(el('p','报名后可领取检查点。已获得的探索印记会保留在活动足迹。','hub-muted'));
 if(v.editable)section.append(button('添加检查点',()=>editPoint()));
 const list=el('div','','hub-checkpoint-list');section.append(list);if(!points.length)empty(list,'负责人还没有发布检查点。');
 for(const point of points){
  const progress=point.progress,dependency=points.find(p=>p.id===point.prerequisite),locked=!!dependency&&dependency.progress?.status!=='accepted',card=row(point.title,point.hint),meta=el('div','','hub-tags');
  meta.append(el('span',({accepted:'已完成',review:'等待审核',rejected:'待补充'}[progress?.status]||(locked?'尚未解锁':'待探索')),'hub-chip'));
  const server=HUB_SERVERS.find(s=>s[0]===point.server)?.[1];if(point.server)meta.append(el('span',server,'hub-chip'));card.prepend(meta);
  card.append(el('small',point.kind==='code'?'找到活动口令':point.kind==='metric'?'由游戏服务器验证进度':'提交凭证由负责人审核'));
  if(dependency)card.append(el('small','前置 · '+dependency.title));if(progress?.reason)card.append(el('p',progress.reason,'hub-muted'));
  const actions=el('div','','hub-actions');card.append(actions);
  if(v.joined&&open&&!locked&&!['accepted','review'].includes(progress?.status))actions.append(button(point.kind==='metric'?'同步游戏进度':'提交进度',()=>claim(point),true));
  if(v.editable)actions.append(button('编辑检查点',()=>editPoint(point)));
  list.append(card);
 }
 if(activity.pending?.length){const queue=row('待审核凭证 · '+activity.pending.length);parent.append(queue);for(const item of activity.pending){const tile=row(item.name+' · '+item.title,item.note),images=el('div','','hub-images');tile.append(images);void pictures(images,item.images);tile.append(button('审核凭证',()=>{const d=dialog('审核 · '+item.name);d.content.append(el('p',item.title),el('p',item.note));const reason=field(d.content,'审核说明','','textarea');d.footer.append(button('退回补充',async()=>{await change('event-review',{checkpoint:item.checkpoint,uid:item.uid,attempt:item.attempt,accept:false,reason:reason.value});d.close();}),button('通过凭证',async()=>{await change('event-review',{checkpoint:item.checkpoint,uid:item.uid,attempt:item.attempt,accept:true,reason:reason.value});d.close();},true));}));queue.append(tile);}}
 function editPoint(point={}){
  const d=dialog(point.id?'编辑检查点':'添加检查点'),title=field(d.content,'检查点名称',point.title||''),hint=field(d.content,'位置线索 / 说明',point.hint||'','textarea'),grid=el('div','','hub-form-grid');d.content.append(grid);
  const kind=select(grid,'验证方式',[['code','活动口令'],['metric','游戏服务器统计'],['manual','人工审核凭证']],point.kind||'code'),server=select(grid,'对应服务器',HUB_SERVERS,point.server||''),prerequisite=select(d.content,'前置检查点',[['','无需前置'],...points.filter(p=>p.id!==point.id).map(p=>[p.id,p.title])],point.prerequisite||'');
  const dynamic=el('div','','hub-list');d.content.append(dynamic);let code,metric,threshold;
  const render=()=>{dynamic.replaceChildren();code=metric=threshold=null;if(kind.value==='code'){code=field(dynamic,point.hasCode?'新口令（留空保留）':'活动口令','','password');code.autocomplete='new-password';}if(kind.value==='metric'){metric=field(dynamic,'服务器统计项',point.metric||'');threshold=field(dynamic,'累计目标值',point.threshold||1,'number');dynamic.append(el('small','要求服务器已接通可信游戏桥，并在活动开始后上传过统计。目标比较累计值。'));}};kind.onchange=render;render();
  d.content.append(el('p','首位玩家提交进度后，本活动的检查点规则即锁定。请先检查顺序与验证条件。','hub-muted'));
  d.footer.append(button('保存检查点',async()=>{await change('event-checkpoint',{id:point.id,revision:point.revision||0,title:title.value,hint:hint.value,kind:kind.value,server:server.value,prerequisite:prerequisite.value,code:code?.value,metric:metric?.value,threshold:Number(threshold?.value)});d.close();},true));
  if(point.id)d.footer.append(button('移除检查点',()=>confirm('移除检查点？',point.title,async()=>{await change('event-checkpoint',{id:point.id,revision:point.revision,remove:true});d.close();})));
 }
 async function claim(point){
  if(point.kind==='metric'){await change('event-claim',{checkpoint:point.id});return;}
  const d=dialog(point.title);d.content.append(el('p',point.hint||'提交检查点进度'));const code=point.kind==='code'?field(d.content,'活动口令','','password'):null,note=point.kind==='manual'?field(d.content,'完成说明',point.progress?.note||'','textarea'):null;
  const images=point.kind==='manual'?uploader(d.content,[],2):[];d.footer.append(button('提交进度',async()=>{await change('event-claim',{checkpoint:point.id,code:code?.value,note:note?.value,images});d.close();},true));
 }
}

export function eventPassport(ctx){
 const {dialog,button,row,empty}=ctx.surface;
 return button('我的活动足迹',async()=>{
  const d=dialog('我的活动足迹');let offset=0;
  async function load(){const value=await ctx.api('events/passport?offset='+offset);if(!ctx.alive()||!d.node.isConnected)return;d.content.replaceChildren();d.footer.replaceChildren();if(!value.items.length)empty(d.content,'完成寻宝检查点后，这里会记录你的探索印记。');const list=el('div','','hub-passport-grid');d.content.append(list);for(const item of value.items){const card=row(item.title,item.event);card.append(el('small',(HUB_SERVERS.find(s=>s[0]===item.server)?.[1]||'社区')+' · '+beijing(item.updated)));list.append(card);}if(offset)d.footer.append(button('上一页',()=>{offset-=24;return load();}));if(value.hasMore)d.footer.append(button('下一页',()=>{offset+=24;return load();}));}
  await load();
 });
}
