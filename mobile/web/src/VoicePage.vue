<script setup>
import {computed,ref,onBeforeUnmount} from 'vue';
import Icon from './Icon.vue';
import VoiceTools from './VoiceTools.vue';
import {avatar} from './native.js';
const props=defineProps({state:Object,settings:Object,rooms:Array,members:Function,roomName:String,speaker:Boolean,busy:Boolean});
const emit=defineEmits(['join','change','mode','leave','press','speaker','login']);
const activeRoom=computed(()=>props.state.room||props.state.recoveringRoom),toolsOpen=ref(false);
const currentMembers=computed(()=>props.members(activeRoom.value));
const microphoneStatus=computed(()=>props.state.recoveringRoom?'正在恢复连接':props.state.muted?'麦克风已静音':props.settings.ptt?'按住按钮时发送声音':'麦克风已开启');
function setMode(ptt){
 if(ptt===props.settings.ptt)return;
 emit('press',false);
 // Apply mode and mute state together so leaving PTT cannot open the microphone.
 emit('mode',{ptt,muted:ptt?props.state.muted:true,pressing:false});
}
function release(){emit('press',false);}
function press(event){if(!props.state.room||props.state.muted||props.busy)return;event.currentTarget.setPointerCapture?.(event.pointerId);emit('press',true);}
function keyPress(event){if(event.repeat||!props.state.room||props.state.muted||props.busy)return;emit('press',true);}
onBeforeUnmount(release);
</script>
<template>
 <section class="content-page voice-page">
  <header class="page-toolbar"><h1>语音</h1><span class="muted">{{rooms.length}} 个房间</span></header>
  <section v-if="activeRoom" class="voice-session card" aria-label="当前语音通话">
   <header class="voice-session-heading"><div><small>正在通话</small><h2>{{roomName||activeRoom}}</h2><p role="status">{{microphoneStatus}}</p></div><button class="danger-button" :disabled="busy" @click="release();$emit('leave')"><Icon name="logout"/>离开语音</button></header>
   <div class="call-actions">
    <button :class="{selected:state.muted}" :aria-pressed="state.muted" :disabled="busy||!state.room" @click="release();$emit('change',{muted:!state.muted,pressing:false})"><Icon :name="state.muted?'mute':'mic'"/><span>{{state.muted?'开启麦克风':'静音麦克风'}}</span></button>
    <button :class="{selected:state.deafened}" :aria-pressed="state.deafened" :disabled="busy||!state.room" @click="$emit('change',{deafened:!state.deafened})"><Icon name="headphones"/><span>{{state.deafened?'恢复收听':'暂停收听'}}</span></button>
   </div>
   <div class="voice-speaking-mode"><span>说话方式</span><div role="group" aria-label="说话方式"><button :class="{selected:settings.ptt}" :aria-pressed="settings.ptt" :disabled="busy||!state.room" @click="setMode(true)">按住说话</button><button :class="{selected:!settings.ptt}" :aria-pressed="!settings.ptt" :disabled="busy||!state.room" @click="setMode(false)">自由说话</button></div></div>
   <button v-if="settings.ptt" class="ptt-button" :disabled="!state.room||state.muted||busy" @pointerdown.prevent="press" @pointerup="release" @pointerleave="release" @pointercancel="release" @lostpointercapture="release" @keydown.space.prevent="keyPress" @keyup.space.prevent="release" @keydown.enter.prevent="keyPress" @keyup.enter.prevent="release" @blur="release" @contextmenu.prevent><Icon name="mic"/>{{state.muted?'开启麦克风后按住说话':'按住说话'}}</button>
   <button class="voice-output soft-button" :disabled="busy||!state.room" :aria-pressed="speaker" @click="$emit('speaker')"><Icon name="speaker"/><span><small>音频输出 · {{speaker?'扬声器':'系统默认'}}</small><strong>{{speaker?'切回默认输出':'切换到扬声器'}}</strong></span></button>
   <details class="voice-members-details"><summary>房间成员 <span>{{currentMembers.length}} / {{rooms.find(r=>r.id===activeRoom)?.capacity||20}}</span></summary><div class="voice-members"><div v-for="u in currentMembers" :key="u.id"><span class="avatar"><img v-if="avatar(u.uid,u.avatarVersion)" :src="avatar(u.uid,u.avatarVersion)" alt=""><span v-else>{{u.name.slice(0,1)}}</span></span><span>{{u.name}}</span><Icon v-if="u.muted" name="mute"/></div></div></details>
  </section>
  <div v-else-if="!state.connected" class="voice-idle card"><Icon name="headphones"/><p>连接社区后加入语音</p><button class="primary" :disabled="busy" @click="$emit('login')">{{state.hasAccount?'连接社区':'登录社区'}}</button></div>
  <details class="voice-room-picker" :open="!activeRoom"><summary>{{activeRoom?'切换房间':'选择房间'}}</summary><div class="voice-room-grid" aria-label="语音房间"><article v-for="r in rooms" :key="r.id" class="voice-room-option card" :class="{selected:activeRoom===r.id}"><div class="voice-room-name"><Icon name="headphones"/><h2>{{r.name}}</h2><span>{{members(r.id).length}} / {{r.capacity||20}}</span></div><p v-if="activeRoom===r.id" class="voice-room-current" role="status">{{state.recoveringRoom===r.id?'正在恢复连接':'正在此房间'}}</p><div v-else class="voice-join-actions"><button class="primary" :disabled="!state.connected||busy" @click="$emit('join',r.id,{muted:true})">{{activeRoom?'切换并收听':'加入收听'}}</button><button class="soft-button" :disabled="!state.connected||busy" @click="$emit('join',r.id,{muted:false})">{{settings.ptt?(activeRoom?'切换并按住说话':'加入并按住说话'):(activeRoom?'切换并开麦':'加入并开麦')}}</button></div></article></div></details>
  <details v-if="activeRoom" class="voice-collaboration" @toggle="toolsOpen=$event.currentTarget.open"><summary>房间协作</summary><VoiceTools v-if="toolsOpen"/></details>
 </section>
</template>
<style scoped>
.voice-page{display:flex;flex-direction:column;gap:16px}.voice-page>*{flex:none;min-width:0}.voice-page>.card,.voice-room-option.card{margin:0}.voice-page>.page-toolbar{padding:0;flex-wrap:wrap}.voice-page h2,.voice-page p{margin:0}.voice-page button{min-height:44px;min-width:0;white-space:normal;line-height:1.6;overflow-wrap:anywhere}
.voice-session{display:grid;gap:16px;padding:16px}.voice-session-heading{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}.voice-session-heading>div{flex:1 1 160px;min-width:0}.voice-session-heading small{color:var(--muted);font-size:.8rem}.voice-session-heading h2{font-size:1.1rem;line-height:1.5;overflow-wrap:anywhere;margin:4px 0}.voice-session-heading p{font-size:.85rem;line-height:1.6;color:var(--muted)}.voice-session-heading>.danger-button{align-self:flex-start}
.voice-session .call-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0}.voice-session .call-actions button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:76px;padding:12px 8px;border:1px solid var(--line);border-radius:12px;background:var(--soft);color:var(--text);font-size:.88rem}.voice-session .call-actions button.selected{border-color:var(--accent-border);color:var(--accent-text);background:var(--accent-soft)}.voice-session .call-actions .icon{flex:none}
.voice-speaking-mode{display:grid;gap:8px;font-size:.85rem}.voice-speaking-mode>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.voice-speaking-mode button{border:1px solid var(--line);border-radius:10px;padding:10px 8px;background:var(--soft);color:var(--text);font-size:.9rem}.voice-speaking-mode button.selected{color:var(--accent-text);border-color:var(--accent-border);background:var(--accent-soft)}
.voice-page .ptt-button{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:58px;padding:12px;border:1px solid var(--accent-border);border-radius:12px;background:var(--accent-soft);color:var(--accent-text);font-size:1rem;touch-action:none;user-select:none}.voice-page .ptt-button:active:not(:disabled){background:var(--accent);color:#fff}.voice-output{display:flex;align-items:center;justify-content:flex-start;gap:12px;padding:12px;text-align:left}.voice-output>.icon{flex:none}.voice-output>span{display:grid;gap:2px;min-width:0;flex:1;font-size:.8rem}.voice-output strong{font-size:.9rem;font-weight:500;overflow-wrap:anywhere}.voice-output>small{font-size:.8rem;flex:0 1 auto;min-width:0;overflow-wrap:anywhere}
.voice-page details>summary{cursor:pointer;min-height:44px;padding:10px 0;font-size:.95rem;font-weight:600;line-height:1.6}.voice-members-details{border-top:1px solid var(--line)}.voice-members-details>summary>span{color:var(--muted);font-weight:400;white-space:nowrap}.voice-session .voice-members{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:12px;margin:8px 0 0}.voice-members>div{display:flex;flex-direction:column;align-items:center;gap:7px;font-size:.85rem;min-width:0;overflow-wrap:anywhere}
.voice-room-picker>.voice-room-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px;padding-top:8px}.voice-room-option{display:grid;gap:14px;padding:16px}.voice-room-option.selected{border-color:var(--accent-border)}.voice-room-name{display:flex;align-items:flex-start;gap:10px;min-width:0}.voice-room-name>.icon{flex:none;margin-top:2px}.voice-room-name h2{flex:1;min-width:0;font-size:1rem;line-height:1.6;overflow-wrap:anywhere}.voice-room-name>span{flex:none;font-size:.8rem;line-height:1.8;color:var(--muted);font-variant-numeric:tabular-nums}.voice-join-actions{display:flex;flex-wrap:wrap;gap:8px}.voice-join-actions>button{flex:1 1 130px}.voice-room-current{font-size:.85rem;line-height:1.6;color:var(--accent-text)}.voice-page .voice-idle{display:grid;justify-items:start;gap:12px;padding:16px;text-align:left}.voice-idle p{line-height:1.6}.voice-collaboration{border-top:1px solid var(--line)}.voice-collaboration :deep(>.card){margin:8px 0 0}.voice-page button:disabled{cursor:default}
</style>
