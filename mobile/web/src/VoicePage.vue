<script setup>
import Icon from './Icon.vue';
import {avatar} from './native.js';
defineProps({state:Object,settings:Object,rooms:Array,members:Function,roomName:String,speaker:Boolean,busy:Boolean});
defineEmits(['join','change','leave','press','speaker','login']);
</script>

<template>
  <section class="content-page voice-page">
    <div class="page-toolbar"><h1>语音大厅</h1><span class="muted">每房最多 20 人</span></div>
    <div class="voice-room-grid" aria-label="语音房间">
      <button v-for="r in rooms" :key="r.id" class="voice-room" :class="{selected:(state.room||state.recoveringRoom)===r.id}" :aria-pressed="(state.room||state.recoveringRoom)===r.id" :disabled="!state.connected||busy" @click="state.room!==r.id&&$emit('join',r.id)">
        <Icon name="headphones"/><strong>{{r.name}}</strong>
        <div class="voice-room-caption"><small>{{state.room===r.id?'已加入':state.recoveringRoom===r.id?'重连中':'点击加入'}}</small><span>{{members(r.id).length}} <small>/ 20</small></span></div>
      </button>
    </div>

    <div v-if="state.room||state.recoveringRoom" class="voice-session card">
      <div class="voice-session-heading"><div><h2>{{roomName}}</h2><p>{{state.recoveringRoom?'连接恢复中…':settings.ptt?'按住说话模式':'自由说话模式'}}</p></div><button class="danger-button" @click="$emit('leave')"><Icon name="logout"/>离开</button></div>
      <div class="call-actions">
        <button :class="{selected:state.muted}" :aria-pressed="state.muted" @click="$emit('change',{muted:!state.muted})"><Icon :name="state.muted?'mute':'mic'"/><span>{{state.muted?'取消静音':'麦克风'}}</span></button>
        <button :class="{selected:state.deafened}" :aria-pressed="state.deafened" @click="$emit('change',{deafened:!state.deafened})"><Icon name="headphones"/><span>{{state.deafened?'恢复收听':'收听中'}}</span></button>
        <button :class="{selected:speaker}" :aria-pressed="speaker" @click="$emit('speaker')"><Icon name="speaker"/><span>{{speaker?'扬声器':'听筒 / 耳机'}}</span></button>
      </div>
      <button v-if="settings.ptt" class="ptt-button" :disabled="!state.room||state.muted" @pointerdown.prevent="$emit('press',true)" @pointerup="$emit('press',false)" @pointercancel="$emit('press',false)" @pointerleave="$emit('press',false)" @contextmenu.prevent><Icon name="mic"/>按住说话</button>
      <div class="voice-members-heading">频道成员 <span>{{members(state.room).length}} / 20</span></div>
      <div class="voice-members">
        <div v-for="u in members(state.room)" :key="u.id"><span class="avatar"><img v-if="avatar(u.uid,u.avatarVersion)" :src="avatar(u.uid,u.avatarVersion)" alt=""><span v-else>{{u.name.slice(0,1)}}</span></span><span>{{u.name}}</span><Icon v-if="u.muted" name="mute"/></div>
      </div>
    </div>
    <div v-else class="voice-idle"><Icon name="headphones"/><p>{{busy?'正在加入房间…':state.connected?'选择房间，开始语音聊天':'登录社区后加入语音'}}</p><button v-if="!state.connected" class="primary" @click="$emit('login')">{{state.hasAccount?'连接社区':'登录社区'}}</button></div>
  </section>
</template>
