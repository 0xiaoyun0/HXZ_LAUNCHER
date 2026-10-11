<script setup>
import {ref,onMounted,onUnmounted} from 'vue';
import {api} from './native.js';
import {mountLinkingBridge} from '../../../packages/linking/host';
const props=defineProps({settings:Object});
const frame=ref(null);let dispose;
onMounted(()=>{dispose=mountLinkingBridge(frame.value,api,()=>({mobile:true,theme:props.settings.theme==='dark'||props.settings.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light',reducedMotion:props.settings.animationSpeed===0||props.settings.animations===false}));});
onUnmounted(()=>dispose?.());
</script>
<template><section class="linking-mobile"><iframe ref="frame" src="./linking/index.html" title="LINKING 档案探索" allow="autoplay"/></section></template>
<style scoped>.linking-mobile{height:100%;min-height:0;overflow:hidden;border-radius:16px;background:var(--surface,#f4f4f0)}iframe{display:block;width:100%;height:100%;border:0;min-height:0}@media(max-width:600px){.linking-mobile{border-radius:0}}</style>
