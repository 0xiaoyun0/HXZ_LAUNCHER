<script setup lang="ts">
import PlayerAvatar from "../components/PlayerAvatar.vue";
import { ref, watch, nextTick } from "vue";
import { groups, perform, selectedAccount } from "../lib/launcher";
import {
  community,
  connect,
  disconnect,
  sendChat,
  joinVoice,
  leaveVoice,
  toggleMute,
  toggleDeafen
} from "../lib/community";
const message = ref(""),
  history = ref<HTMLElement>(),
  device = ref(""),
  devices = ref<MediaDeviceInfo[]>([]),
  joining = ref(false);
const rooms = [{ id: "lobby", name: "旅人休息室" }, ...groups];
function submit() {
  sendChat(message.value);
  message.value = "";
}
async function join(id: string) {
  joining.value = true;
  try {
    await joinVoice(id, device.value);
    devices.value = (await navigator.mediaDevices.enumerateDevices()).filter(
      d => d.kind === "audioinput"
    );
  } finally {
    joining.value = false;
  }
}
watch(
  () => community.messages.length,
  () =>
    void nextTick(() =>
      history.value?.scrollTo({
        top: history.value.scrollHeight,
        behavior: "smooth"
      })
    )
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
        ><span class="subtle">{{ community.users.length }} 人在线</span></header
      ><div ref="history" class="chat-history"
        ><div v-if="!community.messages.length" class="chat-welcome"
          ><q-icon name="waving_hand" size="42px" /><h2>公共聊天</h2
          ><p>{{
            community.connected
              ? "暂无消息"
              : "登录皮肤站并连接社区，开始聊天。"
          }}</p
          ><router-link v-if="!selectedAccount" to="/accounts" class="text-link"
            >前往登录 <q-icon name="arrow_forward" /></router-link></div
        ><article
          v-for="item in community.messages"
          :key="item.id"
          :class="['chat-message', { own: item.uid === community.user?.uid }]"
          ><PlayerAvatar
            :name="item.name"
            :uid="item.uid"
            :version="item.avatarVersion"
          /><div
            ><header
              ><strong>{{ item.name }}</strong
              ><time>{{
                new Date(item.created).toLocaleTimeString([], {
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
          v-model="message"
          outlined
          dense
          placeholder="和大家聊聊…"
          :disable="!community.connected"
          maxlength="1000"
          class="col" /><q-btn
          unelevated
          class="primary-button"
          type="submit"
          icon="send"
          title="发送消息"
          :disable="!community.connected || !message.trim()" /></form
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
              }}<small>/ 8</small></span
            >
          </button></div
        >
        <div v-if="community.room" class="voice-session">
          <div class="voice-session-status"
            ><i class="online-dot" /><strong>{{
              joining ? "正在连接" : "已加入语音"
            }}</strong
            ><span>{{ community.peers }} 位同伴</span></div
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
        ><q-select
          v-if="devices.length"
          v-model="device"
          outlined
          dense
          emit-value
          map-options
          :options="[
            { label: '系统默认麦克风', value: '' },
            ...devices.map(d => ({
              label: d.label || '麦克风',
              value: d.deviceId
            }))
          ]"
          label="麦克风"
          hint="更改后，下次加入生效"
          class="q-mt-md"
        /><p v-if="community.voiceError" class="error-note">{{
          community.voiceError
        }}</p></section
      ><section class="panel online-panel"
        ><h2
          >在线用户
          <span class="count-badge">{{ community.users.length }}</span></h2
        ><div v-if="!community.users.length" class="subtle q-mt-md"
          >暂无在线用户</div
        ><div
          v-for="member in community.users.slice(0, 40)"
          :key="member.id"
          class="online-member"
          ><PlayerAvatar
            class="small"
            :name="member.name"
            :uid="member.uid"
            :version="member.avatarVersion" /><span>{{ member.name }}</span
          ><q-icon
            v-if="member.room"
            :name="member.muted ? 'mic_off' : 'headset_mic'" /><i
            v-else
            class="online-dot" /></div></section></aside
  ></div>
</template>
