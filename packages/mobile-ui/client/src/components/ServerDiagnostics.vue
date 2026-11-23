<script setup lang="ts">
import {ref,watch} from 'vue';import {invoke} from '../lib/launcher';
const props=defineProps<{id:string}>(),emit=defineEmits<{close:[]}>(),busy=ref(false),error=ref(''),result=ref<{address:string;steps:{ok:boolean|null;title:string;detail:string}[]}|null>(null);
async function check(){busy.value=true;error.value='';try{result.value=await invoke('instance.diagnose',{id:props.id});}catch(e){error.value=(e as Error).message;}finally{busy.value=false;}}
watch(()=>props.id,id=>{result.value=null;if(id)void check();});
</script>
<template><q-dialog :model-value="!!id" @update:model-value="v=>!v&&emit('close')"><q-card class="dialog-card"><q-card-section><h2>服务器连接检查</h2><p>{{result?.address||id}}</p><q-linear-progress v-if="busy" indeterminate/><p v-if="error" role="alert">{{error}}</p><div v-for="(step,i) in result?.steps" :key="i" class="q-my-md"><strong><q-icon :name="step.ok===null?'info':step.ok?'check_circle':'error_outline'"/> {{step.title}}</strong><p style="overflow-wrap:anywhere">{{step.detail}}</p></div></q-card-section><q-card-actions align="right"><q-btn flat label="重新检查" :loading="busy" @click="check"/><q-btn flat label="关闭" @click="emit('close')"/></q-card-actions></q-card></q-dialog></template>
