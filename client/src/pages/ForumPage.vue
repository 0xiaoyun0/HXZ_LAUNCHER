<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import type { QInput } from "quasar";
import { useRoute, useRouter } from "vue-router";
import PlayerAvatar from "../components/PlayerAvatar.vue";
import EmojiPicker from "../components/EmojiPicker.vue";
import { community, communityRequest } from "../lib/community";
import { perform, errorMessage } from "../lib/launcher";
import {
  type ForumPost,
  type ForumReply,
  forumCategories,
  jsonRequest,
  displayDate
} from "../lib/content";
const route = useRoute(),
  router = useRouter(),
  items = ref<ForumPost[]>([]),
  total = ref(0),
  page = ref(1),
  query = ref(""),
  category = ref(""),
  loading = ref(false),
  error = ref("");
const detail = ref<ForumPost | null>(null),
  replies = ref<ForumReply[]>([]),
  replyTotal = ref(0),
  replyPage = ref(1),
  reply = ref(""),
  replyParent = ref<ForumReply | null>(null),
  composer = ref<QInput>(),
  sending = ref(false),
  createOpen = ref(false),
  creating = ref(false),
  access = ref({ admin: false });
const form = ref({ title: "", body: "", category: forumCategories[0] }),
  isDetail = computed(() => typeof route.params.id === "string");
type ForumReplyRow = { item: ForumReply; depth: number };
const replyRows = computed<ForumReplyRow[]>(() => {
  const children = new Map<string, ForumReply[]>();
  const ids = new Set(replies.value.map(item => item.id));
  for (const item of replies.value) {
    const parentId =
      item.parentId && ids.has(item.parentId) ? item.parentId : "";
    const list = children.get(parentId) || [];
    list.push(item);
    children.set(parentId, list);
  }
  const rows: ForumReplyRow[] = [];
  const visited = new Set<string>();
  function append(item: ForumReply, depth: number) {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    rows.push({ item, depth: Math.min(depth, 4) });
    for (const child of children.get(item.id) || []) append(child, depth + 1);
  }
  for (const item of children.get("") || []) append(item, 0);
  for (const item of replies.value) append(item, 0);
  return rows;
});
function displayCount(value: unknown) {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const params = new URLSearchParams({
      q: query.value,
      category: category.value,
      offset: String((page.value - 1) * 24)
    });
    const value = await communityRequest<{ items: ForumPost[]; total: number }>(
      "/api/forum/posts?" + params
    );
    items.value = value.items;
    total.value = value.total;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function loadDetail() {
  if (typeof route.params.id !== "string") return;
  loading.value = true;
  error.value = "";
  try {
    const value = await communityRequest<{
      post: ForumPost;
      replies: ForumReply[];
      total: number;
    }>(
      "/api/forum/posts/" +
        route.params.id +
        "?offset=" +
        (replyPage.value - 1) * 24
    );
    detail.value = value.post;
    replies.value = value.replies;
    replyTotal.value = value.total;
  } catch (e) {
    error.value = errorMessage(e);
    detail.value = null;
  } finally {
    loading.value = false;
  }
}
function filter() {
  page.value = 1;
  void load();
}
async function create() {
  creating.value = true;
  try {
    const value = await communityRequest<{ id: string }>(
      "/api/forum/posts",
      jsonRequest("POST", form.value),
      true
    );
    createOpen.value = false;
    form.value.title = "";
    form.value.body = "";
    await router.push("/forum/" + value.id);
  } finally {
    creating.value = false;
  }
}
async function sendReply() {
  if (!detail.value) return;
  sending.value = true;
  try {
    await communityRequest(
      "/api/forum/posts/" + detail.value.id + "/replies",
      jsonRequest("POST", {
        body: reply.value,
        parentId: replyParent.value?.id || null
      }),
      true
    );
    reply.value = "";
    replyPage.value = Math.ceil((replyTotal.value + 1) / 24);
    replyParent.value = null;
    await loadDetail();
    void nextTick(() => composer.value?.focus());
  } finally {
    sending.value = false;
  }
}
function pickReply(value: string) {
  reply.value += value;
  composer.value?.focus();
}
function pickPost(value: string) {
  form.value.body += value;
}
async function likeReply(item: ForumReply) {
  const value = await communityRequest<ForumReply>(
    "/api/forum/replies/" + item.id + "/like",
    jsonRequest("PUT", { liked: !item.liked }),
    true
  );
  Object.assign(item, value);
}
async function like() {
  if (!detail.value) return;
  detail.value = await communityRequest(
    "/api/forum/posts/" + detail.value.id + "/like",
    jsonRequest("PUT", { liked: !detail.value.liked }),
    true
  );
}
async function removePost() {
  if (!detail.value) return;
  await communityRequest(
    "/api/forum/posts/" + detail.value.id,
    { method: "DELETE" },
    true
  );
  await router.push("/forum");
}
async function removeReply(id: string) {
  await communityRequest(
    "/api/forum/replies/" + id,
    { method: "DELETE" },
    true
  );
  await loadDetail();
}
async function moderate(action: string, value: boolean) {
  if (!detail.value) return;
  await communityRequest(
    "/api/forum/posts/" + detail.value.id + "/moderate",
    jsonRequest("POST", { action, value }),
    true
  );
  await loadDetail();
}
async function permissions() {
  try {
    access.value = await communityRequest("/api/content/access");
  } catch {
    access.value = { admin: false };
  }
}
watch(
  () => route.params.id,
  () => {
    detail.value = null;
    replyPage.value = 1;
    reply.value = "";
    replyParent.value = null;
    if (isDetail.value) void loadDetail();
    else void load();
  },
  { immediate: true }
);
watch(
  () => community.connected,
  () => {
    void permissions();
    if (isDetail.value) void loadDetail();
  }
);
onMounted(() => void permissions());
</script>
<template>
  <div class="page-heading"
    ><div><h1>幻想镇论坛</h1></div
    ><q-btn
      v-if="!isDetail"
      class="primary-button"
      unelevated
      icon="edit_square"
      label="发布帖子"
      :disable="!community.connected"
      @click="createOpen = true" /><q-btn
      v-else
      outline
      label="全部帖子"
      to="/forum"
  /></div>
  <div v-if="error" class="info-note error-note q-mb-md">{{ error }}</div>
  <template v-if="!isDetail"
    ><div class="content-toolbar forum-toolbar panel"
      ><q-input
        v-model="query"
        outlined
        dense
        placeholder="搜索帖子"
        @keyup.enter="filter"
        ><template #prepend><q-icon name="search" /></template></q-input
      ><q-select
        v-model="category"
        outlined
        dense
        label="分类"
        emit-value
        map-options
        :options="[
          { label: '全部分类', value: '' },
          ...forumCategories.map(value => ({ label: value, value }))
        ]"
        @update:model-value="filter" /><q-btn
        outline
        icon="refresh"
        label="刷新"
        :loading="loading"
        @click="filter"
    /></div>
    <div v-if="!community.connected" class="info-note q-mb-md"
      >登录并连接社区后可发帖和回复。<router-link class="text-link" to="/chat"
        >连接社区</router-link
      ></div
    >
    <div v-if="!items.length && !loading && !error" class="panel content-empty"
      ><q-icon name="forum" size="40px" /><p>暂无帖子</p></div
    >
    <div class="forum-list"
      ><router-link
        v-for="post in items"
        :key="post.id"
        :to="'/forum/' + post.id"
        class="panel forum-card"
        ><PlayerAvatar :uid="post.uid" :name="post.name" /><div
          class="forum-summary"
          ><div class="content-tags"
            ><span>{{ post.category }}</span
            ><span v-if="post.pinned">置顶</span
            ><span v-if="post.locked">已锁定</span></div
          ><h2>{{ post.title }}</h2
          ><p>{{ post.body }}</p
          ><small class="subtle"
            >{{ post.name }} · {{ displayDate(post.updated) }}</small
          ></div
        ><div class="forum-counts"
          ><span
            ><q-icon name="chat_bubble_outline" />
            {{ displayCount(post.replies) }}</span
          ><span
            ><q-icon name="favorite_border" />
            {{ displayCount(post.likes) }}</span
          ></div
        ></router-link
      ></div
    >
    <q-pagination
      v-if="total > 24"
      v-model="page"
      :max="Math.ceil(total / 24)"
      :max-pages="7"
      class="content-pagination"
      @update:model-value="load"
    />
  </template>
  <template v-else-if="detail"
    ><article class="panel forum-post"
      ><div class="content-tags"
        ><span>{{ detail.category }}</span
        ><span v-if="detail.pinned">置顶</span
        ><span v-if="detail.locked">已锁定</span
        ><span v-if="detail.hidden">已隐藏</span></div
      ><h2>{{ detail.title }}</h2
      ><div class="post-author"
        ><PlayerAvatar :uid="detail.uid" :name="detail.name" /><div
          ><strong>{{ detail.name }}</strong
          ><small>{{ displayDate(detail.created) }}</small></div
        ></div
      ><p class="content-body">{{ detail.body }}</p>
      <div class="content-actions"
        ><q-btn
          outline
          :icon="detail.liked ? 'favorite' : 'favorite_border'"
          :label="'点赞 · ' + displayCount(detail.likes)"
          :disable="!community.connected"
          @click="perform(like)"
        /><q-btn
          v-if="access.admin || detail.uid === community.user?.uid"
          flat
          color="negative"
          label="删除帖子"
          @click="perform(removePost)"
        /><q-btn v-if="access.admin" flat icon="more_horiz" label="管理"
          ><q-menu
            ><q-list
              ><q-item
                clickable
                v-close-popup
                @click="perform(() => moderate('pinned', !detail!.pinned))"
                ><q-item-section>{{
                  detail.pinned ? "取消置顶" : "置顶帖子"
                }}</q-item-section></q-item
              ><q-item
                clickable
                v-close-popup
                @click="perform(() => moderate('locked', !detail!.locked))"
                ><q-item-section>{{
                  detail.locked ? "开放回复" : "锁定回复"
                }}</q-item-section></q-item
              ><q-item
                clickable
                v-close-popup
                @click="perform(() => moderate('hidden', !detail!.hidden))"
                ><q-item-section>{{
                  detail.hidden ? "恢复公开" : "隐藏帖子"
                }}</q-item-section></q-item
              ></q-list
            ></q-menu
          ></q-btn
        ></div
      > </article
    ><section class="panel forum-replies"
      ><h2>回复 · {{ replyTotal }}</h2
      ><p v-if="!replies.length" class="subtle">暂无回复</p
      ><article
        v-for="row in replyRows"
        :key="row.item.id"
        :style="{
          marginLeft: row.depth ? `${row.depth * 44}px` : undefined
        }"
        :class="['forum-reply', { 'forum-reply-child': row.depth > 0 }]"
        ><PlayerAvatar :uid="row.item.uid" :name="row.item.name" /><div
          ><header
            ><strong>{{ row.item.name }}</strong
            ><time>{{ displayDate(row.item.created) }}</time></header
          ><p class="content-body">{{ row.item.body }}</p
          ><div class="content-actions"
            ><q-btn
              flat
              dense
              :icon="row.item.liked ? 'favorite' : 'favorite_border'"
              :label="'点赞 · ' + displayCount(row.item.likes)"
              :disable="!community.connected"
              @click="perform(() => likeReply(row.item))" /><q-btn
              flat
              dense
              label="回复"
              :disable="
                !community.connected || !!detail.locked || !!detail.hidden
              "
              @click="
                replyParent = row.item;
                void nextTick(() => composer?.focus());
              " /></div
          ><q-btn
            v-if="access.admin || row.item.uid === community.user?.uid"
            flat
            dense
            color="negative"
            label="删除回复"
            @click="perform(() => removeReply(row.item.id))" /></div
      ></article>
      <q-pagination
        v-if="replyTotal > 24"
        v-model="replyPage"
        :max="Math.ceil(replyTotal / 24)"
        :max-pages="7"
        @update:model-value="loadDetail"
      />
      <form
        v-if="community.connected && !detail.locked && !detail.hidden"
        class="forum-reply-form"
        @submit.prevent="perform(sendReply)"
        ><q-input
          ref="composer"
          v-model="reply"
          outlined
          type="textarea"
          label="写下回复"
          maxlength="5000"
          :disable="sending" /><div class="content-actions"
          ><EmojiPicker @pick="pickReply" /><q-btn
            v-if="replyParent"
            flat
            :label="'取消回复 @' + replyParent.name"
            @click="replyParent = null" /><q-btn
            type="submit"
            class="primary-button"
            unelevated
            label="发送回复"
            :loading="sending"
            :disable="!reply.trim()" /></div></form
      ><p v-else class="subtle">{{
        detail.locked ? "该帖子已关闭回复" : "连接社区后可参与回复"
      }}</p>
    </section></template
  ><div v-else-if="loading" class="content-empty"
    ><q-spinner size="30px"
  /></div>
  <q-dialog v-model="createOpen" :persistent="creating"
    ><div class="dialog-panel content-detail"
      ><form @submit.prevent="perform(create)"
        ><div class="section-title"
          ><h2>发布帖子</h2
          ><q-btn
            flat
            round
            icon="close"
            :disable="creating"
            @click="createOpen = false" /></div
        ><div class="content-form"
          ><q-input
            v-model="form.title"
            outlined
            label="帖子标题"
            maxlength="100" /><q-select
            v-model="form.category"
            outlined
            label="分类"
            :options="forumCategories" /><q-input
            v-model="form.body"
            outlined
            type="textarea"
            label="正文"
            maxlength="12000"
            :input-style="{ minHeight: '220px' }" /><EmojiPicker
            @pick="pickPost" /></div
        ><div class="content-actions"
          ><q-btn
            flat
            label="取消"
            :disable="creating"
            @click="createOpen = false" /><q-btn
            type="submit"
            class="primary-button"
            unelevated
            label="发布"
            :loading="creating" /></div></form></div
  ></q-dialog>
</template>
