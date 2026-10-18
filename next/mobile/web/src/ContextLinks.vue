<script setup>
import {HUB_KINDS} from '../../../server/shared/hub-catalog.mjs';
import Icon from './Icon.vue';
defineProps({sections:{type:Array,default:()=>[]}});defineEmits(['open']);
const labels={social:'好友与小队',servers:'入服服务',challenges:'棋局回放',space:'玩家空间',saved:'收藏订阅',devices:'多端接续',trades:'玩家交易',workbench:'管理工作台',program:'一起看视频',recipe:'生产计划',event:'活动与赛事'};
const label=key=>labels[key]||HUB_KINDS[key]?.label||key;
</script>
<template><nav class="context-links" aria-label="相关功能"><button v-for="key in sections" :key="key" class="soft-button" @click="$emit('open',key)"><span>{{label(key)}}</span><Icon name="chevron"/></button></nav></template>
<style scoped>.context-links{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,138px),1fr));gap:10px;min-width:0}.context-links .soft-button{display:flex;justify-content:space-between;align-items:center;gap:10px;min-width:0;min-height:44px;padding:10px 12px;text-align:left}.context-links span{min-width:0;overflow-wrap:anywhere}.context-links svg{flex:0 0 16px;width:16px;height:16px}</style>
