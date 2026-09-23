<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, onMounted } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import { secretSequence } from "../lib/secret-sequence";
const router = useRouter();
let secretTaps=0, secretAt=0;
function secretClick(){const now=Date.now();secretTaps=now-secretAt<1500?secretTaps+1:1;secretAt=now;if(secretTaps>=7){secretTaps=0;void router.push("/signal");}}
const secretKey = secretSequence(() => {
  void router.push("/signal");
});
onMounted(() => window.addEventListener("keydown", secretKey));
onBeforeUnmount(() => window.removeEventListener("keydown", secretKey));
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
const gameRoot=ref(state.settings.gameRoot), theme=ref(state.settings.theme);
const section=ref('game'), chinesePaths=ref(state.settings.chinesePaths!==false), confirmUnsaved=ref(state.settings.confirmUnsaved!==false), chatHistoryDays=ref(state.settings.chatHistoryDays||0);
const deleted=ref<{id:string}[]>([]), deletedOpen=ref(false);
async function manageDeleted(){deleted.value=await invoke('instance.deleted');deletedOpen.value=true;}
async function restore(id:string){await invoke('instance.restore',{id});await reload();deleted.value=await invoke('instance.deleted');}
const leavePrompt=ref(false);let resolveLeave:((v:boolean)=>void)|undefined;
function draft(){return {theme:theme.value,...(gameRoot.value?{gameRoot:gameRoot.value}:{}),communityUrl:base.value,javaPath:java.value,downloadMode:downloadMode.value,downloadConcurrency:downloadConcurrency.value,hxzupPopup:hxzupPopup.value,simpleHome:simpleHome.value,autoCheckUpdates:automatic.value,memoryMode:memoryMode.value,defaultMemoryMB:Math.round(defaultMemoryMB.value),voiceMode:voiceMode.value,voiceKey:voiceKey.value,voiceSounds:voiceSounds.value,chinesePaths:chinesePaths.value,confirmUnsaved:confirmUnsaved.value,chatHistoryDays:chatHistoryDays.value};}
const dirty=computed(()=>Object.entries(draft()).some(([key,value])=>value!==state.settings[key as keyof typeof state.settings]));
onBeforeRouteLeave(()=>{
  if(!dirty.value || !confirmUnsaved.value)return true;
  leavePrompt.value=true;
  return new Promise<boolean>(resolve=>resolveLeave=resolve);
});
async function leave(action:string){
  if(action==='save')await save();
  leavePrompt.value=false;resolveLeave?.(action!=='stay');resolveLeave=undefined;
}
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
  event.stopImmediatePropagation();
  if (event.code === "Escape") {
    capturingVoiceKey.value = false;
    return;
  }
  voiceKey.value = event.code;
  capturingVoiceKey.value = false;
}
function startVoiceKeyCapture() {
  window.removeEventListener("keydown", captureVoiceKey, true);
  capturingVoiceKey.value = true;
  window.addEventListener("keydown", captureVoiceKey, {
    once: true,
    capture: true
  });
}
onBeforeUnmount(() =>
  window.removeEventListener("keydown", captureVoiceKey, true)
);
const connection = ref(""),
  checking = ref(false),
  downloadMode = ref(state.settings.downloadMode);
async function check() {
  checking.value = true;
  try {
    const r = await invoke<{ ok: boolean; version?: string; error?: string }>(
      "community.status", {url:base.value}
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
  await saveSettings(draft());
  disconnect();
  if (state.settings.selectedAccount) await connect();
}
async function root() {
  const value = await invoke<string | null>('directory.choose');
  if(value)gameRoot.value=value;
}

</script>
<template>
  <q-dialog v-model="leavePrompt" persistent><q-card class="dialog-card"><q-card-section><h2>应用设置更改？</h2><p>你还有未保存的设置。</p></q-card-section><q-card-actions align="right"><q-btn flat label="继续编辑" @click="leave('stay')"/><q-btn flat label="放弃更改" @click="leave('discard')"/><q-btn unelevated class="primary-button" label="应用并离开" @click="perform(()=>leave('save'))"/></q-card-actions></q-card></q-dialog>
  <q-dialog v-model="deletedOpen"><q-card class="dialog-card"><q-card-section><h2>已隐藏的实例</h2><p class="subtle">恢复列表显示；已硬删除的默认服务器恢复后需要重新下载。</p><p v-if="!deleted.length">暂无隐藏实例</p><div v-for="item in deleted" :key="item.id" class="row items-center justify-between q-my-sm"><span>{{item.id}}</span><q-btn flat label="恢复显示" @click="perform(()=>restore(item.id))"/></div></q-card-section><q-card-actions align="right"><q-btn flat label="关闭" v-close-popup/></q-card-actions></q-card></q-dialog>
  <section v-if="state.settings.linkingDiscovered" class="panel q-mb-md"><q-toggle :model-value="!!state.settings.showLinking" label="在左侧显示 Linking" @update:model-value="value=>perform(()=>saveSettings({showLinking:!!value}))"/><q-btn flat label="打开 Linking" to="/signal"/></section>
  <div class="page-heading"
    ><div><h1 @click="secretClick">启动器设置</h1></div
    ><q-btn
      unelevated
      class="primary-button"
      label="保存设置"
      icon="check"
      :disable="task.busy || state.running"
      @click="perform(save, '设置已保存')"
  /></div>
  <q-tabs v-model="section" align="left" class="settings-tabs q-mb-md" active-color="primary" indicator-color="primary"><q-tab name="game" label="游戏与存储"/><q-tab name="display" label="外观与操作"/><q-tab name="network" label="下载与更新"/><q-tab name="community" label="聊天与社区"/></q-tabs>
  <section v-show="section==='network'" class="panel settings-section">
    <h2>HXZ UP 更新</h2
    ><q-toggle v-model="hxzupPopup" label="保留 HXZ UP 默认更新弹窗" /><p
      class="subtle"
      >默认开启：启动游戏更新时显示独立窗口。关闭后在启动器任务详情中查看。是否自动更新仍由各实例的配置决定。</p
    >
  </section>
  <section v-show="section==='display'" class="panel settings-section settings-appearance">
    <h2>外观</h2><q-toggle v-model="confirmUnsaved" label="离开设置时提醒应用未保存的更改"/>
    <div class="settings-appearance-actions">
      <q-toggle v-model="simpleHome" label="使用简化版启动游戏界面" />
      <q-btn outline to="/appearance" label="字号、颜色与布局" icon="palette" />
    </div>
    <div class="theme-options"
      ><button
        :class="[
          'theme-card',
          'theme-dark',
          { selected: theme === 'dark' }
        ]"
        @click="theme='dark'"
        ><span class="theme-sample"><i /><b /><b /></span>深色
        <q-icon
          v-if="theme === 'dark'"
          name="check_circle" /></button
      ><button
        :class="[
          'theme-card',
          'theme-light',
          { selected: theme === 'light' }
        ]"
        @click="theme='light'"
        ><span class="theme-sample"><i /><b /><b /></span>浅色
        <q-icon
          v-if="theme === 'light'"
          name="check_circle" /></button></div
  ></section>
  <section v-show="section==='game'" class="panel settings-section"
    ><h2>游戏与 Java</h2
    ><div class="row q-gutter-sm q-mb-md"><q-toggle v-model="chinesePaths" label="检索中文路径中的 Java"/><q-btn outline icon="restore_from_trash" label="管理隐藏实例" @click="perform(manageDeleted)"/><q-btn flat to="/instances" label="管理与删除实例"/></div><p class="subtle">默认内存用于新实例；已有实例可在实例配置中单独调整。</p
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
        gameRoot || "尚未设置游戏目录"
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
  <section v-show="section==='network'" class="panel settings-section"
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
  <section v-show="section==='community'" class="panel settings-section"
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
  <section v-show="section==='community'" class="panel settings-section"
    ><h2>社区服务</h2
    ><q-select v-model="chatHistoryDays" outlined emit-value map-options label="聊天记录显示范围" class="q-mb-md" :options="[{label:'不限制',value:0},{label:'1 天',value:1},{label:'3 天',value:3},{label:'5 天',value:5},{label:'1 周',value:7},{label:'一个月',value:30}]"/><p class="subtle">聊天、语音和公告共用此地址；皮肤站与 HXZ UP 独立运行。</p
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
  <section v-show="section==='network'" class="panel settings-section"
    ><h2>启动器更新</h2
    ><q-toggle
      v-model="automatic"
      label="自动更新启动器并安装（GitHub）"
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
