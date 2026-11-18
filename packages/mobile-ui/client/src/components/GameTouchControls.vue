<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import {mountGameControls} from '../lib/game-controls.mjs';
import '../lib/game-controls.css';
const props=defineProps({api:Object,id:String}),root=ref();let dispose;
onMounted(()=>{dispose=mountGameControls(root.value,props.api,props.id);});onUnmounted(()=>dispose?.());
</script>
<template><div ref="root"/></template>
