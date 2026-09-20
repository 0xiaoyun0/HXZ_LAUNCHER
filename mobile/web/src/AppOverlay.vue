<script setup>
import {ref,watch,nextTick,onUnmounted} from 'vue';
import {registerOverlay,unregisterOverlay,isTopOverlay} from './overlays.js';
const props=defineProps({open:Boolean,label:String,kind:{type:String,default:'sheet'}});
const emit=defineEmits(['close']);
const id=Symbol('overlay'),root=ref(),level=ref(1);
let previousFocus;
const close=()=>{if(isTopOverlay(id))emit('close');};
watch(()=>props.open,async open=>{
  if(open){
    previousFocus=document.activeElement;level.value=registerOverlay(id,()=>emit('close'));
    // Drop the soft keyboard before showing choices; don't focus an input on open.
    previousFocus?.blur();await nextTick();root.value?.focus({preventScroll:true});
  }else unregisterOverlay(id);
},{immediate:true});
function restoreFocus(){if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
function keyboard(event){
  if(!isTopOverlay(id))return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
  if(event.key==='Tab'){
    const items=[...root.value.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const index=items.indexOf(document.activeElement);event.preventDefault();
    if(items.length)items[(index+(event.shiftKey?-1:1)+items.length)%items.length].focus();
  }
}
onUnmounted(()=>unregisterOverlay(id));
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay" @after-leave="restoreFocus">
      <div v-if="open" ref="root" class="sheet-backdrop" :class="{'confirm-backdrop':kind==='confirm','picker-backdrop':kind==='picker'}" :style="{zIndex:40+level*10}" :role="kind==='confirm'?'alertdialog':'dialog'" aria-modal="true" :aria-label="label" tabindex="-1" @click.self="close" @keydown="keyboard"><slot/></div>
    </Transition>
  </Teleport>
</template>
