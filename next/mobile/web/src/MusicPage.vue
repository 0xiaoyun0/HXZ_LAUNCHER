<script setup>
import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import {native,state,rooms} from './native.js';
import Icon from './Icon.vue';
import AppSelect from './AppSelect.vue';
const props=defineProps({visible:Boolean,settings:Object});
const items=ref([]),results=ref([]),query=ref(''),link=ref(''),notice=ref(''),busy=ref(false),active=ref(''),playing=ref(false),loading=ref(false),position=ref(0),duration=ref(0),volume=ref(.5),room=ref('lobby'),sharing=ref(false),mode=ref('list');
const current=computed(()=>items.value.find(x=>x.id===active.value));
const audio=new Audio();audio.preload='metadata';let generation=0,attempted=new Set(),timer,context,source,gain,worklet;
function persist(){localStorage.setItem('hxz-music-library',JSON.stringify(items.value));}
function add(track){if(!items.value.some(x=>x.id===track.id)&&items.value.length<500){items.value.push(track);persist();}return track;}
async function action(fn){if(busy.value)return;busy.value=true;notice.value='';try{await fn();}catch(e){if(e.message!=='已取消')notice.value=e.message;}finally{busy.value=false;}}
async function search(){await action(async()=>{results.value=(await native('music',{action:'search',query:query.value})).items;});}
async function importList(){await action(async()=>{const r=await native('music',{action:'playlist',link:link.value});let added=0;for(const t of r.items){if(items.value.length>=500)break;if(!items.value.some(x=>x.id===t.id)){add(t);added++;}}notice.value=`${r.name} · 已导入 ${added} 首，音乐库共 ${items.value.length} 首`;link.value='';});}
async function importLocal(){await action(async()=>{const r=await native('pick',{kind:'music'});add({id:r.url,title:r.name||'本地音乐',artist:'本地文件',url:r.url,source:'local'});});}
function clock(s){return Math.floor((s||0)/60)+':'+String(Math.floor((s||0)%60)).padStart(2,'0');}
function nextId(step=1){const start=items.value.findIndex(t=>t.id===active.value),n=items.value.length;if(!n)return '';for(let i=1;i<=n;i++){const t=items.value[(start+step*i+n*2)%n];if(!attempted.has(t.id))return t.id;}return '';}
async function play(id,chain=false){
 const t=items.value.find(t=>t.id===id);if(!t)return;if(!chain)attempted=new Set();const token=++generation;audio.pause();clearTimeout(timer);loading.value=true;playing.value=false;active.value=id;attempted.add(id);
 try{const url=t.url||(await native('music',{action:'prepare',id:t.netId})).url;if(token!==generation)return;audio.src=url;audio.volume=volume.value;timer=setTimeout(()=>{if(token===generation)failed('读取音频超时');},25000);await audio.play();if(token!==generation)return;playing.value=true;}catch(e){if(token===generation)failed(e.message);}
}
function failed(reason){clearTimeout(timer);loading.value=false;playing.value=false;notice.value=(current.value?.title||'此曲目')+' 无法播放，正在尝试下一首';const next=nextId();if(next)void play(next,true);else{audio.pause();generation++;notice.value='本轮曲目均无法播放，已停止。'+String(reason||'请检查文件或网络').slice(0,130);}}
function pause(){generation++;audio.pause();clearTimeout(timer);loading.value=false;playing.value=false;}
async function toggle(){if(playing.value||loading.value){pause();return;}if(audio.src&&active.value){try{await context?.resume();await audio.play();playing.value=true;}catch(e){failed(e.message);}}else if(items.value[0])void play(items.value[0].id);}
function skip(step){attempted=new Set();const id=nextId(step);if(id)void play(id);}
async function remove(t){if(active.value===t.id){pause();active.value='';audio.removeAttribute('src');audio.load();}items.value=items.value.filter(x=>x.id!==t.id);persist();if(t.source==='local')await native('music',{action:'remove',url:t.url}).catch(()=>{});}
audio.addEventListener('playing',()=>{clearTimeout(timer);loading.value=false;playing.value=true;if(notice.value.includes('正在尝试下一首'))notice.value='已跳过不可播放的曲目，继续播放 '+(current.value?.title||'下一首');});
audio.addEventListener('timeupdate',()=>position.value=audio.currentTime);
audio.addEventListener('durationchange',()=>duration.value=Number.isFinite(audio.duration)?audio.duration:0);
audio.addEventListener('error',()=>{if(active.value&&(playing.value||loading.value))failed('音频格式或链接不可用');});
audio.addEventListener('ended',()=>{attempted=new Set();void play(mode.value==='one'?active.value:nextId());});
watch(volume,value=>{audio.volume=Number(value);});
async function listen(){await action(async()=>{await native('voiceSettings',{muted:true,deafened:false});await native('voiceJoin',{room:room.value});notice.value='加入后可收听同房间伙伴分享的音乐，麦克风保持关闭';});}
async function stopShare(){sharing.value=false;worklet?.port.postMessage(false);await native('musicShare',{enabled:false}).catch(()=>{});}
async function share(){if(sharing.value){await stopShare();return;}await action(async()=>{if(!state.room)throw Error('请先加入一个语音房间');
 if(!context){context=new AudioContext({sampleRate:48000});await context.audioWorklet.addModule(new URL('./music-capture.js',import.meta.url));source=context.createMediaElementSource(audio);gain=context.createGain();gain.gain.value=1;source.connect(gain).connect(context.destination);worklet=new AudioWorkletNode(context,'hxz-music-capture');source.connect(worklet).connect(context.destination);worklet.port.onmessage=e=>{if(!sharing.value)return;const bytes=new Uint8Array(e.data);let raw='';for(const b of bytes)raw+=String.fromCharCode(b);window.HXZNative?.musicPCM?.(btoa(raw));};}
 await context.resume();await native('musicShare',{enabled:true});sharing.value=true;worklet.port.postMessage(true);notice.value='正在分享播放器声音，麦克风状态保持不变';});}
watch(()=>state.room,()=>{if(sharing.value)void stopShare();});
function hidden(){if(document.hidden){pause();void stopShare();}}
onMounted(()=>{try{items.value=JSON.parse(localStorage.getItem('hxz-music-library')||'[]').filter(x=>x&&typeof x.id==='string').slice(0,500);}catch{}if(props.settings.music){add({id:props.settings.music,title:'原背景音乐',artist:'本地文件',url:props.settings.music,source:'local'});props.settings.music='';}document.addEventListener('visibilitychange',hidden);});
onBeforeUnmount(()=>{pause();void stopShare();context?.close();audio.removeAttribute('src');audio.load();document.removeEventListener('visibilitychange',hidden);});
</script>
<template>
<section v-show="visible" class="content-page music-page">
 <div class="page-toolbar"><h1>音乐播放器</h1><span class="tag">{{items.length}} / 500</span></div>
 <p v-if="notice" class="card music-notice" role="status">{{notice}}</p>
 <section class="card music-now"><div class="music-track-icon"><Icon name="music"/></div><div><small>正在播放</small><h2>{{current?.title||'选一首喜欢的音乐'}}</h2><p class="muted">{{current?.artist||'本地音乐 · 网易云可用外链'}}</p></div><div class="music-progress"><input type="range" min="0" :max="duration||1" :value="position" step=".1" aria-label="播放进度" @change="audio.currentTime=Number($event.target.value)"><div><small>{{clock(position)}}</small><small>{{clock(duration)}}</small></div></div><div class="music-buttons"><button class="soft-button" aria-label="上一首" @click="skip(-1)"><Icon name="previous"/></button><button class="primary" :disabled="!items.length" @click="toggle"><Icon :name="playing||loading?'pause':'play'"/>{{loading?'取消加载':playing?'暂停':'播放'}}</button><button class="soft-button" aria-label="下一首" @click="skip(1)"><Icon name="next"/></button></div><label class="music-volume">音量<input v-model.number="volume" type="range" min="0" max="1" step=".05" aria-label="音乐音量"></label><AppSelect v-model="mode" label="播放方式" :options="[{value:'list',label:'列表循环'},{value:'one',label:'单曲循环'}]"/></section>
 <section class="card form-stack"><h2>网易云音乐</h2><form class="music-search" @submit.prevent="search"><input v-model="query" placeholder="搜索歌曲、歌手" maxlength="200" aria-label="搜索歌曲"><button class="soft-button" :disabled="busy||!query.trim()">搜索</button></form><form class="music-search" @submit.prevent="importList"><input v-model="link" placeholder="公开歌单链接或 ID" aria-label="网易云歌单链接"><button class="soft-button" :disabled="busy||!link.trim()">导入歌单</button></form><p class="muted">仅播放可用外链，会员或版权受限曲目会自动跳过。</p><div v-if="results.length" class="music-list search-results"><button v-for="t in results" :key="t.id" class="music-song" @click="add(t);play(t.id)"><Icon name="plus"/><span><strong>{{t.title}}</strong><small>{{t.artist}}</small></span></button></div></section>
 <section class="card form-stack"><h2>一起听</h2><AppSelect v-model="room" label="选择房间" :options="rooms.map(r=>({value:r.id,label:r.name}))"/><div class="actions"><button class="soft-button" :disabled="busy||!state.connected" @click="listen"><Icon name="headphones"/>加入收听</button><button class="soft-button" :disabled="!state.room||busy" :aria-pressed="sharing" @click="share">{{sharing?'停止分享':'分享播放器'}}</button></div><p class="muted">{{state.room?'当前频道：'+(rooms.find(r=>r.id===state.room)?.name||state.room):'同一语音房间内收听，默认不开麦'}}。切换页面继续播放，进入后台暂停音乐分享。</p></section>
 <section class="card music-library"><header><h2>我的音乐</h2><button class="soft-button" :disabled="busy||items.length>=500" @click="importLocal"><Icon name="plus"/>导入音乐</button></header><p v-if="!items.length" class="empty-note">导入普通音频、常见 NCM 或旧 QMC，或搜索网易云音乐。单曲最多 50 MB。</p><div class="music-list"><div v-for="t in items" :key="t.id" class="music-song" :class="{selected:t.id===active}"><button class="song-play" @click="play(t.id)"><Icon :name="active===t.id&&playing?'music':'play'"/><span><strong>{{t.title}}</strong><small>{{t.artist}}</small></span></button><button class="icon-button" :aria-label="'移除 '+t.title" @click="remove(t)"><Icon name="close"/></button></div></div></section>
</section>
</template>
