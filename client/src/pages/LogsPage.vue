<script setup lang="ts">
import { computed, ref } from "vue";
import { logs, task, state, invoke, perform, desktop } from "../lib/launcher";
const query = ref("");
const content = computed(() =>
  logs
    .filter(line =>
      line.toLowerCase().includes((query.value || "").toLowerCase())
    )
    .join("\n")
);
</script>
<template>
  <div class="page-heading"
    ><div><h1>启动日志</h1></div
    ><q-btn
      outline
      label="导出日志"
      icon="download"
      :disable="!desktop"
      @click="perform(() => invoke('logs.export'), '日志已导出')" /></div
  ><div class="panel log-panel"
    ><div class="section-title"
      ><h2
        ><span
          :class="['online-dot', { offline: !task.busy && !state.running }]"
        />
        {{ task.phase }}</h2
      ><q-btn
        v-if="task.busy"
        flat
        label="取消任务"
        @click="perform(() => invoke('task.cancel'))" /></div
    ><q-input
      v-model="query"
      outlined
      dense
      clearable
      placeholder="搜索日志、文件名或错误"
      class="q-mb-md"
      ><template #prepend><q-icon name="search" /></template
    ></q-input>
    <pre class="log-output">{{
      content || "还没有运行日志。启动游戏或检查更新后，进度会显示在这里。"
    }}</pre
    ><p class="subtle q-mb-none"
      >只保留最近 1000
      行，登录凭据会自动隐藏。导出前仍建议检查模组输出的个人信息。</p
    ></div
  >
</template>
