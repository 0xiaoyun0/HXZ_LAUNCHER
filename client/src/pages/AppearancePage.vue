<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import {
  state,
  selectedAccount,
  reload,
  saveSettings,
  invoke,
  perform
} from "../lib/launcher";
import PlayerAvatar from "../components/PlayerAvatar.vue";
const section = ref("basic");
const sections=[{id:"basic",label:"主题与文字",icon:"palette"},{id:"media",label:"背景与头图",icon:"panorama"},{id:"columns",label:"栏目与面板",icon:"dashboard_customize"},{id:"sound",label:"声音与动效",icon:"graphic_eq"},{id:"avatar",label:"我的头像",icon:"account_circle"}];
const avatar = ref(selectedAccount.value?.avatar),
  avatarNote = ref("");
watch(
  () => selectedAccount.value?.id,
  () => {
    avatar.value = selectedAccount.value?.avatar;
    avatarNote.value = "";
  }
);
async function chooseAvatar() {
  const value = await invoke<string | null>("avatar.choose");
  if (value) avatar.value = value;
}
async function saveAvatar() {
  const result = await invoke<{ synced: boolean }>("avatar.save", {
    id: selectedAccount.value?.id,
    avatar: avatar.value || ""
  });
  await reload();
  avatarNote.value = result.synced
    ? "头像已保存并同步社区"
    : "头像已保存，下次连接社区时同步";
}
const form = reactive({
  showCover:state.settings.showCover!==false,
  theme: state.settings.theme,
  fontSize: state.settings.fontSize,
  accentColor: state.settings.accentColor,
  backgroundColor: state.settings.backgroundColor,
  backgroundVideo:state.settings.backgroundVideo,defaultCover:state.settings.defaultCover,backgroundMusic:state.settings.backgroundMusic,musicVolume:state.settings.musicVolume,videoQuality:state.settings.videoQuality,animationSpeed:state.settings.animationSpeed,
  backgroundImage: state.settings.backgroundImage,
  backgroundOpacity: state.settings.backgroundOpacity,
  backgroundPositionX: state.settings.backgroundPositionX ?? 50,
  backgroundPositionY: state.settings.backgroundPositionY ?? 50,
  backgroundFit: state.settings.backgroundFit || "cover",
  hiddenLinks: [...(state.settings.hiddenLinks || [])],
  columns: {
    sidebar: { ...state.settings.columns.sidebar },
    workspace: { ...state.settings.columns.workspace },
    dock: { ...state.settings.columns.dock }
  },
  layout: state.settings.layout
});
watch(() => state.settings.animationSpeed, value => { form.animationSpeed = value; });
async function save() {
  form.columns.workspace.visible = true;
  await saveSettings({
    ...form,
    hiddenLinks: [...form.hiddenLinks],
    columns: {
      sidebar: { ...form.columns.sidebar },
      workspace: { ...form.columns.workspace },
      dock: { ...form.columns.dock }
    }
  });
}
async function media(kind:'background'|'cover'|'music'){
 const value=await invoke<string|null>('media.choose',{kind:kind==='music'?'music':'visual'});if(!value)return;
 if(kind==='cover')form.defaultCover=value;else if(kind==='music')form.backgroundMusic=value;else if(/\.(mp4|webm)$/i.test(value)){form.backgroundVideo=value;form.backgroundImage='';}else{form.backgroundImage=value;form.backgroundVideo='';}
}
function refreshMusic(){window.dispatchEvent(new Event('hxz-refresh-music'));}
async function background() {
  const image = await invoke<string | null>("background.choose");
  if (image) { form.backgroundImage = image; form.backgroundVideo = ""; }
}
async function reset() {
  Object.assign(form, {
    theme: "light",
    fontSize: 15,
    accentColor: "#a9ce80",
    backgroundColor: "",
    showCover:true,backgroundVideo:"",defaultCover:"",backgroundMusic:"",musicVolume:.3,videoQuality:"balanced",animationSpeed:1,
    backgroundImage: "",
    backgroundOpacity: 0.4,
    backgroundPositionX: 50,
    backgroundPositionY: 50,
    backgroundFit: "cover",
    hiddenLinks: [],
    columns: {
      sidebar: { visible: true, color: "", opacity: 1, label: "游戏与社区" },
      workspace: { visible: true, color: "", opacity: 1, label: "主工作区" },
      dock: { visible: true, color: "", opacity: 1, label: "任务详情" }
    },
    layout: "standard"
  });
  await save();
}
</script>
<template>
  <div class="page-heading appearance-heading"><h1>个性化</h1><q-btn unelevated class="primary-button" icon="check" label="应用外观" @click="perform(save, '外观已保存')"/></div>
  <nav class="appearance-tabs" aria-label="个性化分类"><q-btn v-for="item in sections" :key="item.id" flat :icon="item.icon" :label="item.label" :class="{selected:section===item.id}" :aria-pressed="section===item.id" @click="section=item.id"/></nav>
  <div class="appearance-body">
  <template v-if="section==='basic'">
    <section class="panel settings-section"><h2>主题</h2><div class="appearance-grid"><q-select v-model="form.theme" outlined label="明暗模式" emit-value map-options :options="[{label:'浅色',value:'light'},{label:'深色',value:'dark'}]"/><q-select v-model="form.layout" outlined label="布局间距" emit-value map-options :options="[{label:'标准',value:'standard'},{label:'紧凑',value:'compact'},{label:'宽松',value:'wide'}]"/><label class="color-setting">主题色<input v-model="form.accentColor" type="color"/></label><label class="color-setting">背景底色<input :value="form.backgroundColor||(form.theme==='light'?'#f4f5ef':'#101a18')" type="color" @input="form.backgroundColor=($event.target as HTMLInputElement).value"/><q-btn flat label="跟随主题" @click="form.backgroundColor=''"/></label></div></section>
    <section class="panel settings-section"><h2>文字大小</h2><div class="appearance-grid"><div><label>整体字号 · {{form.fontSize}} px</label><q-slider v-model="form.fontSize" :min="13" :max="22" :step="1" label markers/></div><div class="appearance-sample" :style="{fontSize:form.fontSize+'px'}"><strong>幻想镇 · 新的旅程</strong><p>游戏实例、社区消息与日常设置</p></div></div></section>
  </template>
  <template v-else-if="section==='media'">
    <section class="panel settings-section"><div class="section-title"><h2>启动器背景</h2><div class="appearance-actions"><q-btn outline icon="image" label="选择图片 / 视频" @click="perform(()=>media('background'))"/><q-btn flat label="清除" :disable="!form.backgroundImage&&!form.backgroundVideo" @click="form.backgroundImage='';form.backgroundVideo=''"/></div></div>
      <div class="appearance-media-grid"><div class="appearance-preview" :style="{backgroundColor:form.backgroundColor||undefined}"><img v-if="form.backgroundImage" :src="form.backgroundImage" alt="背景构图预览" :style="{objectPosition:form.backgroundPositionX+'% '+form.backgroundPositionY+'%',objectFit:form.backgroundFit==='100% 100%'?'fill':form.backgroundFit as 'cover'|'contain',opacity:form.backgroundOpacity}"/><video v-else-if="form.backgroundVideo" :src="form.backgroundVideo" muted playsinline preload="metadata" :style="{objectPosition:form.backgroundPositionX+'% '+form.backgroundPositionY+'%',objectFit:form.backgroundFit==='100% 100%'?'fill':form.backgroundFit as 'cover'|'contain',opacity:form.backgroundOpacity}"/><span v-else><q-icon name="panorama" size="36px"/><br>使用默认背景</span></div>
      <div class="appearance-controls"><label>背景可见度 · {{Math.round(form.backgroundOpacity*100)}}%<q-slider v-model="form.backgroundOpacity" :min=".2" :max="1" :step=".01"/></label><label>水平位置 · {{form.backgroundPositionX}}%<q-slider v-model="form.backgroundPositionX" :min="0" :max="100"/></label><label>垂直位置 · {{form.backgroundPositionY}}%<q-slider v-model="form.backgroundPositionY" :min="0" :max="100"/></label><q-select v-model="form.backgroundFit" outlined label="填充方式" emit-value map-options :options="[{label:'覆盖裁剪',value:'cover'},{label:'完整显示',value:'contain'},{label:'拉伸填充',value:'100% 100%'}]"/></div></div>
      <q-select v-if="form.backgroundVideo" v-model="form.videoQuality" outlined label="视频绘制质量" emit-value map-options :options="[{label:'原始画质',value:'original'},{label:'均衡 · 1080p / 30 帧',value:'balanced'},{label:'节能 · 720p / 15 帧',value:'efficient'}]"/><p class="subtle">视频最大 50 MB。后台暂停视频，游戏运行时暂停视频与音乐。</p>
    </section>
    <section class="panel settings-section"><div class="section-title"><h2>游戏实例头图</h2><q-toggle v-model="form.showCover" label="显示头图"/></div><p class="subtle">关闭后保留实例信息，内容自动收拢，不占用图片空间。</p><template v-if="form.showCover"><div class="appearance-actions"><q-btn outline icon="panorama" label="选择默认头图" @click="perform(()=>media('cover'))"/><q-btn flat label="恢复默认" :disable="!form.defaultCover" @click="form.defaultCover=''"/></div><p class="subtle">实例单独设置的头图优先显示，可在实例页面调整位置。</p></template></section>
  </template>
  <template v-else-if="section==='columns'">
    <section class="panel settings-section"><h2>区域外观</h2><p class="subtle">分别设置底色与不透明度，最低 20%。文字与弹窗保持清晰。</p><div class="appearance-columns"><div v-for="(column,name) in form.columns" :key="name" class="appearance-column"><q-toggle v-model="column.visible" :disable="name==='workspace'" :label="({sidebar:'侧边导航',workspace:'主工作区',dock:'启动与任务栏'})[name]"/><q-input v-model="column.label" outlined label="栏目名称"/><label class="color-setting">底色<input :value="column.color||(form.theme==='light'?'#ffffff':'#1b2621')" type="color" @input="column.color=($event.target as HTMLInputElement).value"/><q-btn flat dense label="重置" @click="column.color=''"/></label><label>不透明度 · {{Math.round(column.opacity*100)}}%<q-slider v-model="column.opacity" :min=".2" :max="1" :step=".01"/></label></div></div></section>
    <section class="panel settings-section"><h2>隐藏不常用的导航</h2><q-option-group v-model="form.hiddenLinks" type="checkbox" :options="[{label:'游戏实例',value:'/instances'},{label:'下载与安装',value:'/downloads'},{label:'机械动力蓝图库',value:'/blueprints'},{label:'聊天大厅',value:'/chat'},{label:'幻想镇论坛',value:'/forum'},{label:'小游戏',value:'/games'},{label:'积分商城',value:'/shop'},{label:'通知公告',value:'/notices'}]" class="appearance-links"/></section>
  </template>
  <template v-else-if="section==='sound'">
    <section class="panel settings-section"><h2>背景音乐</h2><div class="appearance-actions"><q-btn outline icon="music_note" label="选择音乐" @click="perform(()=>media('music'))"/><q-btn flat label="关闭音乐" :disable="!form.backgroundMusic" @click="form.backgroundMusic=''"/><q-btn flat icon="refresh" label="刷新播放" @click="refreshMusic"/></div><p class="subtle">{{form.backgroundMusic?'已选择自定义音乐':'未设置背景音乐'}}</p><label>音量 · {{Math.round(form.musicVolume*100)}}%</label><q-slider v-model="form.musicVolume" :min="0" :max="1" :step=".05"/></section>
    <section class="panel settings-section"><h2>界面动效</h2><q-select v-model="form.animationSpeed" @update:model-value="perform(()=>saveSettings({animationSpeed:form.animationSpeed}))" outlined label="动画速度 · 即时生效" emit-value map-options :options="[{label:'关闭动画',value:0},{label:'舒缓 · 0.5 倍',value:.5},{label:'标准',value:1},{label:'轻快 · 1.5 倍',value:1.5},{label:'快速 · 2 倍',value:2}]"/><p class="subtle">影响页面切换、按钮和面板展开；游戏画面保持正常运行。</p></section>
  </template>
  <section v-else class="panel settings-section"><h2>我的头像</h2><div class="avatar-editor"><PlayerAvatar class="avatar-preview" :name="selectedAccount?.name" :uid="selectedAccount?.uuid" :image="avatar"/><div><strong>{{selectedAccount?.name||'请先登录并选择角色'}}</strong><p class="subtle">头像绑定当前角色，并在社区中显示。</p><div class="appearance-actions"><q-btn outline icon="image" label="选择图片" :disable="!selectedAccount?.uuid" @click="perform(chooseAvatar)"/><q-btn flat label="恢复默认" :disable="!selectedAccount?.uuid" @click="avatar=''"/><q-btn unelevated class="primary-button" label="保存头像" :disable="!selectedAccount?.uuid" @click="perform(saveAvatar)"/></div><p v-if="avatarNote" role="status" class="subtle">{{avatarNote}}</p></div></div></section>
  </div><footer class="appearance-footer"><q-btn flat icon="restart_alt" label="恢复默认外观" @click="perform(reset, '已恢复默认外观')"/></footer>
</template>
<style scoped>
.appearance-tabs{display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--border);padding:0 0 12px;margin-bottom:20px}.appearance-tabs .selected{background:var(--accent-soft,var(--panel-hover));color:var(--text);font-weight:600}.appearance-tabs .q-btn{min-height:40px}.appearance-body{max-width:1120px}.appearance-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 24px;align-items:center}.appearance-sample{padding:20px;border-left:3px solid var(--accent);background:var(--panel-hover);border-radius:8px}.appearance-sample p{margin:10px 0 0;color:var(--muted)}.appearance-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.appearance-media-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:28px;margin:20px 0}.appearance-preview{min-height:220px;aspect-ratio:16/10;position:relative;display:grid;place-items:center;border:1px solid var(--border);border-radius:10px;background:var(--panel-hover);overflow:hidden}.appearance-preview>img,.appearance-preview>video{position:absolute;width:100%;height:100%;inset:0}.appearance-preview>span{text-align:center;color:var(--muted);line-height:2}.appearance-controls{display:flex;flex-direction:column;gap:12px}.appearance-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.appearance-column{min-width:0;display:flex;flex-direction:column;gap:16px;padding:0 20px 0 0;border-right:1px solid var(--border)}.appearance-column:last-child{padding-right:0;border:0}.appearance-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.appearance-footer{margin:12px 0;color:var(--muted)}.section-title{gap:16px;flex-wrap:wrap}.settings-section .subtle{line-height:1.7}.settings-section h2{margin-bottom:18px}.section-title h2{margin:0}.color-setting{flex-wrap:wrap;gap:12px}
@media(max-width:1050px){.appearance-columns{grid-template-columns:minmax(0,1fr)}.appearance-column{border:0;border-bottom:1px solid var(--border);padding:0 0 18px}.appearance-media-grid{grid-template-columns:minmax(0,1fr)}.appearance-preview{max-height:260px;min-height:160px}.appearance-grid{gap:20px}}
@media(max-width:760px){.appearance-grid,.appearance-links{grid-template-columns:minmax(0,1fr)}.appearance-tabs .q-btn{padding:8px}.avatar-editor{align-items:flex-start;flex-wrap:wrap}}
</style>
