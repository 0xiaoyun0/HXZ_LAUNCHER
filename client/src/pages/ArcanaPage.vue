<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import {
  community,
  communityRequest,
  communityAsset,
  connect
} from "../lib/community";
import { state, saveSettings, perform } from "../lib/launcher";
const frame = ref<HTMLIFrameElement>();
const source = new URL("arcana/index.html", document.baseURI).href;
const identity = computed(
  () => `${state.settings.communityUrl}:${community.user?.uid || ""}`
);
const generation = ref(0);
let abort = new AbortController();
const assets = new Map<string, Promise<string>>();
const urls = new Set<string>();
let pending = 0;
function reset() {
  abort.abort();
  abort = new AbortController();
  for (const url of urls) URL.revokeObjectURL(url);
  urls.clear();
  assets.clear();
  generation.value++;
}
watch(identity, reset);
watch(() => community.connected, reset);
async function receive(event: MessageEvent) {
  const sender = frame.value?.contentWindow,
    data = event.data;
  if (
    !sender ||
    event.source !== sender ||
    data?.type !== "arcana-request" ||
    !Number.isSafeInteger(data.id)
  )
    return;
  const current = generation.value,
    signal = abort.signal;
  if (pending >= 16) {
    sender.postMessage(
      { type: "arcana-response", id: data.id, error: "请求过多，请稍后重试" },
      "*"
    );
    return;
  }
  pending++;
  try {
    let value: unknown;
    if (
      data.path === "/asset" &&
      typeof data.asset === "string" &&
      /^\/assets\/[\w-]+\.(png|svg)$/.test(data.asset)
    ) {
      const path = "/api/arcana/art/" + data.asset.slice(8);
      if (!assets.has(path)) {
        if (assets.size >= 16) throw Error("活动图片数量超出限制");
        const promise = communityAsset(path, signal)
          .then(blob => {
            if (signal.aborted) throw Error("活动已关闭");
            const url = URL.createObjectURL(blob);
            urls.add(url);
            return url;
          })
          .catch(error => {
            assets.delete(path);
            throw error;
          });
        assets.set(path, promise);
      }
      value = await assets.get(path);
    } else {
      if (
        ![
          "/api/public",
          "/api/unlock",
          "/api/card-unlock",
          "/api/card-read",
          "/api/story-complete"
        ].includes(data.path)
      )
        throw Error("无效活动请求");
      const isRead = data.path === "/api/public";
      const body = data.body ?? {};
      if (typeof body !== "object" || JSON.stringify(body).length > 1024)
        throw Error("活动请求过大");
      value = await communityRequest(
        data.path.replace("/api/", "/api/arcana/"),
        {
          method: isRead ? "GET" : "POST",
          headers: { "Content-Type": "application/json" },
          body: isRead ? null : JSON.stringify(body),
          signal: AbortSignal.any([signal, AbortSignal.timeout(30000)])
        },
        true
      );
    }
    if (current === generation.value)
      sender.postMessage({ type: "arcana-response", id: data.id, value }, "*");
  } catch (error) {
    if (current === generation.value)
      sender.postMessage(
        {
          type: "arcana-response",
          id: data.id,
          error: error instanceof Error ? error.message : String(error)
        },
        "*"
      );
  } finally {
    pending--;
  }
}
onMounted(() => {window.addEventListener("message", receive);if(!state.settings.linkingDiscovered)void perform(()=>saveSettings({linkingDiscovered:true,showLinking:true}));});
onBeforeUnmount(() => {
  window.removeEventListener("message", receive);
  reset();
});
</script>
<template>
  <section class="signal-page">
    <q-btn
      class="signal-close"
      flat
      round
      icon="close"
      aria-label="返回设置"
      to="/settings"
    />
    <iframe
      v-if="community.connected && community.user"
      :key="generation"
      ref="frame"
      :src="source"
      title="ARCANA"
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
    <div v-else class="signal-offline"
      ><q-icon name="vpn_key" size="32px" /><p>连接社区后继续</p
      ><q-btn
        outline
        label="连接社区"
        :loading="community.connecting"
        @click="connect()"
      /><p v-if="community.error">{{ community.error }}</p></div
    >
  </section>
</template>
<style scoped>
.signal-page {
  position: relative;
  min-height: 0;
  flex: 1;
  height: 100%;
  background: #080a12;
  border-radius: 12px;
  overflow: hidden;
}
.signal-page iframe {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  border: 0;
  display: block;
}
.signal-close {
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 2;
  color: #d6d4e2;
  background: #181b2acc;
}
.signal-offline {
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: #d6d4e2;
  padding: 30px;
}
</style>
