<script setup lang="ts">
import PlayerAvatar from "../components/PlayerAvatar.vue";
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  state,
  appUpdate,
  desktop,
  groups,
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
const route = useRoute(),
  router = useRouter();
const links = [
  { to: "/", icon: "sports_esports", label: "启动游戏" },
  { to: "/instances", icon: "widgets", label: "游戏实例" },
  { to: "/downloads", icon: "download", label: "下载与安装" },
  { to: "/chat", icon: "forum", label: "聊天大厅" },
  { to: "/notices", icon: "campaign", label: "通知公告" }
];
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
    <aside class="sidebar">
      <router-link to="/" class="brand"
        ><span class="brand-symbol">幻</span
        ><span class="brand-wordmark"
          ><strong>幻想镇</strong><small>FANTASY TOWN</small></span
        ></router-link
      >
      <div class="nav-caption">游戏与社区</div>
      <nav aria-label="主导航">
        <template v-for="link in links" :key="link.to"
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
          <div v-if="link.to === '/notices'" class="nav-children"
            ><router-link
              v-for="group in groups"
              :key="group.id"
              :to="'/notices/' + group.id"
              :class="{ active: route.params.group === group.id }"
              >{{ group.name }}</router-link
            ></div
          >
        </template>
      </nav>
      <div class="sidebar-bottom"
        ><router-link to="/accounts" class="nav-link" active-class="active"
          ><q-icon name="badge" size="20px" />皮肤站账号</router-link
        ><router-link to="/logs" class="nav-link" active-class="active"
          ><q-icon name="subject" size="20px" />启动日志</router-link
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
    <section class="workspace">
      <header class="window-bar"
        ><div class="no-drag row items-center q-gutter-xs"
          ><q-btn
            flat
            round
            dense
            icon="arrow_back"
            title="后退"
            @click="router.back()"
          /><q-btn
            flat
            round
            dense
            icon="arrow_forward"
            title="前进"
            @click="router.forward()"
          /><span class="window-label">HXZ LAUNCHER <b>0.2.2</b></span></div
        ><div class="row items-center no-drag"
          ><q-btn
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
      <main :class="['page-area', { 'home-area': route.path === '/' }]"
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
        ><router-link to="/logs">{{ task.phase }}</router-link></footer
      >
    </section>
  </div>
</template>
