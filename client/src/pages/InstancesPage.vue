<script setup lang="ts">
import ModManager from "../components/ModManager.vue";
import { ref } from "vue";
import {
  state,
  task,
  desktop,
  perform,
  invoke,
  reload,
  saveSettings,
  launch,
  instanceConfig,
  orderedInstances,
  type InstanceConfig
} from "../lib/launcher";
const modID = ref(""),
  builtinsOpen = ref(true);
const showCreate = ref(false),
  name = ref(""),
  updateUrl = ref(""),
  creating = ref(false),
  editing = ref(""),
  urls = ref(""),
  jvm = ref("");
const config = ref<InstanceConfig>(instanceConfig(""));
async function chooseRoot() {
  const gameRoot = await invoke<string | null>("directory.choose");
  if (gameRoot) {
    await saveSettings({ gameRoot });
    await reload();
  }
}
async function create() {
  creating.value = true;
  try {
    await invoke("instance.create", {
      name: name.value,
      updateUrl: updateUrl.value
    });
    showCreate.value = false;
  } finally {
    creating.value = false;
    await reload();
  }
}
function edit(id: string) {
  editing.value = id;
  config.value = instanceConfig(id);
  urls.value = config.value.updateUrls.join("\n");
  jvm.value = config.value.jvmArgs.join("\n");
}
async function save() {
  await saveSettings({
    instance: {
      id: editing.value,
      ...config.value,
      updateUrls: urls.value
        .split("\n")
        .map(v => v.trim())
        .filter(Boolean),
      jvmArgs: jvm.value
        .split("\n")
        .map(v => v.trim())
        .filter(Boolean)
    }
  });
  editing.value = "";
}
async function toggleFavorite(id: string) {
  const current = instanceConfig(id);
  await saveSettings({
    instance: { id, ...current, favorite: !current.favorite }
  });
  await reload();
}
async function openFolder(
  id: string,
  kind: "screenshots" | "versions" | "saves"
) {
  await invoke("instance.folder", { id, kind });
}
</script>
<template>
  <ModManager :id="modID" @close="modID = ''" />
  <div class="page-heading"
    ><div><h1>游戏实例</h1></div
    ><q-btn
      unelevated
      icon="add"
      label="添加整合包"
      class="primary-button"
      :disable="!desktop || task.busy || state.running"
      @click="showCreate = true"
  /></div>
  <div class="directory-bar"
    ><q-icon name="folder_open" size="22px" /><span>{{
      state.settings.gameRoot || "尚未选择 .minecraft 游戏目录"
    }}</span
    ><q-btn
      flat
      label="选择目录"
      :disable="!desktop || task.busy || state.running"
      @click="perform(chooseRoot)" /><q-btn
      flat
      round
      icon="refresh"
      title="重新扫描"
      @click="perform(reload)"
  /></div>
  <div v-if="!state.instances.length" class="empty-state panel"
    ><div class="empty-symbol"><q-icon name="view_in_ar" size="46px" /></div
    ><h2>没有游戏实例</h2
    ><p
      >选择已有的 .minecraft 目录，或使用管理员提供的 HXZ UP 地址添加整合包。</p
    ><q-btn
      flat
      color="primary"
      label="选择已有游戏目录"
      :disable="!desktop"
      @click="perform(chooseRoot)"
  /></div>
  <div v-if="state.instances.length" class="instance-table">
    <div class="instance-table-head"
      ><span>实例名称 / 版本</span><span>加载器</span><span>内存</span
      ><span>更新方式</span><span>操作</span></div
    ><div
      v-if="state.instances.some(instance => instance.builtin)"
      class="instance-table-group-heading row items-center justify-between"
      ><strong class="subtle">默认服务器</strong
      ><q-btn
        flat
        dense
        round
        :icon="builtinsOpen ? 'expand_less' : 'expand_more'"
        :title="builtinsOpen ? '收起默认服务器' : '展开默认服务器'"
        @click="builtinsOpen = !builtinsOpen"
    /></div>
    <TransitionGroup
      name="instance-collapse"
      tag="div"
      class="instance-table-rows"
    >
      <template
        v-for="(instance, index) in orderedInstances"
        :key="instance.id"
      >
        <div
          v-if="builtinsOpen || !instance.builtin"
          :class="[
            'instance-table-row',
            {
              selected: state.settings.selectedInstance === instance.id,
              'other-instance-start':
                !instance.builtin &&
                (index === 0 || orderedInstances[index - 1]?.builtin)
            }
          ]"
          @dblclick="
            !task.busy &&
            !state.running &&
            perform(() => saveSettings({ selectedInstance: instance.id }))
          "
        >
          <button
            class="instance-name-cell"
            :disabled="task.busy || state.running"
            @click="
              perform(() => saveSettings({ selectedInstance: instance.id }))
            "
            ><span class="world-icon"
              ><q-icon name="extension" size="25px" /></span
            ><span
              ><strong>{{ instance.name }}</strong
              ><small>{{ instance.error || instance.version }}</small></span
            ><q-icon
              v-if="state.settings.selectedInstance === instance.id"
              name="check_circle"
              color="primary"
          /></button>
          <span>{{ instance.loader || "待安装" }}</span
          ><span>{{ instanceConfig(instance.id).memoryMB }} MB</span
          ><span>{{
            instanceConfig(instance.id).autoUpdate ? "启动前更新" : "手动"
          }}</span>
          <div class="row no-wrap"
            ><q-btn
              flat
              round
              dense
              icon="extension"
              title="MOD 管理"
              :disable="instance.placeholder || !!instance.error"
              @click="modID = instance.id"
            /><q-btn
              flat
              round
              dense
              icon="login"
              title="启动并进入服务器"
              :disable="instance.placeholder || task.busy || state.running"
              @click="perform(() => launch(instance.id, false, true))"
            /><q-btn
              flat
              round
              dense
              icon="tune"
              title="实例配置"
              :disable="task.busy || state.running"
              @click="edit(instance.id)"
            /><q-btn
              flat
              round
              dense
              icon="sync"
              title="立即更新"
              :disable="instance.builtin || task.busy || state.running"
              @click="perform(() => launch(instance.id, true))"
            /><q-btn
              flat
              round
              dense
              icon="folder_open"
              title="打开实例目录"
              @click="
                perform(() => invoke('instance.open', { id: instance.id }))
              "
            /><q-btn
              flat
              round
              dense
              :icon="
                instanceConfig(instance.id).favorite ? 'star' : 'star_border'
              "
              :title="
                instanceConfig(instance.id).favorite ? '取消收藏' : '收藏实例'
              "
              @click="perform(() => toggleFavorite(instance.id))"
            /><q-btn flat round dense icon="more_horiz" title="打开实例文件夹"
              ><q-menu
                ><q-list dense
                  ><q-item
                    clickable
                    v-close-popup
                    @click="
                      perform(() => openFolder(instance.id, 'screenshots'))
                    "
                    ><q-item-section>截图文件夹</q-item-section></q-item
                  ><q-item
                    clickable
                    v-close-popup
                    @click="perform(() => openFolder(instance.id, 'versions'))"
                    ><q-item-section>版本文件夹</q-item-section></q-item
                  ><q-item
                    clickable
                    v-close-popup
                    @click="perform(() => openFolder(instance.id, 'saves'))"
                    ><q-item-section>存档文件夹</q-item-section></q-item
                  ></q-list
                ></q-menu
              ></q-btn
            ></div
          >
        </div>
      </template>
    </TransitionGroup>
  </div>
  <q-dialog v-model="showCreate"
    ><q-card class="dialog-card"
      ><q-card-section
        ><h2>添加整合包</h2
        ><p class="subtle">服务端需已发布游戏版本与加载器配置。</p
        ><q-input
          v-model="name"
          outlined
          label="实例名称"
          maxlength="60"
          class="q-mb-md"
        /><q-input
          v-model="updateUrl"
          outlined
          label="HXZ UP 客户端接入地址"
          placeholder="https://update.example.com/packs/v3"
        /><p class="subtle"
          >先在本页选择游戏目录。添加后自动执行首次更新。</p
        ></q-card-section
      ><q-card-actions align="right"
        ><q-btn flat label="取消" v-close-popup :disable="creating" /><q-btn
          class="primary-button"
          unelevated
          label="添加并安装"
          :loading="creating"
          @click="perform(create)" /></q-card-actions></q-card
  ></q-dialog>
  <q-dialog
    :model-value="!!editing"
    @update:model-value="
      value => {
        if (!value) editing = '';
      }
    "
    ><q-card class="dialog-card wide"
      ><q-card-section
        ><h2>{{ editing }} · 实例配置</h2
        ><div class="form-grid"
          ><q-input
            v-model.number="config.memoryMB"
            outlined
            type="number"
            label="最大内存（MB）"
            :min="512"
            :max="state.system.memoryMB" /><div class="subtle self-center"
            >设备内存约
            {{ Math.round(state.system.memoryMB / 1024) }}
            GB，建议预留空间给系统。</div
          ><q-input
            v-model.number="config.width"
            outlined
            type="number"
            label="窗口宽度" /><q-input
            v-model.number="config.height"
            outlined
            type="number"
            label="窗口高度" /></div
        ><q-toggle
          v-model="config.isolated"
          label="实例隔离（配置、存档独立）" /><q-toggle
          v-model="config.fullscreen"
          label="全屏启动" /><q-separator class="q-my-md" /><q-toggle
          v-model="config.autoUpdate"
          label="每次启动前检查 HXZ UP 更新" /><q-input
          v-model="urls"
          outlined
          type="textarea"
          label="HXZ UP 客户端地址（每行一个）"
          rows="3"
          class="q-my-md" /><q-input
          v-model="config.serverAddress"
          outlined
          label="进入服务器的地址"
          placeholder="s1.hxzmc.top 或 主机:端口"
          class="q-mt-md" /><q-toggle
          v-model="config.autoJoin"
          label="启动后自动进入服务器"
          :disable="!config.serverAddress" /><q-expansion-item
          label="高级 JVM 参数"
          ><q-input
            v-model="jvm"
            outlined
            type="textarea"
            rows="3"
            label="每行一个参数，如 -XX:+UseG1GC"
            class="q-mt-md" /></q-expansion-item></q-card-section
      ><q-card-actions align="right"
        ><q-btn flat label="取消" v-close-popup /><q-btn
          class="primary-button"
          unelevated
          label="保存配置"
          @click="perform(save, '配置已保存')" /></q-card-actions></q-card
  ></q-dialog>
</template>
