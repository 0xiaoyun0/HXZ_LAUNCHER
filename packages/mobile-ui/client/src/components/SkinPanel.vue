<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount,watch,nextTick} from 'vue';
import {state,invoke,desktop} from '../lib/launcher';
const root=ref<HTMLElement>();let observer:ResizeObserver,mutation:MutationObserver,timer:number;
function update(){cancelAnimationFrame(timer);timer=requestAnimationFrame(()=>{if(!desktop||!root.value)return;const r=root.value.getBoundingClientRect();void invoke('skin.bounds',{x:r.x,y:r.y,width:r.width,height:r.height,visible:r.width>0&&!document.querySelector('.q-dialog')}).catch(()=>{});});}
onMounted(()=>{observer=new ResizeObserver(update);if(root.value)observer.observe(root.value);mutation=new MutationObserver(update);mutation.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',update);update();});
watch(()=>state.settings.selectedAccount,async()=>{await nextTick();update();});
onBeforeUnmount(()=>{cancelAnimationFrame(timer);observer?.disconnect();mutation?.disconnect();window.removeEventListener('resize',update);if(desktop)void invoke('skin.hide').catch(()=>{});});
</script>
<template><section ref="root" class="skin-embedded"><p v-if="!desktop" class="subtle">请在桌面应用中管理皮肤站账号</p></section></template>
<style scoped>.skin-embedded{height:calc(100vh - 250px);min-height:320px;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden}</style>
