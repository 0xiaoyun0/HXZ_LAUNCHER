<script setup lang="ts">
import LauncherReleases from "../components/LauncherReleases.vue";
import UpdateLogs from "../components/UpdateLogs.vue";
import { computed, ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { notices, loadNotices, groups, invoke, perform } from "../lib/launcher";
import { community, connect } from "../lib/community";
const route = useRoute(),
  launcherTab = ref(false),
  show = ref(false),
  title = ref(""),
  body = ref(""),
  groupId = ref("survival");
const filtered = computed(() =>
  notices.items.filter(
    n => !route.params.group || n.groupId === route.params.group
  )
);
const heading = computed(
  () => groups.find(g => g.id === route.params.group)?.name || "通知公告"
);
async function publish() {
  await invoke("notices.publish", {
    title: title.value,
    body: body.value,
    groupId: groupId.value
  });
  show.value = false;
  title.value = "";
  body.value = "";
  await loadNotices();
}
async function remove(id: string) {
  await invoke("notices.delete", { id });
  await loadNotices();
}
onMounted(() => void loadNotices());
</script>
<template>
  <div class="page-heading"
    ><div
      ><h1>{{ launcherTab ? "启动器更新" : heading }}</h1></div
    ><div class="row q-gutter-sm"
      ><q-btn
        flat
        round
        icon="refresh"
        :loading="notices.loading"
        title="刷新公告"
        @click="loadNotices" /><q-btn
        v-if="community.user?.admin"
        unelevated
        class="primary-button"
        icon="edit_note"
        label="发布公告"
        @click="show = true" /></div
  ></div>
  <div class="filter-tabs" @click="launcherTab = false"
    ><router-link
      to="/notices"
      :class="{ selected: !launcherTab && !route.params.group }"
      >全部动态</router-link
    ><router-link
      v-for="group in groups"
      :key="group.id"
      :to="'/notices/' + group.id"
      :class="{ selected: !launcherTab && route.params.group === group.id }"
      >{{ group.name }}</router-link
    ><button :class="{ selected: launcherTab }" @click.stop="launcherTab = true"
      >启动器更新</button
    ></div
  >
  <LauncherReleases v-if="launcherTab" />
  <template v-else>
    <UpdateLogs />
    <h2 class="notice-section-heading">社区公告</h2>
    <div v-if="notices.error" class="panel empty-state"
      ><q-icon name="cloud_off" size="44px" /><h2>公告服务暂未连接</h2
      ><p>{{ notices.error }}</p
      ><router-link to="/settings" class="text-link"
        >检查社区服务设置</router-link
      ></div
    ><div v-else-if="!filtered.length" class="panel empty-state"
      ><q-icon name="campaign" size="44px" /><h2>这里还没有公告</h2
      ><p>管理员发布后，内容会自动出现在对应分组。</p
      ><q-btn
        v-if="!community.connected"
        flat
        color="primary"
        label="连接社区"
        @click="perform(connect)"
    /></div>
    <article
      v-for="notice in filtered"
      :key="notice.id"
      class="panel notice-article"
      ><div class="row items-center justify-between"
        ><span class="tag">{{
          groups.find(g => g.id === notice.groupId)?.name
        }}</span
        ><time>{{ new Date(notice.updated).toLocaleString() }}</time></div
      ><h2>{{ notice.title }}</h2
      ><p class="notice-body">{{ notice.body }}</p
      ><footer
        ><span>{{ notice.author }} · 公告</span
        ><q-btn
          v-if="community.user?.admin"
          flat
          dense
          icon="delete_outline"
          label="删除"
          @click="perform(() => remove(notice.id))" /></footer
    ></article>
  </template>
  <q-dialog v-model="show"
    ><q-card class="dialog-card wide"
      ><q-card-section
        ><h2>发布公告</h2
        ><q-select
          v-model="groupId"
          :options="groups.map(g => ({ label: g.name, value: g.id }))"
          emit-value
          map-options
          outlined
          label="公告分组"
          class="q-mb-md" /><q-input
          v-model="title"
          outlined
          maxlength="100"
          label="标题"
          class="q-mb-md" /><q-input
          v-model="body"
          outlined
          type="textarea"
          maxlength="12000"
          rows="10"
          label="正文（纯文本）" /></q-card-section
      ><q-card-actions align="right"
        ><q-btn flat label="取消" v-close-popup /><q-btn
          unelevated
          class="primary-button"
          label="发布"
          :disable="!title.trim() || !body.trim()"
          @click="perform(publish, '公告已发布')" /></q-card-actions></q-card
  ></q-dialog>
</template>
