<script setup>
import {ref,onMounted,onUnmounted,watch} from 'vue';
import {mountHub} from '../../../packages/hub/ui.mjs';
import {hubDestination} from '../../../packages/hub/navigation.mjs';
import {exportAsset} from '../../../packages/hub/asset-export.mjs';
import '../../../packages/hub/style.css';
import {api,state,native} from './native.js';
const props=defineProps({section:String,item:String,area:{type:String,default:'all'}});
const emit=defineEmits(['navigate']);const root=ref();let dispose;
function start(){if(!root.value)return;dispose?.();root.value.replaceChildren();dispose=mountHub(root.value,{request:api,uid:state.user?.uid,server:state.server,platform:'android',area:props.area==='all'?undefined:props.area,showSummary:props.area==='all'||props.area==='people',copy:text=>native('copy',{text}),pinWidget:()=>native('widgetPin'),section:props.section,item:props.item,exportAsset:(blob,name)=>exportAsset(input=>native('assetExport',input),blob,name),onSection:section=>emit('navigate',props.area==='all'?'/community/hub?section='+encodeURIComponent(section):hubDestination(section)),navigate:url=>/^https?:\/\//.test(url)?native('open',{url}):emit('navigate',url)});}
onMounted(start);watch(()=>[state.user?.uid,state.server,props.section,props.item,props.area],start);onUnmounted(()=>dispose?.());
</script>
<template><section ref="root" class="hub-mobile"/></template>
