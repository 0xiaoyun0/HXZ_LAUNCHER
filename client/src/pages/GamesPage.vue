<script setup lang="ts">
import ArcadeGames from '../components/ArcadeGames.vue';
import {communityRequest} from '../lib/community';
const request=(path:string,method='GET',body?:unknown)=>communityRequest(path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})},method!=='GET');
</script>
<template><ArcadeGames :request="request"/></template>
