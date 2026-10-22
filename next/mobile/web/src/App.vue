<script setup>
import {version as appVersion} from '../package.json';
import {showBlueprintMaterials} from '../../../packages/hub/blueprint-materials.mjs';
import ChatImages from './ChatImages.vue';
import ChatMediaPicker from './ChatMediaPicker.vue';
import SavedStickers from './SavedStickers.vue';
import {disposeChatFiles} from '../../../packages/community/chat-media.mjs';
import MobileMinecraft from "./MobileMinecraft.vue";
import MobileGameStats from "./MobileGameStats.vue";
const guildTask=ref(''),boardTarget=ref(null),arcadeTarget=ref('');
import {ref,reactive,computed,watch,nextTick,onMounted,onUnmounted} from 'vue';
import MusicPage from './MusicPage.vue';
import GuildPage from './GuildPage.vue';
import HubPage from './HubPage.vue';
import {HUB_AREAS,resolveHubTarget,hubAreaFor,appDestination} from '../../../packages/hub/navigation.mjs';
import {isActiveHubSection} from '../../../server/shared/hub-visibility.mjs';
import InventoryPage from './InventoryPage.vue';
import LinkingActivity from './LinkingActivity.vue';
import MentionInput from './MentionInput.vue';
import InboxPage from './InboxPage.vue';
import LobbyPage from './LobbyPage.vue';
import {EMOJI,KAOMOJI} from '../../../packages/community/expressions';
import MediaAppearance from './MediaAppearance.vue';
import Icon from './Icon.vue';
import ShopPanel from '../../../packages/mobile-ui/client/src/components/ShopPanel.vue';
import PointsWallet from '../../../packages/mobile-ui/client/src/components/PointsWallet.vue';
import {GAMES} from '../../../server/shared/arcade-engine.mjs';
import {BOARD_GAMES} from '../../../server/shared/board-catalog.mjs';
const gameCount=GAMES.length+BOARD_GAMES.length+1;
import ArcadeGames from '../../../packages/mobile-ui/client/src/components/ArcadeGames.vue';
import VoicePage from './VoicePage.vue';
import FeedbackPanel from '../../../packages/mobile-ui/client/src/components/FeedbackPanel.vue';
const feedbackTarget=ref('');
import AppSelect from './AppSelect.vue';
import ChoiceRows from './ChoiceRows.vue';
import AppOverlay from './AppOverlay.vue';
import MobileSettings from './MobileSettings.vue';
import MobileWelcome from './MobileWelcome.vue';
import MobileGuide from './MobileGuide.vue';
import {GUIDE_VERSION} from '../../../packages/onboarding/catalog.mjs';
import './mobile-account081.css';
import {registerOverlay,unregisterOverlay,closeTopOverlay,overlayCount} from './overlays.js';
import {state,native,api,on,avatar,groups,rooms as fallbackRooms,date} from './native.js';
import {loadForumPage} from '../../../packages/mobile-ui/client/src/lib/forum-list.mjs';

const rooms=computed(()=>state.voiceRooms?.length?state.voiceRooms:fallbackRooms);
const shopOverlay=Symbol('shop');const shopDialog=close=>close?registerOverlay(shopOverlay,close):unregisterOverlay(shopOverlay);
const hubTarget=ref({area:'events',section:'event',item:''}),hubReturn=ref('discover');
function openHub(section){if(!isActiveHubSection(section)){notify('这个旧栏目已归档，请从导航选择现有功能');return;}if(tab.value!=='hub')hubReturn.value=tab.value;hubTarget.value={area:hubAreaFor(section),section,item:''};navigate('hub');}
const tabs=[{id:'hub',name:'社区',icon:'compass'},{id:'inventory',name:'背包',icon:'shop'},{id:'minecraft',name:'Minecraft',icon:'games'},{id:'guild',name:'冒险家协会',icon:'compass'},{id:'linking',name:'LINKING',icon:'compass'},{id:'inbox',name:'收件箱',icon:'mail'},{id:'discover',name:'首页',icon:'compass'},{id:'music',name:'音乐',icon:'music'},{id:'lobby',name:'联机',icon:'network'},{id:'shop',name:'积分商城',icon:'shop'},{id:'chat',name:'聊天',icon:'chat'},{id:'voice',name:'语音',icon:'headphones'},{id:'forum',name:'论坛',icon:'forum'},{id:'blueprint',name:'蓝图',icon:'blueprint'},{id:'games',name:'游戏',icon:'games'},{id:'notice',name:'公告',icon:'notice'},{id:'settings',name:'设置',icon:'settings'},{id:'feedback',name:'反馈',icon:'chat'},{id:'me',name:'我的',icon:'user'}];
const tab=ref('chat'), sheet=ref(''), busy=ref(false), toast=ref(''), error=ref(''),minecraftRiskOnEntry=ref(false);let toastTimer;
const sessionReady=ref(false),sessionError=ref(''),guideOpen=ref(false);
function guideSeen(){try{return Number(localStorage.getItem('hxz-mobile-guide-version'))>=GUIDE_VERSION;}catch{return false;}}
function finishGuide(){guideOpen.value=false;try{localStorage.setItem('hxz-mobile-guide-version',String(GUIDE_VERSION));}catch{}}
function guideDestination(target){finishGuide();if(target==='admin'){if(access.admin)openHub('workbench');return;}navigate(target);}
function openMinecraftRisk(){minecraftRiskOnEntry.value=true;navigate('minecraft');}
function signedIn(result){Object.assign(state,result);sessionReady.value=true;sheet.value=state.selectedProfile?'':'profiles';error.value='';}
watch(()=>sessionReady.value&&state.hasAccount,active=>{if(active){if(!guideSeen())guideOpen.value=true;}else{guideOpen.value=false;sheet.value='';confirmAction.value=null;}});
const mainTabs=[{id:'chat',name:'聊天',icon:'chat'},{id:'community',name:'社区',icon:'users'},{id:'play',name:'游戏',icon:'games'},{id:'linking',name:'LINKING',icon:'archive'},{id:'me',name:'我的',icon:'user'}];
const sections={community:['forum','blueprint','guild','music'],play:['minecraft','games','lobby']};
const sectionNames={forum:'论坛',blueprint:'蓝图',guild:'委托',music:'音乐',minecraft:'服务器',games:'小游戏',lobby:'联机'};
const sectionIcons={forum:'forum',blueprint:'blueprint',guild:'compass',music:'music',minecraft:'blueprint',games:'games',lobby:'network'};
const mainTab=computed(()=>['voice','chat'].includes(tab.value)?'chat':['inbox','inventory','settings','feedback','wallet','shop'].includes(tab.value)?'me':Object.keys(sections).find(id=>sections[id].includes(tab.value))||(['shop','music','guild','hub','notice'].includes(tab.value)?'community':tab.value));
const navigationTrail=ref([]),pageScroll=new Map();
const settingsArea=ref('');
function openSettings(area=''){settingsArea.value=area;navigate('settings');}
function backSettings(){settingsArea.value='';navigateBack();}
function navigateMain(id){navigationTrail.value=[];navigate(({community:'forum',play:'minecraft'})[id]||id,{remember:false});}
const settings=reactive(readSettings());
const appUpdate=ref({currentVersion:appVersion,currentBuild:80300,autoCheck:true,autoDownload:true,phase:'idle'});
async function updateAction(action,values={}){try{appUpdate.value=await native('appUpdate',{action,...values});}catch(e){error.value=e.message;}}

async function changeVoiceOverlay(event){try{const result=await native('voiceOverlay',{enabled:event.target.checked});settings.voiceOverlay=result.enabled;if(!result.permission)error.value='请在系统中允许悬浮窗，然后返回开启语音屏幕覆盖。';}catch(e){error.value=e.message;settings.voiceOverlay=false;}}
function readSettings(){
  const defaults={theme:'system',font:15,accent:'#4265df',ptt:false,voiceOverlay:false,animations:true,animationSpeed:1,surfaceOpacity:1,background:'',music:'',musicVolume:.3,videoQuality:'efficient',chatHistoryDays:0,layoutRevision:2};
  try{
    const saved=JSON.parse(localStorage.getItem('hxz-mobile-settings')||'{}');
    // Migrate the original default; preserve other player-selected text sizes.
    if(!saved.layoutRevision&&saved.font===16)saved.font=15;
    if(saved.animationSpeed==null&&saved.animations===false)saved.animationSpeed=0;return {...defaults,...saved,layoutRevision:2};
  }catch{return defaults;}
}
const systemDark=ref(matchMedia('(prefers-color-scheme: dark)').matches), dark=computed(()=>settings.theme==='dark'||settings.theme==='system'&&systemDark.value);
watch(()=>[settings.accent,dark.value],()=>{
  const hex=/^#[0-9a-f]{6}$/i.test(settings.accent)?settings.accent:'#4265df';
  const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)),root=document.documentElement;
  root.style.setProperty('--accent-soft',`rgba(${rgb.join(',')},${dark.value?.19:.09})`);
  root.style.setProperty('--accent-border',`rgba(${rgb.join(',')},${dark.value?.5:.28})`);
  root.style.setProperty('--accent-text',dark.value?`rgb(${rgb.map(v=>Math.round(v+(255-v)*.55)).join(',')})`:hex);
},{immediate:true});
watch([()=>settings.theme,()=>settings.font,()=>settings.accent,()=>settings.ptt,()=>settings.chatHistoryDays,systemDark],()=>{localStorage.setItem('hxz-mobile-settings',JSON.stringify(settings));document.documentElement.dataset.theme=dark.value?'dark':'light';document.documentElement.style.fontSize=Math.max(14,Math.min(22,Number(settings.font)||16))+'px';document.documentElement.style.setProperty('--accent',settings.accent);if(window.HXZNative)native('appearance',{dark:dark.value}).catch(()=>{});},{immediate:true});
watch(()=>[settings.animationSpeed,settings.surfaceOpacity,settings.background,settings.music,settings.musicVolume,settings.videoQuality],()=>{settings.animations=settings.animationSpeed!==0;settings.surfaceOpacity=Math.max(.2,Math.min(1,Number(settings.surfaceOpacity??1)||.2));const root=document.documentElement;root.style.setProperty('--motion-duration',(160/(settings.animationSpeed||1))+'ms');root.style.setProperty('--mobile-surface-opacity',String(settings.surfaceOpacity??1));root.dataset.customBackground=settings.background?'true':'false';localStorage.setItem('hxz-mobile-settings',JSON.stringify(settings));},{immediate:true});
const notify=message=>{toast.value=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.value='',4000);};
async function run(fn){if(busy.value)return;busy.value=true;error.value='';try{return await fn();}catch(e){if(e.message!=='已取消')error.value=e.message;}finally{busy.value=false;}}
function widgetNavigate(target){if(!state.hasAccount)return;if(['chat','voice','inbox'].includes(target))navigate(target);else if(['devices','event'].includes(target)){openHub(target);}}
const unsubs=[on('widgetNavigate',widgetNavigate),on('error',message=>error.value=message),on('back',()=>{if(closeTopOverlay())return;if(!sessionReady.value||!state.hasAccount){native('background').catch(()=>{});return;}navigateBack();})];
unsubs.push(on('appUpdate',value=>{const previous=appUpdate.value.phase;appUpdate.value=value;if(value.phase==='ready'&&previous!=='ready')notify('新版已就绪，点右上角下载图标安装');}));
unsubs.push(on('state',value=>{if(typeof value.systemDark==='boolean')systemDark.value=value.systemDark;}));
const onlineUsers=computed(()=>[...new Map(state.users.map(u=>[u.uid,u])).values()]);
const roomName=computed(()=>rooms.value.find(r=>r.id===(state.room||state.recoveringRoom))?.name||''),members=id=>state.users.filter(u=>u.room===id);
const access=reactive({admin:false,reviewer:false,forumCategories:['交流讨论','游戏求助','作品分享','建议反馈'],blueprintCategories:['生产与加工','仓储与物流','动力与传动','列车与交通','建筑与装饰','其他']});
async function loadAccess(){Object.assign(access,await api('/api/content/access'));await loadUnread();}
const unread=ref(0),playtimeRequest=ref(null);
async function loadUnread(){try{unread.value=state.connected?(await api('/api/inbox/unread')).unread:0;}catch{}}
unsubs.push(on('inbox-changed',loadUnread));
async function openInboxTarget(target){
 try{
  const original=resolveHubTarget(target);if(original?.retired){notify('这个旧功能已归档，历史消息仍保留');return true;}
  const destination=appDestination(target);if(!destination)throw new Error('这个内容入口已不可用，消息仍保留在收件箱');
  const u=new URL(destination,'https://local.invalid');
  if(u.pathname==='/community'){
   const message=u.searchParams.get('message');
   const result=message?await api('/api/chat/history?around='+encodeURIComponent(message)):null;
   navigate('chat');if(result){historyPage.value=result.items;nearBottom.value=false;await nextTick();document.querySelector('[data-message="'+Number(message)+'"]')?.scrollIntoView({block:'center'});}
  }else if(u.pathname==='/community/inbox')navigate('inbox');
  else if(u.pathname==='/community/playtime'){playtimeRequest.value={week:Number(u.searchParams.get('week'))||0,nonce:Date.now()};navigate('minecraft');}
  else if(u.pathname==='/community/voice')navigate('voice');
  else if(u.pathname==='/community/forum'){detail.value=null;navigate('forum');}
  else if(u.pathname==='/community/notices')openSettings('updates');
  else if(u.pathname.startsWith('/community/forum/')){
   const id=u.pathname.split('/').pop(),reply=u.searchParams.get('reply');
   const result=await api('/api/forum/posts/'+encodeURIComponent(id)+'?offset=0'+(reply?'&reply='+encodeURIComponent(reply):''));
   if(!result?.post)throw new Error('这条帖子已不可用');
   detail.value=result;replyOffset.value=result.offset||0;replyParent.value=null;replyBody.value='';navigate('forum');await nextTick();if(reply)document.querySelector('[data-reply="'+CSS.escape(reply)+'"]')?.scrollIntoView({block:'center'});
  }else if(u.pathname==='/workshop/blueprints'||u.pathname==='/community/blueprints'){
   const id=u.searchParams.get('item');if(id){const result=await api('/api/blueprints/'+encodeURIComponent(id));if(!result?.id)throw new Error('这张蓝图已不可用');blueprint.value=result;}else blueprint.value=null;navigate('blueprint');
  }else if(resolveHubTarget(u.pathname+u.search)){
   const destination=resolveHubTarget(u.pathname+u.search);if(tab.value!=='hub')hubReturn.value=tab.value;hubTarget.value={...destination,area:destination.area};navigate('hub');
  }else if(u.pathname==='/linking')navigate('linking');
  else if(/^\/arcade\/board\/(gomoku|chess|xiangqi)$/.test(u.pathname)){arcadeTarget.value='';boardTarget.value={game:u.pathname.split('/').pop(),id:u.searchParams.get('match')||''};navigate('games',{notification:true});}
  else if(u.pathname==='/arcade/ranking'||u.pathname==='/arcade/social/werewolf'||u.pathname.startsWith('/arcade/play/')){const id=u.pathname.split('/').pop();if(!['ranking','werewolf'].includes(id)&&!GAMES.some(game=>game.id===id))throw Error('这个小游戏已不可用，消息仍保留在收件箱');boardTarget.value=null;arcadeTarget.value=id;navigate('games',{notification:true});}
  else if(u.pathname==='/music')navigate('music');
  else if(u.pathname==='/multiplayer')navigate('lobby');
  else if(u.pathname==='/arcade/shop')navigate('shop');
  else if(u.pathname==='/arcade'){boardTarget.value=null;arcadeTarget.value='';navigate('games');}
  else if(u.pathname==='/'||u.pathname==='/library'||u.pathname.startsWith('/workshop'))navigate('minecraft');
  else if(u.pathname==='/guild'){guildTask.value=u.searchParams.get('task')||'';navigate('guild');}
  else if(u.pathname==='/settings'||u.pathname==='/feedback'){if(u.pathname==='/feedback'||u.searchParams.has('feedback')){feedbackTarget.value=u.searchParams.get('feedback')||'';navigate('feedback');}else openSettings();}
  else if(u.pathname.startsWith('/account')){navigate(u.searchParams.has('backpack')||u.pathname.endsWith('/backpack')?'inventory':'me');if(u.searchParams.get('skin')==='1')await native('openSkin');}
  else throw new Error('暂时无法打开这条消息，内容仍保留在收件箱');
  return true;
 }catch(e){error.value=e.message;return false;}
}

function currentScroller(){return [...(workspace.value?.querySelectorAll('.content-page,.games-scroll')||[])].find(node=>node.offsetParent&&node.scrollHeight>node.clientHeight);}
function navigate(id,{remember=true,notification=false}={}){if(id==='discover')id='chat';if(id==='games'&&!notification){arcadeTarget.value='';boardTarget.value=null;}if(tab.value===id)return;const scroller=currentScroller();if(scroller)pageScroll.set(tab.value,scroller.scrollTop);if(remember)navigationTrail.value.push(tab.value);tab.value=id;sheet.value='';error.value='';nextTick(()=>{const node=currentScroller();if(node)node.scrollTop=pageScroll.get(id)||0;});}
function navigateBack(){if(navigationTrail.value.at(-1)==='inbox'&&(detail.value||blueprint.value)){navigate(navigationTrail.value.pop(),{remember:false});return;}if(tab.value==='forum'&&detail.value){detail.value=null;return;}if(tab.value==='blueprint'&&blueprint.value){blueprint.value=null;return;}const previous=navigationTrail.value.pop();if(previous)navigate(previous,{remember:false});else if(tab.value!=='chat')navigate('chat',{remember:false});else native('background').catch(()=>{});}
watch(tab,()=>{if(tab.value==='chat'&&!historyPage.value)nextTick(scrollBottom);if(tab.value==='forum')run(loadPosts);if(tab.value==='blueprint')run(loadBlueprints);if(tab.value==='notice')run(loadNotices);});
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
const chatBody=ref(''),chatList=ref(),composer=ref(),nearBottom=ref(true),newMessages=ref(0),emoji=ref(false),mediaUploading=ref(false);
const emojiKind=ref('emoji'),emojis=computed(()=>emojiKind.value==='kaomoji'?KAOMOJI:EMOJI);
const newArrival=ref(new Set());let arrivalTimer;
unsubs.push(on('message',m=>{newArrival.value=new Set([...newArrival.value,m.id]);clearTimeout(arrivalTimer);arrivalTimer=setTimeout(()=>newArrival.value=new Set(),600);}));
onUnmounted(()=>clearTimeout(arrivalTimer));
function scrollBottom(){if(chatList.value)chatList.value.scrollTop=chatList.value.scrollHeight;newMessages.value=0;nearBottom.value=true;}
function chatScroll(){const node=chatList.value;if(node)nearBottom.value=node.scrollHeight-node.scrollTop-node.clientHeight<100;}
unsubs.push(on('message',()=>{if(tab.value==='chat'&&nearBottom.value&&!historyPage.value)nextTick(scrollBottom);else newMessages.value++;}));
watch(()=>state.messages.length,()=>{if(nearBottom.value&&!historyPage.value&&tab.value==='chat')nextTick(scrollBottom);});
const chatMedia=ref([]);watch(()=>state.user?.uid,()=>{disposeChatFiles(chatMedia.value);chatMedia.value=[];});let pendingChat={content:'',id:''},sendingChat=false;
function removeChatMedia(index){disposeChatFiles([chatMedia.value[index]]);chatMedia.value.splice(index,1);}
function addChatMedia(items){for(const item of items)if(chatMedia.value.length<4&&!chatMedia.value.some(old=>old.id===item.id))chatMedia.value.push(item);else disposeChatFiles([item]);}
async function sendChat(){const text=chatBody.value.trim();if(sendingChat||mediaUploading.value||!text&&!chatMedia.value.length)return;sendingChat=true;try{await run(async()=>{const attachments=chatMedia.value.map(item=>item.id),content=JSON.stringify({body:text,attachments});if(content!==pendingChat.content)pendingChat={content,id:crypto.randomUUID()};if(attachments.length)await api('/api/chat/send','POST',{body:text,attachments,requestId:pendingChat.id});else await native('chat',{body:text});disposeChatFiles(chatMedia.value);chatMedia.value=[];pendingChat={content:'',id:''};chatBody.value='';emoji.value=false;nextTick(()=>{composer.value?.focus({preventScroll:true});scrollBottom();});});}finally{sendingChat=false;}}
function insertEmoji(value,target){const node=chatList.value,top=node?.scrollTop||0,atBottom=nearBottom.value;if(target==='reply')replyBody.value=(replyBody.value+value).slice(0,5000);else chatBody.value=(chatBody.value+value).slice(0,1000);nextTick(()=>{(target==='reply'?replyComposer.value:composer.value)?.focus({preventScroll:true});if(node){if(atBottom)scrollBottom();else node.scrollTop=top;}});}
const joiningRoom=ref('');let voiceJoinGeneration=0,cancelVoiceWait=null;
async function join(room,{muted=true}={}){
 if(joiningRoom.value)return;
 if(!state.connected){sheet.value=state.hasAccount?'connection':'login';return;}
 const generation=++voiceJoinGeneration;
 joiningRoom.value=room;error.value='';
 try{
  await native('voiceSettings',{ptt:settings.ptt,muted:true,deafened:false,pressing:false});
  if(state.room!==room){
   await native('voiceJoin',{room});
   if(generation!==voiceJoinGeneration){await native('voiceLeave');return;}
   if(state.room!==room)await new Promise((resolve,reject)=>{
    let timer;const stop=watch(()=>[state.room,state.connected],([joined,connected])=>{if(joined===room)finish();else if(!connected)finish(new Error('社区连接已中断，请连接后重新加入'));});
    const finish=error=>{clearTimeout(timer);stop();cancelVoiceWait=null;error?reject(error):resolve();};
    cancelVoiceWait=()=>finish(new Error('已取消'));
    timer=setTimeout(()=>finish(new Error('尚未加入语音房间，请稍后重试')),40000);
   });
  }
  if(generation!==voiceJoinGeneration)return;
  if(!muted)await native('voiceSettings',{ptt:settings.ptt,muted:false,pressing:false});
  sheet.value='';notify(muted?'已加入收听 · 麦克风关闭':settings.ptt?'已加入，按住说话时才会发声':'已加入，麦克风已开启');
 }catch(e){
  if(generation===voiceJoinGeneration){await native('voiceSettings',{muted:true,pressing:false}).catch(()=>{});if(e.message!=='已取消')error.value=e.message;}
 }finally{if(generation===voiceJoinGeneration)joiningRoom.value='';}
}
const speaker=ref(false);
async function voiceChange(values){const patch={ptt:settings.ptt,...values};if(values.ptt===false&&state.room)Object.assign(patch,{muted:true,pressing:false});try{await native('voiceSettings',patch);}catch(e){if(Object.hasOwn(values,'ptt'))settings.ptt=!!state.ptt;error.value=e.message;}}
async function setVoiceMode(values){try{await native('voiceSettings',values);settings.ptt=values.ptt;}catch(e){error.value=e.message;}}
async function leaveVoice(){voiceJoinGeneration++;cancelVoiceWait?.();joiningRoom.value='';try{await native('voiceLeave');sheet.value='';}catch(e){error.value=e.message;}}
function press(value){if(!state.room||!settings.ptt)return;native('voiceSettings',{ptt:true,pressing:value,...(value?{muted:false}:{})}).catch(e=>error.value=e.message);}
function beginTalk(event){event.currentTarget?.setPointerCapture?.(event.pointerId);press(true);}
function release(){press(false);}
watch(tab,(value,previous)=>{if(previous==='voice'&&value!=='voice')release();});
async function toggleSpeaker(){speaker.value=!speaker.value;try{await native('speaker',{enabled:speaker.value});}catch(e){error.value=e.message;}}

const username=ref(''),password=ref(''),server=ref(state.server);
async function login(){await run(async()=>{try{Object.assign(state,await native('login',{username:username.value.trim(),password:password.value}));sheet.value=state.selectedProfile?'':'profiles';notify('登录成功');}finally{password.value='';}});}
async function profile(id){if(id===state.selectedProfile?.id){sheet.value='';return;}const change=async()=>{Object.assign(state,await native('profile',{id}));sheet.value='';notify('已切换角色');};if(state.room||state.recoveringRoom){confirm('切换角色会离开当前语音房间，继续吗？',change);return;}await run(change);}
async function logout(){Object.assign(state,await native('logout'));Object.assign(access,{admin:false,reviewer:false});detail.value=null;blueprint.value=null;sheet.value='';posts.value=[];blueprints.value=[];notify('已退出登录');}
async function setAvatar(){await run(async()=>{const {avatar:value}=await native('pick',{kind:'avatar'});await api('/api/profile/avatar','POST',{avatar:value});notify('头像已更新');});}
const selectedAvatar=computed(()=>{const u=state.users.find(u=>u.uid===state.user.uid)||state.user;return avatar(u.uid,u.avatarVersion);});
unsubs.push(on('avatar-changed',v=>{if(v.uid===state.user.uid)state.user.avatarVersion=v.avatarVersion;for(const u of state.users)if(u.uid===v.uid)u.avatarVersion=v.avatarVersion;}));
watch(()=>state.server,v=>server.value=v);
watch(()=>state.connected,v=>{if(v&&state.hasAccount){run(async()=>{await loadAccess();if(tab.value==='forum')await loadPosts();if(tab.value==='blueprint')await loadBlueprints();});}});
watch(()=>state.user.uid,(value,old)=>{if(value!==old){posts.value=[];blueprints.value=[];detail.value=null;blueprint.value=null;}});

const posts=ref([]),postTotal=ref(0),postOffset=ref(0),postQuery=ref(''),postCategory=ref(''),postSort=ref('newest'),detail=ref(null),replyBody=ref(''),replyParent=ref(null),replyOffset=ref(0),replyComposer=ref();
async function selectReply(reply){if(busy.value)return;replyParent.value=reply;await nextTick();replyComposer.value?.scrollIntoView({block:'center',behavior:'smooth'});replyComposer.value?.focus();}
const postForm=reactive({title:'',body:'',category:'交流讨论'});
let postGeneration=0;
const postsLoading=ref(false);
async function loadPosts(){const generation=++postGeneration;postsLoading.value=true;try{const r=await loadForumPage(api,{offset:postOffset.value,q:postQuery.value,category:postCategory.value,sort:postSort.value,isCurrent:()=>generation===postGeneration});if(generation!==postGeneration)return;posts.value=r.items;postTotal.value=r.total;}catch(e){if(generation===postGeneration)error.value=e.message;}finally{if(generation===postGeneration)postsLoading.value=false;}}
async function searchPosts(){postOffset.value=0;await loadPosts();}
async function openPost(id,reply=null){await run(async()=>{replyOffset.value=0;replyParent.value=null;replyBody.value='';detail.value=await api('/api/forum/posts/'+id+'?offset=0'+(reply?'&reply='+encodeURIComponent(reply):''));replyOffset.value=detail.value.offset||0;await nextTick();if(reply)document.querySelector('[data-reply="'+CSS.escape(reply)+'"]')?.scrollIntoView({block:'center'});});}
async function loadReplies(){detail.value=await api('/api/forum/posts/'+detail.value.post.id+'?offset='+replyOffset.value);}
async function publishPost(){await run(async()=>{const r=await api('/api/forum/posts','POST',postForm);sheet.value='';postForm.title='';postForm.body='';postOffset.value=0;await loadPosts();detail.value=await api('/api/forum/posts/'+r.id);notify('帖子已发布');});}
async function favoritePost(){await run(async()=>Object.assign(detail.value.post,await api('/api/forum/posts/'+detail.value.post.id+'/favorite','PUT',{enabled:!detail.value.post.favorited})));}
async function blueprintReaction(kind){await run(async()=>Object.assign(blueprint.value,await api('/api/blueprints/'+blueprint.value.id+'/'+kind,'PUT',{enabled:!blueprint.value[kind==='like'?'liked':'favorited']})));}
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

async function loadNotices(){await updateAction('state');}



function touchFeedback(event){
 if(!settings.animations||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const button=event.target.closest('button');if(!button||button.disabled)return;
 button.querySelector('.tap-feedback')?.remove();const wave=document.createElement('span');wave.className='tap-feedback';wave.setAttribute('aria-hidden','true');button.appendChild(wave);setTimeout(()=>wave.remove(),650);
}
let noticeTimer;
async function initializeSession(){
 sessionError.value='';
 if(!window.HXZNative){sessionReady.value=true;return;}
 try{Object.assign(state,await native('state'));sessionReady.value=true;if(typeof state.systemDark==='boolean')systemDark.value=state.systemDark;await native('appearance',{dark:dark.value});if(state.hasAccount&&state.connected)await loadAccess();}
 catch(e){if(!sessionReady.value)sessionError.value=e.message;else error.value=e.message;}
}
onMounted(async()=>{await initializeSession();if(window.HXZNative){updateAction('state');if(state.hasAccount)try{widgetNavigate((await native('widgetTarget')).target);}catch{}}document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});window.addEventListener('blur',release);noticeTimer=setInterval(()=>{if(state.hasAccount&&tab.value==='notice'&&!document.hidden&&!busy.value)run(loadNotices);},60000);});
onUnmounted(()=>{document.removeEventListener('pointerdown',touchFeedback);pageAnimation?.cancel();unsubs.forEach(f=>f());clearTimeout(toastTimer);clearInterval(noticeTimer);window.removeEventListener('blur',release);});
</script>

<template>
<MobileWelcome v-if="!sessionReady||!state.hasAccount" :initializing="!sessionReady&&!sessionError" :initial-error="sessionError" @retry="initializeSession" @signed-in="signedIn"/>
<div v-else class="app-shell" :aria-hidden="overlayCount>0?true:undefined" :inert="overlayCount>0?true:undefined" @invalid.capture.prevent="invalidField">
  <div class="app-top">
  <header class="app-header community-header081">
    <button class="identity-trigger081" :aria-label="state.hasAccount?'切换角色':'登录社区'" @click="sheet=state.hasAccount?'profiles':'login'"><span class="avatar small"><img v-if="selectedAvatar" :src="selectedAvatar" alt=""><span v-else>{{(state.selectedProfile?.name||state.user.name||'旅').slice(0,1)}}</span></span><span><strong>幻想镇</strong><small>{{state.selectedProfile?.name||state.user.name||'登录，和伙伴见面'}}</small></span><Icon name="chevron"/></button>
    <button v-if="!state.connected&&state.hasAccount" class="icon-button connection-retry081" aria-label="重新连接社区" @click="run(()=>native('reconnect'))"><Icon name="refresh"/></button><span v-else-if="state.connected" class="header-online081" aria-label="社区已连接"><i class="status-dot"/></span>
    <button v-if="appUpdate.phase==='ready'" class="icon-button update-ready" aria-label="安装社区更新" @click="updateAction('install')"><Icon name="download"/></button><button class="icon-button inbox-mobile-indicator" aria-label="收件箱" @click="navigate('inbox')"><Icon name="mail"/><b v-if="unread">{{unread>99?'99+':unread}}</b></button>
  </header>

  </div>
  <div v-if="error" class="error-banner" role="alert"><span>{{error}}</span><button class="icon-button" aria-label="关闭错误" @click="error=''"><Icon name="close"/></button></div>
  <div v-if="busy" class="busy-line" role="status" aria-label="正在处理"/>

  <MediaAppearance :settings="settings" :controls="tab==='settings'"/><main ref="workspace" class="workspace" :class="{'has-inline-sections081':!!sections[mainTab]&&sections[mainTab].includes(tab)}" :aria-hidden="overlayCount>0?true:undefined" :inert="overlayCount>0?true:undefined">
    <nav v-if="sections[mainTab]&&sections[mainTab].includes(tab)" class="account-inline-sections081" :aria-label="mainTab==='play'?'游戏内容':'社区栏目'" role="tablist"><button v-for="section in sections[mainTab]" :key="section" role="tab" :aria-selected="tab===section" @click="navigate(section)"><Icon :name="sectionIcons[section]"/>{{sectionNames[section]}}</button></nav>

    <section v-show="tab==='chat'" class="chat-page">
      <div class="channel-strip"><h1>文字大厅</h1><button class="text-button" @click="sheet='members'">{{onlineUsers.length}} 人在线 <Icon name="chevron"/></button><button class="text-button" @click="sheet='voice'"><Icon name="headphones"/>语音房间</button></div>
      <div v-if="!state.room&&!state.recoveringRoom" class="chat-rooms081" aria-label="点击房间加入收听"><button v-for="room in rooms" :key="room.id" :aria-label="'加入收听：'+room.name" :disabled="!!joiningRoom" @click="join(room.id)"><Icon name="headphones"/><span>{{room.name}}</span><small>{{joiningRoom===room.id?'连接中…':members(room.id).length+' / '+(room.capacity||20)}}</small></button></div>
      <div ref="chatList" class="message-list" @scroll="chatScroll">
        <div class="chat-history-actions"><button v-if="state.connected&&!historyEnd" class="text-button" :disabled="historyLoading" @click="olderMessages">{{historyLoading?'读取中…':'更早的消息'}}</button><button v-if="historyPage" class="text-button" @click="latestMessages">返回最新</button></div><div v-if="!visibleMessages.length" class="empty-state"><Icon name="chat"/><h2>{{state.connected?'在这里相遇':'欢迎来到幻想镇'}}</h2><p>{{state.connected?'向在线的旅人打个招呼吧':'登录皮肤站账号，加入聊天与语音'}}</p><button v-if="!state.hasAccount" class="primary" @click="sheet='login'">登录社区</button><button v-else-if="!state.connected" class="soft-button" @click="run(()=>native('reconnect'))">重新连接</button></div>
        <article v-for="(m,index) in visibleMessages" :key="m.id" :data-message="m.id" class="message" :class="{'chat-arrival':newArrival.has(m.id),own:m.uid===state.user.uid,grouped:index>0&&visibleMessages[index-1].uid===m.uid&&m.created-visibleMessages[index-1].created<120000}">
          <div class="avatar"><img v-if="avatar(m.uid,m.avatarVersion)" :src="avatar(m.uid,m.avatarVersion)" alt=""><span v-else>{{m.name?.slice(0,1)}}</span></div>
          <div class="message-content"><div class="message-meta"><strong>{{m.name}}</strong><time>{{date(m.created)}}</time></div><div v-if="m.body" class="bubble">{{m.body}}</div><ChatImages :items="m.attachments"/></div>
        </article>
      </div>
      <button v-if="newMessages&&!nearBottom" class="new-messages" @click="scrollBottom">{{newMessages}} 条新消息 ↓</button>
      <div v-if="emoji" class="emoji-panel"><div class="chips"><button type="button" :class="{selected:emojiKind==='emoji'}" @click="emojiKind='emoji'">Emoji</button><button type="button" :class="{selected:emojiKind==='kaomoji'}" @click="emojiKind='kaomoji'">颜文字</button><button type="button" :class="{selected:emojiKind==='stickers'}" @click="emojiKind='stickers'">表情包</button><button type="button" class="icon-button" aria-label="收起表情" @click="emoji=false"><Icon name="close"/></button></div><SavedStickers v-if="emojiKind==='stickers'" :disabled="chatMedia.length>=4||mediaUploading" @pick="item=>{addChatMedia([item]);emoji=false;}"/><div v-else class="emoji-tray" :class="emojiKind"><button v-for="e in emojis" :key="e" @click="insertEmoji(e)">{{e}}</button></div></div>
      <div v-if="chatMedia.length" class="mobile-media-draft"><div v-for="(item,index) in chatMedia" :key="item.id"><img :src="item.preview||'/community'+item.url" alt="待发送图片"><button type="button" aria-label="移除待发送图片" @click="removeChatMedia(index)"><Icon name="close"/></button></div></div><form class="composer" @submit.prevent="sendChat"><button type="button" class="icon-button composer-tool" aria-label="表情" :aria-expanded="emoji" :disabled="!state.connected" @click="emoji=!emoji"><Icon name="smile"/></button><ChatMediaPicker :disabled="!state.connected||busy" :count="chatMedia.length" @busy="mediaUploading=$event" @error="error=$event" @pick="addChatMedia"/><MentionInput :admin="access.admin" ref="composer" v-model="chatBody" rows="1" maxlength="1000" :disabled="!state.connected" :placeholder="state.connected?'聊点什么…':'连接社区后发送消息'" @keydown.enter.exact="if(!$event.defaultPrevented&&!$event.isComposing){$event.preventDefault();sendChat()}"/><button class="primary send-button" aria-label="发送消息" :disabled="!state.connected||(!chatBody.trim()&&!chatMedia.length)||busy||mediaUploading"><Icon name="send"/></button></form>
    </section>

    <KeepAlive><InboxPage v-if="tab==='inbox'" :key="state.user.uid" :admin="access.admin" :open-target="openInboxTarget" @back="navigateBack" @changed="loadUnread"/></KeepAlive><VoicePage v-if="tab==='voice'" :state="state" :settings="settings" :rooms="rooms" :members="members" :room-name="roomName" :speaker="speaker" :busy="busy" @join="join" @mode="setVoiceMode" @change="voiceChange" @leave="leaveVoice" @press="press" @speaker="toggleSpeaker" @login="sheet=state.hasAccount?'connection':'login'"/>


    <section v-if="tab==='hub'" class="content-page context-page"><header v-if="hubTarget.area!=='all'" class="hub-context-header"><button class="text-button back" @click="navigate(hubReturn)"><Icon name="back"/>返回</button><h1>{{HUB_AREAS[hubTarget.area]?.title}}</h1></header><HubPage :area="hubTarget.area" :section="hubTarget.section" :item="hubTarget.item" @navigate="openInboxTarget"/></section><InventoryPage v-if="tab==='inventory'"/><MobileMinecraft :playtime-request="playtimeRequest" v-if="tab==='minecraft'" :open-risk-on-entry="minecraftRiskOnEntry" @risk-opened="minecraftRiskOnEntry=false"/><GuildPage v-if="tab==='guild'" :key="guildTask" :task="guildTask"/><LinkingActivity v-if="tab==='linking'" :settings="settings"/><section v-show="tab==='music'" class="content-page context-page"><MusicPage :visible="tab==='music'" :settings="settings" @open="navigate('music')"/></section><LobbyPage v-if="tab==='lobby'" @open-minecraft="openMinecraftRisk"/>
    <section v-if="tab==='shop'" class="content-page"><button class="text-button back" @click="navigateBack"><Icon name="back"/>返回</button><ShopPanel :request="api" :dialog-host="shopDialog"/></section>
    <div v-if="tab==='games'" class="games-scroll"><ArcadeGames  :launch-match="boardTarget" :launch-target="arcadeTarget" :request="api" :transport="{send:input=>native('coopControl',input),subscribe:handler=>on('coop-state',handler)}"/></div>
    <section v-if="tab==='forum'" class="content-page">
      <template v-if="!detail">
        <div class="forum-compose-tools081"><form class="search-bar" @submit.prevent="searchPosts"><Icon name="search"/><input v-model="postQuery" placeholder="搜索帖子" aria-label="搜索帖子" maxlength="100"><button aria-label="搜索"><Icon name="chevron"/></button></form><button class="primary icon-button" aria-label="发布帖子" :disabled="!state.connected" @click="sheet='newPost'"><Icon name="plus"/></button></div>
        <div class="forum-filter-tools081"><div class="chips"><button :class="{selected:!postCategory}" @click="postCategory='';searchPosts()">全部</button><button v-for="category in access.forumCategories" :key="category" :class="{selected:postCategory===category}" @click="postCategory=category;searchPosts()">{{category}}</button></div><AppSelect v-model="postSort" label="帖子排序" :options="[{label:'最新发布',value:'newest'},{label:'最早发布',value:'oldest'},{label:'最多点赞',value:'likes'},{label:'最多回复',value:'replies'},{label:'最近活跃',value:'active'}]" @change="searchPosts"/></div>
        <div v-if="!posts.length" class="empty-state"><Icon name="forum"/><h2>这里还没有帖子</h2><p>可以换个分类，或发布第一条话题</p></div>
        <button v-for="post in posts" :key="post.id" class="post-card" @click="openPost(post.id)"><div class="meta"><span class="tag">{{post.category}}</span><span v-if="post.pinned">置顶</span><span v-if="post.locked">已锁定</span><time>{{date(post.created)}}</time></div><h2>{{post.title}}</h2><p class="preview">{{post.body}}</p><div class="card-footer"><span>{{post.name}}</span><span><Icon name="like"/>{{post.likes}} <Icon name="chat"/>{{post.replies}}</span></div></button>
        <div v-if="postTotal>24" class="pagination"><button :disabled="postOffset===0||busy" @click="postOffset-=24;run(loadPosts)">上一页</button><span>{{Math.floor(postOffset/24)+1}} / {{Math.ceil(postTotal/24)}}</span><button :disabled="postOffset+24>=postTotal||busy" @click="postOffset+=24;run(loadPosts)">下一页</button></div>
      </template>
      <template v-else><button class="text-button back" @click="navigateBack"><Icon name="back"/>{{navigationTrail.at(-1)==='inbox'?'返回收件箱':'论坛'}}</button><article class="detail-card"><span class="tag">{{detail.post.category}}</span><h1>{{detail.post.title}}</h1><p class="meta">{{detail.post.name}} · {{date(detail.post.created)}}</p><p class="prose">{{detail.post.body}}</p><div class="actions"><button :class="['soft-button',{selected:detail.post.liked}]" :disabled="!state.connected||busy" @click="likePost"><Icon name="like"/>{{detail.post.likes}}</button><button class="text-button" :class="{selected:detail.post.favorited}" :disabled="!state.connected" @click="favoritePost"><Icon name="star"/>{{detail.post.favorited?'已收藏':'收藏'}} {{detail.post.favorites||0}}</button><button v-if="access.admin||detail.post.uid===state.user.uid" class="text-button danger-text" @click="deletePost">删除</button><template v-if="access.admin"><button class="text-button" @click="moderate('pinned')">{{detail.post.pinned?'取消置顶':'置顶'}}</button><button class="text-button" @click="moderate('locked')">{{detail.post.locked?'解锁':'锁帖'}}</button><button class="text-button" @click="moderate('hidden')">隐藏</button></template></div></article>
        <h2 class="section-title">回复 <span>{{detail.total}}</span></h2>
        <article v-for="reply in detail.replies" :key="reply.id" :data-reply="reply.id" class="reply-card"><div class="meta"><strong>{{reply.name}}</strong><time>{{date(reply.created)}}</time></div><blockquote v-if="reply.parentId">回复 {{parentOf(reply)?.name||'已删除的评论'}}：{{parentOf(reply)?.body?.slice(0,140)||'原评论已删除'}}</blockquote><p class="prose">{{reply.body}}</p><div class="actions"><button class="text-button" :class="{selected:reply.liked}" :disabled="!state.connected" @click="likeReply(reply)"><Icon name="like"/>{{reply.likes}}</button><button class="text-button" :disabled="detail.post.locked||!state.connected" @click="selectReply(reply)">回复</button><button v-if="access.admin||reply.uid===state.user.uid" class="text-button danger-text" @click="deleteReply(reply)">删除</button></div></article>
        <div v-if="detail.total>24" class="pagination"><button :disabled="replyOffset===0||busy" @click="replyOffset-=24;run(loadReplies)">上一页</button><span>{{Math.floor(replyOffset/24)+1}}</span><button :disabled="replyOffset+24>=detail.total||busy" @click="replyOffset+=24;run(loadReplies)">下一页</button></div>
        <form v-if="state.connected&&!detail.post.locked" class="reply-compose card" @submit.prevent="sendReply"><div v-if="replyParent" class="reply-target"><span>回复 {{replyParent.name}}</span><button type="button" class="icon-button" aria-label="取消指定回复" @click="replyParent=null"><Icon name="close"/></button></div><MentionInput :admin="access.admin" ref="replyComposer" v-model="replyBody" placeholder="写下你的回复…" maxlength="5000" rows="3" required/><div class="emoji-tray inline"><button v-for="e in emojis.slice(0,6)" :key="e" type="button" @click="insertEmoji(e,'reply')">{{e}}</button></div><button class="primary" :disabled="busy||!replyBody.trim()">发布回复</button></form><p v-else class="empty-note">{{detail.post.locked?'该帖子已锁定':'登录后参与讨论'}}</p>
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
      <template v-else><button class="text-button back" @click="navigateBack"><Icon name="back"/>{{navigationTrail.at(-1)==='inbox'?'返回收件箱':'蓝图库'}}</button><article class="detail-card"><img v-if="blueprint.cover" class="detail-cover" :src="blueprint.cover" alt="蓝图封面"><span class="tag">{{blueprint.category}}</span><h1>{{blueprint.title}}</h1><button class="soft-button" :disabled="!state.connected||!blueprint.size" @click="showBlueprintMaterials({request:api,id:blueprint.id,copy:text=>native('copy',{text})})">查看材料参考</button><p class="meta">{{blueprint.name}} · {{statusLabel[blueprint.status]}}</p><div class="spec-grid"><div>游戏版本<strong>{{blueprint.mc}}</strong></div><div>机械动力<strong>{{blueprint.create_version}}</strong></div><div>加载器<strong>{{blueprint.loader}}</strong></div><div>文件大小<strong>{{(blueprint.size/1024).toFixed(1)}} KB</strong></div></div><p class="prose">{{blueprint.description}}</p><h3 v-if="blueprint.dependencies">需要的依赖</h3><p class="prose">{{blueprint.dependencies}}</p><p v-if="blueprint.reason" class="error-note">审核意见：{{blueprint.reason}}</p><div class="actions"><button class="primary" :disabled="busy||!blueprint.size" @click="run(async()=>{await native('download',{id:blueprint.id});notify('蓝图已保存')})"><Icon name="download"/>保存蓝图</button><button v-if="blueprint.status==='approved'" class="text-button" :class="{selected:blueprint.liked}" @click="blueprintReaction('like')"><Icon name="like"/>{{blueprint.likes||0}}</button><button v-if="blueprint.status==='approved'" class="text-button" :class="{selected:blueprint.favorited}" @click="blueprintReaction('favorite')"><Icon name="star"/>{{blueprint.favorited?'已收藏':'收藏'}} {{blueprint.favorites||0}}</button><button v-if="access.admin||blueprint.uid===state.user.uid" class="text-button danger-text" @click="deleteBlueprint">删除</button></div></article>
        <div v-if="access.reviewer&&blueprint.size&&(access.admin||blueprint.uid!==state.user.uid)" class="card form-stack"><h2>审核蓝图</h2><textarea v-model="reviewReason" placeholder="审核意见（驳回时必填）" maxlength="1000" rows="3"/><div class="actions"><button class="primary" :disabled="busy" @click="review('approved')">通过审核</button><button class="danger-button" :disabled="busy||!reviewReason.trim()" @click="review('rejected')">驳回</button></div></div>
      </template>
    </section>

    <section v-if="tab==='notice'" class="content-page launcher-notices"><div class="page-toolbar"><h1>启动器更新</h1><button class="icon-button" aria-label="刷新启动器更新" @click="updateAction('check')"><Icon name="refresh"/></button></div><p class="muted">更新来自启动器发行源，无需连接社区。</p><article v-if="appUpdate.version" class="card"><h2>{{appUpdate.version.versionName}}</h2><p class="prose">{{appUpdate.version.notes||'此版本未提供更新说明。'}}</p></article><p v-else class="card muted">{{appUpdate.message||'点击刷新查看最新发行说明。'}}</p><button class="soft-button" @click="openSettings('updates')">下载与更新设置</button></section>

    <section v-if="tab==='me'" class="content-page account-overview081">
      <div class="card account-summary081"><button class="avatar" :disabled="!state.connected" aria-label="更改头像" @click="setAvatar"><img v-if="selectedAvatar" :src="selectedAvatar" alt="我的头像"><span v-else>{{(state.selectedProfile?.name||state.user.name||'旅').slice(0,1)}}</span></button><div><h1>{{state.selectedProfile?.name||state.user.name||'未登录'}}</h1><p>{{state.connection}}</p></div><button :class="state.hasAccount?'soft-button':'primary'" @click="sheet=state.hasAccount?'profiles':'login'">{{state.hasAccount?'切换角色':'登录皮肤站'}}</button></div>
      <div class="account-menu081"><button class="account-menu-row081" @click="navigate('inventory')"><Icon name="archive"/><span><strong>我的背包</strong><small>物品、凭证与待领取礼物</small></span><Icon name="chevron"/></button><button class="account-menu-row081" @click="navigate('inbox')"><Icon name="chat"/><span><strong>收件箱</strong><small>{{unread?'有 '+unread+' 条未读消息':'社区消息与通知'}}</small></span><Icon name="chevron"/></button></div>
      <button v-if="state.hasAccount" class="account-menu-row081 card" @click="navigate('wallet')"><Icon name="coins"/><span><strong>积分与兑换</strong><small>余额、兑换码和收支记录</small></span><Icon name="chevron"/></button><button class="account-menu-row081 card" @click="navigate('shop')"><Icon name="shop"/><span><strong>积分商城</strong><small>兑换物品与使用凭证</small></span><Icon name="chevron"/></button>

      <div class="account-menu081"><button class="account-menu-row081" @click="guideOpen=true"><Icon name="compass"/><span><strong>功能引导</strong><small>重新认识幻想镇的每个入口</small></span><Icon name="chevron"/></button><button class="account-menu-row081" @click="openSettings()"><Icon name="settings"/><span><strong>设置</strong><small>账号、外观、语音与更新</small></span><Icon name="chevron"/></button><button class="account-menu-row081" @click="navigate('feedback')"><Icon name="feedback"/><span><strong>问题反馈与处理</strong></span><Icon name="chevron"/></button><button class="account-menu-row081" @click="openHub('appeal')"><Icon name="users"/><span><strong>申诉与协商</strong></span><Icon name="chevron"/></button><button v-if="access.admin" class="account-menu-row081" @click="openHub('workbench')"><Icon name="settings"/><span><strong>社区管理</strong></span><Icon name="chevron"/></button></div>
      <details v-if="state.connected" class="account-details081"><summary>游戏记录</summary><div><MobileGameStats/></div></details>
    </section>
    <section v-if="tab==='wallet'" class="content-page account-overview081"><header class="account-section-header"><button class="icon-button" aria-label="返回我的" @click="navigateBack"><Icon name="back"/></button><h1>积分与兑换</h1></header><PointsWallet :key="state.user.uid" :request="api"/></section>
    <MobileSettings v-if="tab==='settings'" v-model:category="settingsArea" :settings="settings" :app-update="appUpdate" :state="state" @open="settingsArea=$event" @back="backSettings" @connection="sheet='connection'" @skin="run(()=>native('openSkin'))" @avatar="setAvatar" @logout="confirm('退出登录并离开语音？',logout)" @voice-overlay="changeVoiceOverlay" @voice-change="voiceChange" @update="updateAction"/>
    <section v-if="tab==='feedback'" class="content-page account-feedback081"><header class="account-section-header"><button class="icon-button" aria-label="返回我的" @click="navigate('me')"><Icon name="back"/></button><h1>问题反馈与处理</h1></header><FeedbackPanel :request="api" :initial-id="feedbackTarget"/></section>

  </main><div class="bottom-sessions081">
    <section v-if="state.room||state.recoveringRoom" class="voice-dock081" aria-label="当前语音通话"><button class="voice-dock-room081" @click="sheet='voice'"><Icon name="headphones"/><span><strong>{{roomName||'语音连接中'}}</strong><small>{{state.recoveringRoom?'正在重连':state.deafened?'已关闭收听':settings.ptt?'按住说话':state.muted?'正在收听 · 麦克风关闭':'麦克风已开启'}}</small></span></button><button v-if="settings.ptt" class="voice-dock-ptt081" :disabled="!state.room" @pointerdown.prevent="beginTalk" @pointerup="release" @pointercancel="release" @lostpointercapture="release" @keydown.space.prevent="!$event.repeat&&press(true)" @keyup.space.prevent="release" @blur="release"><Icon name="mic"/>按住说话</button><button v-else class="icon-button" :aria-label="state.muted?'开启麦克风':'关闭麦克风'" :aria-pressed="!state.muted" @click="voiceChange({muted:!state.muted})"><Icon :name="state.muted?'mute':'mic'"/></button><button class="icon-button" aria-label="离开语音" @click="leaveVoice"><Icon name="logout"/></button></section>
    <div id="mobile-music-dock"/>
  </div>


  <nav class="bottom-nav" aria-label="主导航"><button v-for="item in mainTabs" :key="item.id" :class="{active:mainTab===item.id}" :aria-current="mainTab===item.id?'page':undefined" @click="navigateMain(item.id)"><span><Icon :name="item.icon"/><i v-if="item.id==='chat'&&newMessages&&tab!=='chat'" class="badge"/><i v-else-if="item.id==='chat'&&(state.room||state.recoveringRoom)" class="badge voice-badge"/></span>{{item.name}}</button></nav>

  <AppOverlay :open="!!sheet" label="社区面板" @close="sheet=''"><section class="sheet" @invalid.capture.prevent="invalidField" :class="{'full-sheet':['newPost','newBlueprint'].includes(sheet)}"><div class="sheet-handle"/><header class="sheet-header"><h2>{{({login:'登录社区',profiles:'选择角色',connection:'社区连接',members:'在线成员',newPost:'发布帖子',newBlueprint:'上传蓝图',filters:'筛选蓝图',voice:'语音房间',})[sheet]}}</h2><button class="icon-button" aria-label="关闭面板" @click="sheet=''"><Icon name="close"/></button></header><div class="sheet-body">
    <p v-if="error" class="error-note sheet-error" role="alert">{{error}}</p>
    <VoicePage v-if="sheet==='voice'" :state="state" :settings="settings" :rooms="rooms" :members="members" :room-name="roomName" :speaker="speaker" :busy="!!joiningRoom" @join="join" @mode="setVoiceMode" @change="voiceChange" @leave="leaveVoice" @press="press" @speaker="toggleSpeaker" @login="sheet=state.hasAccount?'connection':'login'"/>
    <form v-if="sheet==='login'&&state.hasAccount" class="form-stack" @submit.prevent="login"><p class="muted">使用另一个幻想镇皮肤站账号登录</p><label>邮箱或用户名<input v-model="username" autocomplete="username" autocapitalize="off" required></label><label>密码<input v-model="password" type="password" autocomplete="current-password" required></label><button class="primary full-width" :disabled="busy">{{busy?'正在登录…':'登录'}}</button><button class="text-button" type="button" @click="run(()=>native('open',{url:'https://skin.hxzmc.top/auth/register'}))">注册皮肤站账号</button></form>
    <div v-if="sheet==='profiles'" class="form-stack"><p v-if="!state.profiles.length" class="muted">账号还没有角色，请先在皮肤站创建。</p><ChoiceRows :items="state.profiles.map(p=>({value:p.id,label:p.name}))" :value="state.selectedProfile?.id" label="选择角色" @choose="profile"/><button class="soft-button" @click="run(()=>native('openSkin'))">创建或管理角色</button><button class="soft-button" @click="sheet='login'">登录其他账号</button></div>
    <form v-if="sheet==='connection'" class="form-stack" @submit.prevent="run(async()=>{Object.assign(state,await native('server',{url:server}));sheet='';notify('社区地址已保存')})"><div class="connection-summary"><i class="status-dot" :class="{offline:!state.connected}"/>{{state.connection}}</div><label>社区服务地址<input v-model="server" type="url" placeholder="https://qqbot.hxzmc.top" autocapitalize="off" required></label><button class="primary" :disabled="busy">保存并连接</button><button type="button" class="soft-button" @click="run(()=>native('reconnect'))">重新连接</button><p class="muted">连接地址同时用于聊天和语音，无需额外端口。</p></form>
    <div v-if="sheet==='members'" class="member-list"><p v-if="!onlineUsers.length" class="empty-note">暂时没有在线成员</p><div v-for="u in onlineUsers" :key="u.id" class="member"><span class="avatar"><img v-if="avatar(u.uid,u.avatarVersion)" :src="avatar(u.uid,u.avatarVersion)" alt=""><span v-else>{{u.name.slice(0,1)}}</span></span><strong>{{u.name}}<small class="device-label">{{u.devices?.includes('android')&&u.devices?.includes('desktop')?'手机 · 电脑':u.devices?.includes('android')?'手机在线':u.devices?.includes('desktop')?'电脑在线':'在线'}}</small></strong><small>{{rooms.find(r=>r.id===u.room)?.name||'在线'}}</small></div></div>
    <form v-if="sheet==='newPost'" class="form-stack" @submit.prevent="publishPost"><label>分类<AppSelect v-model="postForm.category" label="帖子分类" :options="access.forumCategories"/></label><label>标题<input v-model="postForm.title" maxlength="100" placeholder="给话题起个名字" required></label><label>正文<MentionInput :admin="access.admin" v-model="postForm.body" maxlength="12000" rows="10" placeholder="分享你的想法…" required/></label><div class="emoji-tray inline"><button v-for="e in emojis" :key="e" type="button" @click="postForm.body+=e">{{e}}</button></div><button class="primary" :disabled="busy">发布帖子</button></form>
    <form v-if="sheet==='newBlueprint'" class="form-stack" @submit.prevent="publishBlueprint"><button type="button" class="file-picker" @click="run(async()=>selectedFile=await native('pick',{kind:'blueprint'}))"><Icon name="upload"/><strong>{{selectedFile?.name||'选择 .nbt 蓝图文件'}}</strong><small>{{selectedFile?(selectedFile.size/1024).toFixed(1)+' KB':'最大 8 MB · 审核后公开'}}</small></button><button type="button" class="soft-button" @click="run(async()=>blueprintForm.cover=(await native('pick',{kind:'cover'})).avatar)"><Icon name="image"/>{{blueprintForm.cover?'重新选择封面':'添加封面（可选）'}}</button><img v-if="blueprintForm.cover" class="upload-cover" :src="blueprintForm.cover" alt="封面预览"><label>作品名称<input v-model="blueprintForm.title" maxlength="100" required></label><label>说明<textarea v-model="blueprintForm.description" maxlength="12000" rows="4" required/></label><label>分类<AppSelect v-model="blueprintForm.category" label="蓝图分类" :options="access.blueprintCategories"/></label><div class="form-grid"><label>Minecraft 版本<input v-model="blueprintForm.mc" maxlength="40" placeholder="1.21.1" required></label><label>机械动力版本<input v-model="blueprintForm.create_version" maxlength="40" placeholder="6.0" required></label></div><label>加载器<AppSelect v-model="blueprintForm.loader" label="加载器" :options="['通用','neoforge','forge','fabric','quilt']"/></label><label>其他依赖<textarea v-model="blueprintForm.dependencies" maxlength="2000" rows="2"/></label><button class="primary" :disabled="busy||!selectedFile">提交审核</button></form>
    <form v-if="sheet==='filters'" class="form-stack" @submit.prevent="sheet='';searchBlueprints()"><label>Minecraft 版本<AppSelect v-model="blueprintMc" label="Minecraft 版本" :options="[{value:'',label:'全部版本'},...versions.minecraft]"/></label><label>机械动力版本<AppSelect v-model="blueprintCreate" label="机械动力版本" :options="[{value:'',label:'全部版本'},...versions.create]"/></label><label>分类<AppSelect v-model="blueprintCategory" label="筛选分类" :options="[{value:'',label:'全部分类'},...access.blueprintCategories]"/></label><button class="primary">应用筛选</button><button type="button" class="soft-button" @click="blueprintMc='';blueprintCreate='';blueprintCategory=''">重置</button></form>

  </div></section></AppOverlay>
  <AppOverlay :open="!!confirmAction" :label="confirmAction?.title||'确认操作'" kind="confirm" @close="confirmAction=null"><section class="confirm-dialog"><h2>{{confirmAction?.title}}</h2><div class="actions"><button class="soft-button" @click="confirmAction=null">取消</button><button class="danger-button" @click="confirmed">确认</button></div></section></AppOverlay>
  <Transition name="toast-motion"><div v-if="toast" class="toast" role="status"><Icon name="check"/>{{toast}}</div></Transition>
</div>
<MobileGuide v-if="sessionReady&&state.hasAccount&&guideOpen" :admin="access.admin" @finish="finishGuide" @open="guideDestination"/>
</template>
