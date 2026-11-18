<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
import { importing, showPack, installPack, type PackInfo } from "../lib/packs";
import { invoke, perform, task, state } from "../lib/launcher";
const dragging = ref(false);
let depth = 0;
function drag(event: DragEvent) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  depth++;
  dragging.value = true;
}
function leave() {
  if (--depth <= 0) {
    depth = 0;
    dragging.value = false;
  }
}
function over(event: DragEvent) {
  if (event.dataTransfer?.types.includes("Files")) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }
}
function drop(event: DragEvent) {
  event.preventDefault();
  depth = 0;
  dragging.value = false;
  const files = Array.from(event.dataTransfer?.files || []);
  void perform(async () => {
    if (task.busy || state.running) throw Error("请先完成当前任务");
    const fileItem = files[0];
    if (
      files.length !== 1 ||
      !fileItem ||
      !/\.(mrpack|zip|modpack|pack|instance)$/i.test(fileItem.name)
    )
      throw Error("支持 .mrpack、CurseForge、Prism、MultiMC 和 ZIP 整合包");
    const file = window.launcher?.filePath(fileItem);
    if (!file) throw Error("请使用桌面启动器导入");
    showPack(await invoke<PackInfo>("pack.inspect", { file }));
  });
}
onMounted(() => {
  window.addEventListener("dragenter", drag);
  window.addEventListener("dragleave", leave);
  window.addEventListener("dragover", over);
  window.addEventListener("drop", drop);
});
onBeforeUnmount(() => {
  window.removeEventListener("dragenter", drag);
  window.removeEventListener("dragleave", leave);
  window.removeEventListener("dragover", over);
  window.removeEventListener("drop", drop);
});
</script>
<template>
  <div v-if="dragging" class="pack-drop"
    ><q-icon name="download" size="56px" /><strong>松开以导入整合包</strong
    ><span>.mrpack · CurseForge · Prism · MultiMC · ZIP</span></div
  >
  <q-dialog
    :model-value="!!importing.pack"
    :persistent="importing.working"
    @update:model-value="
      v => {
        if (!v) importing.pack = null;
      }
    "
  >
    <q-card v-if="importing.pack" class="dialog-card"
      ><q-card-section
        ><h2>安装整合包</h2
        ><p>{{ importing.pack.name }} · {{ importing.pack.version }}</p
        ><div class="pack-properties"
          ><span>Minecraft {{ importing.pack.minecraft }}</span
          ><span
            >{{ importing.pack.loader || "原版" }}
            {{ importing.pack.loaderVersion }}</span
          ><span>{{ importing.pack.format || "Minecraft ZIP" }}</span
          ><span>{{ importing.pack.fileCount }} 个文件</span></div
        ><q-input
          v-model="importing.name"
          outlined
          label="实例名称"
          class="q-mt-lg"
          :disable="importing.working"
        /><template v-if="importing.pack.format === 'minecraft-zip'">
          <q-input
            v-model="importing.pack.minecraft"
            outlined
            label="Minecraft 版本（ZIP 未提供版本清单）"
            class="q-mt-md"
          />
          <q-select
            v-model="importing.pack.loader"
            outlined
            :options="[
              { label: '原版', value: '' },
              { label: 'Fabric', value: 'fabric' },
              { label: 'Quilt', value: 'quilt' },
              { label: 'Forge', value: 'forge' },
              { label: 'NeoForge', value: 'neoforge' }
            ]"
            emit-value
            map-options
            label="加载器"
            class="q-mt-md"
          />
          <q-input
            v-if="importing.pack.loader"
            v-model="importing.pack.loaderVersion"
            outlined
            label="加载器版本"
            class="q-mt-md"
          /> </template
        ><q-checkbox
          v-if="importing.pack.optionalFiles.length"
          v-model="importing.optional"
          :label="'安装可选文件（' + importing.pack.optionalFiles.length + '）'"
          :disable="importing.working"
        /><p class="q-mt-md">{{
          importing.pack.hxzup
            ? "已检测到 HXZ UP，安装后启用启动前自动更新。"
            : "未检测到 HXZ UP，使用整合包提供的文件。"
        }}</p
        ><div v-if="importing.working"
          ><q-linear-progress indeterminate /><p class="q-mt-sm">{{
            task.phase
          }}</p></div
        ></q-card-section
      ><q-card-actions align="right"
        ><q-btn
          v-if="importing.working"
          outline
          label="取消安装"
          @click="perform(() => invoke('task.cancel'))" /><q-btn
          v-else
          flat
          label="取消"
          @click="importing.pack = null" /><q-btn
          unelevated
          class="primary-button"
          label="安装"
          :loading="importing.working"
          :disable="!importing.name || state.running"
          @click="perform(installPack, '整合包已安装')" /></q-card-actions
    ></q-card>
  </q-dialog>
</template>
