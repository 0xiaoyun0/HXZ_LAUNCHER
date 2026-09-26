<script setup>
import {ref,reactive,computed,watch,nextTick,onMounted,onUnmounted} from 'vue';
import MediaAppearance from './MediaAppearance.vue';
import Icon from './Icon.vue';
import ArcadeGames from '../../../client/src/components/ArcadeGames.vue';
import VoicePage from './VoicePage.vue';
import FeedbackPanel from '../../../client/src/components/FeedbackPanel.vue';
const feedbackOpen=ref(false);
import AppSelect from './AppSelect.vue';
import ChoiceRows from './ChoiceRows.vue';
import UpdateCard from './UpdateCard.vue';
import AppOverlay from './AppOverlay.vue';
import FloatingSectionSwitch from './FloatingSectionSwitch.vue';
import {closeTopOverlay,overlayCount} from './overlays.js';
import {state,native,api,on,avatar,groups,rooms,date} from './native.js';

const tabs=[{id:'chat',name:'聊天',icon:'chat'},{id:'voice',name:'语音',icon:'headphones'},{id:'forum',name:'论坛',icon:'forum'},{id:'blueprint',name:'蓝图',icon:'blueprint'},{id:'games',name:'游戏',icon:'games'},{id:'notice',name:'公告',icon:'notice'},{id:'me',name:'我的',icon:'user'}];
const tab=ref('chat'), sheet=ref(''), busy=ref(false), toast=ref(''), error=ref('');let toastTimer;
const mainTabs=[{id:'chat',name:'聊天',icon:'chat'},{id:'community',name:'社区',icon:'forum'},{id:'games',name:'游戏',icon:'games'},{id:'notice',name:'公告',icon:'notice'},{id:'me',name:'我的',icon:'user'}];
const sections={chat:['chat','voice'],community:['forum','blueprint']};
const lastSection=reactive({chat:'chat',community:'forum'});
const mainTab=computed(()=>Object.keys(sections).find(id=>sections[id].includes(tab.value))||tab.value);
const switchTarget=computed(()=>{const pair=sections[mainTab.value];return pair?tabs.find(item=>item.id===pair.find(id=>id!==tab.value)):null;});
watch(tab,value=>{if(sections[mainTab.value])lastSection[mainTab.value]=value;},{flush:'sync'});
function navigateMain(id){navigate(lastSection[id]||id);}
const settings=reactive(readSettings());
const appUpdate=ref({currentVersion:'0.5.0',currentBuild:50001,autoCheck:true,autoDownload:true,phase:'idle'});
async function updateAction(action,values={}){try{appUpdate.value=await native('appUpdate',{action,...values});}catch(e){error.value=e.message;}}

function readSettings(){
  const defaults={theme:'system',font:15,accent:'#58734b',ptt:false,animations:true,animationSpeed:1,surfaceOpacity:1,background:'',music:'',musicVolume:.3,videoQuality:'efficient',chatHistoryDays:0,layoutRevision:2};
  try{
    const saved=JSON.parse(localStorage.getItem('hxz-mobile-settings')||'{}');
    // Migrate the original default; preserve other player-selected text sizes.
    if(!saved.layoutRevision&&saved.font===16)saved.font=15;
    if(saved.animationSpeed==null&&saved.animations===false)saved.animationSpeed=0;return {...defaults,...saved,layoutRevision:2};
  }catch{return defaults;}
}
const systemDark=ref(matchMedia('(prefers-color-scheme: dark)').matches), dark=computed(()=>settings.theme==='dark'||settings.theme==='system'&&systemDark.value);
watch([()=>settings.theme,()=>settings.font,()=>settings.accent,()=>settings.ptt,()=>settings.chatHistoryDays,systemDark],()=>{localStorage.setItem('hxz-mobile-settings',JSON.stringify(settings));document.documentElement.dataset.theme=dark.value?'dark':'light';document.documentElement.style.fontSize=Math.max(14,Math.min(22,Number(settings.font)||16))+'px';document.documentElement.style.setProperty('--accent',settings.accent);if(window.HXZNative)native('appearance',{dark:dark.value}).catch(()=>{});},{immediate:true});
watch(()=>[settings.animationSpeed,settings.surfaceOpacity,settings.background,settings.music,settings.musicVolume,settings.videoQuality],()=>{settings.animations=settings.animationSpeed!==0;const root=document.documentElement;root.style.setProperty('--motion-duration',(160/(settings.animationSpeed||1))+'ms');root.style.setProperty('--mobile-surface-opacity',String(settings.surfaceOpacity??1));root.dataset.customBackground=settings.background?'true':'false';localStorage.setItem('hxz-mobile-settings',JSON.stringify(settings));},{immediate:true});
const notify=message=>{toast.value=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.value='',4000);};
async function run(fn){if(busy.value)return;busy.value=true;error.value='';try{return await fn();}catch(e){if(e.message!=='已取消')error.value=e.message;}finally{busy.value=false;}}
const unsubs=[on('error',message=>error.value=message),on('back',()=>{if(closeTopOverlay())return;if(detail.value)detail.value=null;else if(blueprint.value)blueprint.value=null;else if(tab.value!=='chat')tab.value='chat';else native('background').catch(()=>{});})];
unsubs.push(on('appUpdate',value=>{const previous=appUpdate.value.phase;appUpdate.value=value;if(value.phase==='ready'&&previous!=='ready')notify('社区新版已下载，在“我的”中安装');}));
unsubs.push(on('state',value=>{if(typeof value.systemDark==='boolean')systemDark.value=value.systemDark;}));
const onlineUsers=computed(()=>[...new Map(state.users.map(u=>[u.uid,u])).values()]);
const roomName=computed(()=>rooms.find(r=>r.id===(state.room||state.recoveringRoom))?.name||''),members=id=>state.users.filter(u=>u.room===id);
const access=reactive({admin:false,reviewer:false,forumCategories:['交流讨论','游戏求助','作品分享','建议反馈'],blueprintCategories:['生产与加工','仓储与物流','动力与传动','列车与交通','建筑与装饰','其他']});
async function loadAccess(){Object.assign(access,await api('/api/content/access'));}
function navigate(id){if(tab.value===id)return;tab.value=id;sheet.value='';detail.value=null;blueprint.value=null;error.value='';}
watch(tab,()=>{if(tab.value==='chat'&&nearBottom.value&&!historyPage.value)nextTick(scrollBottom);if(tab.value==='forum')run(loadPosts);if(tab.value==='blueprint')run(loadBlueprints);if(tab.value==='notice')run(loadNotices);});
const workspace=ref();let pageAnimation;
watch(()=>settings.animations,value=>{document.documentElement.dataset.motion=value?'on':'off';localStorage.setItem('hxz-mobile-settings',JSON.stringify(settings));if(!value){pageAnimation?.cancel();workspace.value?.getAnimations({subtree:true}).forEach(a=>a.cancel());}},{immediate:true});
watch(tab,async(next,previous)=>{
  pageAnimation?.cancel();await nextTick();
  if(settings.animations&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&workspace.value?.animate){
    const direction=tabs.findIndex(t=>t.id===next)>=tabs.findIndex(t=>t.id===previous)?1:-1;
    pageAnimation=workspace.value.animate([{opacity:.15,transform:'translateX('+direction*7+'px)'},{opacity:1,transform:'translateX(0)'}],{duration:160/(settings.animationSpeed||1),easing:'cubic-bezier(.16,1,.3,1)'});
  }
});
function invalidField(event){
  event.preventDefault();const field=event.target;
  const label=field.getAttribute('aria-label')||field.closest('label')?.firstChild?.textContent?.trim()||'此项';
  error.value=field.validity.valueMissing?'请填写'+label:field.validity.typeMismatch?'请检查'+label+'的格式':label+'填写不正确';field.focus();
}

const historyPage=ref(null),historyEnd=ref(false),historyLoading=ref(false);
const visibleMessages=computed(()=>{const cutoff=settings.chatHistoryDays?Date.now()-settings.chatHistoryDays*86400000:0;return (historyPage.value||state.messages).filter(m=>m.created>=cutoff);});
async function olderMessages(){if(historyLoading.value)return;historyLoading.value=true;try{const result=await api('/api/chat/history?before='+(visibleMessages.value[0]?.id||Number.MAX_SAFE_INTEGER)+'&days='+(settings.chatHistoryDays||0));historyPage.value=result.items;historyEnd.value=!result.more;nearBottom.value=false;await nextTick();if(chatList.value)chatList.value.scrollTop=0;}catch(e){error.value=e.message;}finally{historyLoading.value=false;}}
function latestMessages(){historyPage.value=null;historyEnd.value=false;nextTick(scrollBottom);}
watch(()=>[settings.chatHistoryDays,state.user.uid],()=>{historyPage.value=null;historyEnd.value=false;});
const chatBody=ref(''),chatList=ref(),composer=ref(),nearBottom=ref(true),newMessages=ref(0),emoji=ref(false);
const emojis=['😊','👍','🎉','❤️','👋','✨','(｡･ω･｡)','(≧∇≦)ﾉ','( •̀ ω •́ )✧','(´･ω･`)'];
function scrollBottom(){if(chatList.value)chatList.value.scrollTop=chatList.value.scrollHeight;newMessages.value=0;nearBottom.value=true;}
function chatScroll(){const node=chatList.value;if(node)nearBottom.value=node.scrollHeight-node.scrollTop-node.clientHeight<100;}
unsubs.push(on('message',()=>{if(tab.value==='chat'&&nearBottom.value&&!historyPage.value)nextTick(scrollBottom);else newMessages.value++;}));
watch(()=>state.messages.length,()=>{if(nearBottom.value&&!historyPage.value&&tab.value==='chat')nextTick(scrollBottom);});
async function sendChat(){const text=chatBody.value.trim();if(!text)return;await run(async()=>{await native('chat',{body:text});chatBody.value='';emoji.value=false;nextTick(()=>{composer.value?.focus();scrollBottom();});});}
function insertEmoji(value,target){if(target==='reply')replyBody.value+=value;else chatBody.value+=value;nextTick(()=>(target==='reply'?replyComposer.value:composer.value)?.focus());}
async function join(room){await run(async()=>{await native('voiceSettings',{ptt:settings.ptt,muted:state.muted,deafened:state.deafened});await native('voiceJoin',{room});tab.value='voice';sheet.value='';});}
const speaker=ref(false);
function voiceChange(values){native('voiceSettings',{ptt:settings.ptt,...values}).catch(e=>error.value=e.message);}
async function leaveVoice(){try{await native('voiceLeave');sheet.value='';}catch(e){error.value=e.message;}}
function press(value){if(!state.room||!settings.ptt)return;native('voiceSettings',{ptt:true,pressing:value}).catch(e=>error.value=e.message);}
function release(){press(false);}
watch(tab,(value,previous)=>{if(previous==='voice'&&value!=='voice')release();});
async function toggleSpeaker(){speaker.value=!speaker.value;try{await native('speaker',{enabled:speaker.value});}catch(e){error.value=e.message;}}

const username=ref(''),password=ref(''),server=ref(state.server);
async function login(){await run(async()=>{try{Object.assign(state,await native('login',{username:username.value.trim(),password:password.value}));sheet.value=state.selectedProfile?'':'profiles';notify('登录成功');}finally{password.value='';}});}
async function profile(id){await run(async()=>{Object.assign(state,await native('profile',{id}));sheet.value='';notify('已切换角色');});}
async function logout(){Object.assign(state,await native('logout'));Object.assign(access,{admin:false,reviewer:false});detail.value=null;blueprint.value=null;sheet.value='';posts.value=[];blueprints.value=[];notify('已退出登录');}
async function setAvatar(){await run(async()=>{const {avatar:value}=await native('pick',{kind:'avatar'});await api('/api/profile/avatar','POST',{avatar:value});notify('头像已更新');});}
const selectedAvatar=computed(()=>{const u=state.users.find(u=>u.uid===state.user.uid)||state.user;return avatar(u.uid,u.avatarVersion);});
unsubs.push(on('avatar-changed',v=>{if(v.uid===state.user.uid)state.user.avatarVersion=v.avatarVersion;for(const u of state.users)if(u.uid===v.uid)u.avatarVersion=v.avatarVersion;}));
watch(()=>state.server,v=>server.value=v);
watch(()=>state.connected,v=>{if(v){run(async()=>{await loadAccess();if(tab.value==='forum')await loadPosts();if(tab.value==='blueprint')await loadBlueprints();});}});
watch(()=>state.user.uid,(value,old)=>{if(value!==old){posts.value=[];blueprints.value=[];detail.value=null;blueprint.value=null;}});

const posts=ref([]),postTotal=ref(0),postOffset=ref(0),postQuery=ref(''),postCategory=ref(''),detail=ref(null),replyBody=ref(''),replyParent=ref(null),replyOffset=ref(0),replyComposer=ref();
async function selectReply(reply){if(busy.value)return;replyParent.value=reply;await nextTick();replyComposer.value?.scrollIntoView({block:'center',behavior:'smooth'});replyComposer.value?.focus();}
const postForm=reactive({title:'',body:'',category:'交流讨论'});
async function loadPosts(){const r=await api('/api/forum/posts?'+new URLSearchParams({offset:postOffset.value,q:postQuery.value,category:postCategory.value}));posts.value=r.items;postTotal.value=r.total;}
async function searchPosts(){postOffset.value=0;await run(loadPosts);}
async function openPost(id){await run(async()=>{replyOffset.value=0;replyParent.value=null;replyBody.value='';detail.value=await api('/api/forum/posts/'+id+'?offset=0');});}
async function loadReplies(){detail.value=await api('/api/forum/posts/'+detail.value.post.id+'?offset='+replyOffset.value);}
async function publishPost(){await run(async()=>{const r=await api('/api/forum/posts','POST',postForm);sheet.value='';postForm.title='';postForm.body='';postOffset.value=0;await loadPosts();detail.value=await api('/api/forum/posts/'+r.id);notify('帖子已发布');});}
async function likePost(){await run(async()=>{detail.value.post=await api('/api/forum/posts/'+detail.value.post.id+'/like','PUT',{liked:!detail.value.post.liked});});}
async function likeReply(reply){await run(async()=>{const r=await api('/api/forum/replies/'+reply.id+'/like','PUT',{liked:!reply.liked});Object.assign(reply,r);});}
async function sendReply(){await run(async()=>{await api('/api/forum/posts/'+detail.value.post.id+'/replies','POST',{body:replyBody.value,parentId:replyParent.value?.id||null});replyBody.value='';replyParent.value=null;replyOffset.value=Math.floor(detail.value.total/24)*24;await loadReplies();notify('回复已发布');});await nextTick();replyComposer.value?.focus();}
const parentOf=reply=>detail.value?.replies.find(item=>item.id===reply.parentId);
const confirmAction=ref(null);
function confirm(title,action){confirmAction.value={title,action};}
async function confirmed(){const action=confirmAction.value.action;confirmAction.value=null;await run(action);}
function deletePost(){confirm('删除这个帖子及其回复？',async()=>{await api('/api/forum/posts/'+detail.value.post.id,'DELETE');detail.value=null;await loadPosts();});}
function deleteReply(reply){confirm('删除这条回复？',async()=>{await api('/api/forum/replies/'+reply.id,'DELETE');await loadReplies();});}
async function moderate(action){await run(async()=>{await api('/api/forum/posts/'+detail.value.post.id+'/moderate','POST',{action,value:!detail.value.post[action]});if(action==='hidden'){detail.value=null;await loadPosts();}else await loadReplies();});}

const blueprints=ref([]),blueprintTotal=ref(0),blueprintOffset=ref(0),blueprintQuery=ref(''),blueprintScope=ref('public'),blueprintMc=ref(''),blueprintCreate=ref(''),blueprintCategory=ref(''),blueprint=ref(null),versions=reactive({minecraft:[],create:[]}),selectedFile=ref(null),reviewReason=ref('');
const blueprintForm=reactive({title:'',description:'',category:'生产与加工',mc:'',loader:'通用',create_version:'',dependencies:'',cover:''});
async function loadBlueprints(){const q=new URLSearchParams({scope:blueprintScope.value,q:blueprintQuery.value,offset:blueprintOffset.value,mc:blueprintMc.value,create_version:blueprintCreate.value,category:blueprintCategory.value});const r=await api('/api/blueprints?'+q);blueprints.value=r.items;blueprintTotal.value=r.total;Object.assign(versions,await api('/api/blueprints/versions'));}
async function searchBlueprints(){blueprintOffset.value=0;await run(loadBlueprints);}
async function openBlueprint(id){await run(async()=>{blueprint.value=await api('/api/blueprints/'+id);reviewReason.value='';});}
async function publishBlueprint(){await run(async()=>{await native('upload',blueprintForm);sheet.value='';selectedFile.value=null;blueprintScope.value='mine';await loadBlueprints();notify('蓝图已提交审核');});}
async function review(status){await run(async()=>{await api('/api/blueprints/'+blueprint.value.id+'/review','POST',{status,reason:reviewReason.value});blueprint.value=null;await loadBlueprints();notify('审核已保存');});}
function deleteBlueprint(){confirm('删除这个蓝图？',async()=>{await api('/api/blueprints/'+blueprint.value.id,'DELETE');blueprint.value=null;await loadBlueprints();});}
const statusLabel={uploading:'文件未上传',pending:'待审核',approved:'已公开',rejected:'已驳回'};

const noticeGroup=ref('survival'),notices=ref([]),logs=ref([]),noticeForm=reactive({groupId:'survival',title:'',body:''});
const currentNotices=computed(()=>notices.value.filter(n=>n.groupId===noticeGroup.value));
const currentLogs=computed(()=>logs.value.find(n=>n.groupId===noticeGroup.value));
async function loadNotices(){const results=await Promise.allSettled([api('/api/notices'),api('/api/update-logs')]);if(results[0].status==='fulfilled')notices.value=results[0].value;else throw results[0].reason;if(results[1].status==='fulfilled')logs.value=results[1].value;else error.value='公告已加载；更新日志暂时无法读取';}
async function publishNotice(){await run(async()=>{await api('/api/notices','POST',noticeForm);sheet.value='';noticeForm.title='';noticeForm.body='';await loadNotices();});}
const groupName=id=>groups.find(g=>g.id===id)?.name||id;

const arcana=ref(null),arcanaCode=ref(''),arcanaCard=ref(null);let taps=0,tapAt=0;
function secret(){const now=Date.now();taps=now-tapAt<1200?taps+1:1;tapAt=now;if(taps===7){taps=0;run(async()=>{arcana.value=await api('/api/arcana/public');sheet.value='arcana';});}}
async function unlockArcana(){await run(async()=>{await api('/api/arcana/'+(arcana.value.entered?'card-unlock':'unlock'),'POST',{code:arcanaCode.value});arcanaCode.value='';arcana.value=await api('/api/arcana/public');});}
async function readCard(){await run(async()=>{if(arcanaCard.value.id==='lovers')await api('/api/arcana/story-complete','POST',{});else await api('/api/arcana/card-read','POST',{cardId:arcanaCard.value.id});arcanaCard.value=null;arcana.value=await api('/api/arcana/public');});}
const storyText=value=>typeof value==='string'?value:Array.isArray(value)?value.map(v=>typeof v==='string'?v:Object.values(v).filter(x=>typeof x==='string').join('：')).join('\n\n'):value?Object.values(value).filter(v=>typeof v==='string').join('\n\n'):'';
function touchFeedback(event){
 if(!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const button=event.target.closest('button');if(!button||button.disabled)return;
 button.querySelector('.tap-feedback')?.remove();const wave=document.createElement('span');wave.className='tap-feedback';wave.setAttribute('aria-hidden','true');button.appendChild(wave);setTimeout(()=>wave.remove(),650);
}
let noticeTimer;
onMounted(async()=>{if(window.HXZNative){updateAction('state');await run(async()=>{Object.assign(state,await native('state'));if(typeof state.systemDark==='boolean')systemDark.value=state.systemDark;await native('appearance',{dark:dark.value});await loadAccess();});}document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});window.addEventListener('blur',release);noticeTimer=setInterval(()=>{if(tab.value==='notice'&&!document.hidden&&!busy.value)run(loadNotices);},60000);});
onUnmounted(()=>{document.removeEventListener('pointerdown',touchFeedback);pageAnimation?.cancel();unsubs.forEach(f=>f());clearTimeout(toastTimer);clearInterval(noticeTimer);window.removeEventListener('blur',release);});
</script>

<template>
<div class="app-shell" :aria-hidden="overlayCount>0?true:undefined" :inert="overlayCount>0?true:undefined" @invalid.capture.prevent="invalidField">
  <div class="app-top">
  <header class="app-header">
    <div class="brand-mark" aria-hidden="true">幻</div><div class="header-title"><strong>幻想镇</strong><span>{{tabs.find(t=>t.id===tab)?.name}}</span></div>
    <button v-if="(state.room||state.recoveringRoom)&&tab!=='voice'" class="header-call icon-button" :aria-label="'返回语音：'+roomName" @click="navigate('voice')"><Icon :name="state.muted?'mute':'headphones'"/><i class="status-dot"/></button>
    <button class="connection" :class="{online:state.connected}" @click="sheet=state.hasAccount?'connection':'login'"><i/>{{state.connected?'在线':state.hasAccount?'连接':'登录'}}</button>
    <button v-if="appUpdate.phase==='ready'" class="icon-button update-ready" aria-label="安装社区更新" @click="navigate('me')"><Icon name="download"/></button><button class="avatar small" aria-label="我的账号" @click="navigate('me')"><img v-if="selectedAvatar" :src="selectedAvatar" alt="头像"><span v-else>{{(state.user.name||'旅').slice(0,1)}}</span></button>
  </header>

  </div>
  <div v-if="error" class="error-banner" role="alert"><span>{{error}}</span><button class="icon-button" aria-label="关闭错误" @click="error=''"><Icon name="close"/></button></div>
  <div v-if="busy" class="busy-line" role="status" aria-label="正在处理"/>

  <MediaAppearance :settings="settings" :controls="tab==='me'"/><main ref="workspace" class="workspace" :aria-hidden="overlayCount>0?true:undefined" :inert="overlayCount>0?true:undefined">
    <section v-show="tab==='chat'" class="chat-page">
      <div class="channel-strip"><h1>文字大厅</h1><button class="text-button" @click="sheet='members'"><i class="status-dot"/>{{onlineUsers.length}} 人在线 <Icon name="chevron"/></button></div>
      <div ref="chatList" class="message-list" @scroll="chatScroll">
        <div class="chat-history-actions"><button v-if="state.connected&&!historyEnd" class="text-button" :disabled="historyLoading" @click="olderMessages">{{historyLoading?'读取中…':'更早的消息'}}</button><button v-if="historyPage" class="text-button" @click="latestMessages">返回最新</button></div><div v-if="!visibleMessages.length" class="empty-state"><Icon name="chat"/><h2>{{state.connected?'在这里相遇':'欢迎来到幻想镇'}}</h2><p>{{state.connected?'向在线的旅人打个招呼吧':'登录皮肤站账号，加入聊天与语音'}}</p><button v-if="!state.hasAccount" class="primary" @click="sheet='login'">登录社区</button><button v-else-if="!state.connected" class="soft-button" @click="run(()=>native('reconnect'))">重新连接</button></div>
        <article v-for="(m,index) in visibleMessages" :key="m.id" class="message" :class="{own:m.uid===state.user.uid,grouped:index>0&&visibleMessages[index-1].uid===m.uid&&m.created-visibleMessages[index-1].created<120000}">
          <div class="avatar"><img v-if="avatar(m.uid,m.avatarVersion)" :src="avatar(m.uid,m.avatarVersion)" alt=""><span v-else>{{m.name?.slice(0,1)}}</span></div>
          <div class="message-content"><div class="message-meta"><strong>{{m.name}}</strong><time>{{date(m.created)}}</time></div><div class="bubble">{{m.body}}</div></div>
        </article>
      </div>
      <button v-if="newMessages&&!nearBottom" class="new-messages" @click="scrollBottom">{{newMessages}} 条新消息 ↓</button>
      <div v-if="emoji" class="emoji-tray"><button v-for="e in emojis" :key="e" @click="insertEmoji(e)">{{e}}</button></div>
      <form class="composer" @submit.prevent="sendChat"><button type="button" class="icon-button" aria-label="表情与颜文字" @click="emoji=!emoji"><Icon name="smile"/></button><textarea ref="composer" v-model="chatBody" rows="1" maxlength="1000" :disabled="!state.connected" :placeholder="state.connected?'聊点什么…':'连接社区后发送消息'" @keydown.enter.exact.prevent="sendChat"/><button class="primary send-button" aria-label="发送消息" :disabled="!state.connected||!chatBody.trim()||busy"><Icon name="send"/></button></form>
    </section>

    <VoicePage v-if="tab==='voice'" :state="state" :settings="settings" :rooms="rooms" :members="members" :room-name="roomName" :speaker="speaker" :busy="busy" @join="join" @change="voiceChange" @leave="leaveVoice" @press="press" @speaker="toggleSpeaker" @login="sheet=state.hasAccount?'connection':'login'"/>

    <div v-if="tab==='games'" class="games-scroll"><ArcadeGames :request="api"/></div>
    <section v-if="tab==='forum'" class="content-page">
      <template v-if="!detail"><div class="page-toolbar"><div><h1>幻想镇论坛</h1></div><button class="primary" :disabled="!state.connected" @click="sheet='newPost'"><Icon name="plus"/>发帖</button></div>
        <form class="search-bar" @submit.prevent="searchPosts"><Icon name="search"/><input v-model="postQuery" placeholder="搜索帖子" maxlength="100"><button aria-label="搜索"><Icon name="chevron"/></button></form>
        <div class="chips"><button :class="{selected:!postCategory}" @click="postCategory='';searchPosts()">全部</button><button v-for="category in access.forumCategories" :key="category" :class="{selected:postCategory===category}" @click="postCategory=category;searchPosts()">{{category}}</button></div>
        <div v-if="!posts.length" class="empty-state"><Icon name="forum"/><h2>这里还没有帖子</h2><p>可以换个分类，或发布第一条话题</p></div>
        <button v-for="post in posts" :key="post.id" class="post-card" @click="openPost(post.id)"><div class="meta"><span class="tag">{{post.category}}</span><span v-if="post.pinned">置顶</span><span v-if="post.locked">已锁定</span><time>{{date(post.created)}}</time></div><h2>{{post.title}}</h2><p class="preview">{{post.body}}</p><div class="card-footer"><span>{{post.name}}</span><span><Icon name="like"/>{{post.likes}} <Icon name="chat"/>{{post.replies}}</span></div></button>
        <div v-if="postTotal>24" class="pagination"><button :disabled="postOffset===0||busy" @click="postOffset-=24;run(loadPosts)">上一页</button><span>{{Math.floor(postOffset/24)+1}} / {{Math.ceil(postTotal/24)}}</span><button :disabled="postOffset+24>=postTotal||busy" @click="postOffset+=24;run(loadPosts)">下一页</button></div>
      </template>
      <template v-else><button class="text-button back" @click="detail=null"><Icon name="back"/>论坛</button><article class="detail-card"><span class="tag">{{detail.post.category}}</span><h1>{{detail.post.title}}</h1><p class="meta">{{detail.post.name}} · {{date(detail.post.created)}}</p><p class="prose">{{detail.post.body}}</p><div class="actions"><button :class="['soft-button',{selected:detail.post.liked}]" :disabled="!state.connected||busy" @click="likePost"><Icon name="like"/>{{detail.post.likes}}</button><button v-if="access.admin||detail.post.uid===state.user.uid" class="text-button danger-text" @click="deletePost">删除</button><template v-if="access.admin"><button class="text-button" @click="moderate('pinned')">{{detail.post.pinned?'取消置顶':'置顶'}}</button><button class="text-button" @click="moderate('locked')">{{detail.post.locked?'解锁':'锁帖'}}</button><button class="text-button" @click="moderate('hidden')">隐藏</button></template></div></article>
        <h2 class="section-title">回复 <span>{{detail.total}}</span></h2>
        <article v-for="reply in detail.replies" :key="reply.id" class="reply-card"><div class="meta"><strong>{{reply.name}}</strong><time>{{date(reply.created)}}</time></div><blockquote v-if="reply.parentId">回复 {{parentOf(reply)?.name||'已删除的评论'}}：{{parentOf(reply)?.body?.slice(0,140)||'原评论已删除'}}</blockquote><p class="prose">{{reply.body}}</p><div class="actions"><button class="text-button" :class="{selected:reply.liked}" :disabled="!state.connected" @click="likeReply(reply)"><Icon name="like"/>{{reply.likes}}</button><button class="text-button" :disabled="detail.post.locked||!state.connected" @click="selectReply(reply)">回复</button><button v-if="access.admin||reply.uid===state.user.uid" class="text-button danger-text" @click="deleteReply(reply)">删除</button></div></article>
        <div v-if="detail.total>24" class="pagination"><button :disabled="replyOffset===0||busy" @click="replyOffset-=24;run(loadReplies)">上一页</button><span>{{Math.floor(replyOffset/24)+1}}</span><button :disabled="replyOffset+24>=detail.total||busy" @click="replyOffset+=24;run(loadReplies)">下一页</button></div>
        <form v-if="state.connected&&!detail.post.locked" class="reply-compose card" @submit.prevent="sendReply"><div v-if="replyParent" class="reply-target"><span>回复 {{replyParent.name}}</span><button type="button" class="icon-button" aria-label="取消指定回复" @click="replyParent=null"><Icon name="close"/></button></div><textarea ref="replyComposer" v-model="replyBody" placeholder="写下你的回复…" maxlength="5000" rows="3" required/><div class="emoji-tray inline"><button v-for="e in emojis.slice(0,6)" :key="e" type="button" @click="insertEmoji(e,'reply')">{{e}}</button></div><button class="primary" :disabled="busy||!replyBody.trim()">发布回复</button></form><p v-else class="empty-note">{{detail.post.locked?'该帖子已锁定':'登录后参与讨论'}}</p>
      </template>
    </section>

    <section v-if="tab==='blueprint'" class="content-page">
      <template v-if="!blueprint"><div class="page-toolbar"><div><h1>机械动力蓝图库</h1></div><button class="primary square" :disabled="!state.connected" aria-label="上传蓝图" @click="sheet='newBlueprint'"><Icon name="upload"/></button></div>
        <form class="search-bar" @submit.prevent="searchBlueprints"><Icon name="search"/><input v-model="blueprintQuery" placeholder="搜索蓝图、作者" maxlength="100"><button aria-label="搜索"><Icon name="chevron"/></button></form>
        <div class="chips"><button :class="{selected:blueprintScope==='public'}" @click="blueprintScope='public';searchBlueprints()">发现</button><button :disabled="!state.connected" :class="{selected:blueprintScope==='mine'}" @click="blueprintScope='mine';searchBlueprints()">我的上传</button><button v-if="access.reviewer" :class="{selected:blueprintScope==='review'}" @click="blueprintScope='review';searchBlueprints()">待审核</button><button class="filter-chip" @click="sheet='filters'"><Icon name="settings"/>筛选{{blueprintMc||blueprintCreate||blueprintCategory?' · 已选':''}}</button></div>
        <div v-if="!blueprints.length" class="empty-state"><Icon name="blueprint"/><h2>暂无符合条件的蓝图</h2><p>试试其他分类或版本</p></div>
        <div class="blueprint-grid"><button v-for="item in blueprints" :key="item.id" class="blueprint-card" @click="openBlueprint(item.id)"><div class="blueprint-cover"><img v-if="item.cover" :src="item.cover" alt="蓝图封面"><Icon v-else name="blueprint"/><span class="tag">{{item.category}}</span></div><div class="blueprint-info"><h2>{{item.title}}</h2><p>{{item.name}} · MC {{item.mc}}</p><div class="card-footer"><span>{{statusLabel[item.status]}}</span><span><Icon name="download"/>{{item.downloads}}</span></div></div></button></div>
        <div v-if="blueprintTotal>24" class="pagination"><button :disabled="blueprintOffset===0||busy" @click="blueprintOffset-=24;run(loadBlueprints)">上一页</button><span>{{Math.floor(blueprintOffset/24)+1}} / {{Math.ceil(blueprintTotal/24)}}</span><button :disabled="blueprintOffset+24>=blueprintTotal||busy" @click="blueprintOffset+=24;run(loadBlueprints)">下一页</button></div>
      </template>
      <template v-else><button class="text-button back" @click="blueprint=null"><Icon name="back"/>蓝图库</button><article class="detail-card"><img v-if="blueprint.cover" class="detail-cover" :src="blueprint.cover" alt="蓝图封面"><span class="tag">{{blueprint.category}}</span><h1>{{blueprint.title}}</h1><p class="meta">{{blueprint.name}} · {{statusLabel[blueprint.status]}}</p><div class="spec-grid"><div>游戏版本<strong>{{blueprint.mc}}</strong></div><div>机械动力<strong>{{blueprint.create_version}}</strong></div><div>加载器<strong>{{blueprint.loader}}</strong></div><div>文件大小<strong>{{(blueprint.size/1024).toFixed(1)}} KB</strong></div></div><p class="prose">{{blueprint.description}}</p><h3 v-if="blueprint.dependencies">需要的依赖</h3><p class="prose">{{blueprint.dependencies}}</p><p v-if="blueprint.reason" class="error-note">审核意见：{{blueprint.reason}}</p><div class="actions"><button class="primary" :disabled="busy||!blueprint.size" @click="run(async()=>{await native('download',{id:blueprint.id});notify('蓝图已保存')})"><Icon name="download"/>保存蓝图</button><button v-if="access.admin||blueprint.uid===state.user.uid" class="text-button danger-text" @click="deleteBlueprint">删除</button></div></article>
        <div v-if="access.reviewer&&blueprint.size&&(access.admin||blueprint.uid!==state.user.uid)" class="card form-stack"><h2>审核蓝图</h2><textarea v-model="reviewReason" placeholder="审核意见（驳回时必填）" maxlength="1000" rows="3"/><div class="actions"><button class="primary" :disabled="busy" @click="review('approved')">通过审核</button><button class="danger-button" :disabled="busy||!reviewReason.trim()" @click="review('rejected')">驳回</button></div></div>
      </template>
    </section>

    <section v-if="tab==='notice'" class="content-page"><div class="page-toolbar"><div><h1>通知公告</h1></div><button class="icon-button" aria-label="刷新公告" :disabled="busy" @click="run(loadNotices)"><Icon name="refresh"/></button></div><div class="segmented"><button v-for="group in groups" :key="group.id" :class="{selected:noticeGroup===group.id}" @click="noticeGroup=group.id">{{group.short}}</button></div>
      <div class="section-title"><h2>{{groupName(noticeGroup)}}</h2><button v-if="access.admin" class="text-button" @click="noticeForm.groupId=noticeGroup;sheet='newNotice'"><Icon name="plus"/>发布</button></div>
      <article v-for="notice in currentNotices" :key="notice.id" class="detail-card"><span class="tag">{{groupName(notice.groupId)}} · 公告</span><h2>{{notice.title}}</h2><p class="prose">{{notice.body}}</p><div class="card-footer"><time>{{date(notice.updated)}}</time><button v-if="access.admin" class="text-button danger-text" @click="confirm('删除这条公告？',async()=>{await api('/api/notices/'+notice.id,'DELETE');await loadNotices()})">删除</button></div></article>
      <p v-if="!currentNotices.length" class="empty-note">本服暂未发布公告</p>
      <h2 class="section-title">HXZ UP 更新日志</h2><p class="source-label">{{groupName(noticeGroup)}} · 独立更新来源</p>
      <p v-if="!currentLogs||currentLogs.status!=='ready'" class="card muted">{{!currentLogs?'正在读取更新日志':currentLogs.status==='unconfigured'?'本服尚未配置更新日志':currentLogs.status==='maintenance'?'本服正在维护，稍后查看更新':currentLogs.error||'本服更新日志暂时不可用'}}</p>
      <details v-for="(log,index) in currentLogs?.entries||[]" :key="log.id" class="log-entry" :open="index===0"><summary><span>{{log.version}}</span><time>{{log.date}}</time></summary><p class="prose">{{log.content}}</p></details>
    </section>

    <section v-if="tab==='me'" class="content-page account-page"><div class="profile-card"><button class="avatar hero" :disabled="!state.connected" aria-label="更改头像" @click="setAvatar"><img v-if="selectedAvatar" :src="selectedAvatar" alt="我的头像"><span v-else>{{(state.user.name||'旅').slice(0,1)}}</span><i><Icon name="image"/></i></button><h1>{{state.user.name||state.selectedProfile?.name||'未登录'}}</h1><p>{{state.connected?'幻想镇皮肤站账号':state.connection}}</p><button v-if="!state.hasAccount" class="primary" @click="sheet='login'">登录皮肤站</button><button v-else class="soft-button" @click="sheet='profiles'">切换角色</button></div>
      <div class="settings-group"><button class="settings-row" @click="sheet='connection'"><Icon name="settings"/><span>社区连接<small>{{state.server}}</small></span><Icon name="chevron"/></button><button class="settings-row" @click="run(()=>native('openSkin'))"><Icon name="user"/><span>皮肤站账号管理<small>皮肤、资料与账号安全</small></span><Icon name="chevron"/></button><button class="settings-row" :disabled="!state.connected" @click="setAvatar"><Icon name="image"/><span>更换社区头像<small>相册选择，居中裁剪</small></span><Icon name="chevron"/></button></div>
      <div class="settings-group"><button class="settings-row" @click="feedbackOpen=!feedbackOpen"><Icon name="chat"/><span>问题反馈与处理</span><Icon name="chevron"/></button></div><FeedbackPanel v-if="feedbackOpen" :request="api"/><h2 class="section-title">外观</h2><div class="card form-stack"><label>主题<AppSelect v-model="settings.theme" label="主题" :options="[{value:'system',label:'跟随系统',icon:'settings',description:'随手机外观自动切换'},{value:'light',label:'浅色',icon:'sun',description:'明亮清晰的浅色界面'},{value:'dark',label:'深色',icon:'moon',description:'柔和舒适的深色界面'}]"/></label><label>文字大小 <span>{{settings.font}} px</span><input v-model.number="settings.font" type="range" min="14" max="22" step="1" aria-label="文字大小"></label><div class="color-row"><span>强调色</span><button v-for="color in ['#58734b','#407d8b','#626cc1','#9f6178','#a17137']" :key="color" :aria-label="'强调色 '+color" :aria-pressed="settings.accent===color" :style="{background:color}" @click="settings.accent=color"><Icon v-if="settings.accent===color" name="check"/></button></div></div>
      <div id="media-controls"/><h2 class="section-title">语音</h2><div class="card form-stack"><label>说话方式<AppSelect v-model="settings.ptt" label="说话方式" :options="[{value:false,label:'自由说话',icon:'mic',description:'进入频道后持续传送语音'},{value:true,label:'按住说话',icon:'mute',description:'仅按住语音页按钮时传送语音'}]" @change="value=>voiceChange({ptt:value,pressing:false})"/></label><p class="muted">按住说话时，在通话面板按住麦克风按钮。离开应用会自动停止发言。</p></div>
      <div class="card form-stack"><label>聊天记录范围<AppSelect v-model="settings.chatHistoryDays" label="聊天记录范围" :options="[{label:'不限制',value:0},{label:'1 天',value:1},{label:'3 天',value:3},{label:'5 天',value:5},{label:'1 周',value:7},{label:'一个月',value:30}]"/></label></div><UpdateCard :state="appUpdate" @action="updateAction"/><div class="settings-group"><button class="settings-row" @click="secret"><span>幻想镇社区<small>Android · 0.5.0（50001） · Android 10 及以上</small></span><span class="tag">0.5.0</span></button><button v-if="state.hasAccount" class="settings-row danger-text" @click="confirm('退出登录并离开语音？',logout)"><Icon name="logout"/><span>退出登录</span></button></div>
    </section>
  </main>

  <FloatingSectionSwitch :group="switchTarget?mainTab:''" :icon="switchTarget?.icon" :label="switchTarget?'切换到'+({chat:'文字大厅',voice:'语音房间',forum:'幻想镇论坛',blueprint:'机械动力蓝图'})[switchTarget.id]:''" :workspace="workspace" :hidden="overlayCount>0" :status="mainTab==='chat'?(tab==='voice'&&newMessages?'unread':state.room||state.recoveringRoom?'voice':''):''" @toggle="switchTarget&&navigate(switchTarget.id)"/>
  <nav class="bottom-nav" aria-label="主导航"><button v-for="item in mainTabs" :key="item.id" :class="{active:mainTab===item.id}" :aria-current="mainTab===item.id?'page':undefined" @click="navigateMain(item.id)"><span><Icon :name="item.icon"/><i v-if="item.id==='chat'&&newMessages&&tab!=='chat'" class="badge"/><i v-else-if="item.id==='chat'&&(state.room||state.recoveringRoom)" class="badge voice-badge"/></span>{{item.name}}</button></nav>

  <AppOverlay :open="!!sheet" label="社区面板" @close="sheet=''"><section class="sheet" @invalid.capture.prevent="invalidField" :class="{'full-sheet':['newPost','newBlueprint','newNotice','arcana'].includes(sheet)}"><div class="sheet-handle"/><header class="sheet-header"><h2>{{({login:'登录社区',profiles:'选择角色',connection:'社区连接',members:'在线成员',newPost:'发布帖子',newBlueprint:'上传蓝图',filters:'筛选蓝图',newNotice:'发布公告',arcana:'星之回廊'})[sheet]}}</h2><button class="icon-button" aria-label="关闭面板" @click="sheet=''"><Icon name="close"/></button></header><div class="sheet-body">
    <p v-if="error" class="error-note sheet-error" role="alert">{{error}}</p>
    <form v-if="sheet==='login'" class="form-stack" @submit.prevent="login"><p class="muted">使用幻想镇皮肤站账号登录</p><label>邮箱或用户名<input v-model="username" autocomplete="username" autocapitalize="off" required></label><label>密码<input v-model="password" type="password" autocomplete="current-password" required></label><button class="primary full-width" :disabled="busy">{{busy?'正在登录…':'登录'}}</button><button class="text-button" type="button" @click="run(()=>native('openSkin'))">注册账号 / 管理皮肤站</button></form>
    <div v-if="sheet==='profiles'" class="form-stack"><p v-if="!state.profiles.length" class="muted">账号还没有角色，请先在皮肤站创建。</p><ChoiceRows :items="state.profiles.map(p=>({value:p.id,label:p.name}))" :value="state.selectedProfile?.id" label="选择角色" @choose="profile"/><button class="soft-button" @click="sheet='login'">登录其他账号</button></div>
    <form v-if="sheet==='connection'" class="form-stack" @submit.prevent="run(async()=>{Object.assign(state,await native('server',{url:server}));sheet='';notify('社区地址已保存')})"><div class="connection-summary"><i class="status-dot" :class="{offline:!state.connected}"/>{{state.connection}}</div><label>社区服务地址<input v-model="server" type="url" placeholder="https://qqbot.hxzmc.top" autocapitalize="off" required></label><button class="primary" :disabled="busy">保存并连接</button><button type="button" class="soft-button" @click="run(()=>native('reconnect'))">重新连接</button><p class="muted">社区服务端 0.5.0。连接地址同时用于聊天和语音，无需额外端口。</p></form>
    <div v-if="sheet==='members'" class="member-list"><p v-if="!onlineUsers.length" class="empty-note">暂时没有在线成员</p><div v-for="u in onlineUsers" :key="u.id" class="member"><span class="avatar"><img v-if="avatar(u.uid,u.avatarVersion)" :src="avatar(u.uid,u.avatarVersion)" alt=""><span v-else>{{u.name.slice(0,1)}}</span></span><strong>{{u.name}}<small class="device-label">{{u.devices?.includes('android')&&u.devices?.includes('desktop')?'手机 · 电脑':u.devices?.includes('android')?'手机在线':u.devices?.includes('desktop')?'电脑在线':'在线'}}</small></strong><small>{{rooms.find(r=>r.id===u.room)?.name||'在线'}}</small></div></div>
    <form v-if="sheet==='newPost'" class="form-stack" @submit.prevent="publishPost"><label>分类<AppSelect v-model="postForm.category" label="帖子分类" :options="access.forumCategories"/></label><label>标题<input v-model="postForm.title" maxlength="100" placeholder="给话题起个名字" required></label><label>正文<textarea v-model="postForm.body" maxlength="12000" rows="10" placeholder="分享你的想法…" required/></label><div class="emoji-tray inline"><button v-for="e in emojis" :key="e" type="button" @click="postForm.body+=e">{{e}}</button></div><button class="primary" :disabled="busy">发布帖子</button></form>
    <form v-if="sheet==='newBlueprint'" class="form-stack" @submit.prevent="publishBlueprint"><button type="button" class="file-picker" @click="run(async()=>selectedFile=await native('pick',{kind:'blueprint'}))"><Icon name="upload"/><strong>{{selectedFile?.name||'选择 .nbt 蓝图文件'}}</strong><small>{{selectedFile?(selectedFile.size/1024).toFixed(1)+' KB':'最大 8 MB · 审核后公开'}}</small></button><button type="button" class="soft-button" @click="run(async()=>blueprintForm.cover=(await native('pick',{kind:'cover'})).avatar)"><Icon name="image"/>{{blueprintForm.cover?'重新选择封面':'添加封面（可选）'}}</button><img v-if="blueprintForm.cover" class="upload-cover" :src="blueprintForm.cover" alt="封面预览"><label>作品名称<input v-model="blueprintForm.title" maxlength="100" required></label><label>说明<textarea v-model="blueprintForm.description" maxlength="12000" rows="4" required/></label><label>分类<AppSelect v-model="blueprintForm.category" label="蓝图分类" :options="access.blueprintCategories"/></label><div class="form-grid"><label>Minecraft 版本<input v-model="blueprintForm.mc" maxlength="40" placeholder="1.21.1" required></label><label>机械动力版本<input v-model="blueprintForm.create_version" maxlength="40" placeholder="6.0" required></label></div><label>加载器<AppSelect v-model="blueprintForm.loader" label="加载器" :options="['通用','neoforge','forge','fabric','quilt']"/></label><label>其他依赖<textarea v-model="blueprintForm.dependencies" maxlength="2000" rows="2"/></label><button class="primary" :disabled="busy||!selectedFile">提交审核</button></form>
    <form v-if="sheet==='filters'" class="form-stack" @submit.prevent="sheet='';searchBlueprints()"><label>Minecraft 版本<AppSelect v-model="blueprintMc" label="Minecraft 版本" :options="[{value:'',label:'全部版本'},...versions.minecraft]"/></label><label>机械动力版本<AppSelect v-model="blueprintCreate" label="机械动力版本" :options="[{value:'',label:'全部版本'},...versions.create]"/></label><label>分类<AppSelect v-model="blueprintCategory" label="筛选分类" :options="[{value:'',label:'全部分类'},...access.blueprintCategories]"/></label><button class="primary">应用筛选</button><button type="button" class="soft-button" @click="blueprintMc='';blueprintCreate='';blueprintCategory=''">重置</button></form>
    <form v-if="sheet==='newNotice'" class="form-stack" @submit.prevent="publishNotice"><label>发布至<AppSelect v-model="noticeForm.groupId" label="发布至" :options="groups.map(g=>({value:g.id,label:g.name}))"/></label><label>标题<input v-model="noticeForm.title" maxlength="100" required></label><label>内容<textarea v-model="noticeForm.body" maxlength="12000" rows="9" required/></label><button class="primary" :disabled="busy">发布公告</button></form>
    <div v-if="sheet==='arcana'&&arcana" class="arcana"><div class="arcana-stars">✦ · ✧ · ✦</div><h1>{{arcana.title}}</h1><p>{{arcana.subtitle}}</p><template v-if="!arcanaCard"><form class="form-stack" @submit.prevent="unlockArcana"><input v-model="arcanaCode" :placeholder="arcana.entered?'输入卡牌代码':'输入入口代码'" required><button class="primary" :disabled="busy">点亮</button></form><div class="arcana-grid"><button v-for="c in arcana.cards" :key="c.id" :disabled="c.state!=='available'" @click="arcanaCard=c"><span>✧</span><strong>{{c.name||'未点亮'}}</strong><small>{{c.state==='locked'?'尚未开放':c.state==='available'?'阅读卡牌':'等待你的发现'}}</small></button></div><p v-if="arcana.storyCompleted">✦ 恋人牌已加入牌库</p></template><template v-else><h2>{{arcanaCard.name}}</h2><p class="prose">{{storyText(arcanaCard.detail)}}</p><p class="prose">{{storyText(arcanaCard.dialogue)}}</p><template v-if="arcanaCard.id==='lovers'"><p class="prose">{{storyText(arcana.center.finalStory||arcana.center.dialogue||arcana.center.story)}}</p></template><button class="primary" :disabled="busy" @click="readCard">{{arcanaCard.id==='lovers'?'完成归档':'读完了'}}</button></template></div>
  </div></section></AppOverlay>
  <AppOverlay :open="!!confirmAction" :label="confirmAction?.title||'确认操作'" kind="confirm" @close="confirmAction=null"><section class="confirm-dialog"><h2>{{confirmAction?.title}}</h2><div class="actions"><button class="soft-button" @click="confirmAction=null">取消</button><button class="danger-button" @click="confirmed">确认</button></div></section></AppOverlay>
  <Transition name="toast-motion"><div v-if="toast" class="toast" role="status"><Icon name="check"/>{{toast}}</div></Transition>
</div>
</template>
