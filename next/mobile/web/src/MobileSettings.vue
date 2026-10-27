<script setup>
import {computed,nextTick,ref,watch} from 'vue';
import Icon from './Icon.vue';
import AppSelect from './AppSelect.vue';
import UpdateCard from './UpdateCard.vue';
const props=defineProps({area:String,category:String,settingsCategory:String,settings:Object,appUpdate:Object,state:Object});
const emit=defineEmits(['open','back','update:category','update:settingsCategory','connection','skin','avatar','logout','voice-overlay','voice-change','update']);
const root=ref(),background=ref(),preferences=ref(),account=ref();
const category=computed(()=>props.category??props.settingsCategory??props.area??'');
function changed(value){emit('update:category',value);emit('update:settingsCategory',value);}
async function reveal(value){
  await nextTick();
  const group={account:account.value,voice:preferences.value,notifications:preferences.value,background:background.value}[value];
  if(group)group.open=true;
  const target=group||root.value?.querySelector('[data-settings-section="'+(value==='appearance'?'appearance':value==='updates'?'updates':'')+'"]');
  if(value&&target){await nextTick();target.scrollIntoView({block:'start'});}
}
watch(category,reveal,{immediate:true,flush:'post'});
function back(){changed('');emit('open','');emit('back');}
</script>
<template>
<section ref="root" class="content-page mobile-settings081 single-settings081">
  <header class="account-section-header"><button class="icon-button" aria-label="返回我的" @click="back"><Icon name="back"/></button><h1>设置</h1></header>
  <section class="card form-stack account-fields081" data-settings-section="appearance">
    <h2>基础外观</h2>
    <label>主题<AppSelect v-model="settings.theme" label="主题" :options="[{value:'system',label:'跟随系统',icon:'settings'},{value:'light',label:'浅色',icon:'sun'},{value:'dark',label:'深色',icon:'moon'}]"/></label>
    <label>文字大小 · {{settings.font}} px<input v-model.number="settings.font" type="range" min="14" max="22" step="1" aria-label="文字大小"></label>
    <fieldset class="account-colors081"><legend>强调色</legend><button v-for="color in ['#4265df','#407d8b','#626cc1','#9f6178','#a17137']" :key="color" :aria-label="'强调色 '+color" :aria-pressed="settings.accent===color" @click="settings.accent=color"><span :style="{background:color}"><Icon v-if="settings.accent===color" name="check"/></span></button></fieldset>
  </section>
  <details ref="background" class="settings-disclosure081" @toggle="background?.open&&changed('background')"><summary>背景与动效</summary><div id="media-controls"/></details>
  <details ref="preferences" class="settings-disclosure081" @toggle="preferences?.open&&changed('notifications')"><summary>通知与默认偏好</summary>
    <div class="card account-fields081">
      <label class="account-toggle081"><span><strong>语音屏幕覆盖</strong></span><input type="checkbox" role="switch" :checked="settings.voiceOverlay" @change="$emit('voice-overlay',$event)"></label>
      <label>默认说话方式<AppSelect v-model="settings.ptt" label="默认说话方式" :options="[{value:false,label:'自由说话',icon:'mic'},{value:true,label:'按住说话',icon:'mute'}]" @change="value=>$emit('voice-change',{ptt:value,pressing:false})"/></label>
      <label>聊天记录范围<AppSelect v-model="settings.chatHistoryDays" label="聊天记录范围" :options="[{label:'不限制',value:0},{label:'1 天',value:1},{label:'3 天',value:3},{label:'5 天',value:5},{label:'1 周',value:7},{label:'一个月',value:30}]"/></label>
    </div>
  </details>
  <details class="settings-disclosure081"><summary>联机网络</summary>
    <div class="card account-fields081">
      <label class="account-toggle081"><span><strong>启用上传前向纠错补偿</strong><small>保留统一配置；当前 Android 使用 P2P / 加密直连，Windows x64 启动器会调用内嵌 hxz-re。</small></span><input v-model="settings.fecEnabled" type="checkbox" role="switch"></label>
      <label class="account-toggle081"><span><strong>允许社区中继备用</strong><small>直连和 P2P 不可达时允许回退到社区中继，可随时关闭。</small></span><input v-model="settings.communityRelayEnabled" type="checkbox" role="switch"></label>
      <p class="muted">hxz-re 模块随 Windows x64 版本内嵌；Android、Windows x32 会自动回退到可用的普通连接方式。</p>
    </div>
  </details>
  <section class="settings-updates081" data-settings-section="updates"><UpdateCard :state="appUpdate" @action="(action,values)=>$emit('update',action,values)"/></section>
  <details ref="account" class="settings-disclosure081" @toggle="account?.open&&changed('account')"><summary>账号与连接</summary>
    <div class="account-menu081"><button class="account-menu-row081" @click="$emit('connection')"><Icon name="users"/><span><strong>社区连接</strong><small>{{state.connection}}</small></span><Icon name="chevron"/></button><button class="account-menu-row081" @click="$emit('skin')"><Icon name="user"/><span><strong>皮肤站账号管理</strong></span><Icon name="chevron"/></button><button class="account-menu-row081" :disabled="!state.connected" @click="$emit('avatar')"><Icon name="user"/><span><strong>更换社区头像</strong></span><Icon name="chevron"/></button></div>
    <button v-if="state.hasAccount" class="danger-button account-wide081" @click="$emit('logout')">退出登录</button>
  </details>
</section>
</template>
<style scoped>
.single-settings081 h2{font-size:1rem;line-height:1.5}.settings-disclosure081{min-width:0;flex-shrink:0}.settings-disclosure081>summary{cursor:pointer;padding:14px 2px;min-height:48px;font-size:.9rem;font-weight:550;line-height:1.5;overflow-wrap:anywhere}.settings-disclosure081[open]>summary{margin-bottom:8px}.settings-disclosure081>.card,.settings-disclosure081>.account-menu081{margin:0}.settings-disclosure081>.danger-button{margin-top:14px}.settings-updates081{display:flex;flex-direction:column;gap:12px;min-width:0}.settings-updates081 :deep(.card){margin:0}.settings-updates081 :deep(.section-title){margin:0;font-size:1rem}.settings-disclosure081 :deep(#media-controls){gap:14px}.settings-disclosure081 :deep(#media-controls>.card){margin:0}
</style>
