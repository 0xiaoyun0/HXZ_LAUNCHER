<script setup lang="ts">
import PlayerAvatar from "../components/PlayerAvatar.vue";
import EmojiPicker from "../components/EmojiPicker.vue";
import { computed, ref, toRef, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import type { QInput } from "quasar";
import {
  groups,
  perform,
  selectedAccount,
  errorMessage,
  state
} from "../lib/launcher";
import {
  community,
  chatView,
  communityRequest,
  type ChatMessage,
  connect,
  disconnect,
  sendChat,
  joinVoice,
  leaveVoice,
  toggleMute,
  toggleDeafen
} from "../lib/community";
const composer = ref<QInput>(),
  history = ref<HTMLElement>(),
  device = toRef(chatView, "device"),
  devices = toRef(chatView, "devices"),
  joining = ref(false);
const onlineUsers = computed(()=>[...new Map(community.users.map(u=>[u.uid,u])).values()]);
const older=ref<ChatMessage[]|null>(null), loadingOlder=ref(false), historyEnd=ref(false);
const visibleMessages=computed(()=>{
 const cutoff=state.settings.chatHistoryDays?Date.now()-state.settings.chatHistoryDays*86400000:0;
 return (older.value||community.messages).filter(m=>m.created>=cutoff).sort((a,b)=>a.id-b.id);
});
function grouped(index:number){const m=visibleMessages.value[index],p=visibleMessages.value[index-1];return !!m&&!!p&&m.uid===p.uid&&m.created-p.created<120000&&new Date(m.created).toDateString()===new Date(p.created).toDateString();}
async function loadOlder(){
 if(loadingOlder.value||historyEnd.value)return;loadingOlder.value=true;
 const height=history.value?.scrollHeight||0,top=history.value?.scrollTop||0;
 try{const before=visibleMessages.value[0]?.id||Number.MAX_SAFE_INTEGER;
 const result=await communityRequest<{items:ChatMessage[];more:boolean}>('/api/chat/history?before='+before+'&days='+(state.settings.chatHistoryDays||0),{},true);
 older.value=result.items;historyEnd.value=!result.more;chatView.atBottom=false;
 await nextTick();if(history.value)history.value.scrollTop=top+history.value.scrollHeight-height;
 }finally{loadingOlder.value=false;}
}
watch(()=>[state.settings.chatHistoryDays,community.user?.uid],()=>{older.value=null;historyEnd.value=false;});
const rooms = [{ id: "lobby", name: "旅人休息室" }, ...groups];
function voiceKeyLabel() {
  const code = state.settings.voiceKey || "KeyT";
  if (code === "Space") return "空格键";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F\d+$/.test(code)) return code;
  return code;
}
function submit() {
  sendChat(chatView.draft);
  chatView.draft = "";
  chatView.atBottom = true;
  void nextTick(() => {
    scrollLatest();
    composer.value?.focus();
  });
}
function pick(value: string) {
  chatView.draft += value;
  composer.value?.focus();
}
function rememberScroll() {
  const el = history.value;
  if (!el) return;
  chatView.scrollTop = el.scrollTop;
  chatView.atBottom = el.scrollHeight - el.clientHeight - el.scrollTop < 40;
}
function scrollLatest() {
  const el = history.value;
  if (el) el.scrollTop = el.scrollHeight;
}
onMounted(() => {
  if (chatView.atBottom) scrollLatest();
  else if (history.value) history.value.scrollTop = chatView.scrollTop;
});
onBeforeUnmount(()=>{if(older.value){chatView.atBottom=true;chatView.scrollTop=0;}else rememberScroll();});
async function join(id: string) {
  joining.value = true;
  try {
    await joinVoice(id, device.value);
    devices.value = (await navigator.mediaDevices.enumerateDevices()).filter(
      d => d.kind === "audioinput"
    );
  } catch (error) {
    community.voiceError = errorMessage(error);
    throw error;
  } finally {
    joining.value = false;
  }
}
watch(
  () => community.messages.at(-1)?.id,
  () =>
    void nextTick(() => {
      if (chatView.atBottom) scrollLatest();
    })
);
</script>
<template>
  <div class="page-heading"
    ><div><h1>聊天大厅</h1></div
    ><q-btn
      v-if="!community.connected"
      unelevated
      class="primary-button"
      icon="link"
      label="连接社区"
      :loading="community.connecting"
      :disable="!selectedAccount"
      @click="perform(connect)" /><q-btn
      v-else
      outline
      label="断开连接"
      @click="disconnect"
  /></div>
  <div v-if="community.error" class="info-note error-note q-mb-md">{{
    community.error
  }}</div>
  <div class="chat-layout"
    ><section class="panel chat-panel"
      ><header class="chat-header"
        ><h2><span class="hash">#</span> 公共大厅</h2
        ><span class="subtle">{{ onlineUsers.length }} 人在线</span></header
      ><div ref="history" class="chat-history" @scroll.passive="rememberScroll"
        ><q-btn v-if="community.connected&&!historyEnd" flat dense class="full-width q-mb-sm" :loading="loadingOlder" label="加载更早消息" @click="perform(loadOlder)"/><q-btn v-if="older" flat dense label="返回最新消息" class="full-width" @click="older=null;historyEnd=false;chatView.atBottom=true;nextTick(scrollLatest)"/><div v-if="!visibleMessages.length" class="chat-welcome"
          ><q-icon name="waving_hand" size="42px" /><h2>公共聊天</h2
          ><p>{{
            community.connected
              ? "暂无消息"
              : "登录皮肤站并连接社区，开始聊天。"
          }}</p
          ><router-link v-if="!selectedAccount" to="/accounts" class="text-link"
            >前往登录 <q-icon name="arrow_forward" /></router-link></div
        ><article
          v-for="(item,index) in visibleMessages"
          :key="item.id"
          :class="['chat-message', { own: item.uid === community.user?.uid, grouped:grouped(index) }]"
          ><PlayerAvatar
            :name="item.name"
            :uid="item.uid"
            :version="item.avatarVersion"
          /><div
            ><header
              ><strong>{{ item.name }}</strong
              ><time>{{
                new Date(item.created).toLocaleString("zh-CN", {
                  year:"numeric",month:"2-digit",day:"2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })
              }}</time></header
            ><p>{{ item.body }}</p></div
          ></article
        ></div
      ><form
        class="chat-composer"
        @submit.prevent="perform(async () => submit())"
        ><q-input
          ref="composer"
          v-model="chatView.draft"
          outlined
          dense
          placeholder="和大家聊聊…"
          :disable="!community.connected"
          maxlength="1000"
          class="col" /><EmojiPicker @pick="pick" /><q-btn
          unelevated
          class="primary-button"
          type="submit"
          icon="send"
          title="发送消息"
          @mousedown.prevent
          :disable="!community.connected || !chatView.draft.trim()" /></form
    ></section>
    <aside class="voice-column"
      ><section class="panel voice-panel"
        ><div class="section-title"
          ><h2>语音房间</h2><q-icon name="headset_mic" size="24px" /></div
        ><div class="voice-room-list"
          ><button
            v-for="room in rooms"
            :key="room.id"
            :class="['voice-room', { selected: community.room === room.id }]"
            :disabled="!community.connected || joining"
            :aria-pressed="community.room === room.id"
            @click="perform(() => join(room.id))"
          >
            <i class="voice-room-icon"
              ><q-icon
                :name="community.room === room.id ? 'graphic_eq' : 'volume_up'"
                size="21px"
            /></i>
            <span class="voice-room-label"
              >{{ room.name
              }}<small>{{
                community.room === room.id ? "当前房间" : "点击加入"
              }}</small></span
            >
            <span class="voice-capacity"
              >{{ community.users.filter(u => u.room === room.id).length
              }}<small>/ {{ community.roomLimit }}</small></span
            >
            <q-tooltip
              class="voice-members-tooltip"
              :delay="250"
              anchor="center left"
              self="center right"
            >
              <strong
                >{{ room.name }} ·
                {{ community.users.filter(u => u.room === room.id).length }} /
                {{ community.roomLimit }}</strong
              >
              <div
                v-for="member in community.users.filter(
                  u => u.room === room.id
                )"
                :key="member.id"
                class="voice-tooltip-member"
              >
                <q-icon :name="member.muted ? 'mic_off' : 'mic'" />
                {{ member.name }}
              </div>
              <div
                v-if="!community.users.some(u => u.room === room.id)"
                class="q-mt-sm"
                >暂无成员</div
              >
            </q-tooltip>
          </button></div
        >
        <div v-if="community.room" class="voice-session">
          <div class="voice-session-status"
            ><i class="online-dot" /><strong>{{
              joining ? "正在连接" : "已加入语音"
            }}</strong
            ><span>{{ community.peers }} 位同伴</span></div
          >
          <div
            v-if="state.settings.voiceMode === 'push-to-talk'"
            :class="['voice-ptt-status', { active: community.voiceTalking }]"
            role="status"
            aria-live="polite"
            ><q-icon
              :name="community.voiceTalking ? 'mic' : 'keyboard'"
              size="17px"
            /><span>{{
              community.voiceTalking
                ? "正在说话 · 松开 " + voiceKeyLabel() + " 停止"
                : "按住 " + voiceKeyLabel() + " 说话"
            }}</span></div
          >
          <div class="voice-actions">
            <button
              :class="{ active: community.muted }"
              :aria-pressed="community.muted"
              title="切换麦克风静音"
              @click="toggleMute"
              ><q-icon :name="community.muted ? 'mic_off' : 'mic'" /><span>{{
                community.muted ? "已静音" : "麦克风"
              }}</span></button
            >
            <button
              :class="{ active: community.deafened }"
              :aria-pressed="community.deafened"
              title="切换接收声音"
              @click="toggleDeafen"
              ><q-icon
                :name="community.deafened ? 'volume_off' : 'headphones'"
              /><span>{{
                community.deafened ? "已关闭" : "收听中"
              }}</span></button
            >
            <button class="voice-leave" title="离开语音" @click="leaveVoice"
              ><q-icon name="call_end" /><span>离开</span></button
            >
          </div> </div
        ><div v-if="devices.length" class="voice-device"
          ><label>麦克风</label
          ><q-select
            v-if="devices.length"
            v-model="device"
            outlined
            emit-value
            map-options
            :options="[
              { label: '系统默认麦克风', value: '' },
              ...devices.map(d => ({
                label: d.label || '麦克风',
                value: d.deviceId
              }))
            ]"
            aria-label="麦克风"
          /><p class="subtle">更改后，下次加入生效</p></div
        ><p v-if="community.voiceError" class="error-note">{{
          community.voiceError
        }}</p></section
      ><section class="panel online-panel"
        ><h2
          >在线用户
          <span class="count-badge">{{ onlineUsers.length }}</span></h2
        ><div v-if="!onlineUsers.length" class="subtle q-mt-md"
          >暂无在线用户</div
        ><div
          v-for="member in onlineUsers.slice(0, 40)"
          :key="member.id"
          class="online-member"
          ><PlayerAvatar
            class="small"
            :name="member.name"
            :uid="member.uid"
            :version="member.avatarVersion" /><span>{{ member.name }}<small class="device-label">{{ member.devices?.includes("android") && member.devices?.includes("desktop") ? "手机 · 电脑" : member.devices?.includes("android") ? "手机在线" : member.devices?.includes("desktop") ? "电脑在线" : "设备未知" }}</small></span
          ><q-icon
            v-if="member.room"
            :name="member.muted ? 'mic_off' : 'headset_mic'" /><i
            v-else
            class="online-dot" /></div></section></aside
  ></div>
</template>
