<script setup lang="ts">
import PlayerAvatar from "./PlayerAvatar.vue";
import TaskDetails from "./TaskDetails.vue";
import {
  state,
  task,
  taskCount,
  taskDetailsOpen,
  selectedAccount,
  selectedInstance,
  instanceConfig,
  perform,
  launch,
  invoke
} from "../lib/launcher";
function dockStyle() {
  const column = state.settings.columns.dock;
  return {
    ...(column.color ? { backgroundColor: column.color } : {}),
    ...(column.opacity !== 1 ? { opacity: column.opacity } : {})
  };
}
</script>
<template>
  <div
    v-show="state.settings.columns.dock.visible"
    class="launch-dock"
    :style="dockStyle()"
    ><q-linear-progress
      v-if="task.busy"
      class="dock-progress"
      :indeterminate="!task.total"
      :value="task.total ? Math.min(1, task.completed / task.total) : 0"
      color="primary" /><div class="dock-instance"
      ><q-icon name="sports_esports" size="29px" /><div
        ><strong>{{ selectedInstance?.name || "未选择游戏实例" }}</strong
        ><small>{{
          task.busy
            ? task.phase + " · " + taskCount
            : selectedInstance
              ? selectedInstance.version + " · " + state.settings.memoryMode ===
                "auto"
                ? "自动内存"
                : instanceConfig(selectedInstance.id).memoryMB + " MB"
              : "在实例列表中选择或添加游戏"
        }}</small></div
      ></div
    ><q-btn
      flat
      dense
      class="dock-details"
      icon="expand_less"
      :label="state.settings.columns.dock.label || '任务详情'"
      @click="taskDetailsOpen.value = true" />
    <router-link to="/accounts" class="dock-account"
      ><PlayerAvatar
        class="small"
        :name="selectedAccount?.name"
        :uid="selectedAccount?.uuid" /><span>{{
        selectedAccount?.name || "登录皮肤站"
      }}</span
      ><q-icon name="unfold_more" size="16px" /></router-link
    ><q-btn
      v-if="task.busy"
      flat
      label="取消"
      @click="perform(() => invoke('task.cancel'))" /><q-btn
      v-if="state.running"
      unelevated
      class="primary-button dock-play"
      label="结束游戏"
      icon="stop"
      @click="perform(() => invoke('game.stop'))" /><q-btn
      v-else
      unelevated
      class="primary-button dock-play"
      label="启动游戏"
      icon="play_arrow"
      :loading="task.busy"
      :disable="
        !selectedInstance || !selectedAccount || selectedInstance.placeholder
      "
      @click="perform(() => launch())"
  /></div>
  <TaskDetails />
</template>
