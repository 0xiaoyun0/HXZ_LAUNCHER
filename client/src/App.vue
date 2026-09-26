<script setup lang="ts">
import AmbientMedia from './components/AmbientMedia.vue';
import CrashReport from './components/CrashReport.vue';
import {decision,invoke} from './lib/launcher';
async function answer(accepted:boolean){await invoke('decision.reply',{id:decision.id,accepted});decision.open=false;}
</script>
<template><AmbientMedia/><router-view/><CrashReport/><q-dialog v-model="decision.open" persistent><q-card class="dialog-card"><q-card-section><h2>{{decision.title}}</h2><p class="q-mt-md" style="white-space:pre-wrap">{{decision.message}}</p></q-card-section><q-card-actions align="right"><q-btn flat label="取消" @click="answer(false)"/><q-btn unelevated class="primary-button" :label="decision.accept" @click="answer(true)"/></q-card-actions></q-card></q-dialog></template>
