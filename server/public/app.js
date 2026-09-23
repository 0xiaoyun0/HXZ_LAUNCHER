const $=id=>document.getElementById(id);let token=sessionStorage.getItem('hxz-admin')||'',current='overview';
function message(text,error=false){$('message').hidden=false;$('message').textContent=text;$('message').className=error?'error':'';setTimeout(()=>$('message').hidden=true,6000);}
async function api(url,method='GET',body){const r=await fetch(url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const value=await r.json();if(!r.ok)throw Error(value.error||'操作失败');return value;}
function row(container,heading,body,button,action){const el=document.createElement('div');el.className='row';const content=document.createElement('div'),title=document.createElement('strong'),p=document.createElement('p');title.textContent=heading;p.textContent=body;content.append(title,p);el.append(content);if(button){const b=document.createElement('button');b.textContent=button;b.className='danger';b.onclick=()=>run(action);el.append(b);}container.append(el);}
async function run(fn){try{await fn();}catch(e){message(e.message,true);}}
function tab(value){current=value;if(value==='servers')void run(loadServers);if(value==='arcade')void run(loadArcade);if(value==='points')void run(loadPoints);if(value==='arcana')void run(loadArcana);if(value==='blueprints')void run(loadBlueprints);if(value==='forum')void run(loadForum);if(value==='users')void run(loadReviewers);document.querySelectorAll('[data-view]').forEach(el=>el.hidden=el.dataset.view!==value);document.querySelectorAll('[data-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.tab===value);if(el.dataset.tab===value)$('heading').textContent=el.textContent;});}
async function refresh(){const [state,notices]=await Promise.all([api('/api/admin/overview'),api('/api/notices')]);$('online-count').textContent=state.online.length;$('voice-count').textContent=state.online.filter(p=>p.room).length;$('version').textContent=state.version;
 for(const id of ['online-list','notice-list','message-list','ban-list'])$(id).replaceChildren();
 for(const p of state.online)row($('online-list'),p.name,p.uid+(p.room?' · 语音 '+p.room:''),'封禁',async()=>{await api('/api/moderation','POST',{uid:p.uid,banned:true});await refresh();});
 const groups={'survival':'原版生存群组','mod-1':'模组一服','mod-2':'模组二服'};
 for(const n of notices)row($('notice-list'),n.title,(groups[n.groupId]||n.groupId)+' · '+new Date(n.updated).toLocaleString()+'\n'+n.body,'删除',async()=>{await api('/api/notices/'+n.id,'DELETE');await refresh();});
 for(const m of state.messages)row($('message-list'),m.name+' · '+new Date(m.created).toLocaleString(),m.body,'删除',async()=>{await api('/api/admin/messages/delete','POST',{id:m.id});await refresh();});
 for(const u of state.banned)row($('ban-list'),u.uid,'已封禁','解除封禁',async()=>{await api('/api/moderation','POST',{uid:u.uid,banned:false});await refresh();});
 const form=$('settings-form');for(const [key,id] of [['hxz_survival','survival'],['hxz_mod1','mod-1'],['hxz_mod2','mod-2']])form.elements[key].value=state.hxzSources?.[id]||'';form.elements.adminIDs.value=state.adminIDs.join('\n');
}
async function enter(){await refresh();$('login').hidden=true;$('login').style.display='none';$('workspace').hidden=false;tab(current);}
$('login-form').onsubmit=e=>{e.preventDefault();void run(async()=>{const data=Object.fromEntries(new FormData(e.target));const r=await api('/api/admin/login','POST',data);token=r.token;sessionStorage.setItem('hxz-admin',token);e.target.elements.password.value='';await enter();});};
$('logout').onclick=()=>{sessionStorage.removeItem('hxz-admin');location.reload();};$('refresh').onclick=()=>run(refresh);document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>tab(el.dataset.tab));
$('notice-form').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/api/notices','POST',Object.fromEntries(new FormData(e.target)));e.target.elements.title.value='';e.target.elements.body.value='';await refresh();message('公告已发布');});};
$('ban-form').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/api/moderation','POST',{uid:e.target.elements.uid.value.trim(),banned:true});await refresh();});};
$('settings-form').onsubmit=e=>{e.preventDefault();void run(async()=>{const data=Object.fromEntries(new FormData(e.target));data.hxzSources={'survival':data.hxz_survival,'mod-1':data.hxz_mod1,'mod-2':data.hxz_mod2};data.adminIDs=data.adminIDs.split(/\s+/).filter(Boolean);await api('/api/admin/settings','POST',data);message('配置已保存');});};
$('password-form').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/api/admin/password','POST',{password:e.target.elements.password.value});e.target.reset();message('密码已修改');});};
if(token)void run(async()=>{try{await enter();}catch(e){sessionStorage.removeItem('hxz-admin');token='';throw e;}});
let blueprintOffset=0,forumOffset=0;
const statusNames={pending:'待审核',approved:'已发布',rejected:'未通过',uploading:'文件未完成'};
function paragraph(text,kind='p'){const el=document.createElement(kind);el.textContent=text;return el;}
function action(container,label,fn,danger=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=danger?'danger':'secondary';b.onclick=()=>run(fn);container.append(b);}
function contentDialog(title){$('content-title').textContent=title;$('content-body').replaceChildren();if(!$('content-dialog').open)$('content-dialog').showModal();return $('content-body');}
$('content-close').onclick=()=>$('content-dialog').close();
async function loadReviewers(){const value=await api('/api/admin/reviewers');$('reviewer-list').replaceChildren();$('reviewer-player').replaceChildren(new Option('选择已登录过社区的玩家',''));for(const m of value.members)$('reviewer-player').append(new Option(m.name+' · '+m.uid,m.uid));for(const r of value.reviewers)row($('reviewer-list'),r.name||r.uid,r.uid,'撤销审核权限',async()=>{await api('/api/admin/reviewers','POST',{uid:r.uid,enabled:false});await loadReviewers();});}
$('reviewer-player').onchange=e=>$('reviewer-form').elements.uid.value=e.target.value;
$('reviewer-form').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/api/admin/reviewers','POST',{uid:e.target.elements.uid.value.trim(),enabled:true});await loadReviewers();message('审核员已任命，可在启动器蓝图库进入审核队列');});};
async function loadBlueprints(){const value=await api('/api/blueprints?scope=manage&status='+encodeURIComponent($('blueprint-status').value)+'&offset='+blueprintOffset);$('blueprint-list').replaceChildren();for(const b of value.items)row($('blueprint-list'),b.title,b.name+' · '+b.category+' · MC '+b.mc+' · Create '+b.create_version+' · '+statusNames[b.status],'查看 / 审核',()=>showBlueprint(b.id));if(!value.items.length)$('blueprint-list').append(paragraph('暂无蓝图'));$('blueprint-page').textContent=`${Math.floor(blueprintOffset/24)+1} / ${Math.max(1,Math.ceil(value.total/24))}`;$('blueprint-prev').disabled=blueprintOffset===0;$('blueprint-next').disabled=blueprintOffset+24>=value.total;}
async function saveBlueprint(id,name){const r=await fetch('/api/blueprints/'+id+'/file',{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error((await r.json()).error);const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name||'blueprint.nbt';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function showBlueprint(id){const b=await api('/api/blueprints/'+id),container=contentDialog(b.title);if(b.cover){const img=document.createElement('img');img.src=b.cover;img.alt='蓝图封面';img.className='review-cover';container.append(img);}container.append(paragraph(`${b.name} · ${b.uid}\n${b.category} · Minecraft ${b.mc} / ${b.loader} / Create ${b.create_version}\n尺寸：${b.metadata.dimensions?.join(' × ')||'—'} · 方块：${b.metadata.blocks||'—'}\n状态：${statusNames[b.status]}`),paragraph(b.description,'pre'),paragraph('模组依赖：'+(b.dependencies||'无额外说明')),paragraph('方块类型：'+(b.metadata.materials||[]).join('、')));const reason=document.createElement('textarea');reason.rows=3;reason.maxLength=1000;reason.placeholder='审核说明（不通过时必填）';reason.value=b.reason;container.append(reason);const actions=document.createElement('div');actions.className='content-buttons';container.append(actions);if(b.size){action(actions,'下载检查文件',()=>saveBlueprint(b.id,b.filename));for(const [label,status] of [['通过审核','approved'],['不通过 / 下架','rejected']])action(actions,label,async()=>{await api('/api/blueprints/'+id+'/review','POST',{status,reason:reason.value});$('content-dialog').close();await loadBlueprints();message('审核结果已保存');},status==='rejected');}action(actions,'删除蓝图',async()=>{if(!confirm('删除此蓝图及文件？'))return;await api('/api/blueprints/'+id,'DELETE');$('content-dialog').close();await loadBlueprints();},true);}
$('load-blueprints').onclick=()=>{blueprintOffset=0;void run(loadBlueprints);};$('blueprint-prev').onclick=()=>{blueprintOffset=Math.max(0,blueprintOffset-24);void run(loadBlueprints);};$('blueprint-next').onclick=()=>{blueprintOffset+=24;void run(loadBlueprints);};
async function loadForum(){const value=await api('/api/forum/posts?manage=1&q='+encodeURIComponent($('forum-query').value)+'&offset='+forumOffset);$('forum-list').replaceChildren();for(const p of value.items)row($('forum-list'),p.title,p.name+' · '+p.category+' · '+p.replies+' 回复 · '+p.likes+' 赞'+(p.hidden?' · 已隐藏':'')+(p.locked?' · 已锁定':'')+(p.pinned?' · 已置顶':''),'管理帖子',()=>showPost(p.id));if(!value.items.length)$('forum-list').append(paragraph('暂无帖子'));$('forum-page').textContent=`${Math.floor(forumOffset/24)+1} / ${Math.max(1,Math.ceil(value.total/24))}`;$('forum-prev').disabled=forumOffset===0;$('forum-next').disabled=forumOffset+24>=value.total;}
async function showPost(id,offset=0){const value=await api('/api/forum/posts/'+id+'?offset='+offset),p=value.post,container=contentDialog(p.title);container.append(paragraph(p.name+' · '+p.uid),paragraph(p.body,'pre'));const actions=document.createElement('div');actions.className='content-buttons';container.append(actions);for(const [label,key] of [[p.pinned?'取消置顶':'置顶','pinned'],[p.locked?'开放回复':'锁定回复','locked'],[p.hidden?'恢复公开':'隐藏帖子','hidden']])action(actions,label,async()=>{await api('/api/forum/posts/'+id+'/moderate','POST',{action:key,value:!p[key]});await showPost(id,offset);await loadForum();});action(actions,'删除帖子',async()=>{if(!confirm('删除帖子及全部回复？'))return;await api('/api/forum/posts/'+id,'DELETE');$('content-dialog').close();await loadForum();},true);container.append(paragraph('回复 · '+value.total,'h3'));for(const r of value.replies)row(container,r.name,r.body,'删除回复',async()=>{await api('/api/forum/replies/'+r.id,'DELETE');await showPost(id,offset);});const pagination=document.createElement('div');pagination.className='content-buttons';container.append(pagination);if(offset)action(pagination,'上一页回复',()=>showPost(id,Math.max(0,offset-24)));if(offset+24<value.total)action(pagination,'下一页回复',()=>showPost(id,offset+24));}
$('load-forum').onclick=()=>{forumOffset=0;void run(loadForum);};$('forum-prev').onclick=()=>{forumOffset=Math.max(0,forumOffset-24);void run(loadForum);};$('forum-next').onclick=()=>{forumOffset+=24;void run(loadForum);};

let arcanaConfig;
function arcanaField(container,label,value,set,{large=false,lines=false,check=false}={}) {
 const wrapper=document.createElement('label');wrapper.textContent=label;
 const input=document.createElement(large?'textarea':'input');
 if(check){input.type='checkbox';input.checked=value;}else{input.value=lines?JSON.stringify(value,null,2):value||'';input.maxLength=large?60000:2000;}
 if(large)input.rows=lines?8:3;
 input.oninput=()=>{input.setCustomValidity('');try{set(check?input.checked:lines?JSON.parse(input.value):input.value);}catch{input.setCustomValidity('请输入有效 JSON，每行包含 speaker 与 text');}};
 wrapper.append(input);container.append(wrapper);
}
async function loadArcana(){
 arcanaConfig=await api('/api/admin/arcana');const root=$('arcana-fields');root.replaceChildren();
 arcanaField(root,'开启活动',arcanaConfig.enabled,v=>arcanaConfig.enabled=v,{check:true});
 for(const [key,label] of [['title','活动名称'],['subtitle','副标题'],['accessCode','入口代码']])arcanaField(root,label,arcanaConfig[key],v=>arcanaConfig[key]=v);
 for(const card of [...arcanaConfig.cards,arcanaConfig.center]){
  const box=document.createElement('details'),heading=document.createElement('summary');heading.textContent=card.name;box.append(heading);root.append(box);
  for(const [key,label] of [['name','牌名'],['activity','对应活动'],['unlockCode','点亮代码']])arcanaField(box,label,card[key],v=>card[key]=v);
  arcanaField(box,'开放时间',card.unlockAt,v=>card.unlockAt=v);
  for(const [key,label] of [['eyebrow','章节标识'],['title','详情标题'],['line','章节描述']])arcanaField(box,label,card.detail[key],v=>card.detail[key]=v,{large:key==='line'});
  arcanaField(box,card.id?'对话（JSON）':'最终长剧情（JSON）',card.dialogue,v=>card.dialogue=v,{large:true,lines:true});
  if(!card.id){arcanaField(box,'卡牌短对话（JSON）',card.cardDialogue,v=>card.cardDialogue=v,{large:true,lines:true});for(const key of ['english','signal','line'])arcanaField(box,key,card[key],v=>card[key]=v);}
 }
}
$('arcana-form').onsubmit=event=>{event.preventDefault();void run(async()=>{if(!arcanaConfig)return;await api('/api/admin/arcana','PUT',arcanaConfig);message('活动已保存，玩家再次进入或刷新牌库后生效');});};

let serverPresets;
function updateLinksField(root,preset){
 const group=document.createElement('section'),heading=document.createElement('h3'),hint=document.createElement('p'),list=document.createElement('div'),add=document.createElement('button');
 group.className='update-links';heading.textContent='HXZ UP 连接地址';hint.textContent='同一整合包的主备地址，按从上到下的顺序尝试。支持 http://主机:端口/整合包 和 HTTPS，最多 16 个。';add.type='button';add.className='secondary';add.textContent='＋ 添加链接';
 function render(){list.replaceChildren();preset.updateUrls.forEach((value,index)=>{
  const row=document.createElement('div'),input=document.createElement('input'),up=document.createElement('button'),remove=document.createElement('button');row.className='update-link-row';
  input.type='url';input.required=true;input.maxLength=2048;input.value=value;input.placeholder='https://hxzup.example.com/original';input.setAttribute('aria-label',preset.name+' 更新地址 '+(index+1));input.oninput=()=>preset.updateUrls[index]=input.value.trim();
  up.type=remove.type='button';up.className='secondary';up.textContent='↑';up.disabled=index===0;up.setAttribute('aria-label','提高地址 '+(index+1)+' 的优先级');up.onclick=()=>{[preset.updateUrls[index-1],preset.updateUrls[index]]=[preset.updateUrls[index],preset.updateUrls[index-1]];render();};
  remove.className='danger';remove.textContent='删除';remove.setAttribute('aria-label','删除地址 '+(index+1));remove.onclick=()=>{preset.updateUrls.splice(index,1);render();};row.append(input,up,remove);list.append(row);
 });add.disabled=preset.updateUrls.length>=16;}
 add.onclick=()=>{preset.updateUrls.push('');render();list.lastElementChild?.querySelector('input')?.focus();};group.append(heading,hint,list,add);root.append(group);render();
}
function selectField(root,label,value,options,set){const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('select');for(const [key,text] of options)input.append(new Option(text,key));input.value=value;input.onchange=()=>set(input.value);wrapper.append(input);root.append(wrapper);}
async function loadServers(){
 serverPresets=(await api('/api/admin/server-presets')).servers;const root=$('servers-fields');root.replaceChildren();
 for(const preset of serverPresets){const box=document.createElement('fieldset'),title=document.createElement('legend');title.textContent=preset.name;box.append(title);root.append(box);
  arcanaField(box,'显示名称',preset.name,v=>preset.name=v);
  selectField(box,'首次安装来源',preset.profileSource,[['manual','指定游戏版本与加载器'],['hxzup','读取 HXZ UP 的游戏配置'],['package','下载整合包文件']],v=>preset.profileSource=v);
  arcanaField(box,'Minecraft 版本（指定版本时必填）',preset.version,v=>preset.version=v);
  selectField(box,'加载器',preset.loader,[['','原版'],['fabric','Fabric'],['quilt','Quilt'],['forge','Forge'],['neoforge','NeoForge']],v=>preset.loader=v);
  arcanaField(box,'加载器版本（留空选择可用稳定版）',preset.loaderVersion,v=>preset.loaderVersion=v);
  arcanaField(box,'自动安装 Fabric API',preset.fabricAPI,v=>preset.fabricAPI=v,{check:true});
  updateLinksField(box,preset);
  arcanaField(box,'整合包下载地址（整合包文件模式）',preset.packageUrl,v=>preset.packageUrl=v);
  arcanaField(box,'整合包 SHA256',preset.packageSha256,v=>preset.packageSha256=v);
  arcanaField(box,'进入游戏服务器地址（域名:端口）',preset.address,v=>preset.address=v);
  for(const [key,label] of [['enabled','开放此服务器入口'],['autoUpdate','默认启动前更新（玩家可关闭）'],['updateRequired','每次启动必须更新（玩家不可跳过）'],['autoJoin','默认自动进入服务器（玩家可关闭）']])arcanaField(box,label,preset[key],v=>preset[key]=v,{check:true});
 }
}
$('servers-form').onsubmit=event=>{event.preventDefault();void run(async()=>{await api('/api/admin/server-presets','PUT',{servers:serverPresets});message('默认服务器已保存');});};
async function loadArcade(){const game=$('arcade-game').value,value=await api('/api/arcade/'+game);$('arcade-list').replaceChildren();for(const [i,p] of value.items.entries())row($('arcade-list'),(i+1)+'. '+p.name,p.score+' 分 · '+p.uid,'移除成绩',async()=>{if(!confirm('移除此玩家的排行榜成绩？'))return;await api('/api/admin/arcade/'+game,'DELETE',{uid:p.uid});await loadArcade();});if(!value.items.length)$('arcade-list').append(paragraph('暂无成绩'));}
$('arcade-refresh').onclick=()=>run(loadArcade);$('arcade-game').onchange=()=>run(loadArcade);

let pointsOffset=0,adjustId='';
async function loadPoints(){const value=await api('/api/admin/points?offset='+pointsOffset);$('points-accounts').replaceChildren();$('points-ledger').replaceChildren();for(const p of value.accounts)row($('points-accounts'),p.name,p.uid+' · 余额 '+p.balance,'选择',async()=>{$('points-adjust').elements.uid.value=p.uid;$('points-adjust').elements.name.value=p.name;});for(const p of value.ledger)row($('points-ledger'),p.name+' · '+p.amount,p.reason+' · '+new Date(p.created).toLocaleString()+' · 操作者 '+p.actor);$('points-page').textContent=(Math.floor(pointsOffset/50)+1)+' / '+Math.max(1,Math.ceil(value.total/50));$('points-prev').disabled=!pointsOffset;$('points-next').disabled=pointsOffset+50>=value.total;}
$('points-prev').onclick=()=>{pointsOffset=Math.max(0,pointsOffset-50);void run(loadPoints);};$('points-next').onclick=()=>{pointsOffset+=50;void run(loadPoints);};
$('points-adjust').oninput=()=>adjustId='';
$('points-adjust').onsubmit=e=>{e.preventDefault();void run(async()=>{const data=Object.fromEntries(new FormData(e.target));if(!confirm('确认'+(data.operation==='spend'?'消费':'增加')+' '+data.amount+' 积分？'))return;adjustId||=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');await api('/api/admin/points/adjust','POST',{...data,id:adjustId});await loadPoints();message('积分记录已保存');});};
$('points-code').onsubmit=e=>{e.preventDefault();void run(async()=>{const value=await api('/api/admin/points/code','POST',Object.fromEntries(new FormData(e.target)));$('points-code-result').textContent='额度：'+value.amount+'\n兑换码（请保存）：'+value.code;});};
