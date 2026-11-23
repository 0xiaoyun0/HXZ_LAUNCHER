<script setup>
import {ref} from 'vue';
import {api,state} from './native.js';
import {uploadChatFiles,disposeChatFiles} from '../../../packages/community/chat-media.mjs';
import Icon from './Icon.vue';
const props=defineProps({disabled:Boolean,count:Number}),emit=defineEmits(['pick','busy','error']),busy=ref(false),file=ref();
async function upload(event){if(!event.target.files?.length)return;busy.value=true;emit('busy',true);const uid=state.user?.uid;try{const items=await uploadChatFiles(event.target.files,api,4-props.count);if(uid===state.user?.uid)emit('pick',items);else disposeChatFiles(items);}catch(e){emit('error',e.message);}finally{event.target.value='';busy.value=false;emit('busy',false);}}
</script>
<template><input hidden ref="file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple @change="upload"><button type="button" class="icon-button composer-tool" aria-label="上传图片或 GIF" :disabled="disabled||busy||count>=4" @click="file.click()"><Icon name="image"/></button></template>
<style>.mobile-media-draft{display:flex;gap:8px;padding:6px 12px;overflow-x:auto;flex-shrink:0;max-height:76px}.mobile-media-draft>div{position:relative;width:64px;height:64px;flex-shrink:0;overflow:hidden;border-radius:8px;border:1px solid var(--line)}.mobile-media-draft img{width:100%;height:100%;object-fit:contain}.mobile-media-draft button{position:absolute;right:0;top:0;background:var(--surface);min-width:28px;min-height:28px;width:28px;height:28px;padding:4px;border-radius:6px}.composer .composer-tool{display:grid;place-items:center;width:44px;min-width:44px;height:44px;min-height:44px;padding:10px;border:0;border-radius:10px;background:transparent;color:var(--muted)}.composer .composer-tool:hover,.composer .composer-tool[aria-expanded=true]{color:var(--accent-text,var(--accent));background:var(--accent-soft)}.composer .composer-tool .icon{width:20px;height:20px;stroke-width:1.8}.composer .composer-tool:disabled{opacity:.4}</style>
