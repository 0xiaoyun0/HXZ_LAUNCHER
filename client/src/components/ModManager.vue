<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { invoke, perform, task, state, bytesLabel } from "../lib/launcher";
const props = defineProps<{ id: string }>();
const emit = defineEmits<{ close: [] }>();
const mods = ref<
    { name: string; file: string; enabled: boolean; size: number }[]
  >([]),
  query = ref(""),
  loading = ref(false),
  tab = ref("installed"),
  onlineQuery = ref(""),
  onlineLoading = ref(false),
  onlineOffset = ref(0),
  onlineTotal = ref(0),
  online = ref<
    {
      project_id: string;
      title: string;
      description: string;
      downloads: number;
      icon_url?: string;
    }[]
  >([]);
const filtered = computed(() =>
  mods.value.filter(m =>
    m.name.toLowerCase().includes(query.value.toLowerCase())
  )
);
async function load() {
  loading.value = true;
  try {
    mods.value = await invoke("mods.list", { id: props.id });
  } finally {
    loading.value = false;
  }
}
async function change(action: string, file?: string) {
  await invoke("mods." + action, { id: props.id, file });
  await load();
}
async function searchOnline(offset = 0) {
  onlineLoading.value = true;
  try {
    const instance = state.instances.find(item => item.id === props.id);
    const result = await invoke<{
      hits: typeof online.value;
      total_hits: number;
    }>("mods.search", {
      query: onlineQuery.value,
      offset,
      minecraft: instance?.version || "",
      loader: instance?.loader || ""
    });
    online.value = result.hits;
    onlineTotal.value = result.total_hits;
    onlineOffset.value = offset;
  } finally {
    onlineLoading.value = false;
  }
}
async function downloadOnline(project: string) {
  await invoke("mods.download", { instance: props.id, project });
  tab.value = "installed";
  await load();
}
watch(
  () => props.id,
  id => {
    if (id) void perform(load);
  },
  { immediate: true }
);
</script>
<template>
  <q-dialog
    :model-value="!!id"
    @update:model-value="
      v => {
        if (!v) emit('close');
      }
    "
    ><q-card class="dialog-card wide mod-manager"
      ><q-card-section
        ><header class="row items-center justify-between"
          ><h2>MOD 管理 · {{ id }}</h2
          ><q-btn flat round icon="close" v-close-popup /></header
        ><q-tabs v-model="tab" dense align="left" class="q-mb-sm"
          ><q-tab name="installed" label="已安装" /><q-tab
            name="online"
            label="在线下载"
            @click="!online.length && perform(() => searchOnline())" /></q-tabs
        ><template v-if="tab === 'installed'"
          ><div class="row q-gutter-sm"
            ><q-input
              v-model="query"
              outlined
              dense
              placeholder="搜索已安装模组"
              class="col" /><q-btn
              outline
              icon="add"
              label="添加 MOD"
              :disable="task.busy || state.running"
              @click="perform(() => change('add'))" /><q-btn
              flat
              icon="folder_open"
              title="打开模组目录"
              @click="perform(() => change('open'))" /></div></template
        ><template v-else
          ><div class="row q-gutter-sm"
            ><q-input
              v-model="onlineQuery"
              outlined
              dense
              placeholder="搜索 Modrinth 模组"
              class="col"
              @keyup.enter="perform(() => searchOnline())" /><q-btn
              unelevated
              class="primary-button"
              label="搜索"
              :loading="onlineLoading"
              @click="perform(() => searchOnline())" /></div
          ><div class="catalog-list q-mt-md"
            ><div
              v-for="item in online"
              :key="item.project_id"
              class="panel catalog-item"
              ><q-icon name="extension" size="28px" /><span
                ><strong>{{ item.title }}</strong
                ><small>{{ item.description }}</small></span
              ><small>{{ item.downloads.toLocaleString() }} 下载</small
              ><q-btn
                unelevated
                class="primary-button"
                label="下载"
                :disable="task.busy || state.running"
                @click="
                  perform(() => downloadOnline(item.project_id))
                " /></div></div
          ><div class="row items-center justify-end q-gutter-sm q-mt-md"
            ><q-btn
              outline
              label="上一页"
              :disable="!onlineOffset || onlineLoading"
              @click="
                perform(() => searchOnline(Math.max(0, onlineOffset - 20)))
              " /><span
              >{{ onlineOffset + 1 }}–{{ onlineOffset + online.length }} /
              {{ onlineTotal }}</span
            ><q-btn
              outline
              label="下一页"
              :disable="onlineOffset + 20 >= onlineTotal || onlineLoading"
              @click="
                perform(() => searchOnline(onlineOffset + 20))
              " /></div></template
        ><template v-if="tab === 'installed'"
          ><q-linear-progress v-if="loading" indeterminate /><p
            v-if="!mods.length && !loading"
            class="subtle q-mt-md"
            >此实例尚无模组。原版需要先安装兼容的加载器。</p
          ><div class="mod-list"
            ><div v-for="mod in filtered" :key="mod.file" class="mod-row"
              ><q-toggle
                :model-value="mod.enabled"
                :disable="task.busy || state.running"
                @update:model-value="
                  perform(() => change('toggle', mod.file))
                " /><span :title="mod.file">{{ mod.name }}</span
              ><small>{{ bytesLabel(mod.size) }}</small
              ><q-btn
                flat
                round
                icon="delete_outline"
                title="移至回收站"
                :disable="task.busy || state.running"
                @click="
                  perform(() => change('remove', mod.file))
                " /></div></div></template></q-card-section></q-card
  ></q-dialog>
</template>
