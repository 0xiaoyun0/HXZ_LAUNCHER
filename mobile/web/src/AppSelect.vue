<script setup>
import {computed,ref,nextTick} from 'vue';
import Icon from './Icon.vue';
import AppOverlay from './AppOverlay.vue';
const props=defineProps({modelValue:[String,Number,Boolean],options:{type:Array,default:()=>[]},label:{type:String,required:true},disabled:Boolean});
const emit=defineEmits(['update:modelValue','change']);
const open=ref(false),filter=ref(''),list=ref();
const items=computed(()=>props.options.map(option=>typeof option==='object'?option:{label:String(option),value:option}));
const selected=computed(()=>items.value.find(item=>item.value===props.modelValue));
const visible=computed(()=>items.value.filter(item=>item.label.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase())));
async function show(){filter.value='';open.value=true;await nextTick();list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});}
function choose(value){emit('update:modelValue',value);emit('change',value);open.value=false;}
function arrows(event){
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  event.preventDefault();const buttons=[...list.value.querySelectorAll('[role="option"]')];if(!buttons.length)return;
  const current=buttons.indexOf(document.activeElement);const index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length;buttons[index].focus();
}
</script>

<template>
  <button type="button" class="app-select" :aria-label="label" aria-haspopup="listbox" :aria-expanded="open" :disabled="disabled" @click="show"><span>{{selected?.label??modelValue??'请选择'}}</span><Icon name="chevron"/></button>
  <AppOverlay :open="open" :label="label" kind="picker" @close="open=false">
    <section class="sheet choice-sheet"><div class="sheet-handle"/><header class="sheet-header"><h2>{{label}}</h2><button type="button" class="icon-button" aria-label="关闭选项" @click="open=false"><Icon name="close"/></button></header>
      <div class="sheet-body"><input v-if="items.length>12" v-model="filter" class="choice-search" type="search" placeholder="搜索选项" aria-label="搜索选项"><div ref="list" class="choice-list" role="listbox" :aria-label="label" @keydown="arrows"><button v-for="item in visible" :key="String(item.value)" type="button" role="option" :aria-selected="item.value===modelValue" :class="{selected:item.value===modelValue}" @click="choose(item.value)"><span>{{item.label}}</span><Icon v-if="item.value===modelValue" name="check"/></button><p v-if="!visible.length" class="empty-note">没有匹配的选项</p></div></div>
    </section>
  </AppOverlay>
</template>
