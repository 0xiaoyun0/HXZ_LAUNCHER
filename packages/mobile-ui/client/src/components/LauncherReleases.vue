<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke, errorMessage } from "../lib/launcher";
const items = ref<
    { version: string; title: string; body: string; date: string }[]
  >([]),
  loading = ref(false),
  error = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try {
    items.value = await invoke("launcher.releases");
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(() => void load());
</script>
<template>
  <section class="panel launcher-releases"
    ><header class="row items-center justify-between"
      ><h2>启动器更新日志</h2
      ><q-btn
        flat
        round
        icon="refresh"
        title="刷新启动器日志"
        :loading="loading"
        @click="load" /></header
    ><p v-if="error" class="subtle">{{ error }}</p
    ><p v-else-if="loading">正在获取 GitHub 更新日志…</p
    ><p v-else-if="!items.length">暂无已发布版本</p
    ><details
      v-for="(item, index) in items"
      :key="item.version"
      :open="index === 0"
      ><summary
        ><strong>{{ item.title }}</strong
        ><time>{{ new Date(item.date).toLocaleDateString() }}</time></summary
      ><pre>{{ item.body }}</pre>
    </details></section
  >
</template>
