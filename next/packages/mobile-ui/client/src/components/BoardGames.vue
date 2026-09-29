<script setup>
import {ref,computed,onMounted,onUnmounted,watch} from 'vue';
const props=defineProps({request:{type:Function,required:true},game:{type:Object,required:true}});
const difficulty=ref(1),match=ref(null),lobby=ref([]),busy=ref(false),error=ref(''),selection=ref(-1),promotion=ref('q'),rank=ref({items:[],self:null}),now=ref(Date.now()),confirmExit=ref(false);
const rankPeriod=ref('week'),comment=ref(''),danmaku=ref([]);let seen=new Set(),timer,closed=false,loading=false;
watch(()=>match.value, m=>{if(!m?.spectator){danmaku.value=[];seen.clear();return;}const fresh=(m.comments||[]).filter(c=>!seen.has(c.id));fresh.forEach(c=>seen.add(c.id));danmaku.value=[...danmaku.value.filter(c=>Date.now()-c.shown<8000),...fresh.slice(-6).map((c,i)=>({...c,shown:Date.now(),lane:i%4}))].slice(-12);if(seen.size>200)seen=new Set((m.comments||[]).map(c=>c.id));});
async function sendComment(){if(!comment.value.trim())return;await run(async()=>{match.value=await props.request('/api/boards/'+match.value.id,'POST',{action:'comment',text:comment.value});comment.value='';});}
const levels=['初识','入门','进阶','精锐','大师'];
const chessSymbols={ak:'♔',aq:'♕',ar:'♖',ab:'♗',an:'♘',ap:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
const xiangqiSymbols={ak:'帥',aa:'仕',ae:'相',ah:'馬',ar:'車',ac:'炮',ap:'兵',bk:'將',ba:'士',be:'象',bh:'馬',br:'車',bc:'砲',bp:'卒'};
const width=computed(()=>props.game.id==='gomoku'?15:props.game.id==='xiangqi'?9:8);
const myTurn=computed(()=>match.value?.side===match.value?.state.turn&&!match.value?.state.winner&&!!match.value?.b);
const destinations=computed(()=>new Set((match.value?.legal||[]).filter(m=>props.game.id==='gomoku'||m.from===selection.value).map(m=>m.to)));
const cells=computed(()=>{const board=match.value?.state.board||Array(width.value*(props.game.id==='xiangqi'?10:width.value)).fill('');return board.map((piece,i)=>({piece,i})).sort((a,b)=>match.value?.side==='b'?b.i-a.i:a.i-b.i);});
const result=computed(()=>{const m=match.value;if(!m)return '选择模式，开始一局';if(m.state.winner)return m.state.winner==='draw'?'和棋':m.state.winner===m.side?'你赢了':'本局结束';if(!m.b)return '等待另一位旅人加入';if(m.thinking||busy.value&&m.mode==='bot')return '机器人正在思考…';return (m[m.state.turn]?.name||'玩家')+' 行棋'+(myTurn.value?' · 轮到你':m.spectator?' · 观战中':'');});
const remaining=computed(()=>Math.max(0,Math.ceil(((match.value?.deadline||0)-now.value)/1000)));
async function run(fn){if(busy.value)return;busy.value=true;error.value='';try{await fn();}catch(e){error.value=e.message;}finally{busy.value=false;}}
async function refresh(){if(closed||loading||busy.value||document.hidden)return;loading=true;try{
 const game=props.game.id;
 if(match.value&&!match.value.state.winner){const id=match.value.id,ply=match.value.state.ply;const current=await props.request('/api/boards/'+id);if(!closed&&!busy.value&&game===props.game.id&&match.value?.id===id&&match.value.state.ply===ply&&!match.value.state.winner)match.value=current;}
 else{const value=await props.request('/api/boards');if(!closed&&game===props.game.id)lobby.value=value.items.filter(m=>m.game===game);}
 const value=await props.request('/api/arcade/'+game+'?period='+rankPeriod.value);if(!closed&&game===props.game.id)rank.value=value;
 }catch(e){if(!closed)error.value=e.message;}finally{loading=false;}}
async function start(mode){await run(async()=>{match.value=await props.request('/api/boards','POST',{game:props.game.id,mode,level:difficulty.value});selection.value=-1;});}
async function join(item){await run(async()=>{match.value=(item.side||item.b)?await props.request('/api/boards/'+item.id):await props.request('/api/boards/'+item.id,'POST',{action:'join'});});}
async function resign(){await run(async()=>{match.value=await props.request('/api/boards/'+match.value.id,'POST',{action:'resign'});confirmExit.value=false;});}
function symbol(piece){return props.game.id==='chess'?chessSymbols[piece]:props.game.id==='xiangqi'?xiangqiSymbols[piece]:'';}
async function clickCell(i){
 if(!myTurn.value||busy.value)return;
 const m=match.value,p=m.state.board[i];
 if(props.game.id!=='gomoku'&&p?.[0]===m.side){selection.value=i;return;}
 const moves=m.legal.filter(move=>move.to===i&&(props.game.id==='gomoku'||move.from===selection.value));
 if(!moves.length)return;
 const move=moves.find(x=>x.promotion===promotion.value)||moves[0];
 await run(async()=>{match.value=await props.request('/api/boards/'+m.id,'POST',{action:'move',ply:m.state.ply,move});selection.value=-1;});
 if(match.value?.state.winner)void refresh();
}
watch(()=>props.game.id,()=>{match.value=null;selection.value=-1;void refresh();});
onMounted(()=>{void refresh();timer=setInterval(()=>{now.value=Date.now();void refresh();},2500);});
onUnmounted(()=>{closed=true;clearInterval(timer);});
</script>
<template>
 <div class="board-layout">
  <section class="board-main">
   <div class="board-banner"><div><small>{{game.tag}}</small><h2>{{game.name}}</h2></div><span class="board-status" aria-live="polite">{{result}}</span></div>
   <div v-if="match" class="board-players"><span :class="{'is-turn':!match.state.winner&&match.state.turn==='a'}"><i class="side-a"/>{{match.a.name}}<small>{{game.id==='chess'?'白方':game.id==='xiangqi'?'红方':'黑方'}}</small></span><b>{{match.state.ply}} 手</b><span :class="{'is-turn':!match.state.winner&&match.state.turn==='b'}"><i class="side-b"/>{{match.b?.name||'空席'}}<small v-if="match.mode==='bot'">{{levels[match.level-1]}}</small></span></div>
   <div class="strategy-board" :class="game.id" :style="{'--columns':width}">
    <button v-for="cell in cells" :key="cell.i" class="board-cell" :class="[{dark:(cell.i%width+Math.floor(cell.i/width))%2,chosen:selection===cell.i,last:match?.state.last?.to===cell.i,available:myTurn&&destinations.has(cell.i)},cell.piece?.[0]==='a'?'side-a':'side-b']" :disabled="!myTurn||busy" :aria-label="(symbol(cell.piece)||'空位')+' '+(cell.i%width+1)+','+(Math.floor(cell.i/width)+1)" @click="clickCell(cell.i)"><span v-if="cell.piece" :key="cell.piece+':'+(match?.state.last?.to===cell.i?match.state.ply:0)" class="board-piece">{{symbol(cell.piece)}}</span><i v-else-if="myTurn&&destinations.has(cell.i)&&selection>=0" class="move-dot"/></button>
    <div v-if="match?.spectator" class="spectator-overlay" aria-hidden="true"><span v-for="c in danmaku" :key="c.id" :style="{top:(8+c.lane*17)+'%'}">{{c.name}}：{{c.text}}</span></div><div v-if="!match" class="board-intro"><span>{{game.symbol}}</span><strong>落子之间，各有天地</strong><small>社区对战 · 五档机器人</small></div>
   </div>
   <div v-if="match" class="board-footer"><span>{{match.state.winner?'本局已结束':match.b?'每步剩余 '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):'等待加入，30 分钟后关闭'}}</span><button v-if="match.spectator" @click="match=null;refresh()">退出观战</button><button v-else-if="!match.state.winner" @click="confirmExit=true">{{match.b?'认输':'关闭房间'}}</button><button v-else @click="match=null;refresh()">再来一局</button></div>
   <form v-if="match?.spectator&&!match.state.winner" class="spectator-compose" @submit.prevent="sendComment"><input v-model="comment" maxlength="120" placeholder="观众弹幕 · 对局玩家不可见" aria-label="观战弹幕"/><button :disabled="busy||!comment.trim()">发送</button></form><div v-if="confirmExit" class="board-confirm" role="alert"><span>确认结束当前对局？{{match?.b?'将判定对手获胜。':''}}</span><button @click="confirmExit=false">继续对局</button><button :disabled="busy" @click="resign">确认</button></div>
   <p v-if="error" class="board-error" role="alert">{{error}} <button :disabled="busy" @click="refresh">重试</button></p>
  </section>
  <aside class="board-aside">
   <section v-if="!match||match.state.winner" class="board-controls"><h3>开启对局</h3><div class="difficulty"><button v-for="(label,i) in levels" :key="label" :class="{active:difficulty===i+1}" @click="difficulty=i+1"><b>{{i+1}}</b>{{label}}</button></div><button class="board-primary" :disabled="busy" @click="start('bot')">挑战机器人 · {{levels[difficulty-1]}}</button><button :disabled="busy" @click="start('online')">创建社区联机房间</button><p>五档逐级增强；机器人胜场以难度优先、步数次之排名。</p></section>
   <section v-if="!match" class="board-rooms"><h3>社区棋桌</h3><p v-if="!lobby.length">还没有等待中的棋桌。</p><button v-for="item in lobby" :key="item.id" :disabled="busy" @click="join(item)"><span>{{item.a.name}}<small>{{item.mode==='bot'?'机器人练习':item.b?item.b.name:'等待对手'}}</small></span><b>{{item.side?'继续':item.b?'观战':'入座'}} →</b></button></section>
   <section v-if="game.id==='chess'&&match?.side" class="promotion"><h3>兵升变</h3><div><button v-for="(label,key) in {q:'后',r:'车',b:'象',n:'马'}" :key="key" :class="{active:promotion===key}" @click="promotion=key">{{label}}</button></div></section>
   <section class="board-rank"><h3>机器人挑战榜</h3><div class="rank-period"><button :class="{active:rankPeriod==='week'}" @click="rankPeriod='week';refresh()">本周</button><button :class="{active:rankPeriod==='all'}" @click="rankPeriod='all';refresh()">长期</button></div><small>{{rank.label}}</small><ol><li v-for="p in rank.items" :key="p.uid"><b>{{p.rank}}</b><span>{{p.name}}</span><strong>{{p.score}}</strong></li></ol><p>我的排名：{{rank.self?.rank||'暂未上榜'}} · {{rank.self?.score||0}}</p></section>
   <details class="board-rules"><summary>对局规则</summary><p>联机每人每周合计最多获得 1 积分；每步限时 5 分钟。刷新或暂时离开后，可从社区棋桌继续对局。</p><p v-if="game.id==='gomoku'">自由五子棋，无禁手。横、竖或斜线连续五子及以上获胜。</p><p v-else-if="game.id==='xiangqi'">遵循蹩马腿、塞象眼、河界、九宫及将帅不能照面规则。无合法走法判负；重复局面三次、连续 120 手无吃子判和。</p><p v-else>支持王车易位、吃过路兵、升变及将军检查。逼和、子力不足、五十回合规则或三次重复局面判和。</p></details>
  </aside>
 </div>
</template>
<style scoped src="../css/board-games.css"></style>
