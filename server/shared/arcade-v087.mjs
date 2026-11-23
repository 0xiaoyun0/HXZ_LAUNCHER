// 0.8.7 games.  The rules are deterministic and intentionally use only the
// shared four-direction action set so desktop, mobile and replay verification
// cannot drift apart.
export const V087_GAMES = [
  {id:'orbit', number:31, name:'星环采集', tag:'空间 · 轨道生存', description:'在不断收缩的轨道里收集星核，躲开碎片风暴。', keys:'WASD / 方向键移动', color:'#9ec9ed'},
  {id:'supply', number:32, name:'雾港配给', tag:'节奏 · 码头接货', description:'调度小船接住补给箱，连续接货可以获得连锁积分。', keys:'A D / ← → 移动', color:'#d9b68d'},
  {id:'rhythm', number:33, name:'霓虹节拍', tag:'反应 · 四轨节奏', description:'在节拍线到达时按下对应方向，连续准确命中会加速得分。', keys:'WASD / 方向键按轨', color:'#e4a7da'},
  {id:'alchemy', number:34, name:'秘境炼金', tag:'策略 · 元素合成', description:'移动炼金师收集元素，合成更高阶的晶核并保持连锁。', keys:'WASD / 方向键移动', color:'#b7d8ad'}
];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const dirs={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
const rand=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
const direction=actions=>actions.find(a=>Object.hasOwn(dirs,a));

export function createV087(s){
  s.level=1;s.event=null;s.lives=3;
  if(s.game==='orbit')Object.assign(s,{x:180,y:240,target:{x:250,y:170},debris:[],nextDebris:30,combo:0,energy:3});
  if(s.game==='supply')Object.assign(s,{boat:180,crates:[],nextCrate:24,missed:0,combo:0,harbor:0});
  if(s.game==='rhythm')Object.assign(s,{notes:[],nextNote:30,combo:0,accuracy:0,missed:0,finishedAt:1800});
  if(s.game==='alchemy')Object.assign(s,{x:3,y:3,cursor:0,grid:Array(49).fill(0),nextElement:22,combo:0,chain:0,level:1});
}

function stepOrbit(s,actions){
  const d=direction(actions);if(d){const [dx,dy]=dirs[d];s.x=clamp(s.x+dx*4,18,342);s.y=clamp(s.y+dy*4,44,450);}
  if(--s.nextDebris<=0){s.debris.push({x:12+rand(s)*336,y:35+rand(s)*410,vx:(rand(s)-.5)*1.6,vy:.9+rand(s)*1.8,r:5+rand(s)*5});s.nextDebris=Math.max(8,34-Math.floor(s.tick/240));}
  for(const b of s.debris){b.x+=b.vx;b.y+=b.vy;if(b.x<8||b.x>352)b.vx=-b.vx;if(Math.hypot(b.x-s.x,b.y-s.y)<b.r+10){b.dead=true;s.lives--;s.combo=0;s.energy=Math.max(0,s.energy-1);s.event={tick:s.tick,kind:'hurt'};if(s.lives<=0)s.over=true;}}
  s.debris=s.debris.filter(b=>!b.dead&&b.y<500);
  if(Math.hypot(s.target.x-s.x,s.target.y-s.y)<18){s.score+=25+s.combo*5;s.combo++;s.energy=Math.min(5,s.energy+1);s.target={x:20+rand(s)*320,y:55+rand(s)*380};s.event={tick:s.tick,kind:'collect'};}
  s.level=1+Math.floor(s.tick/450);s.score+=s.tick%15===0?1:0;
}
function stepSupply(s,actions){
  const d=direction(actions);if(d==='left')s.boat=clamp(s.boat-7,28,332);if(d==='right')s.boat=clamp(s.boat+7,28,332);
  if(--s.nextCrate<=0){const good=rand(s)>.14;s.crates.push({x:22+rand(s)*316,y:46,vy:1.7+rand(s)*1.5,w:good?16:22,good});s.nextCrate=Math.max(10,30-Math.floor(s.tick/180));}
  for(const c of s.crates){c.y+=c.vy;if(c.y>410&&c.y<438&&Math.abs(c.x-s.boat)<30){c.dead=true;if(c.good){s.score+=20+s.combo*4;s.combo++;s.harbor++;}else{s.score=Math.max(0,s.score-12);s.combo=0;}s.event={tick:s.tick,kind:c.good?'catch':'bad'};}else if(c.y>470){c.dead=true;if(c.good){s.missed++;s.combo=0;if(s.missed>=5)s.over=true;}}}
  s.crates=s.crates.filter(c=>!c.dead);s.level=1+Math.floor(s.tick/360);
}
function stepRhythm(s,actions){
  if(--s.nextNote<=0){const lanes=['left','up','down','right'];s.notes.push({lane:lanes[Math.floor(rand(s)*4)],y:40,life:0});s.nextNote=Math.max(10,30-Math.floor(s.tick/220));}
  const lane=direction(actions);let hit=false;
  for(const n of s.notes){n.y+=5;n.life++;if(n.y>=390&&n.y<=430&&!n.hit&&lane===n.lane){n.hit=true;hit=true;s.combo++;s.accuracy++;s.score+=20+Math.min(80,s.combo*4);s.event={tick:s.tick,kind:'hit'};}}
  for(const n of s.notes)if(!n.hit&&n.y>450){n.hit=true;s.missed++;s.combo=0;}
  s.notes=s.notes.filter(n=>n.y<470);s.level=1+Math.floor(s.tick/300);if(s.tick>=s.finishedAt){s.over=true;s.won=s.accuracy>=Math.max(8,Math.floor(s.tick/90));}
  if(!hit&&lane&&s.notes.length>0&&s.notes.every(n=>n.y<370||n.hit))s.combo=0;
}
function stepAlchemy(s,actions){
  const d=direction(actions);if(d){const [dx,dy]=dirs[d];s.x=clamp(s.x+dx,0,6);s.y=clamp(s.y+dy,0,6);}
  const index=s.y*7+s.x;
  if(!s.grid[index]&&s.tick>=s.nextElement){s.grid[index]=1+Math.floor(rand(s)*3);s.nextElement=s.tick+20;}
  if(s.grid[index]){const value=s.grid[index];s.grid[index]=0;s.chain=value===s.cursor+1?s.chain+1:0;s.cursor=value;s.score+=value*10+s.chain*5;s.event={tick:s.tick,kind:'brew'};if(value===3)s.level++;}
  s.level=Math.max(1,Math.min(20,s.level));if(s.tick>=2400){s.over=true;s.won=s.score>=900;}
}
export function stepV087(s,actions=[]){
  if(s.game==='orbit')stepOrbit(s,actions);
  else if(s.game==='supply')stepSupply(s,actions);
  else if(s.game==='rhythm')stepRhythm(s,actions);
  else if(s.game==='alchemy')stepAlchemy(s,actions);
}
