import {contraCore} from './contra/core.mjs';
export const NEW_GAMES=[
 {id:'contra',number:10,name:'丛林突击',tag:'横版射击 · ContraRun',description:'跑、跳、冲刺与八向射击，突破三座丛林要塞',keys:'方向键移动 / 瞄准 · 空格跳跃 · J 开火 · K 冲刺；手机使用双手控制区',color:'#85c7b3'},
 {id:'garden',number:11,name:'花园守卫',tag:'策略塔防 · 三十波挑战',description:'布置炮塔，守护灯塔；用冰霜与火力搭配抵挡来袭',keys:'选择炮塔后点击空地建造；升级 / 回收模式点击已有炮塔；点击下一波开始',color:'#e6c88e'}
];
const cores=new WeakMap();
export const GARDEN_PATH=[[0,1],[6,1],[6,3],[1,3],[1,5],[5,5],[5,7],[0,7]];
export const TOWERS={seed:{name:'星种炮',cost:45,damage:9,range:2.3,rate:19},frost:{name:'霜花塔',cost:65,damage:4,range:2,rate:28},cannon:{name:'莓果炮',cost:90,damage:25,range:2.5,rate:44}};
const route=[];for(let i=1;i<GARDEN_PATH.length;i++){let [x,y]=GARDEN_PATH[i-1],end=GARDEN_PATH[i];while(x!==end[0]||y!==end[1]){route.push([x,y]);x+=Math.sign(end[0]-x);y+=Math.sign(end[1]-y);}}route.push(GARDEN_PATH.at(-1));
export const gardenRoad=cell=>route.some(([x,y])=>y*7+x===cell);
export function createNew(s){
 if(s.game==='contra'){const core=contraCore(s.seed);cores.set(s,core);s.contra=core.snapshot();s.lives=3;s.level=1;return;}
 Object.assign(s,{lives:20,level:1,coins:160,wave:false,spawned:0,nextSpawn:0,towers:[],enemies:[],effects:[],event:null});
}
export function stepNew(s,actions){
 if(s.game==='contra'){let core=cores.get(s);if(!core){core=contraCore(s.seed);core.restore(s.contra);cores.set(s,core);}s.contra=core.step(actions);s.score=s.contra.score;s.lives=s.contra.lives;s.level=s.contra.game.stage+1;s.over=['gameover','complete'].includes(s.contra.game.state);s.won=s.contra.game.state==='complete';return;}
 s.effects=s.effects.filter(e=>s.tick-e.tick<12);
 for(const a of actions){if(a==='wave'&&!s.wave){s.wave=true;s.spawned=0;s.nextSpawn=s.tick+20;}
  if(typeof a!=='string')continue;const [command,type,n]=a.split(':'),cell=Number(n),tower=s.towers.find(t=>t.cell===cell);
  if(command==='build'&&TOWERS[type]&&Number.isInteger(cell)&&cell>=0&&cell<63&&!gardenRoad(cell)&&!tower&&s.coins>=TOWERS[type].cost){s.coins-=TOWERS[type].cost;s.towers.push({cell,type,level:1,cool:0,spent:TOWERS[type].cost});}
  if(command==='tower'&&tower){if(type==='sell'){s.coins+=Math.floor(tower.spent*.65);s.towers=s.towers.filter(t=>t!==tower);}else if(type==='upgrade'&&tower.level<4){const cost=30+tower.level*25;if(s.coins>=cost){s.coins-=cost;tower.spent+=cost;tower.level++;}}}
 }
 const amount=7+s.level*2;
 if(s.wave&&s.spawned<amount&&s.tick>=s.nextSpawn){const heavy=s.spawned===amount-1&&s.level%5===0,hp=(25+s.level*12)* (heavy?5:1);s.enemies.push({id:s.tick,hp,max:hp,p:0,speed:(.025+Math.min(.025,s.level*.001))*(heavy?.6:1),slow:0,heavy});s.spawned++;s.nextSpawn=s.tick+Math.max(10,32-s.level/2);}
 for(const e of s.enemies){e.p+=e.speed*(e.slow>s.tick?.5:1);const a=route[Math.min(route.length-1,Math.floor(e.p))],b=route[Math.min(route.length-1,Math.floor(e.p)+1)],t=e.p%1;e.x=a[0]+(b[0]-a[0])*t;e.y=a[1]+(b[1]-a[1])*t;if(e.p>=route.length-1){e.gone=true;s.lives-=e.heavy?3:1;}}
 for(const tower of s.towers){if(tower.cool>s.tick)continue;const def=TOWERS[tower.type],x=tower.cell%7,y=Math.floor(tower.cell/7),range=def.range+(tower.level-1)*.25;const target=s.enemies.filter(e=>!e.gone&&e.hp>0&&Math.hypot(x-e.x,y-e.y)<=range).sort((a,b)=>b.p-a.p)[0];if(!target)continue;
  tower.cool=s.tick+Math.max(6,def.rate-(tower.level-1)*3);tower.aim=Math.atan2(target.y-y,target.x-x);s.effects.push({tick:s.tick,x,y,tx:target.x,ty:target.y,type:tower.type});
  for(const e of s.enemies)if(e===target||(tower.type==='cannon'&&Math.hypot(e.x-target.x,e.y-target.y)<.85)){e.hp-=def.damage*(1+(tower.level-1)*.7);if(tower.type==='frost')e.slow=s.tick+60;if(e.hp<=0&&!e.gone){e.gone=true;s.coins+=e.heavy?35:9;s.score+=e.heavy?120:20;}}
 }
 s.enemies=s.enemies.filter(e=>!e.gone);if(s.lives<=0){s.lives=0;s.over=true;}
 if(s.wave&&s.spawned===amount&&!s.enemies.length&&!s.over){s.wave=false;s.coins+=35+s.level*3;s.score+=s.level*60;if(s.level%5===0)s.lives=Math.min(20,s.lives+2);if(s.level===30){s.over=true;s.won=true;}else s.level++;}
}
export function validNewAction(game,a){return game==='contra'?['left','right','up','down','jump','fire','dash'].includes(a):a==='wave'||typeof a==='string'&&/^(?:build:(?:seed|frost|cannon)|tower:(?:upgrade|sell)):(?:[0-9]|[1-5][0-9]|6[0-2])$/.test(a);}
