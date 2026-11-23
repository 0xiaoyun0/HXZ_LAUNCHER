<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import {mountInventory} from '../../../packages/inventory/ui.mjs';
import '../../../packages/inventory/style.css';
import {api,state} from './native.js';
import {registerOverlay,unregisterOverlay} from './overlays.js';
const root=ref(),key=Symbol('inventory');let dispose;
onMounted(()=>dispose=mountInventory(root.value,{request:api,canManage:!!state.user?.admin,dialogHost:close=>close?registerOverlay(key,close):unregisterOverlay(key)}));
onUnmounted(()=>dispose?.());
</script>
<template><section ref="root" class="content-page"/></template>
