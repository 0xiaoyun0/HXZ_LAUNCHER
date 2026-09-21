<script setup>
import {computed} from 'vue';
import Icon from './Icon.vue';
const props=defineProps({state:Object});
defineEmits(['action']);
const working=computed(()=>['checking','downloading','verifying'].includes(props.state.phase));
const percent=computed(()=>props.state.total?Math.min(100,Math.floor(props.state.received/props.state.total*100)):0);
const mb=n=>(Number(n||0)/1048576).toFixed(1);
</script>
<template>
  <h2 class="section-title">应用更新</h2>
  <div class="card update-card">
    <div class="update-heading"><span class="avatar"><Icon name="download"/></span><div><strong>幻想镇社区 {{state.currentVersion||'0.4.4'}}</strong><small>构建 {{state.currentBuild||40402}}</small></div><span v-if="state.phase==='ready'" class="tag">可安装</span></div>
    <label class="toggle-row"><span>自动检查更新<small>启动与返回应用时定期检查</small></span><input type="checkbox" :checked="state.autoCheck" @change="$emit('action','settings',{autoCheck:$event.target.checked})"></label>
    <label class="toggle-row"><span>自动下载更新<small>发现新版后下载，安装需系统确认</small></span><input type="checkbox" :checked="state.autoDownload" @change="$emit('action','settings',{autoDownload:$event.target.checked})"></label>
    <div class="update-status" role="status"><Icon :class="{spinning:working}" :name="working?'refresh':state.phase==='ready'?'check':'download'"/><span>{{state.message||'正在读取更新设置…'}}</span></div>
    <template v-if="state.phase==='downloading'"><progress :value="state.received" :max="state.total||1"/><div class="update-transfer"><span>{{mb(state.received)}} / {{mb(state.total)}} MB</span><strong>{{percent}}%</strong></div></template>
    <p v-if="state.source" class="muted">{{state.source}} · 镜像优先，失败自动换源</p>
    <details v-if="state.version&&state.version.versionCode>state.currentBuild"><summary>{{state.version.versionName}} · 构建 {{state.version.versionCode}} 更新内容</summary><p class="prose">{{state.version.notes}}</p></details>
    <div class="actions"><button v-if="state.phase==='ready'" class="primary" @click="$emit('action','install')"><Icon name="download"/>安装更新</button><button v-else-if="['available','paused','error'].includes(state.phase)&&state.version?.versionCode>state.currentBuild" class="primary" @click="$emit('action','download')">{{state.phase==='available'?'下载更新':'重新下载'}}</button><button v-if="working" class="soft-button" @click="$emit('action','cancel')">暂停</button><button v-else class="soft-button" @click="$emit('action','check')"><Icon name="refresh"/>检查更新</button></div>
    <small v-if="state.checkedAt" class="muted">上次检查 {{new Date(state.checkedAt).toLocaleString('zh-CN')}}</small>
  </div>
</template>
