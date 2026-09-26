<script setup lang="ts">
import DeleteInstance from "../components/DeleteInstance.vue";
import CoverImage from "../components/CoverImage.vue";
import ModManager from "../components/ModManager.vue";
import { computed, ref, watch } from "vue";
import {
  taskDetailsOpen,
  state,
  selectedInstance,
  notices,
  groups,
  task,
  perform,
  saveSettings,
  instanceConfig,
  instanceMemoryLabel,
  orderedInstances,
  toggleInstanceFavorite,
  favoritePending,
  invoke,
  reload
} from "../lib/launcher";
const deleting = ref("");
const instancesCollapsed = ref(!!state.settings.instancesCollapsed);
let savingCollapse = false;
watch(() => state.settings.instancesCollapsed, value => {
  if (!savingCollapse) instancesCollapsed.value = !!value;
});
async function toggleInstances() {
  instancesCollapsed.value = !instancesCollapsed.value;
  if (savingCollapse) return;
  savingCollapse = true;
  try {
    let value: boolean;
    do {
      value = instancesCollapsed.value;
      await saveSettings({ instancesCollapsed: value });
    } while (value !== instancesCollapsed.value);
  } catch (error) {
    instancesCollapsed.value = !!state.settings.instancesCollapsed;
    throw error;
  } finally {
    savingCollapse = false;
  }
}
const search = ref(""),
  cover = ref(""),
  modID = ref(""),
  builtinsOpen = ref(true),
  coverEditorOpen = ref(false),
  coverPositionX = ref(50),
  coverPositionY = ref(50),
  coverZoom = ref(1);
let coverGeneration = 0;
const editingCoverId=ref("");
watch(
  () => state.settings.selectedInstance,
  async id => {
    const generation = ++coverGeneration;
    cover.value = "";
    if (!id || !window.launcher) return;
    const image = await invoke<string>("instance.cover", { id }).catch(
      () => ""
    );
    if (generation === coverGeneration) cover.value = image||state.settings.defaultCover;
  },
  { immediate: true }
);
async function chooseCover(reset = false) {
  const id = state.settings.selectedInstance;
  if (!id) return;
  const image = await invoke<string | null>("instance.cover", {
    id,
    media: !reset,
    reset
  });
  if (id === state.settings.selectedInstance && image !== null)
    cover.value = image||state.settings.defaultCover;
}

const instances = computed(() =>
  orderedInstances.value.filter(
    i =>
      i.name.toLowerCase().includes(search.value.toLowerCase()) &&
      (builtinsOpen.value || !i.builtin)
  )
);
const config = computed(() => instanceConfig(state.settings.selectedInstance));
async function toggleFavorite() {
  if (!selectedInstance.value) return;
  await toggleInstanceFavorite(selectedInstance.value.id);
}
async function openFolder(kind: "screenshots" | "versions" | "saves") {
  if (!selectedInstance.value) return;
  await invoke("instance.folder", { id: selectedInstance.value.id, kind });
}
function editCoverPlacement() {
  editingCoverId.value=state.settings.selectedInstance;
  coverPositionX.value = config.value.coverPositionX;
  coverPositionY.value = config.value.coverPositionY;
  coverZoom.value = config.value.coverZoom;
  coverEditorOpen.value = true;
}
async function saveCoverPlacement() {
  if (!selectedInstance.value) return;
  await invoke("instance.cover-placement", {id:editingCoverId.value,x:coverPositionX.value,y:coverPositionY.value,zoom:coverZoom.value});
  coverEditorOpen.value = false;
  await reload();
}
async function chooseRoot() {
  const gameRoot = await invoke<string | null>("directory.choose");
  if (gameRoot) {
    await saveSettings({ gameRoot });
    await reload();
  }
}
</script>
<template>
  <DeleteInstance :id="deleting" @close="deleting = ''"/>
  <ModManager :id="modID" @close="modID = ''" />
  <div :class="['desktop-home', { 'simple-home': state.settings.simpleHome, 'instances-collapsed': instancesCollapsed }]">
    <div id="home-instance-list" class="instance-rail" :inert="instancesCollapsed || undefined" :aria-hidden="instancesCollapsed">
    <section class="world-list"
      ><header
        ><strong>游戏实例</strong
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
      ><div
        v-if="state.instances.some(instance => instance.builtin)"
        class="world-list-group-heading row items-center justify-between q-mt-sm q-mb-sm"
        ><strong class="subtle">默认服务器</strong
        ><q-btn
          flat
          dense
          round
          :icon="builtinsOpen ? 'expand_less' : 'expand_more'"
          :title="builtinsOpen ? '收起默认服务器' : '展开默认服务器'"
          @click="builtinsOpen = !builtinsOpen" /></div
      ><TransitionGroup
        name="instance-collapse"
        tag="div"
        class="world-list-items"
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
        ><div
          v-if="!instances.length"
          key="instance-list-empty"
          class="list-empty"
          ><q-icon name="folder_open" size="32px" /><p>{{
            search ? "没有匹配的实例" : "尚未添加游戏实例"
          }}</p
          ><q-btn
            flat
            dense
            color="primary"
            label="选择游戏目录"
            @click="perform(chooseRoot)" /></div></TransitionGroup
      ><footer
        ><q-icon name="folder_open" /><span :title="state.settings.gameRoot">{{
          state.settings.gameRoot || "未设置游戏目录"
        }}</span></footer
      ></section
    ></div>
    <section class="world-detail"
      ><div class="detail-toolbar"
        ><div class="detail-heading"><q-btn flat dense round :icon="instancesCollapsed ? 'chevron_right' : 'chevron_left'" :title="instancesCollapsed ? '展开实例列表' : '收起实例列表'" :aria-label="instancesCollapsed ? '展开实例列表' : '收起实例列表'" :aria-expanded="!instancesCollapsed" aria-controls="home-instance-list" @click="perform(toggleInstances)"/><span>实例概览</span></div
        ><div class="row q-gutter-xs detail-actions"
          ><q-btn
            flat
            dense
            icon="image"
            label="头图"
            :disable="!selectedInstance"
            @click="perform(() => chooseCover())" /><q-btn
            flat
            dense
            :icon="config.favorite ? 'star' : 'star_border'"
            :label="config.favorite ? '取消收藏' : '收藏'"
            :loading="!!favoritePending[state.settings.selectedInstance]"
            :disable="!selectedInstance"
            @click="perform(toggleFavorite)" /><q-btn
            v-if="cover"
            flat
            dense
            icon="restart_alt"
            title="恢复默认头图"
            @click="perform(() => chooseCover(true))" /><q-btn
            v-if="cover"
            flat
            dense
            icon="crop"
            label="裁剪"
            @click="editCoverPlacement" /><q-btn
            flat
            dense
            icon="extension"
            label="MOD"
            :disable="!selectedInstance || selectedInstance.placeholder"
            @click="modID = state.settings.selectedInstance" /><q-btn
            flat
            dense
            icon="folder_open"
            label="文件夹"
            :disable="!selectedInstance"
            ><q-menu
              ><q-list dense
                ><q-item
                  clickable
                  v-close-popup
                  @click="perform(() => openFolder('screenshots'))"
                  ><q-item-section avatar
                    ><q-icon name="photo_library" /></q-item-section
                  ><q-item-section>截图文件夹</q-item-section></q-item
                ><q-item
                  clickable
                  v-close-popup
                  @click="perform(() => openFolder('versions'))"
                  ><q-item-section avatar
                    ><q-icon name="folder_open" /></q-item-section
                  ><q-item-section>版本文件夹</q-item-section></q-item
                ><q-item
                  clickable
                  v-close-popup
                  @click="perform(() => openFolder('saves'))"
                  ><q-item-section avatar><q-icon name="save" /></q-item-section
                  ><q-item-section>存档文件夹</q-item-section></q-item
                ></q-list
              ></q-menu
            ></q-btn
          ><q-btn flat dense icon="delete_outline" title="删除实例" :disable="!selectedInstance || task.busy || state.running" @click="deleting=state.settings.selectedInstance"/><q-btn flat dense icon="tune" label="配置" to="/instances" /></div
      ></div>
      <div class="world-preview" :class="{ 'custom-cover': !!cover }"
        ><CoverImage v-if="cover" :src="cover" :x="config.coverPositionX" :y="config.coverPositionY" :zoom="config.coverZoom"/><div v-else class="preview-art" aria-hidden="true"
          ><div class="sun" /><div class="mountain mountain-back" /><div
            class="mountain mountain-front" /><div class="tower"
            ><i /><i /><i /></div></div
        ><div class="preview-caption"
          ><span>{{ selectedInstance?.loader || "MINECRAFT" }}</span
          ><h1>{{ selectedInstance?.name || "幻想镇" }}</h1
          ><p v-if="selectedInstance?.placeholder">整合包尚未发布</p
          ><p v-else>{{
            selectedInstance
              ? "Minecraft " + selectedInstance.version
              : "未选择实例"
          }}</p></div
        ></div
      >
      <div v-if="!state.settings.simpleHome" class="detail-body"
        ><div class="detail-tabs"
          ><span class="active">基本信息</span
          ><router-link to="/notices">服务器公告</router-link
          ><button class="text-link" @click="taskDetailsOpen.value = true"
            >任务与运行日志</button
          ></div
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
            ><dt>分配内存</dt
            ><dd>{{
              selectedInstance
                ? instanceMemoryLabel(selectedInstance.id)
                : "自动分配"
            }}</dd></div
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
  <q-dialog v-model="coverEditorOpen"
    ><q-card class="dialog-card"
      ><q-card-section
        ><h2>调整头图裁剪</h2
        ><div class="world-preview q-mb-md"
          ><CoverImage v-if="cover" :src="cover" :x="coverPositionX" :y="coverPositionY" :zoom="coverZoom" editable @move="(x,y)=>{coverPositionX=x;coverPositionY=y}"/></div
        ><label>水平位置 · {{ Math.round(coverPositionX) }}%</label
        ><q-slider
          v-model="coverPositionX"
          :min="0"
          :max="100"
          :step="1"
          label /><label>垂直位置 · {{ Math.round(coverPositionY) }}%</label
        ><q-slider
          v-model="coverPositionY"
          :min="0"
          :max="100"
          :step="1"
          label /><label>缩放 · {{ coverZoom.toFixed(2) }}×</label
        ><q-slider
          v-model="coverZoom"
          :min="1"
          :max="2"
          :step="0.01"
          label /></q-card-section
      ><q-card-actions align="right"
        ><q-btn flat label="取消" v-close-popup /><q-btn
          unelevated
          class="primary-button"
          label="保存裁剪位置"
          @click="perform(saveCoverPlacement)" /></q-card-actions></q-card
  ></q-dialog>
</template>
