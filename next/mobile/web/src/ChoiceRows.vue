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
