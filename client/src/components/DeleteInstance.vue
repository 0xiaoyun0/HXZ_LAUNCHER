<script setup lang="ts">
import { ref, watch } from 'vue';
import { invoke, reload, perform, task, state } from '../lib/launcher';
const props = defineProps<{id:string}>();
const emit = defineEmits<{close:[]}>();
const mode = ref('logical'), working = ref(false);
watch(()=>props.id,()=>mode.value='logical');
async function remove() {
  working.value=true;
  try { await invoke('instance.delete',{id:props.id,mode:mode.value,confirmed:true}); await reload(); emit('close'); }
  finally {working.value=false;}
}
</script>
<template>
  <q-dialog :model-value="!!id" :persistent="working" @hide="emit('close')">
    <q-card class="dialog-card">
      <q-card-section><h2>删除实例</h2><p>{{id}}</p>
        <q-option-group v-model="mode" :options="[{label:'逻辑删除 · 从列表隐藏，保留全部文件',value:'logical'},{label:'硬删除 · 删除此实例目录中的文件和存档',value:'physical'}]"/>
        <p class="subtle q-mt-md">隐藏后可在设置中恢复。硬删除不会清理共享 libraries、assets、根目录存档和历史备份。</p>
        <p v-if="mode==='physical'" class="error-note">实例内的存档、截图和配置将被永久删除。请确认已备份。</p>
      </q-card-section>
      <q-card-actions align="right"><q-btn flat label="取消" :disable="working" v-close-popup/><q-btn unelevated :color="mode==='physical'?'negative':'primary'" label="确认删除" :loading="working" :disable="task.busy||state.running" @click="perform(remove)"/></q-card-actions>
    </q-card>
  </q-dialog>
</template>
