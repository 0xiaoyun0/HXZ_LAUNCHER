<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { groups, invoke, errorMessage, state } from "../lib/launcher";
interface UpdateFeed {
  groupId: string;
  source: string;
  status: string;
  error?: string;
  currentVersion?: string;
  entries: { id: string; version: string; date: string; content: string }[];
}
const route = useRoute(),
  feeds = ref<UpdateFeed[]>([]),
  loading = ref(false),
  error = ref("");
const visible = computed(() =>
  groups.filter(g => !route.params.group || g.id === route.params.group)
);
const feed = (id: string) => feeds.value.find(f => f.groupId === id);
let timer: ReturnType<typeof setInterval>,
  generation = 0;
async function refresh() {
  const current = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await invoke<UpdateFeed[]>("update-logs.list");
    if (current === generation) feeds.value = result;
  } catch (e) {
    if (current === generation) {
      feeds.value = [];
      error.value = errorMessage(e);
    }
  } finally {
    if (current === generation) loading.value = false;
  }
}
watch(
  () => state.settings.communityUrl,
  () => {
    feeds.value = [];
    void refresh();
  }
);
onMounted(() => {
  void refresh();
  timer = setInterval(() => {
    if (!loading.value) void refresh();
  }, 60000);
});
onUnmounted(() => {
  generation++;
  clearInterval(timer);
});
</script>
<template>
  <section class="update-log-section">
    <div class="section-title"
      ><h2>整合包更新 · HXZ UP</h2
      ><q-btn
        flat
        dense
        icon="refresh"
        label="刷新日志"
        :loading="loading"
        @click="refresh"
    /></div>
    <p v-if="error" class="info-note">更新日志暂不可用：{{ error }}</p>
    <div :class="['update-feed-grid', { single: !!route.params.group }]">
      <article
        v-for="group in visible"
        :key="group.id"
        class="panel update-feed"
        :data-group="group.id"
      >
        <header
          ><span class="server-tag" :class="group.id">{{ group.name }}</span
          ><small>HXZ UP 更新日志</small></header
        >
        <p v-if="!feed(group.id)" class="subtle">{{
          loading ? "正在读取…" : "等待连接更新日志服务"
        }}</p>
        <template v-else>
          <p v-if="feed(group.id)?.status === 'unconfigured'" class="subtle"
            >管理员尚未配置此服的更新日志来源。</p
          >
          <p
            v-else-if="feed(group.id)?.status === 'maintenance'"
            class="info-note"
            >此服整合包正在维护，发布后显示更新日志。</p
          >
          <p v-else-if="feed(group.id)?.status === 'error'" class="info-note">{{
            feed(group.id)?.error
          }}</p>
          <template v-else>
            <p v-if="!feed(group.id)?.entries.length" class="subtle"
              >此服还没有发布更新日志。</p
            >
            <q-expansion-item
              v-for="(entry, i) in feed(group.id)?.entries || []"
              :key="group.id + ':' + entry.id"
              :default-opened="i === 0"
              :label="entry.version"
              :caption="entry.date"
              class="update-log-entry"
            >
              <p class="notice-body">{{
                entry.content || "此版本未填写更新说明。"
              }}</p>
            </q-expansion-item>
          </template>
          <footer
            ><small :title="feed(group.id)?.source"
              >来源：{{ feed(group.id)?.source || "未配置" }}</small
            ><router-link
              v-if="!route.params.group"
              :to="'/notices/' + group.id"
              >查看此服</router-link
            ></footer
          >
        </template>
      </article>
    </div>
  </section>
</template>
