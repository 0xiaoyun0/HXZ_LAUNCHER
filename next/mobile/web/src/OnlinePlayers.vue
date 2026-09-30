<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue';import {api} from './native.js';
const items=ref([]),busy=ref(false),error=ref('');let timer,live=true;
async function load(){if(busy.value)return;busy.value=true;error.value='';try{const r=await api('/api/server-online');if(live)items.value=r.items;}catch(e){if(live)error.value=e.message;}finally{busy.value=false;}}
onMounted(()=>{load();timer=setInterval(()=>{if(!document.hidden)load();},60000);});onBeforeUnmount(()=>{live=false;clearInterval(timer);});
</script>
<template><section class="card form-stack"><header class="mobile-card-heading"><h2>默认服务器在线玩家</h2><button class="text-button" :disabled="busy" @click="load">刷新</button></header><p v-if="error" class="error-note">{{error}}</p><details v-for="s in items" :key="s.id" class="mobile-server-players"><summary><strong>{{s.name}}</strong><span>{{s.available?s.online+' / '+s.max:'暂不可用'}}</span></summary><p class="muted">{{s.available?'服务器返回的名单样本，可能不包含全部在线玩家。':s.error}}</p><div class="actions"><span v-for="p in s.players" :key="p.id+p.name" class="tag">{{p.name}}</span></div><p v-if="s.available&&!s.players?.length" class="muted">服务器未提供玩家名单</p></details></section></template>
<style>.mobile-server-players{border-top:1px solid var(--line);padding-top:12px}.mobile-server-players summary{display:flex;justify-content:space-between;gap:12px;min-height:44px;align-items:center;cursor:pointer}.mobile-server-players summary strong{font-size:.9rem}.mobile-server-players summary span{font-size:.8rem;flex-shrink:0}.mobile-server-players .actions{margin:10px 0}</style>
