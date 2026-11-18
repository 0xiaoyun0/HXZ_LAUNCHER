<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import {mountGuild} from '../../../packages/guild/ui.mjs';
import '../../../packages/guild/style.css';
import {api,state} from './native.js';
const props=defineProps({task:String});const root=ref();let dispose;onMounted(()=>dispose=mountGuild(root.value,{request:api,uid:state.user?.uid,initialTask:props.task}));onUnmounted(()=>dispose?.());
</script>
<template><section ref="root" class="content-page"/></template>
