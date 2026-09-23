<script setup>
import {ref,onMounted} from 'vue';
const props=defineProps({request:{type:Function,required:true}});
const period=ref('weekly'),offset=ref(0),board=ref({items:[],total:0,self:null}),wallet=ref({balance:'0',ledger:[]}),code=ref(''),busy=ref(false),error=ref('');
async function load(){if(busy.value)return;busy.value=true;error.value='';try{[board.value,wallet.value]=await Promise.all([props.request('/api/points/leaderboard?period='+period.value+'&offset='+offset.value),props.request('/api/points')]);}catch(e){error.value=e.message;}finally{busy.value=false;}}
async function redeem(){if(!code.value.trim()||busy.value)return;busy.value=true;error.value='';try{await props.request('/api/points/redeem','POST',{code:code.value.trim()});code.value='';}catch(e){error.value=e.message;}finally{busy.value=false;}if(!error.value)await load();}
function change(value){if(busy.value)return;period.value=value;offset.value=0;void load();}
onMounted(load);
</script>
<template>
 <section class="points-panel">
  <div class="points-wallet"><div><small>可用积分</small><strong>{{wallet.balance}}</strong></div><form @submit.prevent="redeem"><input v-model="code" placeholder="输入积分兑换码" aria-label="积分兑换码" autocomplete="off"/><button :disabled="busy||!code.trim()">兑换</button></form></div>
  <div class="points-tabs"><button :class="{active:period==='weekly'}" @click="change('weekly')">周积分榜</button><button :class="{active:period==='annual'}" @click="change('annual')">年度总榜</button><button :disabled="busy" @click="load">刷新</button></div>
  <p class="points-caption">{{period==='weekly'?board.label:(board.year||new Date().getFullYear())+' 年累计积分'}} · {{period==='weekly'?'各小游戏积分合并，每周一北京时间结算':'仅累计已结算周榜及周榜奖励，本周积分结算后计入'}}</p>
  <p v-if="error" role="alert">{{error}}</p>
  <ol class="points-list"><li v-for="item in board.items" :key="item.uid"><b>{{item.rank}}</b><span>{{item.name}}</span><strong>{{item.points}}</strong></li></ol>
  <p v-if="!board.items.length&&!error">暂无积分记录</p>
  <div class="points-self">我的排名 <b>{{board.self?.rank||'暂未上榜'}}</b><span>{{board.self?.points||'0'}} 分</span></div>
  <div v-if="period==='annual'&&board.total>50" class="points-tabs"><button :disabled="offset===0||busy" @click="offset-=50;load()">上一页</button><span>{{Math.floor(offset/50)+1}} / {{Math.ceil(board.total/50)}}</span><button :disabled="offset+50>=board.total||busy" @click="offset+=50;load()">下一页</button></div>
  <details class="points-rules"><summary>积分规则与最近收支</summary><p>各小游戏周榜前三名分别贡献 3 / 2 / 1 分，联机胜利每人每周合计最多贡献 1 分，合并为周积分榜。兑换码和管理员发放积分也先计入当周。</p><p>每周一结算周积分榜，前三名额外奖励 3 / 2 / 1 分；该周积分连同奖励累计进年度总榜。未结算的游戏排名奖励为预估，结算后进入余额。兑换和联机积分即时可用；消费不扣榜单积分，余额跨年保留。</p><p v-for="(item,i) in wallet.ledger" :key="i">{{new Date(item.created).toLocaleString('zh-CN')}} · {{item.reason}} · {{item.amount}}</p></details>
 </section>
</template>
<style scoped>
.points-panel{color:var(--text);max-width:1000px;margin:auto}.points-wallet{display:flex;flex-wrap:wrap;gap:24px;justify-content:space-between;align-items:center;padding:24px;background:var(--panel,var(--surface));border:1px solid var(--border,var(--line));border-radius:16px}.points-wallet small{display:block;color:var(--muted)}.points-wallet strong{display:block;font-size:2rem;overflow-wrap:anywhere;max-width:360px}.points-wallet form{display:flex;flex-wrap:wrap;gap:8px;min-width:0}.points-wallet input{min-width:0;max-width:100%;background:transparent;border:1px solid var(--border,var(--line));padding:10px;color:inherit;border-radius:8px}.points-panel button{cursor:pointer;border:1px solid var(--border,var(--line));border-radius:8px;background:var(--panel,var(--surface));padding:9px 16px;color:inherit;font:inherit}.points-panel button:disabled{opacity:.45;cursor:default}.points-tabs{display:flex;align-items:center;gap:8px;margin:18px 0;flex-wrap:wrap}.points-tabs .active{background:var(--accent-soft,#93ad7d26)}.points-caption,.points-rules{color:var(--muted);font-size:.85rem}.points-list{padding:0;list-style:none}.points-list li,.points-self{display:flex;align-items:center;gap:20px;padding:14px 16px;border-bottom:1px solid var(--border,var(--line))}.points-list li>b{width:28px;color:var(--muted)}.points-list li>span{flex:1}.points-list strong{max-width:55%;overflow-wrap:anywhere}.points-self{background:var(--accent-soft,#93ad7d26);border-radius:10px;flex-wrap:wrap}.points-self span{margin-left:auto}.points-rules{margin-top:20px;line-height:1.7}.points-rules summary{cursor:pointer}
</style>
