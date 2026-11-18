<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import {mountTankRoom} from '../lib/tank-room-ui.mjs';
import '../lib/tank-room.css';
const props=defineProps({request:Function,transport:Object}),root=ref();let dispose;
onMounted(()=>{dispose=mountTankRoom(root.value,{request:props.request,...props.transport});});onUnmounted(()=>dispose?.());
</script>
<template><div ref="root"/></template>
