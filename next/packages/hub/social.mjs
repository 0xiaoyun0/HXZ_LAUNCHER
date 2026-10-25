import {spaceHero} from './space.mjs';
import {el} from './dom.mjs';
import {appDestination,resolveHubTarget} from './navigation.mjs';

// Retain profiles and saved links; retired friends, squads, timed letters and
// cross-device to-do panels must not return through this shared renderer.
export function socialUI(ctx){
 const {api,uid,surface,refresh,navigate}=ctx,{button,field,select,dialog,row,empty}=surface;
 async function editProfile(){
  const v=await api('profiles/'+uid),d=dialog('编辑我的空间'),form=el('div','','hub-surface');d.content.append(form);
  const bio=field(form,'个人介绍',v.bio,'textarea'),tags=field(form,'兴趣标签 · 用逗号分隔',(v.tags||[]).join('，')),time=field(form,'常在线时段',v.availability),visibility=select(form,'资料可见范围',[['community','社区成员'],['private','仅自己']],v.visibility==='community'?'community':'private'),theme=select(form,'空间颜色',[['sky','晴空'],['forest','森林'],['night','夜色'],['rose','樱粉']],v.home?.theme||'sky'),motto=field(form,'签名',v.home?.motto||'');
  d.footer.append(button('保存',async()=>{await api('profile','PUT',{revision:v.revision,bio:bio.value,tags:tags.value.split(/[,，]/).map(t=>t.trim()).filter(Boolean),availability:time.value,visibility:visibility.value,discoverable:false,mentor:v.mentor===true,home:{...v.home,theme:theme.value,motto:motto.value}});d.close();await refresh();},true));
 }
 async function space(parent){
  const v=await api('profiles/'+uid);if(!ctx.alive())return;
  const profile=spaceHero(v);profile.append(button('编辑空间',editProfile),button('皮肤衣柜',()=>navigate('/account?skin=1')));parent.append(profile);
 }
 function destination(url){
  if(/^https?:\/\//i.test(url))return url;
  if(resolveHubTarget(url)?.retired)return null;
  return appDestination(url);
 }
 async function saved(parent,filter){
  const v=await api('saved?q='+encodeURIComponent(filter.query)+'&offset='+filter.offset);if(!ctx.alive())return;
  const tools=el('div','','hub-tools'),q=field(tools,'搜索收藏',filter.query);tools.append(button('查找',()=>{filter.query=q.value;filter.offset=0;return refresh();}),button('添加收藏',()=>{const d=dialog('添加收藏'),title=field(d.content,'名称'),link=field(d.content,'链接'),tags=field(d.content,'标签 · 用逗号分隔');d.footer.append(button('保存',async()=>{const url=destination(link.value);if(!url)throw Error('这个栏目已停用，或链接不属于启动器支持的内容');await api('saved','POST',{title:title.value,url,tags:tags.value.split(/[,，]/).filter(Boolean)});d.close();await refresh();},true));}));parent.append(tools);
  const grid=el('div','','hub-grid');parent.append(grid);for(const item of v.items){const url=destination(item.url),card=row(item.title,(item.tags||[]).join(' · '));if(url)card.append(button('打开',()=>navigate(url)));else card.append(el('small','旧功能已归档，收藏记录仍保留','hub-muted'));card.append(button('移除收藏',async()=>{await api('saved/'+item.id,'DELETE');await refresh();}));grid.append(card);}if(!v.items.length)empty(grid,'还没有收藏。');
  const prefs=row('社区通知','安静时段内的社区提醒会在时段结束后送入收件箱。'),subscriptions=field(prefs,'接收关注作者的新内容',v.preferences.subscriptions!==false,'checkbox'),quiet=field(prefs,'启用安静时段',v.preferences.quiet===true,'checkbox'),start=field(prefs,'开始小时（北京时间）',v.preferences.quietStart??23,'number'),end=field(prefs,'结束小时（北京时间）',v.preferences.quietEnd??8,'number');prefs.append(button('保存偏好',async()=>{await api('preferences','PUT',{subscriptions:subscriptions.checked,digest:false,quiet:quiet.checked,quietStart:Number(start.value),quietEnd:Number(end.value)});await refresh();}));parent.append(prefs);
  if(v.follows?.length){const following=row('已关注作者');for(const p of v.follows)following.append(button('取消关注 · '+p.name,async()=>{await api('follow','POST',{uid:p.target,followed:false});await refresh();}));parent.append(following);}
 }
 return {space,saved};
}
