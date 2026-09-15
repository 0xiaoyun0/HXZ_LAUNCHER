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
const feed = ref(state.settings.updateFeed);
async function checkUpdate() {
  await saveSettings({ updateFeed: feed.value });
  await invoke("app-update.check");
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
    hxzupPopup: hxzupPopup.value
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
      :disable="!desktop || task.busy || state.running"
      @click="perform(save, '设置已保存')"
  /></div>
  <section class="panel settings-section">
    <h2>HXZ UP 更新</h2
    ><q-toggle v-model="hxzupPopup" label="保留 HXZ UP 默认更新弹窗" /><p
      class="subtle"
      >默认开启：启动游戏更新时显示独立窗口。关闭后在启动器任务详情中查看。是否自动更新仍由各实例的配置决定。</p
    >
  </section>
  <section class="panel settings-section"
    ><h2>外观</h2
    ><q-btn
      outline
      to="/appearance"
      label="字号、颜色与布局"
      icon="palette" /><p class="subtle"></p
    ><div class="theme-options"
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
    ><p class="subtle">内存、分辨率与更新地址在各实例的配置中单独保存。</p
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
    ><h2>下载来源</h2
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
  /></section>
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
      >本地联调默认 http://127.0.0.1:8787。正式部署填写管理员提供的 HTTPS
      地址。</p
    ></section
  >
  <section class="panel settings-section"
    ><h2>启动器更新</h2
    ><q-input
      v-model="feed"
      outlined
      label="更新发布地址"
      placeholder="https://你的更新站/launcher/"
    /><div class="row items-center q-gutter-sm q-mt-md"
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
