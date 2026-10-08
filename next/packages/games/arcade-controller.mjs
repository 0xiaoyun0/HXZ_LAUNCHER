import {GAMES,createGame,step,MAX_TICKS} from '../../server/shared/arcade-engine.mjs';
import {createRenderer} from './arcade-renderer.mjs';
import {createSwipeInput} from './game-gestures.mjs';
export function createArcade(request,reactivity={}){
 let revision=0,scheduled=false;const subscribers=new Set();
 const changed=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;revision++;for(const fn of subscribers)fn();});};
 const ref=reactivity.ref|| (initial=>{let value=initial;return {get value(){return value;},set value(next){if(value===next)return;value=next;changed();}};});
 const shallowRef=reactivity.shallowRef||ref,computed=reactivity.computed||(fn=>({get value(){return fn();}})),nextTick=reactivity.nextTick||(()=>Promise.resolve());
 const mounts=[],unmounts=[];const onMounted=fn=>mounts.push(fn),onUnmounted=fn=>unmounts.push(fn);
 const selected=ref(null),canvas=shallowRef(),game=shallowRef(null),score=ref(0),playing=ref(false),paused=ref(false),busy=ref(false),message=ref(''),ranking=ref([]),rankSelf=ref(null),rankLabel=ref(''),rankError=ref(''),ranked=ref(false),finished=ref(false),countdown=ref(0),elapsed=ref(0),level=ref(1),lines=ref(0),sound=ref(false),pendingScore=ref(null),lives=ref(3),choices=ref([]),tool=ref('build:seed'),coins=ref(0);
 let saved={};try{saved=JSON.parse(localStorage.getItem('hxz-arcade-best')||'{}');}catch{}
 if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};
 const mode=ref('solo'),flagMode=ref(false),detail=ref(''),rankPeriod=ref('week'),syncPaused=ref(false);
 const best=ref(saved),name=computed(()=>selected.value?.name||'小游戏'),time=computed(()=>Math.floor(elapsed.value/60)+':'+String(elapsed.value%60).padStart(2,'0'));
 let frame=0,clock=0,accumulator=0,run=null,inputs=[],queued=[],held=new Set(),holdTicks=new Map(),timer,closed=false,submitting=false,loadingRanking=false,renderer,audio,lastEvent=-1,countdownLeft=0,checkpointTick=0,checkpointPromise=null,checkpointRetry=0;
 async function loadRanking(){
  if(!selected.value||document.hidden||closed||loadingRanking)return;
  const id=selected.value.id,period=rankPeriod.value;loadingRanking=true;
  try{const data=await request('/api/arcade/'+id+'?period='+period);if(!closed&&selected.value?.id===id&&rankPeriod.value===period){ranking.value=Array.isArray(data.items)?data.items:[];rankSelf.value=data.self;rankLabel.value=data.label||'';rankError.value='';}}
  catch(e){if(!closed&&selected.value?.id===id&&rankPeriod.value===period)rankError.value='排名暂时无法连接，仍可在本机练习。';}
  finally{loadingRanking=false;if(!closed&&selected.value&&(selected.value.id!==id||rankPeriod.value!==period))void loadRanking();}
 }
 function thumbnail(el,item){if(!el)return;const s=createGame(item.id,100);if(item.id==='runner'){s.tick=65;s.y=18;s.obstacles=[{x:180,w:24,h:34},{x:308,w:18,h:42}];}if(item.id==='blocks'){for(let y=14;y<20;y++)for(let x=0;x<10;x++)if((x+y)%5&&x!==6)s.board[y][x]=1+(x+Math.floor(y/2))%7;s.y=8;}if(item.id==='breakout'){s.ball.x=126;s.ball.y=284;s.paddle=170;s.serve=0;s.bricks.forEach((b,i)=>{if(i>26&&i%3===1)b.alive=false;});}const r=createRenderer(el,item.id,{preview:true});r.draw(s);r.dispose();}
 async function select(item){if(playing.value||submitting||busy.value)return;resetPointer();renderer?.dispose();renderer=null;selected.value=item;game.value=null;finished.value=false;pendingScore.value=null;message.value='';ranking.value=[];score.value=0;elapsed.value=0;level.value=1;lines.value=0;await loadRanking();}
 function prepareAudio(){if(!sound.value)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();void audio.resume();}catch{sound.value=false;}}
 function tone(kind){if(!sound.value||!audio||audio.state!=='running')return;const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;osc.type='sine';osc.frequency.setValueAtTime(kind==='jump'?440:kind==='clear'?660:kind==='end'?180:320,now);osc.frequency.exponentialRampToValueAtTime(kind==='end'?70:kind==='clear'?880:220,now+.09);gain.gain.setValueAtTime(.025,now);gain.gain.exponentialRampToValueAtTime(.001,now+.12);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(now+.13);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
 function toggleSound(){sound.value=!sound.value;prepareAudio();}
 async function start(){if(!selected.value||closed||busy.value||playing.value||submitting||checkpointPromise)return;busy.value=true;message.value='';finished.value=false;pendingScore.value=null;prepareAudio();
  try{run=await request('/api/arcade/'+selected.value.id+'/start','POST',{rulesVersion:6});if(run.rulesVersion!==6)throw Error('社区需安装新版小游戏规则，当前仅本机练习');ranked.value=true;}catch(e){run={seed:Math.floor(Math.random()*4294967296)};ranked.value=false;message.value='练习模式 · '+e.message;}finally{busy.value=false;}
  if(closed)return;resetPointer();game.value=createGame(selected.value.id,run.seed);lives.value=game.value.lives||0;coins.value=game.value.coins||0;level.value=1;lines.value=0;detail.value='';choices.value=[];score.value=0;elapsed.value=0;inputs=[];checkpointTick=0;checkpointRetry=0;syncPaused.value=false;queued=[];held.clear();holdTicks.clear();playing.value=true;paused.value=false;clock=0;accumulator=0;lastEvent=-1;countdownLeft=1.8;countdown.value=2;
  await nextTick();renderer?.dispose();renderer=createRenderer(canvas.value,selected.value.id);renderer.draw(game.value);canvas.value?.focus({preventScroll:true});frame=requestAnimationFrame(loop);
 }
 function input(a,repeat=false){if(!playing.value||paused.value||countdown.value)return;if(typeof a==='object'){const at=queued.findIndex(v=>typeof v==='object');if(at>=0){queued[at]=a;return;}}if(queued.length<4&&(repeat||!queued.includes(a)))queued.push(a);}
 function hold(a){if(!playing.value||paused.value)return;if(['merge','snake'].includes(game.value?.game)){input(a);return;}held.add(a);holdTicks.set(a,game.value?.tick||0);input(a);}
 function release(a){held.delete(a);holdTicks.delete(a);}
 function key(event){if(!playing.value||event.target?.closest('input,textarea,select,[contenteditable=true]'))return;if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();if(event.type==='keydown'&&!event.repeat)pause();return;}if(game.value.game==='mines'){if(event.type==='keyup')return;const s=game.value;let i=s.cursor??0;const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9}[event.code];if(delta){event.preventDefault();s.cursor=Math.max(0,Math.min(107,i+delta));}else if(['Enter','Space','KeyF'].includes(event.code)){event.preventDefault();input((event.code==='KeyF'?'flag:':'reveal:')+i);}return;}const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',ArrowUp:'rotate',KeyW:'rotate',Space:'drop',KeyC:'hold'};const action=game.value.game==='tanks'?(({KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down',KeyJ:'fire',Space:'fire',ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'})[event.code]):game.value.game==='contra'?({ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'jump',KeyJ:'fire',KeyZ:'fire',KeyK:'dash',ShiftLeft:'dash'}[event.code]):['danmaku','maze','fighter','merge','snake'].includes(game.value.game)?({ArrowUp:'up',KeyW:'up',ShiftLeft:'focus',ShiftRight:'focus'}[event.code]||keys[event.code]):keys[event.code];if(!action)return;event.preventDefault();if(event.type==='keyup'){release(action);return;}if(event.repeat)return;if(['merge','snake'].includes(game.value.game)){input(action);return;}if(game.value.game==='runner'){if(['rotate','drop'].includes(action))input('jump');return;}if(['left','right','up','down','focus','fire','jump','dash'].includes(action))hold(action);else input(action);}
 function loop(now){if(!playing.value)return;const dt=clock?Math.min(.12,(now-clock)/1000):0;clock=now;
  if(!paused.value){if(countdownLeft>0){countdownLeft=Math.max(0,countdownLeft-dt);countdown.value=Math.ceil(countdownLeft);}else{accumulator+=dt;while(accumulator>=1/30&&playing.value){accumulator-=1/30;const s=game.value;
   for(const action of held){const age=s.tick-(holdTicks.get(action)||0);if(s.game!=='blocks'||age>=6&&age%2===0)input(action);}
   const actions=queued.splice(0,4);if(ranked.value)for(const action of actions)inputs.push([s.tick+1,action]);s.renderPrevious={y:s.y,ballX:s.ball?.x,ballY:s.ball?.y,paddle:s.paddle,playerX:s.x,playerY:s.y};
   if(actions.includes('jump')&&s.y===0)tone('jump');step(s,actions);if(actions.some(a=>typeof a==='object')&&['danmaku','fighter','breakout'].includes(s.game)){s.renderPrevious.playerX=s.x;s.renderPrevious.playerY=s.y;s.renderPrevious.paddle=s.paddle;}lives.value=s.lives||0;coins.value=s.coins||0;detail.value=s.game==='mines'?'已点亮 '+s.revealed+' / 88 · 剩余星雷 '+(20-s.flags.filter(Boolean).length):s.game==='tanks'?'1P '+s.players[0].hp+'/3'+(s.coop?' · 2P '+s.players[1].hp+'/3':'')+' · 基地 '+s.lives+'/6':s.game==='merge'?'移动 '+s.moves+' 次 · 最高 '+Math.max(...s.cells):s.game==='snake'?'长度 '+s.snake.length+' · 速度 '+s.level:s.game==='garden'?(s.wave?'守卫中':'准备建造')+' · 金币 '+s.coins:'';const nextChoices=s.choices||[];if(nextChoices.length!==choices.value.length||nextChoices.some((v,i)=>v!==choices.value[i]))choices.value=[...nextChoices];score.value=s.score;level.value=s.level||1;lines.value=s.lines||0;elapsed.value=Math.floor(s.tick/30);
   if(s.event&&s.event.tick!==lastEvent){lastEvent=s.event.tick;tone(s.game==='blocks'?'clear':'hit');}
   if(s.over||(s.game==='blocks'&&s.tick>=MAX_TICKS)){void finish();break;}
   if(ranked.value&&s.tick-checkpointTick>=900&&Date.now()>=checkpointRetry)void checkpoint();
   if(ranked.value&&s.tick-checkpointTick>=3600){syncPaused.value=true;paused.value=true;message.value='成绩同步暂时中断，已暂停以保留进度。请重试同步后继续。';break;}
  }}renderer?.draw(game.value,accumulator*30,now);}
  if(playing.value&&!paused.value)frame=requestAnimationFrame(loop);
 }
 function pause(){if(!playing.value)return;if(syncPaused.value){void retrySync();return;}resetPointer();paused.value=!paused.value;held.clear();queued=[];clock=0;accumulator=0;cancelAnimationFrame(frame);if(!paused.value){canvas.value?.focus({preventScroll:true});frame=requestAnimationFrame(loop);}}
 function hidden(event){if((document.hidden||event?.type==='blur')&&playing.value&&!paused.value)pause();}
 async function checkpoint(){
  if(checkpointPromise)return checkpointPromise;
  if(!ranked.value||!game.value||game.value.tick===checkpointTick)return true;
  const ticks=game.value.tick,from=checkpointTick,id=run.id,gameId=selected.value.id;
  checkpointPromise=(async()=>{try{const result=await request('/api/arcade/'+gameId+'/checkpoint','POST',{id,from,ticks,inputs:inputs.filter(e=>e[0]<=ticks)});if(result.ticks!==ticks)throw Error('成绩同步响应无效');checkpointTick=ticks;inputs=inputs.filter(e=>e[0]>ticks);checkpointRetry=0;return true;}catch(e){checkpointRetry=Date.now()+10000;message.value='成绩同步重试中 · '+e.message;return false;}finally{checkpointPromise=null;}})();
  return checkpointPromise;
 }
 async function retrySync(){if(await checkpoint()){syncPaused.value=false;message.value='进度已同步';if(paused.value)pause();}}
 async function changeRank(period){rankPeriod.value=period;await loadRanking();}
 async function submit(){if(!pendingScore.value||submitting)return;submitting=true;busy.value=true;try{const result=await request('/api/arcade/'+pendingScore.value.game+'/finish','POST',pendingScore.value.body);ranking.value=result.items;pendingScore.value=null;void loadRanking();message.value='成绩已同步至社区排行榜';}catch(e){message.value='成绩暂未提交：'+e.message;}finally{submitting=false;busy.value=false;}}
 async function finish(){if(!playing.value)return;resetPointer();playing.value=false;paused.value=false;finished.value=true;countdown.value=0;held.clear();cancelAnimationFrame(frame);renderer?.draw(game.value);tone('end');const id=selected.value.id;
  if(score.value>(Number(best.value[id])||0)){best.value={...best.value,[id]:score.value};try{localStorage.setItem('hxz-arcade-best',JSON.stringify(best.value));}catch{}}
  if(ranked.value&&game.value.tick){busy.value=true;await checkpointPromise;pendingScore.value={game:id,body:{id:run.id,from:checkpointTick,ticks:game.value.tick,inputs:[...inputs]}};await submit();}else message.value=ranked.value?'本局尚未开始':'练习成绩仅保存在本机';
 }
 let drag=null,pressTimer;const swipe=createSwipeInput(action=>input(action,true));
 function resetPointer(){clearTimeout(pressTimer);swipe.reset();drag=null;}
 function pointer(event){
  const ending=['pointerup','pointercancel','lostpointercapture'].includes(event.type);
  if(!playing.value||paused.value||countdown.value||!canvas.value){if(ending)resetPointer();return;}
  const rect=canvas.value.getBoundingClientRect(),id=game.value.game;
  if(drag&&drag.id!==event.pointerId)return;
  if(event.type==='pointerdown'){canvas.value.setPointerCapture?.(event.pointerId);drag={id:event.pointerId,x:event.clientX,y:event.clientY,gameX:game.value.x,gameY:game.value.y};}
  if(swipe.handle(event,id,rect.width)){if(ending)drag=null;return;}
  if(!drag)return;
  if(id==='mines'){
   const x=Math.floor(((event.clientX-rect.left)/rect.width*360-22)/35.2),y=Math.floor(((event.clientY-rect.top)/rect.height*480-54)/31.4),cell=y*9+x;
   if(event.type==='pointerdown'&&x>=0&&x<9&&y>=0&&y<12){drag.cell=cell;drag.flagged=false;if(event.button===2||flagMode.value){input('flag:'+cell);drag.flagged=true;}else pressTimer=setTimeout(()=>{if(playing.value&&!paused.value&&drag?.cell===cell){input('flag:'+cell);drag.flagged=true;}},450);}
   if(event.type==='pointermove'&&drag&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>12){clearTimeout(pressTimer);drag.flagged=true;}
   if(ending){clearTimeout(pressTimer);if(event.type==='pointerup'&&drag?.cell===cell&&!drag.flagged)input('reveal:'+cell);drag=null;}return;
  }
  if(ending){drag=null;return;}
  if(id==='runner'){if(event.type==='pointerdown')input('jump');return;}
  if(id==='garden'&&event.type==='pointerdown'){const x=Math.floor(((event.clientX-rect.left)/rect.width*360-19)/46),y=Math.floor(((event.clientY-rect.top)/rect.height*480-38)/46);if(x>=0&&x<7&&y>=0&&y<9){const cell=y*7+x,s=game.value;s.selectedCell=cell;const tower=s.towers.find(t=>t.cell===cell),cost={seed:45,frost:65,cannon:90}[tool.value.split(':')[1]];if(tool.value.startsWith('build:')&&tower)message.value='这里已有炮塔，请选择升级或回收。';else if(cost>s.coins)message.value='金币不足，需要 '+cost+' 金币。';else if(tool.value.startsWith('tower:')&&!tower)message.value='请点击一座已有炮塔。';else if(tool.value==='tower:upgrade'&&tower?.level>=4)message.value='这座炮塔已升至最高等级。';else if(tool.value==='tower:upgrade'&&s.coins<30+tower.level*25)message.value='升级需要 '+(30+tower.level*25)+' 金币。';else {message.value='';input(tool.value+':'+cell);}} return;}
  if(['breakout','danmaku','fighter'].includes(id)&&(event.buttons||event.type==='pointerdown')){
   let x=(event.clientX-rect.left)/rect.width*360,y=(event.clientY-rect.top)/rect.height*480;
   if(id!=='breakout'&&event.pointerType==='touch'){x=drag.gameX+(event.clientX-drag.x)/rect.width*360;y=drag.gameY+(event.clientY-drag.y)/rect.height*480;}
   const point={x:Math.round(Math.max(0,Math.min(360,x)))};if(id!=='breakout')point.y=Math.round(Math.max(0,Math.min(480,y)));input(point);
  }
 }
 onMounted(()=>{window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);window.addEventListener('blur',hidden);document.addEventListener('visibilitychange',hidden);timer=setInterval(loadRanking,5000);});
 onUnmounted(()=>{closed=true;resetPointer();cancelAnimationFrame(frame);clearInterval(timer);window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',key,true);window.removeEventListener('blur',hidden);document.removeEventListener('visibilitychange',hidden);held.clear();renderer?.dispose();void audio?.close();});
 return {subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn);},getVersion(){return revision;},mount(){mounts.forEach(fn=>fn());},dispose(){unmounts.forEach(fn=>fn());},mode,flagMode,detail,tool,coins,lives,choices,rankPeriod,changeRank,syncPaused,retrySync,GAMES,selected,canvas,game,score,playing,paused,busy,message,ranking,rankSelf,rankLabel,rankError,ranked,finished,countdown,level,lines,sound,pendingScore,best,name,time,thumbnail,select,toggleSound,start,input,hold,release,pause,submit,finish,pointer};
}
