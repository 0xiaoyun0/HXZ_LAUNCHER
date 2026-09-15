<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { invoke, perform, task, state, bytesLabel } from "../lib/launcher";
const props = defineProps<{ id: string }>();
const emit = defineEmits<{ close: [] }>();
const mods = ref<
    { name: string; file: string; enabled: boolean; size: number }[]
  >([]),
  query = ref(""),
  loading = ref(false);
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
        ><div class="row q-gutter-sm"
          ><q-input
            v-model="query"
            outlined
            dense
            placeholder="搜索模组"
            class="col" /><q-btn
            outline
            icon="add"
            label="添加 MOD"
            :disable="task.busy || state.running"
            @click="perform(() => change('add'))" /><q-btn
            flat
            icon="folder_open"
            title="打开模组目录"
            @click="perform(() => change('open'))" /></div
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
              " /></div></div></q-card-section></q-card
  ></q-dialog>
</template>
