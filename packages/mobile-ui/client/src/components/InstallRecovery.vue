<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { invoke, perform, task, state, reload } from "../lib/launcher";
const jobs = ref<{ id: string; status: string; error?: string }[]>([]),
  loading = ref(false);
async function load() {
  if (!window.launcher) return;
  loading.value = true;
  try {
    jobs.value = await invoke("install.list");
  } finally {
    loading.value = false;
  }
}
async function resume(id: string) {
  try {
    await invoke("install.resume", { id });
  } finally {
    await load();
    await reload();
  }
}
async function discard(id: string) {
  await invoke("install.discard", { id });
  await load();
  await reload();
}
watch(
  () => task.busy,
  () => {
    if (!task.busy) void perform(load);
  }
);
watch(
  () => state.settings.gameRoot,
  () => void perform(load)
);
onMounted(() => void perform(load));
</script>
<template>
  <section v-if="jobs.length" class="install-recovery"
    ><header class="row items-center justify-between"
      ><h3>未完成的安装</h3
      ><q-btn
        flat
        round
        dense
        icon="refresh"
        title="刷新安装任务"
        :loading="loading"
        @click="perform(load)" /></header
    ><div v-for="job in jobs" :key="job.id" class="recovery-row"
      ><div
        ><strong>{{ job.id }}</strong
        ><small>{{
          job.error || "上次安装未完成，已校验文件可继续使用"
        }}</small></div
      ><q-btn
        outline
        label="继续安装"
        :disable="task.busy || state.running"
        @click="perform(() => resume(job.id))" /><q-btn
        flat
        label="清理"
        :disable="task.busy || state.running"
        @click="perform(() => discard(job.id))" /></div
  ></section>
</template>
