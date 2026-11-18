<script setup>
import {computed} from 'vue';
import {iconAliases, iconNodes} from './icon-nodes.js';

const props=defineProps({name:String});
const warned=new Set();
const resolved=computed(()=>{
  if(Object.prototype.hasOwnProperty.call(iconAliases,props.name))return iconAliases[props.name];
  if(import.meta.env.DEV&&!warned.has(props.name)){
    warned.add(props.name);
    console.warn(`[Icon] Unknown mobile icon: ${String(props.name)}; showing circle-help`);
  }
  return iconAliases['circle-help'];
});
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" :data-icon="resolved">
    <component :is="tag" v-for="([tag,attributes],index) in iconNodes[resolved]" :key="index" v-bind="attributes"/>
  </svg>
</template>

