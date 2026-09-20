<script setup lang="ts">
import {ref,computed,watch,onBeforeUnmount,onMounted} from 'vue';
import {community,communityRequest,communityAsset,connect} from '../lib/community';
import {state,saveSettings,perform} from '../lib/launcher';
type Dialogue={speaker:string;text:string};
type Card={id:string;state:string;name?:string;art?:string;activity?:string;detail?:{eyebrow:string;title:string;line:string};dialogue?:Dialogue[]};
type Activity={entered:boolean;title:string;subtitle:string;cards:Card[];center:{dialogue?:Dialogue[];line?:string};storyCompleted:boolean;finalRevealReady:boolean};
const activity=ref<Activity>(),selected=ref<Card>(),code=ref(''),busy=ref(false),error=ref(''),art=ref<Record<string,string>>({}),finale=ref(false);
let controller=new AbortController(),generation=0;
const identity=computed(()=>`${state.settings.communityUrl}:${community.user?.uid||''}:${community.connected}`);
const lit=computed(()=>activity.value?.cards.filter(c=>c.state==='available').length||0);
const title=computed(()=>finale.value?'同一张地图':selected.value?.detail?.title||selected.value?.name);
async function load(){
 const current=++generation;controller.abort();controller=new AbortController();
 for(const url of Object.values(art.value))URL.revokeObjectURL(url);art.value={};selected.value=undefined;finale.value=false;activity.value=undefined;
 if(!community.connected)return;
 busy.value=true;error.value='';
 try{const data=await communityRequest('/api/arcana/public',{signal:controller.signal},true) as Activity;if(current!==generation)return;activity.value=data;
 await Promise.all(data.cards.filter(c=>c.state==='available'&&/^\/assets\/[\w-]+\.(png|svg)$/.test(c.art||'')).map(async c=>{try{const blob=await communityAsset('/api/arcana/art/'+c.art!.slice(8),controller.signal);if(current===generation)art.value[c.id]=URL.createObjectURL(blob);}catch{}}));
 }catch(e){if(current===generation)error.value=e instanceof Error?e.message:String(e);}finally{if(current===generation)busy.value=false;}
}
async function action(path:string,body:object){if(busy.value)return;busy.value=true;error.value='';try{await communityRequest('/api/arcana/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal},true);code.value='';await load();}catch(e){error.value=e instanceof Error?e.message:String(e);}finally{busy.value=false;}}
async function finishReading(){if(!selected.value)return;if(selected.value.id==='lovers'&&!finale.value){finale.value=true;return;}await action(finale.value?'story-complete':'card-read',finale.value?{}:{cardId:selected.value.id});}
watch(identity,load,{immediate:true});
onMounted(()=>{if(!state.settings.linkingDiscovered)void perform(()=>saveSettings({linkingDiscovered:true,showLinking:true}));});
onBeforeUnmount(()=>{generation++;controller.abort();for(const url of Object.values(art.value))URL.revokeObjectURL(url);});
</script>
<template>
<section class="linking-page">
 <header class="linking-header"><div><small>LINKING</small><h1>{{activity?.title||'同一张地图'}}</h1><p>{{activity?.subtitle||'一个周目，七次相遇'}}</p></div><q-btn flat round icon="refresh" aria-label="刷新活动" :loading="busy" @click="load"/></header>
 <p v-if="error" class="linking-error" role="alert">{{error}}</p>
 <div v-if="!community.connected" class="linking-entry"><q-icon name="auto_awesome" size="44px"/><h2>连接之后，故事继续</h2><q-btn outline label="连接社区" :loading="community.connecting" @click="connect()"/><p>{{community.error}}</p></div>
 <form v-else-if="!activity?.entered" class="linking-entry" @submit.prevent="action('unlock',{code})"><q-icon name="auto_awesome" size="46px"/><h2>每次相遇，都有回响</h2><q-input v-model="code" outlined label="入口代码" maxlength="100" :disable="busy"/><q-btn type="submit" unelevated class="primary-button" label="进入牌库" :loading="busy" :disable="!code.trim()"/></form>
 <div v-else class="linking-body">
  <aside class="linking-library"><div class="linking-progress"><strong>记忆牌库</strong><span>{{lit}} / {{activity.finalRevealReady?8:7}}</span></div>
   <div class="linking-cards"><button v-for="(card,index) in activity.cards" :key="card.id" :class="['linking-card',{chosen:selected?.id===card.id,lit:card.state==='available'}]" :disabled="card.state!=='available'" @click="selected=card;finale=false"><img v-if="art[card.id]" :src="art[card.id]" alt="" draggable="false"/><span v-else class="card-mark">✧</span><span class="card-caption"><small>{{String(index+1).padStart(2,'0')}}</small><strong>{{card.name||'未点亮'}}</strong></span></button></div>
   <form class="linking-unlock" @submit.prevent="action('card-unlock',{code})"><q-input v-model="code" outlined dense label="卡牌代码" maxlength="100"/><q-btn type="submit" icon="key" aria-label="点亮卡牌" :loading="busy" :disable="!code.trim()"/></form>
   <p v-if="activity.storyCompleted" class="linking-complete">✦ 恋人牌已加入牌库</p>
  </aside>
  <article class="linking-reader"><template v-if="selected"><header><small>{{selected.detail?.eyebrow||selected.activity}}</small><h2>{{title}}</h2></header><div class="linking-story"><p class="story-intro">{{finale?activity.center.line:selected.detail?.line}}</p><div v-for="(line,index) in (finale?activity.center.dialogue:selected.dialogue)||[]" :key="index" class="dialogue-line"><strong>{{line.speaker}}</strong><p>{{line.text}}</p></div></div><footer><q-btn unelevated class="primary-button" :label="finale?'完成归档':selected.id==='lovers'?'阅读最终篇章':'读完了'" :loading="busy" @click="finishReading"/></footer></template><div v-else class="linking-welcome"><q-icon name="auto_stories" size="42px"/><h2>选择一张已点亮的牌</h2><p>故事会在这里展开</p></div></article>
 </div>
</section>
</template>
<style scoped>
.linking-page{height:100%;min-height:0;display:flex;flex-direction:column;background:radial-gradient(ellipse at 85% 0,#35334366,transparent 60%),#151822;color:#ebe6dc;border:1px solid #ffffff14;border-radius:14px;overflow:hidden;overscroll-behavior:none}.linking-header{display:flex;align-items:center;justify-content:space-between;padding:22px 26px;border-bottom:1px solid #ffffff14;flex:none}.linking-header small{letter-spacing:.3em;color:#b8a987;font-size:11px}.linking-header h1{font-size:25px;margin:4px 0}.linking-header p{margin:0;color:#aaa5a2;font-size:13px}.linking-error{color:#f5b7af;padding:10px 24px;margin:0}.linking-body{display:grid;grid-template-columns:minmax(275px,42%) minmax(0,1fr);flex:1;min-height:0}.linking-library{padding:18px;display:flex;flex-direction:column;gap:14px;border-right:1px solid #ffffff14;min-height:0}.linking-progress{display:flex;justify-content:space-between;color:#b8a987;font-size:13px}.linking-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:9px;flex:1;min-height:0}.linking-card{position:relative;min-height:0;border:1px solid #ffffff22;border-radius:10px;overflow:hidden;padding:0;background:#212431;color:#dfd6bf;cursor:pointer}.linking-card:disabled{cursor:default;opacity:.65}.linking-card.chosen{border-color:#d5bd7f;box-shadow:0 0 0 2px #d5bd7f33}.linking-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.card-mark{display:grid;place-items:center;height:100%;font-size:30px;color:#a29374}.card-caption{position:absolute;inset:auto 0 0;padding:20px 7px 9px;display:flex;flex-direction:column;background:linear-gradient(transparent,#111722ee);font-size:13px}.card-caption small{font-size:10px;color:#c7b890}.linking-unlock{display:flex;gap:7px;flex:none}.linking-unlock .q-field{flex:1;min-width:0}.linking-page :deep(.q-field__native),.linking-page :deep(.q-field__label){color:#ddd9ce}.linking-page :deep(.q-field__control:before){border-color:#ffffff33}.linking-reader{display:flex;flex-direction:column;min-height:0;padding:24px}.linking-reader header{flex:none;border-bottom:1px solid #ffffff14;padding-bottom:16px}.linking-reader header small{color:#b8a987;font-size:12px}.linking-reader h2{font-size:23px;margin:8px 0 0}.linking-story{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px 6px 16px 0;scrollbar-width:thin}.story-intro{color:#c9baa0;white-space:pre-wrap;line-height:1.9}.dialogue-line{margin:16px 0}.dialogue-line strong{font-size:12px;color:#b8a987}.dialogue-line p{white-space:pre-wrap;line-height:1.8;margin:7px 0}.linking-reader footer{flex:none;padding-top:12px}.linking-entry,.linking-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;min-height:0}.linking-entry .q-field{width:min(340px,80%)}.linking-entry h2,.linking-welcome h2{font-size:20px}.linking-welcome p{color:#aaa5a2}.linking-complete{font-size:13px;color:#d5bd7f;margin:0}@media(max-height:750px){.linking-header{padding:12px 22px}.linking-header h1{font-size:21px}.linking-library,.linking-reader{padding:14px}.linking-cards{gap:6px}}
</style>
