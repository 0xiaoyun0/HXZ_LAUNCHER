<script setup lang="ts">
import {surfaceColor} from "../lib/surface";
import PlayerAvatar from "../components/PlayerAvatar.vue";
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  state,
  appUpdate,
  desktop,
  taskDetailsOpen,
  selectedAccount,
  task,
  reload,
  perform,
  toggleTheme,
  invoke,
  loadNotices
} from "../lib/launcher";
import { community, connect } from "../lib/community";
import PackImport from "../components/PackImport.vue";
import LaunchDock from "../components/LaunchDock.vue";
const route = useRoute();
const links = [
  { to: "/", icon: "sports_esports", label: "启动游戏" },
  { to: "/instances", icon: "widgets", label: "游戏实例" },
  { to: "/downloads", icon: "download", label: "下载与安装" },
  { to: "/blueprints", icon: "view_in_ar", label: "机械动力蓝图库" },
  { to: "/chat", icon: "forum", label: "聊天大厅" },
  { to: "/forum", icon: "article", label: "幻想镇论坛" },
  { to: "/games", icon: "videogame_asset", label: "小游戏" },
  { to: "/notices", icon: "campaign", label: "通知公告" }
];
const visibleLinks = computed(() =>
  [...links, ...(state.settings.linkingDiscovered && state.settings.showLinking ? [{to:"/signal",icon:"auto_awesome",label:"Linking"}] : [])].filter(link => !state.settings.hiddenLinks?.includes(link.to))
);
function columnVisible(name: "sidebar" | "workspace" | "dock") {
  return name === "workspace" || state.settings.columns[name].visible;
}
function columnStyle(name: "sidebar" | "workspace") {
  const column = state.settings.columns[name];
  return {
    backgroundColor: surfaceColor(column.color || (name === "sidebar" ? "var(--sidebar)" : "var(--bg)"), column.opacity)
  };
}
onMounted(() => {
  void perform(async () => {
    await reload();
    void loadNotices();
    if (state.settings.selectedAccount) void connect();
  });
});
</script>
<template>
  <div class="launcher"
    ><PackImport />
    <aside
      v-show="columnVisible('sidebar')"
      class="sidebar"
      :style="columnStyle('sidebar')"
    >
      <router-link to="/" class="brand"
        ><span class="brand-symbol">幻</span
        ><span class="brand-wordmark"
          ><strong>幻想镇</strong><small>FANTASY TOWN</small></span
        ></router-link
      >
      <div class="nav-caption">{{ state.settings.columns.sidebar.label }}</div>
      <nav aria-label="主导航">
        <template v-for="link in visibleLinks" :key="link.to"
          ><router-link
            :to="link.to"
            :class="[
              'nav-link',
              {
                active:
                  link.to === '/'
                    ? route.path === '/'
                    : route.path.startsWith(link.to)
              }
            ]"
            ><q-icon :name="link.icon" size="20px" />{{ link.label
            }}<span
              v-if="link.to === '/chat' && community.connected"
              class="online-dot"
          /></router-link>
        </template>
      </nav>
      <div class="sidebar-bottom"
        ><router-link to="/accounts" class="nav-link" active-class="active"
          ><q-icon name="badge" size="20px" />皮肤站账号</router-link
        ><router-link to="/appearance" class="nav-link" active-class="active"
          ><q-icon name="palette" size="20px" />个性化</router-link
        ><router-link to="/settings" class="nav-link" active-class="active"
          ><q-icon name="tune" size="20px" />设置</router-link
        >
        <router-link to="/accounts" class="profile-tile"
          ><PlayerAvatar
            :name="selectedAccount?.name"
            :uid="selectedAccount?.uuid" /><span
            ><strong>{{ selectedAccount?.name || "未登录" }}</strong
            ><small>{{
              selectedAccount ? "幻想镇皮肤站" : "登录皮肤站"
            }}</small></span
          ><q-icon name="chevron_right"
        /></router-link>
      </div>
    </aside>
    <section
      v-show="columnVisible('workspace')"
      class="workspace"
      :style="columnStyle('workspace')"
    >
      <header class="window-bar"
        ><div class="row items-center"
          ><span class="window-label">HXZ LAUNCHER <b>0.4.4</b></span></div
        ><div class="row items-center no-drag"
          ><q-btn
            v-if="!columnVisible('sidebar')"
            flat
            round
            dense
            to="/appearance"
            icon="palette"
            title="恢复栏目与外观" /><q-btn
            v-if="!columnVisible('sidebar')"
            flat
            round
            dense
            to="/"
            icon="home"
            title="启动游戏" /><q-btn
            v-if="appUpdate.available"
            flat
            to="/settings"
            icon="system_update"
            label="新版本" /><q-btn
            flat
            round
            dense
            :icon="state.settings.theme === 'dark' ? 'light_mode' : 'dark_mode'"
            title="切换外观"
            @click="perform(toggleTheme)" /><span class="bar-divider" /><q-btn
            v-if="desktop"
            flat
            round
            dense
            icon="remove"
            title="最小化"
            @click="
              perform(() => invoke('window.control', { action: 'minimize' }))
            " /><q-btn
            v-if="desktop"
            flat
            round
            dense
            icon="crop_square"
            title="最大化"
            @click="
              perform(() => invoke('window.control', { action: 'maximize' }))
            " /><q-btn
            v-if="desktop"
            flat
            round
            dense
            icon="close"
            class="close-window"
            title="关闭"
            @click="
              perform(() => invoke('window.control', { action: 'close' }))
            " /></div
      ></header>
      <div v-if="!desktop" class="preview-banner"
        >浏览器预览 · 登录、文件管理与游戏启动请使用桌面版</div
      >
      <main :class="['page-area', { 'home-area': route.path === '/', 'linking-area': route.path === '/signal' }]"
        ><router-view
      /></main>
      <LaunchDock />
      <footer class="status-bar"
        ><span
          ><i :class="['online-dot', { offline: !community.connected }]" />{{
            community.status
          }}</span
        ><span v-if="community.room"
          ><q-icon name="headset_mic" /> 语音已连接 ·
          {{ community.peers }} 位同伴</span
        ><button class="status-task" @click="taskDetailsOpen.value = true">{{
          task.phase
        }}</button></footer
      >
    </section>
  </div>
</template>
