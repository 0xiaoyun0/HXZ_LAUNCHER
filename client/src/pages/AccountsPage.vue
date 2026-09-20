<script setup lang="ts">
import SkinPanel from "../components/SkinPanel.vue";
import PlayerAvatar from "../components/PlayerAvatar.vue";
import { ref } from "vue";
import {
  state,
  desktop,
  task,
  invoke,
  reload,
  perform,
  saveSettings
} from "../lib/launcher";
import { community, disconnect, connect } from "../lib/community";
const managerOpen=ref(false);
const username = ref(""),
  password = ref(""),
  loading = ref(false),
  showPassword = ref(false);
async function login() {
  loading.value = true;
  try {
    await invoke("account.login", {
      username: username.value,
      password: password.value
    });
    password.value = "";
    await reload();
    disconnect();
    await connect();
  } finally {
    loading.value = false;
    password.value = "";
  }
}
function openSkin(){managerOpen.value=!managerOpen.value;return Promise.resolve();}
async function select(id: string) {
  disconnect();
  await saveSettings({ selectedAccount: id });
  await connect();
}
async function remove(id: string) {
  disconnect();
  await invoke("account.remove", { id });
  await reload();
}
async function profile(id: string, uuid: string) {
  disconnect();
  await invoke("account.profile", { id, uuid });
  await reload();
  await connect();
}
</script>
<template>
  <div class="page-heading"
    ><div><h1>皮肤站账号</h1></div
    ><q-btn
      outline
      icon="manage_accounts"
      :label="managerOpen ? '返回启动器账号' : '皮肤与角色管理'"
      @click="perform(openSkin)"
  /></div>
  <SkinPanel v-if="managerOpen"/><div v-else class="account-grid"
    ><section class="panel"
      ><div class="section-title"
        ><h2>登录幻想镇</h2><q-icon name="shield" size="25px" /></div
      ><p class="subtle"
        >使用皮肤站邮箱或用户名登录。密码仅用于本次验证，不会保存在启动器中。</p
      ><form @submit.prevent="perform(login)"
        ><q-input
          v-model="username"
          outlined
          label="邮箱 / 用户名"
          autocomplete="username"
          class="q-mb-md" /><q-input
          v-model="password"
          outlined
          label="密码"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          ><template #append
            ><q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword" /></template></q-input
        ><q-btn
          type="submit"
          unelevated
          class="primary-button full-width q-mt-lg"
          label="登录并连接社区"
          :loading="loading"
          :disable="
            task.busy || state.running || !username || !password
          " /></form
      ><p class="subtle q-mt-lg"
        ><q-icon name="lock" />
        {{
          state.persistentCredentials
            ? "登录令牌由系统加密保存，下次打开自动恢复。"
            : "当前环境仅保留本次会话，关闭后需重新登录。"
        }}</p
      ><div class="info-note"
        >登录时同步建立皮肤站管理会话，可直接在启动器内管理。已有账号或网站要求验证码时，在内嵌页面完成一次验证，之后保留该账号的会话。</div
      ></section
    >
    <section class="panel"
      ><div class="section-title"
        ><h2>已保存账号</h2
        ><span class="count-badge">{{ state.accounts.length }}</span></div
      ><div v-if="!state.accounts.length" class="empty-inline"
        ><q-icon name="person_outline" size="46px" /><p>暂无账号</p></div
      ><article
        v-for="account in state.accounts"
        :key="account.id"
        class="account-item"
        ><div class="row items-center q-gutter-md"
          ><PlayerAvatar
            class="large"
            :name="account.name || account.username"
            :uid="account.uuid"
            :image="account.avatar" /><div class="col"
            ><h3>{{ account.name || "请先选择角色" }}</h3
            ><small class="subtle">{{ account.username }}</small></div
          ><q-badge
            v-if="account.id === state.settings.selectedAccount"
            color="primary"
            label="当前账号" /></div
        ><q-select
          v-if="account.profiles.length"
          :model-value="account.uuid"
          :options="account.profiles.map(p => ({ label: p.name, value: p.id }))"
          emit-value
          map-options
          outlined
          dense
          label="游戏角色"
          class="q-mt-md"
          :disable="task.busy || state.running"
          @update:model-value="
            value => perform(() => profile(account.id, value))
          "
        /><div class="row q-mt-md"
          ><q-btn
            flat
            color="primary"
            label="使用此账号"
            :disable="task.busy || state.running"
            @click="perform(() => select(account.id))" /><q-btn
            flat
            label="退出此账号"
            :disable="task.busy || state.running"
            @click="perform(() => remove(account.id))" /></div
        ><small class="subtle selectable"
          >角色 UUID：{{ account.uuid || "尚未选择" }}</small
        ></article
      ><div v-if="community.error" class="info-note">{{
        community.error
      }}</div></section
    ></div
  >
</template>
