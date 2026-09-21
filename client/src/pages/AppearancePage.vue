<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import {
  state,
  selectedAccount,
  reload,
  saveSettings,
  invoke,
  perform
} from "../lib/launcher";
import PlayerAvatar from "../components/PlayerAvatar.vue";
const avatar = ref(selectedAccount.value?.avatar),
  avatarNote = ref("");
watch(
  () => selectedAccount.value?.id,
  () => {
    avatar.value = selectedAccount.value?.avatar;
    avatarNote.value = "";
  }
);
async function chooseAvatar() {
  const value = await invoke<string | null>("avatar.choose");
  if (value) avatar.value = value;
}
async function saveAvatar() {
  const result = await invoke<{ synced: boolean }>("avatar.save", {
    id: selectedAccount.value?.id,
    avatar: avatar.value || ""
  });
  await reload();
  avatarNote.value = result.synced
    ? "头像已保存并同步社区"
    : "头像已保存，下次连接社区时同步";
}
const form = reactive({
  theme: state.settings.theme,
  fontSize: state.settings.fontSize,
  accentColor: state.settings.accentColor,
  backgroundColor: state.settings.backgroundColor,
  backgroundImage: state.settings.backgroundImage,
  backgroundOpacity: state.settings.backgroundOpacity,
  backgroundPositionX: state.settings.backgroundPositionX ?? 50,
  backgroundPositionY: state.settings.backgroundPositionY ?? 50,
  backgroundFit: state.settings.backgroundFit || "cover",
  hiddenLinks: [...(state.settings.hiddenLinks || [])],
  columns: {
    sidebar: { ...state.settings.columns.sidebar },
    workspace: { ...state.settings.columns.workspace },
    dock: { ...state.settings.columns.dock }
  },
  layout: state.settings.layout
});
async function save() {
  form.columns.workspace.visible = true;
  await saveSettings({
    ...form,
    hiddenLinks: [...form.hiddenLinks],
    columns: {
      sidebar: { ...form.columns.sidebar },
      workspace: { ...form.columns.workspace },
      dock: { ...form.columns.dock }
    }
  });
}
async function background() {
  const image = await invoke<string | null>("background.choose");
  if (image) form.backgroundImage = image;
}
async function reset() {
  Object.assign(form, {
    theme: "light",
    fontSize: 15,
    accentColor: "#a9ce80",
    backgroundColor: "",
    backgroundImage: "",
    backgroundOpacity: 0.4,
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundFit: "cover",
    hiddenLinks: [],
    columns: {
      sidebar: { visible: true, color: "", opacity: 1, label: "游戏与社区" },
      workspace: { visible: true, color: "", opacity: 1, label: "主工作区" },
      dock: { visible: true, color: "", opacity: 1, label: "任务详情" }
    },
    layout: "standard"
  });
  await save();
}
</script>
<template>
  <div class="page-heading"
    ><h1>个性化</h1
    ><q-btn
      unelevated
      class="primary-button"
      icon="check"
      label="应用外观"
      @click="perform(save, '外观已保存')"
  /></div>
  <section class="panel settings-section">
    <h2>我的头像</h2
    ><div class="avatar-editor"
      ><PlayerAvatar
        class="avatar-preview"
        :name="selectedAccount?.name"
        :uid="selectedAccount?.uuid"
        :image="avatar"
      /><div
        ><strong>{{ selectedAccount?.name || "请先登录并选择角色" }}</strong
        ><p class="subtle">头像用于启动器和聊天大厅，绑定当前角色。</p
        ><div class="row q-gutter-sm"
          ><q-btn
            outline
            label="选择图片"
            icon="image"
            :disable="!selectedAccount?.uuid"
            @click="perform(chooseAvatar)" /><q-btn
            flat
            label="恢复默认"
            :disable="!selectedAccount?.uuid"
            @click="avatar = ''" /><q-btn
            unelevated
            class="primary-button"
            label="保存头像"
            :disable="!selectedAccount?.uuid"
            @click="perform(saveAvatar)" /></div
        ><p v-if="avatarNote" class="subtle">{{ avatarNote }}</p></div
      ></div
    >
  </section>
  <section class="panel settings-section"
    ><h2>文字与布局</h2
    ><div class="install-grid"
      ><div
        ><label>整体字号 · {{ form.fontSize }} px</label
        ><q-slider
          v-model="form.fontSize"
          :min="13"
          :max="22"
          :step="1"
          label
          markers
        /><p :style="{ fontSize: form.fontSize + 'px' }"
          >幻想镇 · 游戏实例与启动设置</p
        ></div
      ><q-select
        v-model="form.layout"
        outlined
        emit-value
        map-options
        :options="[
          { label: '标准', value: 'standard' },
          { label: '紧凑', value: 'compact' },
          { label: '宽松', value: 'wide' }
        ]"
        label="布局间距" /><q-select
        v-model="form.theme"
        outlined
        emit-value
        map-options
        :options="[
          { label: '深色', value: 'dark' },
          { label: '浅色', value: 'light' }
        ]"
        label="明暗模式" /></div
  ></section>
  <section class="panel settings-section"
    ><h2>颜色与背景</h2
    ><div class="install-grid"
      ><label class="color-setting"
        >主题色 <input v-model="form.accentColor" type="color" /></label
      ><label class="color-setting"
        >背景底色
        <input
          :value="form.backgroundColor || '#101a18'"
          type="color"
          @input="
            form.backgroundColor = ($event.target as HTMLInputElement).value
          " /><q-btn
          flat
          label="跟随主题"
          @click="form.backgroundColor = ''" /></label
      ><div
        ><q-btn
          outline
          icon="image"
          label="选择背景图片"
          @click="perform(background)" /><q-btn
          v-if="form.backgroundImage"
          flat
          label="移除图片"
          @click="form.backgroundImage = ''" /><img
          v-if="form.backgroundImage"
          :src="form.backgroundImage"
          class="background-preview"
          alt="背景预览" /></div
      ><div
        ><label
          >背景可见度 · {{ Math.round(form.backgroundOpacity * 100) }}%</label
        ><q-slider
          v-model="form.backgroundOpacity"
          :min="0"
          :max="1"
          :step="0.01"
          label /></div></div></section
  ><section class="panel settings-section"
    ><h2>背景位置与裁剪</h2
    ><p class="subtle"
      >调整背景图的焦点和填充方式，让背景图在不同窗口中保持合适的构图。</p
    ><div class="install-grid"
      ><div
        ><label>水平位置 · {{ Math.round(form.backgroundPositionX) }}%</label
        ><q-slider
          v-model="form.backgroundPositionX"
          :min="0"
          :max="100"
          :step="1"
          label /></div
      ><div
        ><label>垂直位置 · {{ Math.round(form.backgroundPositionY) }}%</label
        ><q-slider
          v-model="form.backgroundPositionY"
          :min="0"
          :max="100"
          :step="1"
          label /></div
      ><q-select
        v-model="form.backgroundFit"
        outlined
        emit-value
        map-options
        :options="[
          { label: '覆盖裁剪', value: 'cover' },
          { label: '完整显示', value: 'contain' },
          { label: '拉伸填充', value: '100% 100%' }
        ]"
        label="背景填充方式" /><img
        v-if="form.backgroundImage"
        :src="form.backgroundImage"
        class="background-preview"
        alt="背景裁剪预览"
        :style="
          'object-position: ' +
          form.backgroundPositionX +
          '% ' +
          form.backgroundPositionY +
          '%; object-fit: ' +
          (form.backgroundFit === '100% 100%' ? 'fill' : form.backgroundFit)
        " /></div></section
  ><section class="panel settings-section"
    ><h2>栏目与内容</h2
    ><p class="subtle"
      >可隐藏不常用栏目，并分别调整三栏的颜色、透明度和名称。主工作区会始终保留，避免启动器失去主要内容。</p
    ><div class="column-settings"
      ><div
        v-for="(column, name) in form.columns"
        :key="name"
        class="column-setting"
        ><q-toggle
          v-model="column.visible"
          :disable="name === 'workspace'"
          :label="column.label" /><q-input
          v-model="column.label"
          outlined
          dense
          label="栏目名称" /><label class="color-setting"
          >颜色 <input v-model="column.color" type="color" /></label
        ><div
          ><label>透明度 · {{ Math.round(column.opacity * 100) }}%</label
          ><q-slider
            v-model="column.opacity"
            :min="0.2"
            :max="1"
            :step="0.01"
            label /></div></div></div
    ><div class="content-form q-mt-md"
      ><strong>隐藏导航栏目</strong
      ><q-option-group
        v-model="form.hiddenLinks"
        type="checkbox"
        :options="[
          { label: '游戏实例', value: '/instances' },
          { label: '下载与安装', value: '/downloads' },
          { label: '机械动力蓝图库', value: '/blueprints' },
          { label: '聊天大厅', value: '/chat' },
          { label: '幻想镇论坛', value: '/forum' },
          { label: '小游戏', value: '/games' },
          { label: '通知公告', value: '/notices' }
        ]"
        inline
        class="hidden-links-options" /></div
    ><div class="appearance-reset-actions"
      ><q-btn
        outline
        label="恢复默认外观"
        @click="perform(reset, '已恢复默认外观')" /></div
  ></section>
</template>
