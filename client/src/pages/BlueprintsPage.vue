<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { community, communityRequest } from "../lib/community";
import { perform, invoke, errorMessage } from "../lib/launcher";
import {
  type Blueprint,
  blueprintCategories,
  statusLabels,
  jsonRequest,
  coverImage,
  displayDate
} from "../lib/content";
const route = useRoute(),
  router = useRouter();
const items = ref<Blueprint[]>([]),
  total = ref(0),
  page = ref(1),
  query = ref(""),
  category = ref(""),
  mc = ref(""),
  loader = ref(""),
  scope = ref("public");
const loading = ref(false),
  error = ref(""),
  detail = ref<Blueprint | null>(null),
  uploadOpen = ref(false),
  uploading = ref(false),
  file = ref<File | null>(null),
  cover = ref<File | null>(null);
const access = ref({ admin: false, reviewer: false }),
  reason = ref(""),
  submitting = ref(false);
const form = ref({
  title: "",
  description: "",
  category: blueprintCategories[0],
  mc: "1.21.1",
  loader: "neoforge",
  create_version: "",
  dependencies: ""
});
const detailOpen = computed({
  get: () => !!detail.value,
  set: () => {
    detail.value = null;
    void router.push("/blueprints");
  }
});
const canReview = computed(
  () =>
    access.value.reviewer &&
    detail.value &&
    detail.value.size > 0 &&
    (access.value.admin || detail.value.uid !== community.user?.uid)
);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const params = new URLSearchParams({
      q: query.value,
      category: category.value,
      mc: mc.value,
      loader: loader.value,
      scope: scope.value,
      offset: String((page.value - 1) * 24)
    });
    const value = await communityRequest<{ items: Blueprint[]; total: number }>(
      "/api/blueprints?" + params
    );
    items.value = value.items;
    total.value = value.total;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function permissions() {
  try {
    access.value = await communityRequest("/api/content/access");
  } catch {
    access.value = { admin: false, reviewer: false };
  }
}
async function openDetail(id: string) {
  error.value = "";
  reason.value = "";
  try {
    detail.value = await communityRequest(
      "/api/blueprints/" + encodeURIComponent(id)
    );
  } catch (e) {
    error.value = errorMessage(e);
  }
}
function filter() {
  page.value = 1;
  void load();
}
async function upload() {
  if (!file.value || !file.value.name.toLowerCase().endsWith(".nbt"))
    throw Error("请选择机械动力 .nbt 蓝图文件");
  if (file.value.size > 8 * 1024 * 1024) throw Error("蓝图文件不能超过 8 MB");
  const uploadFile = file.value;
  uploading.value = true;
  let id = "";
  try {
    const image = cover.value ? await coverImage(cover.value) : "";
    const created = await communityRequest<{ id: string }>(
      "/api/blueprints",
      jsonRequest("POST", { ...form.value, cover: image }),
      true
    );
    id = created.id;
    await communityRequest(
      "/api/blueprints/" + id + "/file",
      {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: uploadFile,
        signal: AbortSignal.timeout(120000)
      },
      true
    );
    uploadOpen.value = false;
    file.value = null;
    cover.value = null;
    form.value.title = "";
    form.value.description = "";
    scope.value = "mine";
    filter();
  } catch (e) {
    if (id)
      await communityRequest(
        "/api/blueprints/" + id,
        { method: "DELETE" },
        true
      ).catch(() => {});
    throw e;
  } finally {
    uploading.value = false;
  }
}
async function review(status: string) {
  if (!detail.value) return;
  submitting.value = true;
  try {
    await communityRequest(
      "/api/blueprints/" + detail.value.id + "/review",
      jsonRequest("POST", { status, reason: reason.value }),
      true
    );
    await openDetail(detail.value.id);
    await load();
  } finally {
    submitting.value = false;
  }
}
async function remove() {
  if (!detail.value) return;
  await communityRequest(
    "/api/blueprints/" + detail.value.id,
    { method: "DELETE" },
    true
  );
  detailOpen.value = false;
  await load();
}
watch(
  () => route.params.id,
  id => {
    if (typeof id === "string") void openDetail(id);
    else detail.value = null;
  },
  { immediate: true }
);
watch(
  () => community.connected,
  () => {
    void permissions();
    if (!community.connected && scope.value !== "public") {
      scope.value = "public";
      filter();
    }
  }
);
onMounted(() => {
  void load();
  void permissions();
});
</script>
<template>
  <div class="page-heading"
    ><div><h1>机械动力蓝图库</h1></div
    ><q-btn
      class="primary-button"
      unelevated
      icon="upload"
      label="上传蓝图"
      :disable="!community.connected"
      @click="uploadOpen = true"
  /></div>
  <div class="content-toolbar panel">
    <q-input
      v-model="query"
      outlined
      dense
      placeholder="搜索名称、作者或说明"
      @keyup.enter="filter"
      ><template #prepend><q-icon name="search" /></template
    ></q-input>
    <q-select
      v-model="category"
      outlined
      dense
      :options="['', ...blueprintCategories]"
      label="分类"
      :display-value="category || '全部分类'"
      @update:model-value="filter"
    />
    <q-input
      v-model="mc"
      outlined
      dense
      label="游戏版本"
      placeholder="全部"
      @keyup.enter="filter"
    />
    <q-select
      v-model="loader"
      outlined
      dense
      :options="['', 'neoforge', 'forge', 'fabric', 'quilt', '通用']"
      :display-value="loader || '全部加载器'"
      label="加载器"
      @update:model-value="filter"
    />
    <q-btn outline icon="search" label="查找" @click="filter" />
  </div>
  <div class="content-tabs"
    ><q-btn
      flat
      :class="{ selected: scope === 'public' }"
      label="公开蓝图"
      @click="
        scope = 'public';
        filter();
      " /><q-btn
      v-if="community.connected"
      flat
      :class="{ selected: scope === 'mine' }"
      label="我的上传"
      @click="
        scope = 'mine';
        filter();
      " /><q-btn
      v-if="access.reviewer"
      flat
      :class="{ selected: scope === 'review' }"
      label="审核队列"
      @click="
        scope = 'review';
        filter();
      " /><span class="subtle">{{ total }} 份蓝图</span
    ><q-btn
      flat
      round
      icon="refresh"
      title="刷新蓝图"
      :loading="loading"
      @click="load"
  /></div>
  <div v-if="!community.connected" class="info-note q-mb-md"
    >登录并连接社区后可上传蓝图。<router-link to="/chat" class="text-link"
      >连接社区</router-link
    ></div
  >
  <div v-if="error" class="info-note error-note q-mb-md">{{ error }}</div>
  <div v-if="loading && !items.length" class="content-empty"
    ><q-spinner size="30px"
  /></div>
  <div v-else-if="!items.length && !error" class="panel content-empty"
    ><q-icon name="view_in_ar" size="40px" /><p>{{
      scope === "review" ? "暂无待审核蓝图" : "暂无蓝图"
    }}</p></div
  >
  <div class="blueprint-grid"
    ><router-link
      v-for="item in items"
      :key="item.id"
      :to="'/blueprints/' + item.id"
      class="panel blueprint-card"
    >
      <div class="blueprint-cover"
        ><img
          v-if="item.cover"
          :src="item.cover"
          alt="蓝图封面"
          loading="lazy"
        /><q-icon v-else name="view_in_ar" size="54px" /><span
          v-if="scope !== 'public'"
          class="content-badge"
          >{{ statusLabels[item.status] }}</span
        ></div
      >
      <div class="blueprint-summary"
        ><h2>{{ item.title }}</h2
        ><p class="subtle">{{ item.name }} · {{ item.category }}</p
        ><div class="content-tags"
          ><span>MC {{ item.mc }}</span
          ><span>{{ item.loader }}</span
          ><span>Create {{ item.create_version }}</span></div
        ><div class="blueprint-foot"
          ><span>{{ item.metadata.dimensions?.join(" × ") || "等待上传" }}</span
          ><span><q-icon name="download" /> {{ item.downloads }}</span></div
        ></div
      >
    </router-link></div
  >
  <q-pagination
    v-if="total > 24"
    v-model="page"
    :max="Math.ceil(total / 24)"
    :max-pages="7"
    class="content-pagination"
    @update:model-value="load"
  />
  <q-dialog v-model="detailOpen"
    ><div v-if="detail" class="dialog-panel content-detail"
      ><div class="section-title"
        ><h2>{{ detail.title }}</h2
        ><q-btn
          flat
          round
          icon="close"
          title="关闭蓝图详情"
          @click="detailOpen = false"
      /></div>
      <img
        v-if="detail.cover"
        class="content-detail-cover"
        :src="detail.cover"
        alt="蓝图封面"
      />
      <div class="content-tags"
        ><span>{{ detail.category }}</span
        ><span>MC {{ detail.mc }}</span
        ><span>{{ detail.loader }}</span
        ><span>Create {{ detail.create_version }}</span
        ><span>{{ statusLabels[detail.status] }}</span></div
      >
      <p class="subtle">{{ detail.name }} · {{ displayDate(detail.created) }}</p
      ><p class="content-body">{{ detail.description }}</p>
      <dl class="blueprint-facts"
        ><div
          ><dt>尺寸</dt
          ><dd>{{ detail.metadata.dimensions?.join(" × ") || "—" }}</dd></div
        ><div
          ><dt>方块数</dt><dd>{{ detail.metadata.blocks || "—" }}</dd></div
        ><div
          ><dt>文件</dt><dd>{{ (detail.size / 1024).toFixed(1) }} KB</dd></div
        ></dl
      >
      <p v-if="detail.dependencies" class="content-body"
        ><strong>模组依赖</strong><br />{{ detail.dependencies }}</p
      >
      <details v-if="detail.metadata.materials?.length"
        ><summary>方块类型（{{ detail.metadata.materials.length }}）</summary
        ><p class="content-body subtle">{{
          detail.metadata.materials.join("\n")
        }}</p></details
      >
      <div v-if="detail.reason" class="info-note q-my-md"
        >审核说明：{{ detail.reason }}</div
      >
      <div v-if="canReview" class="content-review"
        ><q-input
          v-model="reason"
          outlined
          type="textarea"
          label="审核说明（不通过时必填）"
          maxlength="1000" /><div class="content-actions"
          ><q-btn
            outline
            color="negative"
            label="不通过 / 下架"
            :loading="submitting"
            @click="perform(() => review('rejected'))" /><q-btn
            class="primary-button"
            unelevated
            label="审核通过"
            :loading="submitting"
            @click="perform(() => review('approved'))" /></div
      ></div>
      <div class="content-actions"
        ><q-btn
          v-if="access.admin || detail.uid === community.user?.uid"
          flat
          color="negative"
          label="删除蓝图"
          @click="perform(remove)" /><q-btn
          class="primary-button"
          unelevated
          icon="download"
          label="下载蓝图"
          :disable="!detail.size"
          @click="
            perform(() => invoke('blueprints.download', { id: detail!.id }))
          "
      /></div> </div
  ></q-dialog>
  <q-dialog v-model="uploadOpen" :persistent="uploading"
    ><div class="dialog-panel content-detail"
      ><form @submit.prevent="perform(upload)"
        ><div class="section-title"
          ><h2>上传蓝图</h2
          ><q-btn
            flat
            round
            icon="close"
            :disable="uploading"
            @click="uploadOpen = false"
        /></div>
        <div class="content-form"
          ><q-input
            v-model="form.title"
            outlined
            label="蓝图名称"
            maxlength="100"
            :rules="[v => !!v || '请填写名称']" /><div class="content-form-row"
            ><q-select
              v-model="form.category"
              outlined
              label="分类"
              :options="blueprintCategories" /><q-select
              v-model="form.loader"
              outlined
              label="加载器"
              :options="[
                'neoforge',
                'forge',
                'fabric',
                'quilt',
                '通用'
              ]" /></div
          ><div class="content-form-row"
            ><q-input
              v-model="form.mc"
              outlined
              label="Minecraft 版本" /><q-input
              v-model="form.create_version"
              outlined
              label="机械动力版本"
              placeholder="例如 6.0.6" /></div
          ><q-input
            v-model="form.description"
            outlined
            type="textarea"
            label="功能与使用说明"
            maxlength="12000" /><q-input
            v-model="form.dependencies"
            outlined
            label="附属模组依赖（可选）"
            maxlength="2000" /><q-file
            v-model="file"
            outlined
            label="蓝图文件 · .nbt · 最大 8 MB"
            accept=".nbt" /><q-file
            v-model="cover"
            outlined
            label="封面图片（可选）"
            accept="image/png,image/jpeg,image/webp"
        /></div>
        <p class="subtle">提交后进入审核，通过后才会公开展示和下载。</p
        ><div class="content-actions"
          ><q-btn
            flat
            label="取消"
            :disable="uploading"
            @click="uploadOpen = false" /><q-btn
            type="submit"
            class="primary-button"
            unelevated
            label="提交审核"
            :loading="uploading"
        /></div> </form></div
  ></q-dialog>
</template>
