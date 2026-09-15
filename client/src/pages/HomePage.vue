<script setup lang="ts">
import { computed, ref } from "vue";
import {
  state,
  selectedInstance,
  notices,
  groups,
  task,
  perform,
  saveSettings,
  instanceConfig,
  invoke,
  reload
} from "../lib/launcher";
const search = ref("");
const instances = computed(() =>
  state.instances.filter(i =>
    i.name.toLowerCase().includes(search.value.toLowerCase())
  )
);
const config = computed(() => instanceConfig(state.settings.selectedInstance));
async function chooseRoot() {
  const gameRoot = await invoke<string | null>("directory.choose");
  if (gameRoot) {
    await saveSettings({ gameRoot });
    await reload();
  }
}
</script>
<template>
  <div class="desktop-home">
    <section class="world-list"
      ><header
        ><strong>本地实例</strong
        ><router-link to="/instances" title="管理实例"
          ><q-icon name="add" size="20px" /></router-link
        ><q-btn
          flat
          dense
          round
          size="sm"
          icon="refresh"
          title="刷新实例"
          @click="perform(reload)" /></header
      ><div class="world-search"
        ><q-input v-model="search" outlined dense placeholder="搜索实例"
          ><template #prepend
            ><q-icon name="search" size="17px" /></template></q-input></div
      ><div class="world-list-items"
        ><button
          v-for="instance in instances"
          :key="instance.id"
          :class="[
            'world-item',
            { selected: instance.id === state.settings.selectedInstance }
          ]"
          :disabled="task.busy || state.running"
          @click="
            perform(() => saveSettings({ selectedInstance: instance.id }))
          "
          ><span class="world-icon"
            ><q-icon
              :name="instance.loader === '原版' ? 'grass' : 'extension'"
              size="25px" /></span
          ><span
            ><strong>{{ instance.name }}</strong
            ><small>{{
              instance.error
                ? "等待安装"
                : instance.version + " · " + instance.loader
            }}</small></span
          ><q-icon
            v-if="instance.id === state.settings.selectedInstance"
            name="check"
            size="16px" /></button
        ><div v-if="!instances.length" class="list-empty"
          ><q-icon name="folder_open" size="32px" /><p>{{
            search ? "没有匹配的实例" : "尚未添加游戏实例"
          }}</p
          ><q-btn
            flat
            dense
            color="primary"
            label="选择游戏目录"
            @click="perform(chooseRoot)" /></div></div
      ><footer
        ><q-icon name="folder_open" /><span :title="state.settings.gameRoot">{{
          state.settings.gameRoot || "未设置游戏目录"
        }}</span></footer
      ></section
    >
    <section class="world-detail"
      ><div class="detail-toolbar"
        ><span>实例概览</span
        ><div class="row q-gutter-xs"
          ><q-btn
            flat
            dense
            icon="folder_open"
            label="文件夹"
            :disable="!selectedInstance"
            @click="
              perform(() =>
                invoke('instance.open', { id: state.settings.selectedInstance })
              )
            " /><q-btn
            flat
            dense
            icon="tune"
            label="配置"
            to="/instances" /></div
      ></div>
      <div class="world-preview"
        ><div class="preview-art" aria-hidden="true"
          ><div class="sun" /><div class="mountain mountain-back" /><div
            class="mountain mountain-front" /><div class="tower"
            ><i /><i /><i /></div></div
        ><div class="preview-caption"
          ><span>{{ selectedInstance?.loader || "MINECRAFT" }}</span
          ><h1>{{ selectedInstance?.name || "幻想镇" }}</h1
          ><p>{{
            selectedInstance
              ? "Minecraft " + selectedInstance.version
              : "未选择实例"
          }}</p></div
        ></div
      >
      <div class="detail-body"
        ><div class="detail-tabs"
          ><span class="active">基本信息</span
          ><router-link to="/notices">服务器公告</router-link
          ><router-link to="/logs">运行日志</router-link></div
        ><dl class="property-grid"
          ><div
            ><dt>游戏版本</dt
            ><dd>{{ selectedInstance?.version || "—" }}</dd></div
          ><div
            ><dt>加载器</dt><dd>{{ selectedInstance?.loader || "—" }}</dd></div
          ><div
            ><dt>Java 环境</dt
            ><dd>{{
              state.settings.javaPath
                ? "手动配置"
                : selectedInstance
                  ? "自动 · Java " + selectedInstance.javaMajor
                  : "自动选择"
            }}</dd></div
          ><div
            ><dt>分配内存</dt><dd>{{ config.memoryMB }} MB</dd></div
          ><div
            ><dt>版本隔离</dt
            ><dd>{{
              config.isolated ? "独立实例目录" : "共享游戏目录"
            }}</dd></div
          ><div
            ><dt>HXZ UP</dt
            ><dd>{{
              config.autoUpdate ? "启动前检查更新" : "手动更新"
            }}</dd></div
          ></dl
        >
        <div v-if="!selectedInstance" class="setup-inline"
          ><q-icon name="info_outline" size="20px" /><span
            >导入已有的 .minecraft 目录，或通过 HXZ UP 安装整合包。</span
          ><q-btn flat dense color="primary" label="添加实例" to="/instances"
        /></div>
        <section class="desktop-notices"
          ><header
            ><strong>最近公告</strong
            ><router-link to="/notices"
              >查看全部 <q-icon name="chevron_right" /></router-link></header
          ><div v-if="notices.error" class="notice-status"
            ><q-icon name="cloud_off" /> 社区服务未连接
            <router-link to="/settings">设置地址</router-link></div
          ><div v-else-if="!notices.items.length" class="notice-status"
            >暂无公告</div
          ><router-link
            v-for="notice in notices.items.slice(0, 3)"
            :key="notice.id"
            :to="'/notices/' + notice.groupId"
            class="desktop-notice-row"
            ><span>{{ groups.find(g => g.id === notice.groupId)?.name }}</span
            ><strong>{{ notice.title }}</strong
            ><time>{{
              new Date(notice.updated).toLocaleDateString()
            }}</time></router-link
          ></section
        >
      </div>
    </section>
  </div>
</template>
