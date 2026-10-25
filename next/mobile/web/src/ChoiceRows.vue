<script setup>
import Icon from './Icon.vue';
defineProps({items:Array,value:[String,Number,Boolean],label:String});
defineEmits(['choose']);
</script>
<template>
  <div class="form-stack role-choice-list" role="listbox" :aria-label="label">
    <button v-for="item in items" :key="String(item.value)" type="button" class="settings-row role-choice" role="option" :aria-label="item.label" :aria-selected="item.value===value" @click="$emit('choose',item.value)">
      <span class="avatar"><Icon v-if="item.icon" :name="item.icon"/><span v-else>{{item.label.slice(0,1)}}</span></span>
      <span class="choice-label">{{item.label}}<small v-if="item.description">{{item.description}}</small></span>
      <Icon v-if="item.value===value" name="check"/><span v-else class="choice-check-space"/>
    </button>
  </div>
</template>
<style scoped>
.role-choice>.avatar{flex:0 0 40px;width:40px;height:40px;min-width:40px;min-height:40px}
.role-choice>.choice-label{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
.role-choice>.icon,.role-choice>.choice-check-space{flex:0 0 22px;width:22px;height:22px}
</style>
