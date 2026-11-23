<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import {mountWerewolf} from '../lib/werewolf-ui.mjs';
import '../lib/werewolf.css';
const props=defineProps({request:Function}),root=ref();let dispose;
onMounted(()=>dispose=mountWerewolf(root.value,(...args)=>props.request(...args)));onUnmounted(()=>dispose?.());
</script>
<template><div ref="root"/></template>
