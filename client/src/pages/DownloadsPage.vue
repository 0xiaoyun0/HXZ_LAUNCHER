<script setup lang="ts">
import InstallRecovery from "../components/InstallRecovery.vue";
import { ref, computed, onMounted, watch } from "vue";
import { invoke, perform, reload, state, task, desktop } from "../lib/launcher";
import { choosePack, chooseRoot, showPack, type PackInfo } from "../lib/packs";
const tab = ref("game"),
  versions = ref<{ id: string; type: string }[]>([]),
  query = ref(""),
  snapshots = ref(false),
  minecraft = ref(""),
  loader = ref(""),
  loaderVersion = ref(""),
  loaders = ref<{ version: string; stable: boolean }[]>([]),
  name = ref(""),
  loading = ref(false),
  installing = ref(false),
  loaderLoading = ref(false);
const options = computed(() =>
  versions.value
    .filter(
      v =>
        (snapshots.value || v.type === "release") && v.id.includes(query.value)
    )
    .map(v => v.id)
);
async function load() {
  loading.value = true;
  try {
    versions.value = await invoke("catalog.versions");
    minecraft.value ||=
      versions.value.find(v => v.type === "release")?.id || "";
  } finally {
    loading.value = false;
  }
}
let request = 0;
watch([minecraft, loader], () => {
  name.value = minecraft.value + (loader.value ? "-" + loader.value : "");
  loaderVersion.value = "";
  loaders.value = [];
  const serial = ++request;
  if (!loader.value || !minecraft.value) return;
  loaderLoading.value = true;
  void perform(async () => {
    try {
      const values = await invoke<{ version: string; stable: boolean }[]>(
        "catalog.loaders",
        { minecraft: minecraft.value, loader: loader.value }
      );
      if (serial === request) {
        loaders.value = values;
        loaderVersion.value =
          values.find(v => v.stable)?.version || values[0]?.version || "";
      }
    } finally {
      if (serial === request) loaderLoading.value = false;
    }
  });
});
async function install() {
  if (!state.settings.gameRoot && !(await chooseRoot())) return;
  installing.value = true;
  try {
    await invoke("game.install", {
      name: name.value,
      minecraft: minecraft.value,
      loader: loader.value,
      loaderVersion: loaderVersion.value
    });
    await reload();
  } finally {
    installing.value = false;
  }
}
const search = ref(""),
  results = ref<
    {
      project_id: string;
      title: string;
      description: string;
      downloads: number;
    }[]
  >([]),
  offset = ref(0),
  total = ref(0),
  searching = ref(false),
  project = ref(""),
  releases = ref<{ id: string; name: string; game_versions: string[] }[]>([]),
  release = ref("");
async function searchPacks(page = 0) {
  searching.value = true;
  try {
    const r = await invoke<{ hits: typeof results.value; total_hits: number }>(
      "catalog.packs",
      { query: search.value, offset: page }
    );
    results.value = r.hits;
    total.value = r.total_hits;
    offset.value = page;
  } finally {
    searching.value = false;
  }
}
async function selectPack(id: string) {
  project.value = id;
  releases.value = [];
  release.value = "";
  const values = await invoke<typeof releases.value>("catalog.packVersions", {
    id
  });
  if (project.value === id) {
    releases.value = values;
    release.value = values[0]?.id || "";
  }
}
async function downloadPack() {
  showPack(
    await invoke<PackInfo>("pack.download", {
      project: project.value,
      version: release.value
    })
  );
  project.value = "";
}
onMounted(() => {
  if (desktop) void perform(load);
});
</script>
<template>
  <InstallRecovery />
  <div class="page-heading"
    ><h1>下载与安装</h1
    ><q-btn
      unelevated
      class="primary-button"
      icon="file_upload"
      label="导入 .mrpack"
      :disable="!desktop || task.busy || state.running"
      @click="perform(choosePack)"
  /></div>
  <div class="directory-bar q-mb-md"
    ><q-icon name="folder_open" /><span>{{
      state.settings.gameRoot || "请先选择游戏目录"
    }}</span
    ><q-btn
      outline
      label="选择目录"
      :disable="task.busy || state.running || !desktop"
      @click="perform(chooseRoot)"
  /></div>
  <q-tabs v-model="tab" align="left" class="q-mb-lg"
    ><q-tab name="game" label="Minecraft" /><q-tab
      name="packs"
      label="整合包"
      @click="!results.length && perform(() => searchPacks())"
  /></q-tabs>
  <section v-if="tab === 'game'" class="panel settings-section"
    ><div class="row items-center justify-between"
      ><h2>安装游戏版本</h2
      ><q-btn
        outline
        icon="refresh"
        label="刷新版本"
        :loading="loading"
        :disable="!desktop"
        @click="perform(load)" /></div
    ><div class="install-grid"
      ><q-input
        v-model="query"
        outlined
        label="筛选版本"
        placeholder="例如 1.21.1" /><q-checkbox
        v-model="snapshots"
        label="显示快照和历史测试版" /><q-select
        v-model="minecraft"
        outlined
        :options="options"
        label="Minecraft 版本"
        :loading="loading"
        virtual-scroll-item-size="48" /><q-select
        v-model="loader"
        outlined
        emit-value
        map-options
        :options="[
          { label: '原版', value: '' },
          { label: 'Fabric', value: 'fabric' },
          { label: 'NeoForge', value: 'neoforge' },
          { label: 'Forge', value: 'forge' },
          { label: 'Quilt', value: 'quilt' }
        ]"
        label="模组加载器" /><q-select
        v-if="loader"
        v-model="loaderVersion"
        outlined
        :options="loaders.map(v => v.version)"
        label="加载器版本"
        :loading="loaderLoading"
        :hint="
          !loaderLoading && !loaders.length ? '该游戏版本暂无此加载器' : ''
        " /><q-input v-model="name" outlined label="实例名称" /></div
    ><div class="row q-gutter-sm q-mt-lg"
      ><q-btn
        unelevated
        class="primary-button"
        icon="download"
        label="安装游戏"
        :loading="installing"
        :disable="
          !desktop ||
          task.busy ||
          state.running ||
          !name ||
          !minecraft ||
          (!!loader && !loaderVersion)
        "
        @click="perform(install, '游戏版本已安装')" /><q-btn
        v-if="installing"
        outline
        label="取消"
        @click="perform(() => invoke('task.cancel'))" /></div
    ><p v-if="installing" class="q-mt-md">{{ task.phase }}</p></section
  >
  <section v-else
    ><div class="row q-gutter-sm q-mb-md"
      ><q-input
        v-model="search"
        outlined
        class="col"
        label="搜索 Modrinth 整合包"
        @keyup.enter="perform(() => searchPacks())" /><q-btn
        unelevated
        class="primary-button"
        label="搜索"
        :loading="searching"
        :disable="!desktop"
        @click="perform(() => searchPacks())" /></div
    ><div class="catalog-list"
      ><button
        v-for="pack in results"
        :key="pack.project_id"
        class="panel catalog-item"
        @click="perform(() => selectPack(pack.project_id))"
        ><q-icon name="inventory_2" size="28px" /><span
          ><strong>{{ pack.title }}</strong
          ><small>{{ pack.description }}</small></span
        ><q-icon name="chevron_right" /></button></div
    ><div class="row items-center justify-end q-gutter-sm q-mt-md"
      ><q-btn
        outline
        label="上一页"
        :disable="!offset || searching"
        @click="perform(() => searchPacks(Math.max(0, offset - 20)))" /><span
        >{{ offset + 1 }}–{{ offset + results.length }} / {{ total }}</span
      ><q-btn
        outline
        label="下一页"
        :disable="offset + 20 >= total || searching"
        @click="perform(() => searchPacks(offset + 20))" /></div
  ></section>
  <q-dialog
    :model-value="!!project"
    @update:model-value="
      v => {
        if (!v) project = '';
      }
    "
    ><q-card class="dialog-card"
      ><q-card-section
        ><h2>选择整合包版本</h2
        ><q-select
          v-model="release"
          outlined
          emit-value
          map-options
          :options="
            releases.map(r => ({
              label: r.name + ' · ' + r.game_versions.join(', '),
              value: r.id
            }))
          "
          label="版本"
          :loading="!releases.length" /></q-card-section
      ><q-card-actions align="right"
        ><q-btn flat label="取消" @click="project = ''" /><q-btn
          unelevated
          class="primary-button"
          label="下载并导入"
          :disable="!release || task.busy || state.running"
          @click="perform(downloadPack)" /></q-card-actions></q-card
  ></q-dialog>
</template>
