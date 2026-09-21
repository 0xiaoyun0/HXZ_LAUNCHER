import {ref,shallowRef,computed,onMounted,onUnmounted,nextTick} from 'vue';
import {GAMES,createGame,step,MAX_TICKS} from '../../../server/shared/arcade-engine.mjs';
import {createRenderer} from './arcade-renderer.mjs';
export function useArcade(request){
 const selected=ref(null),canvas=ref(),game=shallowRef(null),score=ref(0),playing=ref(false),paused=ref(false),busy=ref(false),message=ref(''),ranking=ref([]),rankError=ref(''),ranked=ref(false),finished=ref(false),countdown=ref(0),elapsed=ref(0),level=ref(1),lines=ref(0),sound=ref(false),pendingScore=ref(null);
 let saved={};try{saved=JSON.parse(localStorage.getItem('hxz-arcade-best')||'{}');}catch{}
 const best=ref(saved),name=computed(()=>selected.value?.name||'小游戏'),time=computed(()=>Math.floor(elapsed.value/60)+':'+String(elapsed.value%60).padStart(2,'0'));
 let frame=0,clock=0,accumulator=0,run=null,inputs=[],queued=[],held=new Set(),holdTicks=new Map(),timer,closed=false,submitting=false,loadingRanking=false,renderer,audio,lastEvent=-1,countdownLeft=0;
 async function loadRanking(){if(!selected.value||document.hidden||closed||loadingRanking)return;const id=selected.value.id;loadingRanking=true;try{const data=await request('/api/arcade/'+id);if(!closed&&selected.value?.id===id){ranking.value=data.items;rankError.value='';}}catch{if(!closed&&selected.value?.id===id)rankError.value='暂时无法获取排名。社区服务端需升级至 0.4.4。';}finally{loadingRanking=false;if(!closed&&selected.value&&selected.value.id!==id)void loadRanking();}}
 function thumbnail(el,item){if(!el)return;const s=createGame(item.id,100);if(item.id==='runner'){s.tick=65;s.y=18;s.obstacles=[{x:180,w:24,h:34},{x:308,w:18,h:42}];}if(item.id==='blocks'){for(let y=14;y<20;y++)for(let x=0;x<10;x++)if((x+y)%5&&x!==6)s.board[y][x]=1+(x+Math.floor(y/2))%7;s.y=8;}if(item.id==='breakout'){s.ball.x=126;s.ball.y=284;s.paddle=170;s.serve=0;s.bricks.forEach((b,i)=>{if(i>26&&i%3===1)b.alive=false;});}const r=createRenderer(el,item.id,{preview:true});r.draw(s);r.dispose();}
 async function select(item){if(playing.value||submitting)return;renderer?.dispose();renderer=null;selected.value=item;game.value=null;finished.value=false;pendingScore.value=null;message.value='';ranking.value=[];score.value=0;elapsed.value=0;level.value=1;lines.value=0;await loadRanking();}
 function prepareAudio(){if(!sound.value)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();void audio.resume();}catch{sound.value=false;}}
 function tone(kind){if(!sound.value||!audio||audio.state!=='running')return;const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;osc.type='sine';osc.frequency.setValueAtTime(kind==='jump'?440:kind==='clear'?660:kind==='end'?180:320,now);osc.frequency.exponentialRampToValueAtTime(kind==='end'?70:kind==='clear'?880:220,now+.09);gain.gain.setValueAtTime(.025,now);gain.gain.exponentialRampToValueAtTime(.001,now+.12);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(now+.13);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
 function toggleSound(){sound.value=!sound.value;prepareAudio();}
 async function start(){if(busy.value||playing.value||submitting)return;busy.value=true;message.value='';finished.value=false;pendingScore.value=null;prepareAudio();
  try{run=await request('/api/arcade/'+selected.value.id+'/start','POST',{});ranked.value=true;}catch(e){run={seed:Math.floor(Math.random()*4294967296)};ranked.value=false;message.value='练习模式 · '+e.message;}finally{busy.value=false;}
  if(closed)return;game.value=createGame(selected.value.id,run.seed);score.value=0;elapsed.value=0;inputs=[];queued=[];held.clear();holdTicks.clear();playing.value=true;paused.value=false;clock=0;accumulator=0;lastEvent=-1;countdownLeft=1.8;countdown.value=2;
  await nextTick();renderer?.dispose();renderer=createRenderer(canvas.value,selected.value.id);renderer.draw(game.value);canvas.value?.focus();frame=requestAnimationFrame(loop);
 }
 function input(a){if(!playing.value||paused.value||countdown.value)return;if(typeof a==='object'){const at=queued.findIndex(v=>typeof v==='object');if(at>=0){queued[at]=a;return;}}if(queued.length<4&&!queued.includes(a))queued.push(a);}
 function hold(a){held.add(a);holdTicks.set(a,game.value?.tick||0);input(a);}
 function release(a){held.delete(a);holdTicks.delete(a);}
 function key(event){if(!playing.value||event.target?.matches('input,textarea,select'))return;if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();if(event.type==='keydown'&&!event.repeat)pause();return;}const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',ArrowUp:'rotate',KeyW:'rotate',Space:'drop',KeyC:'hold'};const action=keys[event.code];if(!action)return;event.preventDefault();if(event.type==='keyup'){release(action);return;}if(event.repeat)return;if(game.value.game==='runner'){if(['rotate','drop'].includes(action))input('jump');return;}if(['left','right','down'].includes(action))hold(action);else input(action);}
 function loop(now){if(!playing.value)return;const dt=clock?Math.min(.12,(now-clock)/1000):0;clock=now;
  if(!paused.value){if(countdownLeft>0){countdownLeft=Math.max(0,countdownLeft-dt);countdown.value=Math.ceil(countdownLeft);}else{accumulator+=dt;while(accumulator>=1/30&&playing.value){accumulator-=1/30;const s=game.value;
   for(const action of held){const age=s.tick-(holdTicks.get(action)||0);if(s.game==='breakout'||age>=6&&age%2===0)input(action);}
   const actions=queued.splice(0,4);for(const action of actions)inputs.push([s.tick+1,action]);s.renderPrevious={y:s.y,ballX:s.ball?.x,ballY:s.ball?.y,paddle:s.paddle};
   if(actions.includes('jump')&&s.y===0)tone('jump');step(s,actions);score.value=s.score;level.value=s.level||1;lines.value=s.lines||0;elapsed.value=Math.floor(s.tick/30);
   if(s.event&&s.event.tick!==lastEvent){lastEvent=s.event.tick;tone(s.game==='blocks'?'clear':'hit');}
   if(s.over||s.tick>=MAX_TICKS||inputs.length>=MAX_TICKS*2){void finish();break;}
  }}renderer?.draw(game.value,accumulator*30,now);}
  if(playing.value)frame=requestAnimationFrame(loop);
 }
 function pause(){if(!playing.value)return;paused.value=!paused.value;held.clear();queued=[];clock=0;accumulator=0;cancelAnimationFrame(frame);if(!paused.value){canvas.value?.focus();frame=requestAnimationFrame(loop);}}
 function hidden(event){if((document.hidden||event?.type==='blur')&&playing.value&&!paused.value)pause();}
 async function submit(){if(!pendingScore.value||submitting)return;submitting=true;busy.value=true;try{const result=await request('/api/arcade/'+pendingScore.value.game+'/finish','POST',pendingScore.value.body);ranking.value=result.items;pendingScore.value=null;message.value='成绩已同步至社区排行榜';}catch(e){message.value='成绩暂未提交：'+e.message;}finally{submitting=false;busy.value=false;}}
 async function finish(){if(!playing.value)return;playing.value=false;paused.value=false;finished.value=true;countdown.value=0;held.clear();cancelAnimationFrame(frame);renderer?.draw(game.value);tone('end');const id=selected.value.id;
  if(score.value>(Number(best.value[id])||0)){best.value={...best.value,[id]:score.value};try{localStorage.setItem('hxz-arcade-best',JSON.stringify(best.value));}catch{}}
  if(ranked.value&&game.value.tick){pendingScore.value={game:id,body:{id:run.id,ticks:game.value.tick,inputs}};await submit();}else message.value=ranked.value?'本局尚未开始':'练习成绩仅保存在本机';
 }
 function pointer(event){if(!playing.value||!canvas.value)return;if(event.type==='pointerdown')canvas.value.setPointerCapture?.(event.pointerId);if(game.value.game==='runner'){if(event.type==='pointerdown')input('jump');}else if(game.value.game==='breakout'&&(event.buttons||event.type==='pointerdown')){const rect=canvas.value.getBoundingClientRect();input({x:Math.round(Math.max(0,Math.min(360,(event.clientX-rect.left)/rect.width*360)))});}}
 onMounted(()=>{window.addEventListener('keydown',key,true);window.addEventListener('keyup',key,true);window.addEventListener('blur',hidden);document.addEventListener('visibilitychange',hidden);timer=setInterval(loadRanking,5000);});
 onUnmounted(()=>{closed=true;cancelAnimationFrame(frame);clearInterval(timer);window.removeEventListener('keydown',key,true);window.removeEventListener('keyup',key,true);window.removeEventListener('blur',hidden);document.removeEventListener('visibilitychange',hidden);held.clear();renderer?.dispose();void audio?.close();});
 return {GAMES,selected,canvas,game,score,playing,paused,busy,message,ranking,rankError,ranked,finished,countdown,level,lines,sound,pendingScore,best,name,time,thumbnail,select,toggleSound,start,input,hold,release,pause,submit,finish,pointer};
}
