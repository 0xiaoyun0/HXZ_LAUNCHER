<script setup lang="ts">
import ShopPanel from '../components/ShopPanel.vue';
import {communityRequest} from '../lib/community';
const request=(path:string,method='GET',body?:unknown)=>communityRequest(path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})},true);
</script>
<template><ShopPanel :request="request"/></template>
