<script setup lang="ts">
import {ref,watch,onMounted,onBeforeUnmount,nextTick} from 'vue';
import {state} from '../lib/launcher';
const video=ref<HTMLVideoElement>(),canvas=ref<HTMLCanvasElement>(),music=ref<HTMLAudioElement>();let frame=0,last=0;
function paint(now:number){
 const v=video.value,c=canvas.value,q=state.settings.videoQuality;
 if(v&&c&&!v.paused&&q!=='original'&&now-last>=(q==='efficient'?1000/15:1000/30)){
  last=now;const scale=Math.min(1,(q==='efficient'?1280:1920)/innerWidth,(q==='efficient'?720:1080)/innerHeight),w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  const ctx=c.getContext('2d',{alpha:false});if(ctx&&v.videoWidth){const fit=state.settings.backgroundFit,ratio=fit==='contain'?Math.min(w/v.videoWidth,h/v.videoHeight):Math.max(w/v.videoWidth,h/v.videoHeight);const dw=fit==='100% 100%'?w:v.videoWidth*ratio,dh=fit==='100% 100%'?h:v.videoHeight*ratio;ctx.fillStyle=state.settings.backgroundColor||'#152019';ctx.fillRect(0,0,w,h);ctx.drawImage(v,(w-dw)*(state.settings.backgroundPositionX??50)/100,(h-dh)*(state.settings.backgroundPositionY??50)/100,dw,dh);}
 }
 if(v&&!v.paused)frame=requestAnimationFrame(paint);
}
function playing(){cancelAnimationFrame(frame);frame=requestAnimationFrame(paint);}
async function sync(){await nextTick();if(video.value){if(document.hidden||state.running)video.value.pause();else void video.value.play().catch(()=>{});}if(music.value){music.value.volume=state.settings.musicVolume??.3;if(document.hidden||state.running)music.value.pause();else void music.value.play().catch(()=>{});}}
function reloadMusic(){if(music.value){music.value.load();void sync();}}
watch(()=>[state.settings.backgroundVideo,state.settings.backgroundMusic,state.settings.musicVolume,state.running],sync);
onMounted(()=>{document.addEventListener('visibilitychange',sync);window.addEventListener('pointerdown',sync,{once:true});window.addEventListener('hxz-refresh-music',reloadMusic);void sync();});
onBeforeUnmount(()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',sync);window.removeEventListener('pointerdown',sync);window.removeEventListener('hxz-refresh-music',reloadMusic);});
</script>
<template><div v-if="state.settings.backgroundVideo" class="ambient-video" :style="{opacity:state.settings.backgroundOpacity}"><video ref="video" :src="state.settings.backgroundVideo" muted loop playsinline @play="playing" :class="{source:state.settings.videoQuality!=='original'}" :style="{objectFit:state.settings.backgroundFit==='contain'?'contain':state.settings.backgroundFit==='100% 100%'?'fill':'cover',objectPosition:`${state.settings.backgroundPositionX}% ${state.settings.backgroundPositionY}%`}"/><canvas v-show="state.settings.videoQuality!=='original'" ref="canvas"/></div><audio v-if="state.settings.backgroundMusic" ref="music" :src="state.settings.backgroundMusic" loop preload="metadata"/></template>
<style scoped>.ambient-video{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}.ambient-video video,.ambient-video canvas{width:100%;height:100%;position:absolute;inset:0}.ambient-video .source{width:1px;height:1px;opacity:0}</style>
