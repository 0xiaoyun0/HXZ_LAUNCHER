// Deterministic roguelike rules shared by rendering clients and the score verifier.
export const ROGUE_GAMES=[
 {id:'swarm',number:16,name:'星潮幸存',tag:'肉鸽 · 怪潮生存',description:'穿行于星潮，构筑属于你的自动武装',keys:'WASD / 方向键或摇杆移动 · 空格冲刺 · 自动攻击；升级时选择本局天赋',color:'#8fbadf'},
 {id:'deck',number:17,name:'星图旅札',tag:'肉鸽 · 卡牌探险',description:'预判敌意，用每一张旅札改变前路',keys:'点击敌人选择目标，点击手牌打出；数字 1–5 出牌，E 结束回合；击败守卫后选择路线与卡牌',color:'#b4a1dc'},
 {id:'dungeon',number:18,name:'星灯迷宫',tag:'肉鸽 · 地牢闯关',description:'点亮三十间秘境，让遗物与你一起成长',keys:'WASD / 方向键或摇杆移动 · J / 空格释放星爆；靠近自动挥剑，清空房间后走入上方门',color:'#86c5b3'}
];
export const ROGUE_UPGRADES={
 'r-power':{title:'星核共鸣',description:'每次攻击增加 1 点伤害',stat:'power'},
 'r-rapid':{title:'轻盈回响',description:'攻击间隔缩短，最多强化 5 次',stat:'rapid',max:5},
 'r-speed':{title:'逐风之靴',description:'移动速度提升 10%，最多 4 次',stat:'speed',max:4},
 'r-vital':{title:'丰盈之心',description:'最大生命 +2，并恢复 2 点生命',stat:'vital'},
 'r-heal':{title:'星泉补给',description:'恢复 4 点生命'},
 'r-multi':{title:'分裂星芒',description:'增加一道追踪弹，最多强化 4 次',stat:'multi',max:4},
 'r-orbit':{title:'环绕星卫',description:'近身敌人受到周期伤害，最多强化 4 次',stat:'orbit',max:4},
 'r-luck':{title:'丰收徽记',description:'击败敌人额外获得经验，最多强化 4 次',stat:'luck',max:4},
 'r-armor':{title:'星纹护甲',description:'受伤后无敌时间增加 0.2 秒',stat:'armor',max:5},
 'r-reach':{title:'月刃延展',description:'挥剑范围增加 8，最多强化 4 次',stat:'reach',max:4},
 'r-burst':{title:'聚能星爆',description:'主动星爆伤害提高，冷却缩短',stat:'burst',max:5},
 'r-siphon':{title:'暖光灯芯',description:'每击败 12 名敌人恢复 1 点生命',stat:'siphon',max:1},
 'r-frost':{title:'霜星刻印',description:'攻击使敌人减速 2 秒；与环绕星卫协同控制近身敌人',stat:'frost',max:1},
 'r-pierce':{title:'贯星长矢',description:'星芒额外穿透一名敌人，最多强化 3 次',stat:'pierce',max:3},
 'r-chain':{title:'共振导线',description:'攻击向附近另一名敌人传递 50% 伤害（每次最多一次）',stat:'chain',max:1},
 'r-retaliate':{title:'荆光披肩',description:'受到伤害时，对周围敌人造成 3 点反击伤害',stat:'retaliate',max:3},
 'r-regen':{title:'长明烛火',description:'每 15 秒恢复 1 点生命，最多强化 2 次',stat:'regen',max:2},
 'r-execute':{title:'破晓裁决',description:'生命低于 30% 的敌人受到额外 2 点伤害',stat:'execute',max:3},
 'r-camp':{title:'星泉营地',description:'恢复 12 点生命，获得一张净化'},
 'r-elite':{title:'险径试炼',description:'下一战敌人更强，通关奖励翻倍'},
 'r-library':{title:'遗迹书库',description:'获得两张随机稀有旅札'},
 'r-heart':{title:'坚韧旅人',description:'最大生命 +8，恢复 8 点生命'},
 'r-energy':{title:'晨星徽章',description:'每回合能量 +1（最高 5）'},
 'r-blade':{title:'磨砺锋芒',description:'本局所有攻击卡的伤害 +2'},
 ...Object.fromEntries(['bolt','barrier','nova','renew','leech','insight','poison','sweep','thorns','fortify','venom','meditate','shieldbash','comet'].map(id=>['r-card-'+id,{title:'获得旅札',description:'将新卡加入本局牌组',card:id}]))
};
export const CARDS={
 strike:{name:'星斩',cost:1,damage:6,text:'对目标造成 6 点伤害'},guard:{name:'守望',cost:1,block:5,text:'获得 5 点格挡'},
 bolt:{name:'月矢',cost:1,damage:10,text:'对目标造成 10 点伤害'},barrier:{name:'光壁',cost:2,block:15,text:'获得 15 点格挡'},
 nova:{name:'星陨',cost:2,all:8,text:'对所有敌人造成 8 点伤害'},renew:{name:'净化',cost:1,heal:5,exhaust:true,text:'恢复 5 点生命，本战移除'},
 leech:{name:'汲光',cost:1,damage:5,heal:2,text:'伤害 5，恢复 2 点生命'},insight:{name:'洞悉',cost:0,draw:2,exhaust:true,text:'抽 2 张牌，本战移除'},
 poison:{name:'月蚀',cost:1,poison:4,text:'目标获得 4 层持续毒伤'},sweep:{name:'破晓',cost:2,damage:16,block:4,text:'伤害 16，获得 4 点格挡'},
 thorns:{name:'镜棘',cost:1,thorns:5,block:3,text:'格挡 3；本回合敌人攻击时反伤 5'},
 fortify:{name:'恒星庇护',cost:1,block:7,retain:6,text:'格挡 7；下回合最多保留 6 点格挡'},
 venom:{name:'星尘风暴',cost:2,poisonAll:5,text:'所有敌人获得 5 层持续毒伤'},
 meditate:{name:'凝神',cost:1,focus:2,exhaust:true,text:'本战所有攻击伤害 +2，本战移除'},
 shieldbash:{name:'盾星冲击',cost:1,shieldDamage:true,text:'造成 3 加当前格挡值的伤害'},
 comet:{name:'流星连奏',cost:0,damage:3,combo:2,text:'伤害 3；本回合此前每打出一张牌再 +2'}
};
for(const value of Object.values(ROGUE_UPGRADES))if(value.card){value.title=CARDS[value.card].name;value.description=CARDS[value.card].text+'；加入牌组';}
export const rogueUpgrade=id=>ROGUE_UPGRADES[id];
export function validRogueAction(game,a){return ['swarm','deck','dungeon'].includes(game)&&typeof a==='string'&&(['left','right','up','down','dash','fire','endturn'].includes(a)||/^card:[0-7]$/.test(a)||/^target:[0-2]$/.test(a)||a.startsWith('upgrade:')&&Object.hasOwn(ROGUE_UPGRADES,a.slice(8)));}
const random=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const shuffled=(s,values)=>{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function choose(s,ids){s.choices=shuffled(s,ids.filter(id=>(id!=='r-energy'||s.maxEnergy<5)&&(!ROGUE_UPGRADES[id].max||(s[ROGUE_UPGRADES[id].stat]||0)<ROGUE_UPGRADES[id].max))).slice(0,3);}
function heal(s,n){s.hp=Math.min(s.maxHp,s.hp+n);}
function hurt(s,n){if(s.invincible>0)return;s.hp=Math.max(0,s.hp-n);s.invincible=30+(s.armor||0)*6;s.shake=8;if(s.retaliate)for(const e of s.enemies)if(e.hp>0&&Math.hypot(e.x-s.x,e.y-s.y)<80)damage(s,e,s.retaliate*3,true);if(!s.hp)s.over=true;}
function award(s,e){if(e.awarded)return;e.awarded=true;s.kills++;s.score+=e.boss?200:10+(e.kind||0)*5;s.xp+=1+(s.luck||0);if(s.siphon&&s.kills%12===0)heal(s,1);s.effects.push({x:e.x,y:e.y,age:16,type:'burst'});}
function damage(s,e,n,secondary=false){if(e.hp<=0)return;e.hp-=n+(s.execute&&e.hp/e.max<.3?s.execute*2:0);e.hit=6;if(s.frost)e.slow=60;if(e.hp<=0)award(s,e);if(s.chain&&!secondary){const other=s.enemies.find(v=>v!==e&&v.hp>0&&Math.hypot(v.x-e.x,v.y-e.y)<75);if(other)damage(s,other,Math.max(1,Math.floor(n*.5)),true);}}
export function createRogue(s){
 Object.assign(s,{level:1,age:0,hp:8,maxHp:8,x:180,y:280,kills:0,power:2,rapid:0,speed:0,multi:0,orbit:0,luck:0,armor:0,reach:0,burst:0,siphon:0,xp:0,nextXp:8,invincible:0,cool:0,skill:0,choices:[],enemies:[],shots:[],effects:[],nextSpawn:0,uid:0,shake:0});
 if(s.game==='deck'){Object.assign(s,{hp:44,maxHp:44,deck:['strike','strike','strike','strike','guard','guard','guard','bolt','insight'],draw:[],discard:[],hand:[],block:0,energy:3,maxEnergy:3,strength:0,target:0,turn:1,elite:false,log:[],revision:0});battle(s);}
 if(s.game==='dungeon')room(s);
}
function upgrade(s,id){const item=ROGUE_UPGRADES[id];if(!s.choices.includes(id)||!item)return false;s.choices=[];
 if(s.game==='deck'){
  if(item.card)s.deck.push(item.card);if(id==='r-camp'){heal(s,12);s.deck.push('renew');}if(id==='r-library')s.deck.push(...shuffled(s,['nova','leech','sweep','poison','barrier','thorns','fortify','venom','meditate','shieldbash','comet']).slice(0,2));if(id==='r-heart'){s.maxHp+=8;heal(s,8);}if(id==='r-energy')s.maxEnergy=Math.min(5,s.maxEnergy+1);if(id==='r-blade')s.strength+=2;s.elite=id==='r-elite';s.level++;battle(s);return true;
 }
 if(item.stat)s[item.stat]=(s[item.stat]||0)+1;if(id==='r-power'){}if(id==='r-vital'){s.maxHp+=2;heal(s,2);}if(id==='r-heal')heal(s,4);
 if(s.game==='dungeon'){s.level++;room(s);}else{s.level++;s.nextXp=Math.round(s.nextXp*1.28+3);heal(s,1);}return true;
}
function foe(s,x,y,boss=false){const kind=boss?3:Math.floor(random(s)*3),hp=(2+Math.floor((s.game==='dungeon'?s.level:s.age/1200)*1.2))*(boss?14:kind===2?2:1);return {id:++s.uid,x,y,kind,boss,hp,max:hp,cool:30+Math.floor(random(s)*90),hit:0};}
function move(s,actions){const dx=Number(actions.includes('right'))-Number(actions.includes('left')),dy=Number(actions.includes('down'))-Number(actions.includes('up')),length=Math.hypot(dx,dy)||1;let speed=2.1*(1+s.speed*.1);if(s.game==='swarm'&&actions.includes('dash')&&s.skill<=0){s.dash=7;s.skill=110;s.invincible=Math.max(s.invincible,15);}if(s.dash>0){s.dash--;speed*=3;}const x=clamp(s.x+dx/length*speed,14,346),y=clamp(s.y+dy/length*speed,42,452);if(s.game!=='dungeon'||walkable(s,x,s.y))s.x=x;if(s.game!=='dungeon'||walkable(s,s.x,y))s.y=y;}
function attack(s){if(s.cool>0)return;const nearest=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y));if(!nearest.length)return;
 if(s.game==='swarm'){for(let i=0;i<=s.multi;i++){const target=nearest[i%nearest.length],angle=Math.atan2(target.y-s.y,target.x-s.x);s.shots.push({x:s.x,y:s.y,vx:Math.cos(angle)*6,vy:Math.sin(angle)*6,age:75,damage:s.power,enemy:false,pierce:s.pierce||0,hits:[]});}s.cool=Math.max(6,24-s.rapid*3);}
 else if(Math.hypot(nearest[0].x-s.x,nearest[0].y-s.y)<48+s.reach*8){const angle=Math.atan2(nearest[0].y-s.y,nearest[0].x-s.x);for(const e of nearest)if(Math.hypot(e.x-s.x,e.y-s.y)<52+s.reach*8)damage(s,e,s.power+1);s.effects.push({x:s.x,y:s.y,age:12,type:'slash',angle,radius:52+s.reach*8});s.cool=Math.max(8,28-s.rapid*3);}
}
function activeStep(s,actions){s.age++;if(s.regen&&s.age%450===0)heal(s,s.regen);s.cool--;s.skill--;s.invincible=Math.max(0,s.invincible-1);s.shake=Math.max(0,s.shake-1);move(s,actions);
 if(s.game==='swarm'){
  if(s.age>=s.nextSpawn&&s.enemies.length<72){const side=Math.floor(random(s)*4),x=side===0?8:side===1?352:18+random(s)*324,y=side===2?35:side===3?455:45+random(s)*390;s.enemies.push(foe(s,x,y));s.nextSpawn=s.age+Math.max(8,42-Math.floor(s.age/420));}
  if(s.age%1800===0)s.enemies.push(foe(s,180,42,true));
 }else{
  if(actions.includes('fire')&&s.skill<=0){for(const e of s.enemies)if(Math.hypot(e.x-s.x,e.y-s.y)<105)damage(s,e,5+s.burst*3);s.effects.push({x:s.x,y:s.y,age:18,type:'nova',radius:105});s.skill=Math.max(80,240-s.burst*25);}
  if(s.age%8===0)s.distances=distances(s);
 }
 if(s.orbit&&s.age%18===0)for(const e of s.enemies)if(Math.hypot(e.x-s.x,e.y-s.y)<44+s.orbit*5)damage(s,e,s.orbit);
 attack(s);
 for(const e of s.enemies){if(e.hp<=0)continue;e.slow=Math.max(0,(e.slow||0)-1);e.hit=Math.max(0,e.hit-1);let tx=s.x,ty=s.y;
  if(s.game==='dungeon'){const cell=cellAt(e.x,e.y),adj=neighbors(cell).filter(c=>!s.walls.includes(c));if(cell!==cellAt(s.x,s.y)){let best=cell;for(const n of adj)if((s.distances?.[n]??999)<(s.distances?.[best]??999))best=n;[tx,ty]=cellCenter(best);const [cx,cy]=cellCenter(cell);if(Math.floor(best/9)===Math.floor(cell/9)&&Math.abs(e.y-cy)>2){tx=cx;ty=cy;}else if(best%9===cell%9&&Math.abs(e.x-cx)>2){tx=cx;ty=cy;}}}
  const dx=tx-e.x,dy=ty-e.y,dist=Math.hypot(dx,dy)||1,speed=(e.kind===1?1.25:.75)+Math.min(.55,(s.game==='dungeon'?s.level:s.age/1800)*.025);if(dist>3){const slow=e.slow>0?.55:1,nx=e.x+dx/dist*speed*slow,ny=e.y+dy/dist*speed*slow;if(s.game!=='dungeon'||walkable(s,nx,e.y))e.x=nx;if(s.game!=='dungeon'||walkable(s,e.x,ny))e.y=ny;}
  if(--e.cool<=0&&(e.kind===2||e.boss)){const a=Math.atan2(s.y-e.y,s.x-e.x);for(let i=0;i<(e.boss?5:1);i++){const angle=a+(e.boss?(i-2)*.28:0);s.shots.push({x:e.x,y:e.y,vx:Math.cos(angle)*2.3,vy:Math.sin(angle)*2.3,age:160,enemy:true,damage:1});}e.cool=e.boss?60:120;}
  if(Math.hypot(e.x-s.x,e.y-s.y)<(e.boss?24:15))hurt(s,e.boss?2:1);
 }
 for(const b of s.shots){b.x+=b.vx;b.y+=b.vy;b.age--;if(s.game==='dungeon'&&!walkable(s,b.x,b.y))b.age=0;if(b.enemy){if(Math.hypot(b.x-s.x,b.y-s.y)<11){hurt(s,b.damage);b.age=0;}}else{const e=s.enemies.find(e=>e.hp>0&&!b.hits?.includes(e.id)&&Math.hypot(e.x-b.x,e.y-b.y)<(e.boss?23:12));if(e){damage(s,e,b.damage);(b.hits||=[]).push(e.id);if(b.pierce>0)b.pierce--;else b.age=0;}}}
 s.shots=s.shots.filter(b=>b.age>0&&b.x>0&&b.x<360&&b.y>25&&b.y<465).slice(-200);s.enemies=s.enemies.filter(e=>e.hp>0);s.effects=s.effects.filter(e=>--e.age>0).slice(-50);
 if(s.game==='swarm'&&s.xp>=s.nextXp){s.xp-=s.nextXp;choose(s,['r-power','r-rapid','r-speed','r-vital','r-heal','r-multi','r-orbit','r-luck','r-armor','r-siphon','r-frost','r-pierce','r-chain','r-retaliate','r-regen','r-execute']);}
 if(s.game==='dungeon'){
  for(const c of s.chests)if(!c.open&&Math.hypot(c.x-s.x,c.y-s.y)<22){c.open=true;s.score+=35;heal(s,1);}
  if(!s.enemies.length&&s.y<92&&Math.abs(s.x-180)<25){s.score+=150*s.level;heal(s,1);if(s.level>=30){s.over=true;s.won=true;s.score+=s.hp*25;}else choose(s,['r-power','r-rapid','r-speed','r-vital','r-heal','r-orbit','r-armor','r-reach','r-burst','r-siphon','r-frost','r-chain','r-retaliate','r-regen','r-execute']);}
 }
}
const cellAt=(x,y)=>clamp(Math.floor((y-50)/36),0,10)*9+clamp(Math.floor((x-18)/36),0,8),cellCenter=c=>[36+(c%9)*36,68+Math.floor(c/9)*36];
function neighbors(c){const x=c%9,y=Math.floor(c/9);return [x>0?c-1:-1,x<8?c+1:-1,y>0?c-9:-1,y<10?c+9:-1].filter(n=>n>=0);}
function walkable(s,x,y){if(x<28||x>332||y<60||y>436)return false;return [[-7,-7],[7,-7],[-7,7],[7,7]].every(([dx,dy])=>!s.walls.includes(cellAt(x+dx,y+dy)));}
function distances(s){const d=Array(99).fill(999),queue=[cellAt(s.x,s.y)];d[queue[0]]=0;for(let i=0;i<queue.length;i++)for(const n of neighbors(queue[i]))if(!s.walls.includes(n)&&d[n]>d[queue[i]]+1){d[n]=d[queue[i]]+1;queue.push(n);}return d;}
function room(s){s.x=180;s.y=392;s.enemies=[];s.shots=[];s.walls=[];s.effects=[];s.skill=0;s.invincible=35;s.chests=[];
 for(let y=1;y<9;y++)for(let x=1;x<8;x++)if(x!==4&&y%3===1&&x%3===1&&random(s)>.2)s.walls.push(y*9+x);
 const spots=shuffled(s,Array.from({length:63},(_,i)=>i).filter(i=>Math.floor(i/9)>1&&!s.walls.includes(i)));const count=s.level%5===0?3:Math.min(16,3+Math.floor(s.level/2));for(let i=0;i<count;i++){const [x,y]=cellCenter(spots[i]);s.enemies.push(foe(s,x,y,s.level%5===0&&i===0));}
 const [x,y]=cellCenter(spots[count]);s.chests=[{x,y,open:false}];s.distances=distances(s);
}
function drawCards(s,n){while(n--&&s.hand.length<8){if(!s.draw.length){s.draw=shuffled(s,s.discard);s.discard=[];}if(!s.draw.length)break;s.hand.push(s.draw.pop());}}
function battle(s){s.enemies=Array.from({length:s.level%3===0?1:Math.min(3,1+Math.floor(s.level/3))},(_,i)=>{const boss=s.level%3===0,hp=(14+s.level*4)*(boss?2.1:1)*(s.elite?1.4:1);return {name:boss?'星蚀守卫':i%2?'月影斥候':'迷途星灵',hp:Math.round(hp),max:Math.round(hp),block:0,poison:0,intent:'attack',amount:0,boss};});s.target=0;s.draw=shuffled(s,s.deck);s.discard=[];s.hand=[];s.turn=1;s.block=0;s.battleFocus=0;s.thorns=0;s.retain=0;s.played=0;s.energy=s.maxEnergy;s.log=['第 '+s.level+' 场遭遇'];drawCards(s,5);intent(s);s.revision++;}
function intent(s){for(const e of s.enemies){e.intent=random(s)<.22?'guard':'attack';e.amount=e.intent==='guard'?5+s.level:3+Math.floor(s.level*.8)+(e.boss?3:0)+Math.floor(random(s)*3);}}
function strike(s,e,n){if(!e||e.hp<=0)return;const absorbed=Math.min(e.block,n);e.block-=absorbed;e.hp=Math.max(0,e.hp-n+absorbed);}
function deckStep(s,actions){for(const action of actions){if(s.over||s.choices.length)break;if(typeof action!=='string')continue;
  if(action.startsWith('target:')){const index=Number(action.slice(7));if(s.enemies[index]?.hp>0)s.target=index;continue;}
  if(action.startsWith('card:')){const index=Number(action.slice(5)),id=s.hand[index],card=CARDS[id];if(!card||card.cost>s.energy)continue;s.energy-=card.cost;s.hand.splice(index,1);if(!card.exhaust)s.discard.push(id);const e=s.enemies[s.target]?.hp>0?s.enemies[s.target]:s.enemies.find(e=>e.hp>0);if(card.damage)strike(s,e,card.damage+s.strength+s.battleFocus+(card.combo||0)*s.played);if(card.all)for(const enemy of s.enemies)strike(s,enemy,card.all+s.strength+s.battleFocus);if(card.shieldDamage)strike(s,e,3+s.block+s.strength+s.battleFocus);if(card.focus)s.battleFocus+=card.focus;if(card.thorns)s.thorns+=card.thorns;if(card.retain)s.retain+=card.retain;if(card.poisonAll)for(const enemy of s.enemies)enemy.poison+=card.poisonAll;s.played++;if(card.block)s.block+=card.block;if(card.heal)heal(s,card.heal);if(card.poison&&e)e.poison+=card.poison;if(card.draw)drawCards(s,card.draw);s.log.push('打出「'+card.name+'」');s.revision++;}
  if(action==='endturn'){
   for(const e of s.enemies){e.hp=Math.max(0,e.hp-e.poison);e.poison=Math.max(0,e.poison-1);if(e.hp<=0)continue;e.block=0;if(e.intent==='guard')e.block=e.amount;else{const hit=Math.max(0,e.amount-s.block);s.block=Math.max(0,s.block-e.amount);s.hp=Math.max(0,s.hp-hit);if(s.thorns)strike(s,e,s.thorns);s.log.push(e.name+' 造成 '+hit+' 点伤害');}}
   if(!s.hp){s.over=true;break;}s.discard.push(...s.hand);s.hand=[];s.turn++;s.energy=s.maxEnergy;s.block=Math.min(s.block,s.retain);s.retain=0;s.thorns=0;s.played=0;drawCards(s,5);intent(s);s.revision++;
  }
  if(s.enemies.every(e=>e.hp<=0)){
   s.score+=s.level*100*(s.elite?2:1)+Math.max(0,60-s.turn*3);if(s.level===12){s.over=true;s.won=true;s.score+=s.hp*10;break;}
   choose(s,s.level%3===0?['r-camp','r-library','r-heart','r-energy','r-blade','r-elite']:['r-card-bolt','r-card-barrier','r-card-nova','r-card-renew','r-card-leech','r-card-insight','r-card-poison','r-card-sweep','r-card-thorns','r-card-fortify','r-card-venom','r-card-meditate','r-card-shieldbash','r-card-comet','r-camp']);
  }
 }
 s.log=s.log.slice(-4);}
export function stepRogue(s,actions){if(s.choices.length){const selected=actions.find(a=>typeof a==='string'&&a.startsWith('upgrade:'));if(selected)upgrade(s,selected.slice(8));return;}if(s.game==='deck')deckStep(s,actions);else activeStep(s,actions);}
