<script setup lang="ts">
import { ref, watch } from "vue";
import {
  state,
  appUpdate,
  desktop,
  task,
  invoke,
  saveSettings,
  reload,
  perform
} from "../lib/launcher";
import { disconnect, connect } from "../lib/community";
const hxzupPopup = ref(state.settings.hxzupPopup !== false);
const simpleHome = ref(state.settings.simpleHome);
const memoryMode = ref(state.settings.memoryMode || "auto");
const defaultMemoryMB = ref(state.settings.defaultMemoryMB || 4096);
const voiceMode = ref(state.settings.voiceMode || "open");
const voiceKey = ref(state.settings.voiceKey || "KeyT");
const voiceSounds = ref(state.settings.voiceSounds !== false);
const capturingVoiceKey = ref(false);
const downloadConcurrency = ref(state.settings.downloadConcurrency ?? 64);
const automatic = ref(state.settings.autoCheckUpdates !== false);
async function checkUpdate() {
  await invoke("app-update.check");
}
function voiceKeyName(code: string) {
  if (code === "Space") return "空格键";
  if (code === "Enter") return "回车键";
  if (code === "Escape") return "Esc";
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F\d+$/.test(code)) return code;
  return code || "T";
}
function captureVoiceKey(event: KeyboardEvent) {
  if (!capturingVoiceKey.value) return;
  event.preventDefault();
  if (event.code === "Escape") {
    capturingVoiceKey.value = false;
    return;
  }
  voiceKey.value = event.code;
  capturingVoiceKey.value = false;
}
function startVoiceKeyCapture() {
  capturingVoiceKey.value = true;
  window.addEventListener("keydown", captureVoiceKey, { once: true });
}
const connection = ref(""),
  checking = ref(false),
  downloadMode = ref(state.settings.downloadMode);
async function check() {
  checking.value = true;
  try {
    await saveSettings({ communityUrl: base.value });
    const r = await invoke<{ ok: boolean; version?: string; error?: string }>(
      "community.status"
    );
    connection.value = r.ok
      ? "已连接 · 社区服务 " + r.version
      : r.error || "连接失败";
  } finally {
    checking.value = false;
  }
}
const base = ref(state.settings.communityUrl),
  java = ref(state.settings.javaPath),
  scanning = ref(false),
  javas = ref<{ path: string; version: string; major: number; arch: string }[]>(
    []
  );
watch(
  () => state.settings.communityUrl,
  value => (base.value = value)
);
watch(
  () => state.settings.javaPath,
  value => (java.value = value)
);
async function scan() {
  scanning.value = true;
  try {
    javas.value = await invoke("java.scan");
  } finally {
    scanning.value = false;
  }
}
async function choose() {
  const value = await invoke<string | null>("java.choose");
  if (value) java.value = value;
}
async function save() {
  await saveSettings({
    communityUrl: base.value,
    javaPath: java.value,
    downloadMode: downloadMode.value,
    downloadConcurrency: downloadConcurrency.value,
    hxzupPopup: hxzupPopup.value,
    simpleHome: simpleHome.value,
    autoCheckUpdates: automatic.value,
    memoryMode: memoryMode.value,
    defaultMemoryMB: Math.round(defaultMemoryMB.value),
    voiceMode: voiceMode.value,
    voiceKey: voiceKey.value,
    voiceSounds: voiceSounds.value
  });
  disconnect();
  if (state.settings.selectedAccount) await connect();
}
async function root() {
  const gameRoot = await invoke<string | null>("directory.choose");
  if (gameRoot) {
    await saveSettings({ gameRoot });
    await reload();
  }
}
</script>
<template>
  <div class="page-heading"
    ><div><h1>启动器设置</h1></div
    ><q-btn
      unelevated
      class="primary-button"
      label="保存设置"
      icon="check"
      :disable="task.busy || state.running"
      @click="perform(save, '设置已保存')"
  /></div>
  <section class="panel settings-section">
    <h2>HXZ UP 更新</h2
    ><q-toggle v-model="hxzupPopup" label="保留 HXZ UP 默认更新弹窗" /><p
      class="subtle"
      >默认开启：启动游戏更新时显示独立窗口。关闭后在启动器任务详情中查看。是否自动更新仍由各实例的配置决定。</p
    >
  </section>
  <section class="panel settings-section settings-appearance">
    <h2>外观</h2>
    <div class="settings-appearance-actions">
      <q-toggle v-model="simpleHome" label="使用简化版启动游戏界面" />
      <q-btn outline to="/appearance" label="字号、颜色与布局" icon="palette" />
    </div>
    <div class="theme-options"
      ><button
        :class="[
          'theme-card',
          'theme-dark',
          { selected: state.settings.theme === 'dark' }
        ]"
        @click="perform(() => saveSettings({ theme: 'dark' }))"
        ><span class="theme-sample"><i /><b /><b /></span>深色
        <q-icon
          v-if="state.settings.theme === 'dark'"
          name="check_circle" /></button
      ><button
        :class="[
          'theme-card',
          'theme-light',
          { selected: state.settings.theme === 'light' }
        ]"
        @click="perform(() => saveSettings({ theme: 'light' }))"
        ><span class="theme-sample"><i /><b /><b /></span>浅色
        <q-icon
          v-if="state.settings.theme === 'light'"
          name="check_circle" /></button></div
  ></section>
  <section class="panel settings-section"
    ><h2>游戏与 Java</h2
    ><p class="subtle">默认内存用于新实例；已有实例可在实例配置中单独调整。</p
    ><div class="install-grid q-mb-md"
      ><q-select
        v-model="memoryMode"
        outlined
        emit-value
        map-options
        :options="[
          { label: '自动分配（推荐）', value: 'auto' },
          { label: '手动分配', value: 'manual' }
        ]"
        label="默认内存分配方式"
      /><q-input
        v-if="memoryMode === 'manual'"
        v-model.number="defaultMemoryMB"
        outlined
        type="number"
        label="默认内存（MB）"
        :min="512"
        :max="state.system.memoryMB"
        hint="建议至少保留一半内存给系统"
      /><div v-else class="subtle self-center"
        >启动时根据当前剩余内存自动分配，单次启动会重新计算。</div
      ></div
    ><div class="directory-bar"
      ><q-icon name="folder_open" /><span>{{
        state.settings.gameRoot || "尚未设置游戏目录"
      }}</span
      ><q-btn
        flat
        label="选择目录"
        :disable="!desktop || task.busy || state.running"
        @click="perform(root)" /></div
    ><div class="row q-gutter-sm q-mt-md"
      ><q-select
        v-model="java"
        outlined
        class="col"
        emit-value
        map-options
        :options="[
          { label: '自动选择已安装 Java', value: '' },
          ...javas.map(j => ({
            label: 'Java ' + j.version + ' · ' + j.arch + ' · ' + j.path,
            value: j.path
          })),
          ...(java && !javas.some(j => j.path === java)
            ? [{ label: java, value: java }]
            : [])
        ]"
        label="Java 运行环境" /><q-btn
        outline
        label="自动检测"
        :loading="scanning"
        :disable="!desktop"
        @click="perform(scan)" /><q-btn
        flat
        label="手动选择"
        :disable="!desktop"
        @click="perform(choose)" /></div
  ></section>
  <section class="panel settings-section"
    ><h2>下载设置</h2
    ><q-select
      v-model="downloadMode"
      outlined
      emit-value
      map-options
      :options="[
        { label: '国内镜像优先，失败回退官方', value: 'domestic' },
        { label: '官方来源', value: 'official' }
      ]"
      label="资源下载"
    /><q-select
      v-model="downloadConcurrency"
      outlined
      class="q-mt-md"
      :options="[8, 16, 32, 64, 128]"
      :display-value="downloadConcurrency + ' 并发'"
      label="下载并发数"
      hint="默认 64，开始或继续安装时生效"
      :disable="task.busy || state.running"
    />
  </section>
  <section class="panel settings-section"
    ><h2>语音聊天</h2
    ><div class="install-grid"
      ><q-select
        v-model="voiceMode"
        outlined
        emit-value
        map-options
        :options="[
          { label: '全程说话', value: 'open' },
          { label: '按键说话', value: 'push-to-talk' }
        ]"
        label="麦克风模式" /><div v-if="voiceMode === 'push-to-talk'"
        ><q-btn
          outline
          icon="keyboard"
          :label="
            capturingVoiceKey
              ? '请按下新的按键（Esc 取消）'
              : '按键说话：' + voiceKeyName(voiceKey)
          "
          @click="startVoiceKeyCapture"
        /><p class="subtle q-mt-sm"
          >默认使用 T 键，可更改为键盘上的任意按键。</p
        ></div
      ><q-toggle v-model="voiceSounds" label="播放语音频道进出提示音" /></div
  ></section>
  <section class="panel settings-section"
    ><h2>社区服务</h2
    ><p class="subtle">聊天、语音和公告共用此地址；皮肤站与 HXZ UP 独立运行。</p
    ><q-input
      v-model="base"
      outlined
      label="社区服务地址"
      placeholder="https://community.example.com"
    /><div class="row items-center q-gutter-sm q-mt-md"
      ><q-btn
        outline
        icon="network_check"
        label="检查连接"
        :loading="checking"
        :disable="!desktop || task.busy || state.running"
        @click="perform(check)"
      /><span>{{ connection }}</span></div
    ><p class="subtle q-mb-none"
      >幻想镇社区：https://qqbot.hxzmc.top。</p
    ></section
  >
  <section class="panel settings-section"
    ><h2>启动器更新</h2
    ><q-toggle
      v-model="automatic"
      label="自动更新启动器并安装（GitHub）"
      @update:model-value="
        perform(() => saveSettings({ autoCheckUpdates: automatic }))
      "
    /><p class="subtle"
      >发现更高的正式版本后自动下载，游戏与安装任务结束后自动重启安装。可随时关闭。</p
    ><div class="row items-center q-gutter-sm q-mt-md"
      ><q-btn
        outline
        label="检查更新"
        :disable="!desktop || task.busy || state.running"
        @click="perform(checkUpdate)"
      /><q-btn
        v-if="appUpdate.available && !appUpdate.ready"
        unelevated
        class="primary-button"
        label="下载更新"
        @click="perform(() => invoke('app-update.download'))"
      /><q-btn
        v-if="appUpdate.ready"
        unelevated
        class="primary-button"
        label="重启并安装"
        :disable="task.busy || state.running"
        @click="perform(() => invoke('app-update.install'))"
      /><span
        >{{ appUpdate.phase }}
        {{ appUpdate.percent ? appUpdate.percent + "%" : "" }}</span
      ></div
    ></section
  >
</template>
