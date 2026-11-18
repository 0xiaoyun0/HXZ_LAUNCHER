import {el} from './dom.mjs';
import {bilibiliStage} from './bilibili-stage.mjs';

const stamp=seconds=>{const n=Math.max(0,Math.floor(seconds||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
export function sharedMediaUI(ctx){
 const {api,surface,uid}=ctx,{button,dialog,field,row,empty}=surface;let currentClose=null;
 async function lobby(program){
  const d=dialog('共同放映'),list=el('div','','hub-list');
  d.content.append(el('p','播放进度在房间内同步，每位成员从节目原站获取音视频。','hub-muted'));
  if(program){const name=field(d.content,'房间名称',program.title);name.maxLength=80;d.content.append(button('创建放映房间',async()=>{const value=await api('media/rooms','POST',{record:program.id,title:name.value});d.close();await open(value);},true));}
  d.content.append(list);const load=async()=>{const data=await api('media/rooms');if(!d.node.isConnected)return;list.replaceChildren();for(const item of data.items){const tile=row(item.title,item.hostName+' 主持 · '+item.members+' 人');tile.append(button('加入放映',async()=>{const value=await api('media/rooms/'+item.id+'/join','POST',{});d.close();await open(value);},true));list.append(tile);}if(!data.items.length)empty(list,program?'还没有放映房间，可以从这部节目开始。':'还没有放映房间，打开一个节目后即可创建。');};
  d.footer.append(button('刷新房间',load));await load();
 }
 async function open(initial){
  await currentClose?.();
  const d=dialog(initial.title);d.node.classList.add('hub-watch-dialog');
  let stopped=false,value=initial,received=performance.now(),source='',enabled=false,requesting=false,polling=false,timer,media=null,bili=null,queueKey='',memberKey='';
  const stage=el('div','','hub-watch-stage'),status=el('p','','hub-muted'),controls=el('div','','hub-actions'),time=el('p','','hub-muted'),timeline=field(d.content,'共同播放进度',0,'range'),people=el('div','','hub-tags'),queue=row('播放队列'),items=el('div','','hub-list');
  timeline.min='0';timeline.max='1';timeline.step='.1';timeline.disabled=true;
  const start=button('启用本机播放',async()=>{enabled=true;if(value.playing)await sync(true);else status.textContent='本机已就绪，等待主持人开始播放。';renderControls();},true);
  const toggle=button('播放',()=>{enabled=true;return command('control',{position:position(),playing:!value.playing});},true),next=button('播放下一项',()=>command('next')),mute=button('静音',()=>{if(media){media.muted=!media.muted;renderControls();}}),refresh=button('重新同步',async()=>{await poll();await sync(true);});
  controls.append(start,toggle,next,mute,refresh);d.content.prepend(stage,status,controls);d.content.append(time,people,queue);queue.append(button('添加节目',pick),items);
  const seekTools=el('div','','hub-actions'),seek=field(seekTools,'跳转到秒数',0,'number');seek.min='0';seek.max='86400';seekTools.append(button('同步到此位置',()=>command('control',{position:Number(seek.value),playing:value.playing})));d.content.insertBefore(seekTools,time);const origin=button('在 B站 打开',()=>ctx.navigate(value.current.source));controls.append(origin);
  const position=()=>Math.min(86400,value.position+(value.playing?(performance.now()-received)/1000:0));
  const clamp=seconds=>Number.isFinite(media?.duration)&&media.duration>0?Math.min(Math.max(0,seconds),media.duration):Math.max(0,seconds);
  function renderControls(){start.hidden=enabled;toggle.hidden=next.hidden=!value.mine;toggle.textContent=value.playing?'暂停':'播放';toggle.disabled=next.disabled=requesting||!value.current;mute.hidden=!!bili;origin.hidden=!bili;seekTools.hidden=!bili||!value.mine;timeline.closest('.hub-field').hidden=!!bili;mute.textContent=media?.muted?'取消静音':'静音';timeline.disabled=!value.mine||!media||!Number.isFinite(media.duration);next.disabled||=!value.queue.length;}
  async function sync(force=false){
   if(bili){bili.sync({position:position(),playing:value.playing,enabled,stamp:value.updated,force});status.textContent=enabled?'B站视频 · 使用房间的播放、暂停和定位来同步；播放器内部操作仅影响自己。':'点「启用本机播放」载入 B站官方播放器。';return;}
   if(!media||!value.current||stopped)return;
   const desired=clamp(position()),canSeek=Array.from({length:media.seekable.length},(_,i)=>[media.seekable.start(i),media.seekable.end(i)]).some(([a,b])=>desired>=a&&desired<=b+.2);
   if(media.readyState&&Math.abs(media.currentTime-desired)>(force?.5:1.5)){
    if(canSeek)media.currentTime=desired;
    else if(desired>2){status.textContent='这个节目源暂不支持定位，无法准确同步。可重新同步，或切换支持分段播放的节目。';media.pause();return;}
   }
   if(value.playing&&enabled&&!document.hidden){try{await media.play();if(!stopped)status.textContent=value.mine?'你正在主持 · 调整进度会同步到所有成员':'正在跟随主持人播放';}catch{if(!stopped){enabled=false;status.textContent='浏览器未开始播放，请点「启用本机播放」。';renderControls();}}}else media.pause();
  }
  function update(nextValue){
   if(stopped||nextValue.revision<value.revision||nextValue.serverTime<value.serverTime)return;value=nextValue;received=performance.now();d.node.querySelector('h2').textContent=value.title;
   if(source!==value.current?.source){
    media?.pause();media?.removeAttribute('src');media?.load();media=null;bili?.close();bili=null;stage.replaceChildren();source=value.current?.source||'';
    if(source&&value.current.format==='bilibili'){stage.dataset.format='bilibili';stage.append(el('h3',value.current.title));bili=bilibiliStage(stage,{title:value.current.title,source,onError:text=>status.textContent=text});}
    else if(source){media=el(value.current.format==='audio'?'audio':'video');media.preload='metadata';media.playsInline=true;media.controls=false;media.src=source;media.setAttribute('aria-label',value.current.title);stage.dataset.format=value.current.format;
     const heading=el('h3',value.current.title);stage.append(heading,media);media.onloadedmetadata=()=>{timeline.max=String(Number.isFinite(media.duration)?media.duration:1);renderControls();void sync(true);};media.oncanplay=()=>void sync();media.onerror=()=>{status.textContent='节目源暂时无法播放。请确认原站允许在线播放，或由主持人切换下一项。';};media.onended=()=>{if(value.mine&&!requesting)void command('control',{position:clamp(position()),playing:false}).catch(e=>surface.report(e,d.content));};
    }else{media=null;empty(stage,'当前节目已撤回，请主持人从队列切换节目。');}
   }
   const nextMembers=JSON.stringify([value.host,value.members.map(m=>[m.uid,m.name]).sort()]);if(nextMembers!==memberKey){memberKey=nextMembers;people.replaceChildren(...value.members.map(m=>el('span',m.name+(m.uid===value.host?' · 主持':''),'hub-chip')));}
   const nextQueue=JSON.stringify([value.mine,value.canClose,value.queue]);if(nextQueue!==queueKey){queueKey=nextQueue;items.replaceChildren();for(const item of value.queue){const tile=row(item.title),actions=el('div','','hub-actions');actions.append(button((item.voted?'取消投票':'优先播放')+' · '+item.votes,()=>command('vote',{item:item.id,voted:!item.voted})));if(item.uid===uid||value.mine||value.canClose)actions.append(button('移除',()=>command('remove',{item:item.id})));tile.append(actions);items.append(tile);}if(!value.queue.length)empty(items,'加入喜欢的节目，投票决定下一项。');}
   time.textContent=bili?'房间播放位置 · '+stamp(position()):stamp(position())+' / '+(Number.isFinite(media?.duration)?stamp(media.duration):'等待媒体时长');renderControls();void sync();
  }
  async function command(action,input={}){if(stopped)return;requesting=true;renderControls();try{update(await api('media/rooms/'+value.id+'/'+action,'POST',{...input,revision:value.revision}));}catch(e){await poll();throw e;}finally{requesting=false;renderControls();}}
  timeline.onchange=()=>void command('control',{position:Number(timeline.value),playing:value.playing}).catch(e=>surface.report(e,d.content));
  async function poll(){if(stopped||polling||document.hidden)return;polling=true;try{const next=await api('media/rooms/'+value.id);if(!next.joined){status.textContent='你已离开放映房间，请关闭后重新加入。';media?.pause();bili?.pause();enabled=false;return;}update(next);}catch(e){if(!stopped){media?.pause();bili?.pause();status.textContent='同步暂时中断：'+e.message;}}finally{polling=false;}}
  async function pick(){const select=dialog('添加节目'),search=field(select.content,'查找节目'),list=el('div','','hub-list');select.content.append(list);const load=async()=>{const data=await api('records?kind=program&q='+encodeURIComponent(search.value));if(!select.node.isConnected)return;list.replaceChildren();for(const item of data.items.filter(i=>i.status==='published')){const b=button(item.title,async()=>{await command('queue',{record:item.id});select.close();});list.append(b);}if(!list.childElementCount)empty(list,'未找到已发布的节目。');};select.footer.append(button('查找',load));search.onkeydown=e=>{if(e.key==='Enter')void load().catch(e=>surface.report(e,select.content));};await load();}
  const close=async()=>{if(stopped)return;stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visibility);media?.pause();media?.removeAttribute('src');media?.load();bili?.close();d.close();if(currentClose===close)currentClose=null;await api('media/rooms/'+value.id+'/leave','POST',{}).catch(()=>{});};
  const visibility=()=>{if(document.hidden){media?.pause();bili?.pause();}else void poll();};document.addEventListener('visibilitychange',visibility);
  currentClose=close;d.onClose(()=>void close());d.footer.append(button('离开放映',close));
  if(value.canClose)d.footer.append(button('结束房间',()=>surface.confirm('结束共同放映？','所有成员将离开当前房间。',async()=>{await api('media/rooms/'+value.id,'DELETE');await close();})));
  update(value);let ticks=0;timer=setInterval(()=>{if(stopped||document.hidden)return;time.textContent=bili?'房间播放位置 · '+stamp(position()):stamp(position())+' / '+(Number.isFinite(media?.duration)?stamp(media.duration):'等待媒体时长');if(document.activeElement!==timeline)timeline.value=String(clamp(position()));if(++ticks%5===0)void poll();},1000);
 }
 return {lobby,close:async()=>{await currentClose?.();}};
}
