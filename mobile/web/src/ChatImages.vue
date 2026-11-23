<script setup>
import {ref} from 'vue';
import {api} from './native.js';
import AppOverlay from './AppOverlay.vue';
import Icon from './Icon.vue';
const props=defineProps({items:{type:Array,default:()=>[]}}),active=ref(null),message=ref(''),saving=ref(false);
const url=item=>item?.url?.startsWith('/api/chat-media/')?'/community'+item.url:'';
async function save(){saving.value=true;try{await api('/api/chat/stickers','POST',{id:active.value.id});message.value='已加入我的表情';}catch(e){message.value=e.message;}finally{saving.value=false;}}
</script>
<template><div class="chat-images"><template v-for="(item,index) in items" :key="item.id||index"><small v-if="item.expired" class="muted">图片已过期</small><button v-else type="button" class="chat-image" :style="{aspectRatio:Math.min(2,Math.max(.75,item.width/item.height))}" aria-label="查看聊天图片" @click="active=item;message=''">
<img :src="url(item)" alt="聊天图片" loading="lazy" decoding="async"></button></template></div>
<AppOverlay :open="!!active" label="聊天图片" @close="active=null"><section class="sheet"><header class="sheet-header"><h2>聊天图片</h2><button type="button" class="icon-button" aria-label="关闭图片" @click="active=null"><Icon name="close"/></button></header><div class="sheet-body"><img v-if="active" :src="url(active)" class="chat-image-full" alt="聊天图片"><p v-if="message" role="status">{{message}}</p><button class="primary" :disabled="saving" @click="save">收藏为表情</button></div></section></AppOverlay>
</template>
<style>.chat-images{display:flex;flex-wrap:wrap;gap:8px;max-width:100%;margin-top:5px}.chat-images:empty{display:none}.chat-image{border:1px solid var(--line);background:var(--soft);border-radius:12px;overflow:hidden;padding:0;width:min(100%,170px);max-height:180px}.chat-image img{width:100%;height:100%;object-fit:contain}.chat-image-full{max-width:100%;max-height:min(400px,50dvh);display:block;object-fit:contain;margin:0 auto 16px}.message.own .chat-images{justify-content:flex-end}</style>
