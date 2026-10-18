<script setup>
import {ref,onMounted,onUnmounted,watch} from 'vue';import {state,api} from './native.js';import {mountVoiceTools} from '../../../packages/community/voice-tools-ui.mjs';import '../../../packages/hub/style.css';import '../../../packages/community/voice-tools.css';
const root=ref();let dispose;function start(){dispose?.();dispose=null;if(root.value&&state.room&&state.id)dispose=mountVoiceTools(root.value,{request:api,client:state.id,recognition:false});}onMounted(start);watch(()=>[state.room,state.id],start,{flush:'post'});onUnmounted(()=>dispose?.());
</script>
<template><section v-if="state.room" class="card"><h2>房间协作</h2><div ref="root"/></section></template>
