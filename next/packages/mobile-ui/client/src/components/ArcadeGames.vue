<script setup>
import {ref,computed,watch,nextTick,onBeforeUnmount} from 'vue';
import {flightUpgrade} from '../../../server/shared/arcade-upgrades.mjs';
const pageRoot=ref(),focused=ref(false);const beginGame=async()=>{await start();};
import ArcadeIcon from './ArcadeIcon.vue';
import Werewolf from './Werewolf.vue';
import TankRoom from './TankRoom.vue';
const tankSolo=ref(false);
import {WEREWOLF} from '../lib/werewolf-ui.mjs';
import GameTouchControls from './GameTouchControls.vue';
import BoardGames from './BoardGames.vue';
import PointsPanel from './PointsPanel.vue';
import {BOARD_GAMES} from '../../../server/shared/board-catalog.mjs';
const boardGame=ref(null),pointsOpen=ref(false),social=ref(false);

import {useArcade} from '../lib/use-arcade.mjs';
const props=defineProps({request:{type:Function,required:true},transport:Object,launchMatch:Object,launchTarget:String});
watch(()=>props.launchMatch,v=>{if(v?.game)boardGame.value=BOARD_GAMES.find(g=>g.id===v.game)||null;},{immediate:true});
const arcade=useArcade((...args)=>props.request(...args));
const {mode,flagMode,detail,tool,coins,lives,choices,rankPeriod,changeRank,syncPaused,retrySync,GAMES,selected,canvas,game,score,playing,paused,busy,message,ranking,rankSelf,rankLabel,rankError,ranked,finished,countdown,level,lines,sound,pendingScore,best,name,time,thumbnail,select,toggleSound,start,input,hold,release,pause,submit,finish,pointer}=arcade;
watch(()=>props.launchTarget,async target=>{if(!target)return;if(playing.value||busy.value){if(playing.value&&!paused.value)pause();message.value=busy.value?'当前游戏正在准备或提交成绩，请稍后再打开通知。':'当前对局已暂停，请先结束本局，再打开通知中的游戏。';return;}const item=GAMES.find(g=>g.id===target);if(!item&&!['ranking','werewolf'].includes(target))return;boardGame.value=null;pointsOpen.value=target==='ranking';social.value=target==='werewolf';selected.value=null;game.value=null;focused.value=false;if(item)await select(item);},{immediate:true});
watch(selected,()=>{tankSolo.value=false;});
watch([selected,boardGame,social,pointsOpen],async()=>{await nextTick();const scroll=pageRoot.value?.closest('.games-scroll');if(scroll)scroll.scrollTop=0;});
const catalog=[...GAMES.map((item,index)=>({...item,number:item.number||index+1,board:false})),...BOARD_GAMES.map((item,index)=>({...item,number:index+4,board:true})),WEREWOLF].sort((a,b)=>a.number-b.number);
const gameFilter=ref('all');const visibleCatalog=computed(()=>catalog.filter(g=>gameFilter.value==='all'||g.tag?.includes('肉鸽')));
// The arena owns its available space. Controls and popups never become grid peers.
let fitObserver,fitFrame=0;
function fitFocus(){cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(()=>{
 const play=document.querySelector('.arcade-focus .arcade-play'),stage=play?.querySelector('.arcade-stage'),arena=play?.querySelector('.arcade-arena');if(!stage||!arena)return;
 const ratio=['runner','deck','dice','caravan'].includes(selected.value?.id)?360/260:3/4;
 const height=Math.max(150,arena.clientHeight),width=arena.clientWidth;
 const next=Math.floor(Math.min(width,height*ratio));if(next>0&&stage.style.width!==next+'px')stage.style.width=next+'px';
});}
watch([focused,playing,paused,selected],async()=>{fitObserver?.disconnect();await nextTick();
 const stage=document.querySelector('.arcade-play-portal .arcade-stage');if(!focused.value){stage?.style.removeProperty('width');return;}
 fitObserver=new ResizeObserver(fitFocus);const arena=document.querySelector('.arcade-focus .arcade-arena');if(arena)fitObserver.observe(arena);fitFocus();
});
window.addEventListener('resize',fitFocus);onBeforeUnmount(()=>{window.removeEventListener('resize',fitFocus);fitObserver?.disconnect();cancelAnimationFrame(fitFrame);});
</script>
<template>
 <section ref="pageRoot" class="arcade-page" :data-arcade-playing="playing" :style="{'--game-color':selected?.color||'#9dd9a8'}">
  <header v-if="!boardGame&&!pointsOpen&&!social" class="arcade-heading"><div><span class="arcade-eyebrow">FANTASY TOWN · ARCADE</span><h1>{{name}}</h1></div><div class="arcade-top-actions"><button v-if="selected" @click="toggleSound" :aria-pressed="sound"><ArcadeIcon :name="sound?'volume':'muted'"/>{{sound?'音效开':'音效关'}}</button><button v-if="selected&&!playing&&!busy" @click="selected=null;game=null"><ArcadeIcon name="back"/>游戏库</button><span v-if="!selected" class="arcade-counter">{{visibleCatalog.length}} <small>款游戏</small></span></div></header>
  <div v-if="!selected&&!boardGame&&!social" class="arcade-library-tabs"><template v-if="!pointsOpen"><button :aria-pressed="gameFilter==='all'" @click="gameFilter='all'">全部游戏</button><button :aria-pressed="gameFilter==='rogue'" @click="gameFilter='rogue'">肉鸽探险</button></template><button @click="pointsOpen=!pointsOpen"><ArcadeIcon :name="pointsOpen?'back':'trophy'"/>{{pointsOpen?'返回游戏库':'社区积分榜'}}</button></div>
  <template v-if="social"><div class="arcade-library-tabs"><button @click="social=false">返回游戏库</button></div><Werewolf :request="request"/></template>
  <PointsPanel v-else-if="pointsOpen" :request="request"/>
  <template v-else-if="boardGame"><div class="arcade-library-tabs"><button @click="boardGame=null"><ArcadeIcon name="back"/>游戏库</button><span>社区棋牌 · {{boardGame.name}}</span></div><BoardGames :key="boardGame.id" :initial-match="launchMatch?.game===boardGame.id?launchMatch.id:''" :game="boardGame" :request="request"/></template>
  <div v-else-if="!selected" class="arcade-cards"><button v-for="item in visibleCatalog" :key="item.id" class="arcade-card" :class="{'strategy-card':item.board}" @click="item.social ? social=true : item.board ? boardGame=item : select(item)" :style="{'--game-color':item.color}"><div class="arcade-art" :class="[item.id,{'strategy-art':item.board}]"><img :src="'/media/games/'+item.id+'.webp?v=064'" alt="" loading="lazy"/><span class="arcade-card-number">{{String(item.number).padStart(2,'0')}}</span><span class="arcade-card-play"><ArcadeIcon name="play"/></span></div><div class="arcade-card-body"><small>{{item.tag}}</small><strong>{{item.name}}</strong><span>{{item.description}}</span><footer><span v-if="item.social">六人联机 · 可补齐机器人</span><span v-else-if="item.board">社区联机 · 五档机器人</span><span v-else>本机最佳 <b>{{best[item.id]||'—'}}</b></span><span>{{item.social?'进入圆桌':item.board?'入座':'开始游戏'}} <ArcadeIcon name="arrow"/></span></footer></div></button></div>
  <template v-else-if="selected?.id==='tanks'&&!tankSolo"><div class="coop-mode-toolbar"><button @click="tankSolo=true">单人练习</button></div><TankRoom :request="request" :transport="transport"/></template>
  <template v-else-if="selected"><Teleport to="body" :disabled="!focused"><div class="arcade-page arcade-play-portal" :data-game="selected.id" :class="{'arcade-focus':focused}" :style="{'--game-color':selected.color}"><div class="arcade-layout" :class="selected.id"><section class="arcade-play">
   <div class="arcade-status"><button class="arcade-focus-toggle" @click="focused=!focused">{{focused?'退出专注':'专注游玩'}}</button><div><small>本局得分</small><strong>{{score.toLocaleString()}}</strong></div><div><small>{{['runner','danmaku','merge','mines'].includes(selected.id)?'用时':selected.id==='blocks'?'等级':'关卡'}}</small><b>{{['runner','danmaku','merge','mines'].includes(selected.id)?time:String(level).padStart(2,'0')}}</b></div><div><small>{{selected.id==='blocks'?'消除行':'本机最佳'}}</small><b>{{selected.id==='blocks'?lines:best[selected.id]||'—'}}</b></div><button v-if="playing" class="arcade-pause" @click="pause"><ArcadeIcon :name="paused?'play':'pause'"/>{{paused?'继续':'暂停'}}</button></div>
   <div class="arcade-arena"><div class="arcade-stage"><canvas v-if="game" ref="canvas" tabindex="0" :aria-label="selected.name" @pointerdown.prevent="pointer" @pointermove.prevent="pointer" @pointerup="pointer" @pointercancel="pointer" @lostpointercapture="pointer" @contextmenu.prevent/><canvas v-else :ref="el=>thumbnail(el,selected)" aria-hidden="true"/>
    <div v-if="!game||paused||finished||countdown" class="arcade-overlay" :class="{countdown:countdown&&!paused}">
     <template v-if="countdown&&!paused"><strong class="count-number">{{countdown}}</strong><span>准备出发</span></template>
     <template v-else-if="paused"><span class="overlay-symbol"><ArcadeIcon name="pause"/></span><h2>休息一下</h2><p>{{syncPaused?'等待成绩同步，进度已保留':'当前进度已暂停'}}</p><button class="arcade-primary" @click="pause">{{syncPaused?'重试同步':'继续游戏'}}</button><button class="arcade-quiet" @click="finish">结束本局</button></template>
     <template v-else-if="finished"><span class="overlay-kicker">{{game.won?'全部通关':'挑战完成'}}</span><strong class="result-score">{{score.toLocaleString()}}</strong><p>{{time}} · {{ranked?'社区排位':'本机练习'}}</p><button class="arcade-primary" :disabled="busy" @click="beginGame">{{busy?'正在提交…':'再来一局'}}</button><button class="arcade-quiet" @click="focused=false;selected=null;game=null">返回游戏库</button><button v-if="pendingScore&&!busy" class="arcade-quiet" @click="submit">重试提交成绩</button></template>
     <template v-else><span class="overlay-kicker">{{selected.tag}}</span><h2>{{selected.name}}</h2><button class="arcade-primary" :disabled="busy" @click="beginGame">{{busy?'准备中…':'开始游戏'}}</button></template>
    </div>
   </div>
   </div>
   <div v-if="choices.length&&playing&&!paused" class="arcade-upgrade-panel" role="dialog" aria-modal="true" aria-label="选择本局增益"><div class="arcade-upgrade-dialog"><span class="overlay-kicker">第 {{level}} 阶段</span><h2>选择本局增益</h2><p>增益在本局持续生效</p><button v-for="choice in choices" :key="choice" class="arcade-upgrade" @click="input('upgrade:'+choice)"><strong>{{flightUpgrade(choice).title}}</strong><small>{{flightUpgrade(choice).description}}</small></button></div></div>
   <div class="arcade-command-panel">
   <p v-if="detail" class="arcade-vitals" role="status">{{detail}}</p><GameTouchControls v-if="playing&&!paused" :api="arcade" :id="selected.id"/><p v-if="selected.id==='garden'" class="arcade-vitals">金币 {{coins}} · 点空地建造，点炮塔升级或回收</p>
   <p v-if="game&&['breakout','danmaku','maze','fighter'].includes(selected.id)" class="arcade-vitals">剩余机会 {{lives}} / 3<span v-if="selected.id!=='danmaku'"> · 每过五关恢复一次，最多三次</span></p><div class="arcade-footnote"><span><i :class="{practice:!ranked}"/>{{playing||finished?(ranked?'社区排位':'本机练习'):'登录社区后成绩自动参与排名'}}</span><button v-if="playing" class="arcade-quiet" @click="finish">结束本局</button></div><p v-if="message" class="arcade-message" role="status">{{message}}</p>
   </div>
  </section><aside class="arcade-side"><section class="arcade-board"><header><h2>{{rankPeriod==='all'?'长期排行榜':'本周排行榜'}}</h2><span class="arcade-live">实时</span></header><div class="arcade-library-tabs"><button :aria-pressed="rankPeriod==='week'" @click="changeRank('week')">周榜</button><button :aria-pressed="rankPeriod==='all'" @click="changeRank('all')">长期榜</button></div><p v-if="rankError" role="status" class="arcade-empty">{{rankError}}</p><p v-else-if="!ranking.length" class="arcade-empty">首个纪录，等你创造。</p><ol><li v-for="(item,index) in ranking" :key="item.uid" :class="{podium:index<3}"><b>{{String(index+1).padStart(2,'0')}}</b><span>{{item.name}}</span><strong>{{item.score.toLocaleString()}}</strong></li></ol><footer>{{rankLabel}}<br>我的排名：{{rankSelf?.rank||'暂未上榜'}} · {{rankSelf?.score||0}} 分<br>每 5 秒同步 · 显示前十与本人</footer></section><section class="arcade-guide"><h2>操作指南</h2><p>{{selected.keys}}</p><p v-if="selected.id==='blocks'">虚线标记落点；暂存每块可用一次。每消除 10 行提升一级，连续消行可获额外分数。</p><p v-if="selected.id==='breakout'">挡板不同位置会改变反弹角度。连续击碎砖块获得连击加分，共 100 关、三次机会，每过五关恢复一次（上限三次）。金属砖不可破坏；增益砖包含延展、减速、护盾、修复、重击、爆破、双倍收获、引导和钢墙瓦解。</p><p v-if="selected.id==='runner'">点击画面也能跳跃。无时间上限，速度逐渐递增，注意提前观察障碍间距。</p><small>P / ESC 暂停 · 切至后台自动暂停 · {{selected.id==='blocks'?'单局 10 分钟':'分段同步，长时间游玩'}}</small></section></aside></div></div></Teleport></template>
 </section>
</template>
<style scoped src="../css/arcade.css"></style>
