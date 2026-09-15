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
  layout: state.settings.layout
});
async function save() {
  await saveSettings({ ...form });
}
async function background() {
  const image = await invoke<string | null>("background.choose");
  if (image) form.backgroundImage = image;
}
async function reset() {
  Object.assign(form, {
    theme: "dark",
    fontSize: 15,
    accentColor: "#a9ce80",
    backgroundColor: "",
    backgroundImage: "",
    backgroundOpacity: 0.4,
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
  ><q-btn
    outline
    label="恢复默认外观"
    @click="perform(reset, '已恢复默认外观')"
  />
</template>
