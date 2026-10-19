<script setup>
import Icon from './Icon.vue';
import AppSelect from './AppSelect.vue';
import UpdateCard from './UpdateCard.vue';
defineProps({area:String,settings:Object,appUpdate:Object,state:Object});
defineEmits(['open','back','connection','skin','avatar','logout','voice-overlay','voice-change','update']);
const areas=[{id:'account',icon:'user',title:'账号与连接',body:'皮肤站、角色与社区地址'},{id:'appearance',icon:'settings',title:'外观与显示',body:'主题、字号、背景与动画'},{id:'voice',icon:'headphones',title:'语音与聊天',body:'说话方式、覆盖与聊天记录'},{id:'updates',icon:'archive',title:'下载与更新',body:'版本、更新设置与发行说明'}];
</script>
<template>
<section class="content-page mobile-settings081">
  <header class="account-section-header"><button class="icon-button" :aria-label="area?'返回设置':'返回我的'" @click="$emit('back')"><Icon name="back"/></button><h1>{{areas.find(item=>item.id===area)?.title||'设置'}}</h1></header>
  <div v-if="!area" class="account-menu081"><button v-for="item in areas" :key="item.id" class="account-menu-row081" @click="$emit('open',item.id)"><Icon :name="item.icon"/><span><strong>{{item.title}}</strong><small>{{item.body}}</small></span><Icon name="chevron"/></button></div>
  <template v-if="area==='account'">
    <div class="account-menu081"><button class="account-menu-row081" @click="$emit('connection')"><Icon name="users"/><span><strong>社区连接</strong><small>{{state.connection}} · {{state.server}}</small></span><Icon name="chevron"/></button><button class="account-menu-row081" @click="$emit('skin')"><Icon name="user"/><span><strong>皮肤站账号管理</strong><small>皮肤、资料与账号安全</small></span><Icon name="chevron"/></button><button class="account-menu-row081" :disabled="!state.connected" @click="$emit('avatar')"><Icon name="user"/><span><strong>更换社区头像</strong><small>从相册选择并裁剪</small></span><Icon name="chevron"/></button></div>
    <button v-if="state.hasAccount" class="danger-button account-wide081" @click="$emit('logout')">退出登录</button>
  </template>
  <template v-if="area==='appearance'">
    <section class="card form-stack account-fields081"><label>主题<AppSelect v-model="settings.theme" label="主题" :options="[{value:'system',label:'跟随系统',icon:'settings'},{value:'light',label:'浅色',icon:'sun'},{value:'dark',label:'深色',icon:'moon'}]"/></label><label>文字大小 · {{settings.font}} px<input v-model.number="settings.font" type="range" min="14" max="22" step="1" aria-label="文字大小"></label><fieldset class="account-colors081"><legend>强调色</legend><button v-for="color in ['#4265df','#407d8b','#626cc1','#9f6178','#a17137']" :key="color" :aria-label="'强调色 '+color" :aria-pressed="settings.accent===color" @click="settings.accent=color"><span :style="{background:color}"><Icon v-if="settings.accent===color" name="check"/></span></button></fieldset></section>
    <div id="media-controls"/>
  </template>
  <template v-if="area==='voice'">
    <section class="card account-fields081"><label class="account-toggle081"><span><strong>语音屏幕覆盖</strong><small>加入语音后显示正在说话的伙伴</small></span><input type="checkbox" role="switch" :checked="settings.voiceOverlay" @change="$emit('voice-overlay',$event)"></label></section>
    <section class="card form-stack account-fields081"><label>说话方式<AppSelect v-model="settings.ptt" label="说话方式" :options="[{value:false,label:'自由说话',icon:'mic',description:'进入频道后持续传送语音'},{value:true,label:'按住说话',icon:'mute',description:'仅按住语音页按钮时传送语音'}]" @change="value=>$emit('voice-change',{ptt:value,pressing:false})"/></label><p class="muted">按住说话时，在通话面板按住麦克风按钮。离开应用会自动停止发言。</p><label>聊天记录范围<AppSelect v-model="settings.chatHistoryDays" label="聊天记录范围" :options="[{label:'不限制',value:0},{label:'1 天',value:1},{label:'3 天',value:3},{label:'5 天',value:5},{label:'1 周',value:7},{label:'一个月',value:30}]"/></label></section>
  </template>
  <template v-if="area==='updates'">
    <UpdateCard :state="appUpdate" @action="(action,values)=>$emit('update',action,values)"/>
    <article v-if="appUpdate.version" class="card form-stack"><h2>发行说明 · {{appUpdate.version.versionName}}</h2><p class="prose">{{appUpdate.version.notes||'此版本未提供更新说明。'}}</p></article>
  </template>
  <p class="account-version081">幻想镇社区 {{appUpdate.currentVersion||state.version}} · Android 10 及以上</p>
</section>
</template>
