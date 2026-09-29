<script setup>
import {ref,reactive,computed,watch,onMounted,onUnmounted,nextTick} from 'vue';
import Icon from './Icon.vue';

const props=defineProps({group:String,icon:String,label:String,status:String,workspace:Object,hidden:Boolean});
const emit=defineEmits(['toggle']);
const KEY='hxz-mobile-switch-positions-v1',SIZE=46,HOLD=420;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const positions={chat:{x:0,y:.42},community:{x:0,y:.62}};
try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
  for(const group of Object.keys(positions))if(Number.isFinite(saved[group]?.x)&&Number.isFinite(saved[group]?.y))
    positions[group]={x:clamp(saved[group].x,0,1),y:clamp(saved[group].y,0,1)};
}catch{}
const button=ref(),point=reactive({x:8,y:180}),dragging=ref(false),pressed=ref(false),ready=ref(false);
let gesture,timer,frame,observer,bounds={left:8,top:70,right:300,bottom:600};
const style=computed(()=>({transform:`translate3d(${point.x}px,${point.y}px,0)`}));
function measure(){
  const el=props.workspace;if(!el)return;
  const rect=el.getBoundingClientRect(),viewport=window.visualViewport;
  // Page transitions translate the workspace, but the switch stays in place.
  const transform=getComputedStyle(el).transform;
  const shift=transform==='none'?0:new DOMMatrixReadOnly(transform).m41;
  const left=Math.max(rect.left-shift,viewport?.offsetLeft||0)+8;
  const top=Math.max(rect.top,viewport?.offsetTop||0)+10;
  const right=Math.max(left,Math.min(rect.right-shift,(viewport?.offsetLeft||0)+(viewport?.width||innerWidth))-SIZE-8);
  const bottomEdge=Math.min(rect.bottom,(viewport?.offsetTop||0)+(viewport?.height||innerHeight));
  // Keep clear of the chat composer as well as the primary navigation.
  const reserve=Math.min(72,Math.max(0,bottomEdge-top-SIZE-10));
  bounds={left,top,right,bottom:Math.max(top,bottomEdge-SIZE-10-reserve)};
  if(dragging.value){point.x=clamp(point.x,left,right);point.y=clamp(point.y,top,bounds.bottom);}
  else{
    const saved=positions[props.group]||positions.chat;
    point.x=left+(right-left)*saved.x;point.y=top+(bounds.bottom-top)*saved.y;
  }
  ready.value=true;
}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);}
function store(group){
  positions[group]={x:bounds.right===bounds.left?0:(point.x-bounds.left)/(bounds.right-bounds.left),y:bounds.bottom===bounds.top?0:(point.y-bounds.top)/(bounds.bottom-bounds.top)};
  try{localStorage.setItem(KEY,JSON.stringify(positions));}catch{}
}
function down(event){
  if(!event.isPrimary||event.button!==0||!props.group)return;
  event.preventDefault();
  stop(false);measure();pressed.value=true;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY,originX:point.x,originY:point.y,group:props.group,moved:false};
  event.currentTarget.setPointerCapture(event.pointerId);
  timer=setTimeout(()=>{if(gesture)dragging.value=true;},HOLD);
}
function move(event){
  if(!gesture||event.pointerId!==gesture.id)return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  if(!dragging.value){
    if(Math.hypot(dx,dy)>9){clearTimeout(timer);gesture.moved=true;pressed.value=false;}
    return;
  }
  point.x=clamp(gesture.originX+dx,bounds.left,bounds.right);
  point.y=clamp(gesture.originY+dy,bounds.top,bounds.bottom);
}
function stop(save=false){
  clearTimeout(timer);const old=gesture;gesture=null;
  if(save&&dragging.value&&old)store(old.group);
  dragging.value=false;pressed.value=false;
  if(old&&button.value?.hasPointerCapture(old.id))button.value.releasePointerCapture(old.id);
}
function up(event){
  if(gesture?.id!==event.pointerId)return;
  const tap=!dragging.value&&!gesture.moved;
  stop(true);
  // Touch browsers can suppress the click after a previous drag. Use the
  // pointer gesture itself; the synthesized click must not switch a second time.
  if(tap)emit('toggle');
}
function cancel(){stop(false);schedule();}
function activate(event){
  if(event.detail===0)emit('toggle'); // Keyboard / accessibility activation.
}
watch(()=>props.group,async()=>{stop(false);await nextTick();measure();});
watch(()=>props.hidden,value=>{if(value)cancel();});
watch(()=>props.workspace,(el,previous)=>{if(previous)observer?.unobserve(previous);if(el)observer?.observe(el);schedule();});
onMounted(()=>{
  observer=new ResizeObserver(schedule);if(props.workspace)observer.observe(props.workspace);measure();
  window.addEventListener('resize',schedule);window.addEventListener('blur',cancel);
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
});
onUnmounted(()=>{
  stop(false);cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('blur',cancel);
  window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
});
</script>

<template>
 <button v-show="group&&!hidden&&ready" ref="button" type="button" class="floating-section-switch" :class="{dragging,pressed}" :style="style" :data-group="group"
   :aria-label="label+'；长按可拖动位置'" :title="label+' · 长按拖动'" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="cancel" @lostpointercapture="stop(false)" @touchstart.prevent @touchmove.prevent @touchend.prevent @contextmenu.prevent @dragstart.prevent @click.stop.prevent="activate">
   <Icon :name="icon"/><i v-if="status" class="switch-status" :class="status"/>
 </button>
</template>

<style scoped>
.floating-section-switch{position:fixed;left:0;top:0;z-index:12;width:46px;height:46px;min-height:46px;padding:0;display:grid;place-items:center;border:1px solid var(--line);border-radius:16px;background:var(--elevated);color:var(--accent);box-shadow:0 3px 12px #14291d22;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;cursor:pointer;transition:box-shadow 140ms ease,border-color 140ms ease;will-change:transform;contain:layout style;}
.floating-section-switch .icon{width:22px;height:22px;pointer-events:none;transition:transform 140ms ease;}
.floating-section-switch.pressed .icon{transform:scale(.9);}
.floating-section-switch.dragging{cursor:grabbing;border-color:var(--accent);box-shadow:0 7px 22px #14291d40;}
.floating-section-switch.dragging .icon{transform:scale(1.06);}
.floating-section-switch:focus-visible{outline:2px solid var(--accent);outline-offset:3px;}
.switch-status{position:absolute;right:5px;top:5px;width:7px;height:7px;border:1px solid var(--surface);border-radius:50%;background:var(--accent);pointer-events:none;}
.switch-status.unread{background:var(--danger);}
:root[data-motion=off] .floating-section-switch,:root[data-motion=off] .floating-section-switch .icon{transition:none;}
@media(prefers-reduced-motion:reduce){.floating-section-switch,.floating-section-switch .icon{transition:none;}}
</style>
