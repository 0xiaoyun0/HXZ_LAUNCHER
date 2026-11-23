<script setup lang="ts">
import {ref,computed,onMounted,onBeforeUnmount} from 'vue';
const props=defineProps<{src:string;x:number;y:number;zoom:number;editable?:boolean}>();
const video=computed(()=>/\.(mp4|webm)$/i.test(props.src));
const emit=defineEmits<{move:[x:number,y:number]}>();
const root=ref<HTMLElement>(),width=ref(1),height=ref(1),natural=ref({width:1,height:1});let observer:ResizeObserver|undefined,drag:{x:number;y:number;px:number;py:number}|null=null;
const dimensions=computed(()=>{const scale=Math.max(width.value/natural.value.width,height.value/natural.value.height)*Math.max(1,Number(props.zoom)||1);return {width:natural.value.width*scale,height:natural.value.height*scale};});
const imageStyle=computed(()=>({width:dimensions.value.width+'px',height:dimensions.value.height+'px',left:(width.value-dimensions.value.width)*(Number(props.x)||0)/100+'px',top:(height.value-dimensions.value.height)*(Number(props.y)||0)/100+'px'}));
function loaded(e:Event){const image=e.target as HTMLImageElement,clip=e.target as HTMLVideoElement;natural.value={width:image.naturalWidth||clip.videoWidth||1,height:image.naturalHeight||clip.videoHeight||1};}
function down(e:PointerEvent){if(!props.editable)return;e.preventDefault();root.value?.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,px:props.x,py:props.y};}
function move(e:PointerEvent){if(!drag)return;const dx=dimensions.value.width-width.value,dy=dimensions.value.height-height.value;emit('move',Math.max(0,Math.min(100,drag.px-(dx>1?(e.clientX-drag.x)/dx*100:0))),Math.max(0,Math.min(100,drag.py-(dy>1?(e.clientY-drag.y)/dy*100:0))));}
onMounted(()=>{observer=new ResizeObserver(entries=>{const box=entries[0]?.contentRect;if(box){width.value=box.width;height.value=box.height;}});if(root.value)observer.observe(root.value);});onBeforeUnmount(()=>observer?.disconnect());
</script>
<template><div ref="root" class="cover-surface" :class="{editable}" @pointerdown="down" @pointermove="move" @pointerup="drag=null" @pointercancel="drag=null" @lostpointercapture="drag=null"><video v-if="video" :src="src" muted autoplay loop playsinline :style="imageStyle" @loadedmetadata="loaded"/><img v-else :src="src" alt="实例头图" :style="imageStyle" draggable="false" @load="loaded"/></div></template>
<style scoped>.cover-surface{position:absolute;inset:0;overflow:hidden}.cover-surface img,.cover-surface video{position:absolute;max-width:none;user-select:none;pointer-events:none}.cover-surface.editable{touch-action:none;cursor:grab}.cover-surface.editable:active{cursor:grabbing}</style>
