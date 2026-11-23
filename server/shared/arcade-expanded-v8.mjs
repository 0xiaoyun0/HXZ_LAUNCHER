import {FLIGHT_UPGRADES,availableFlightUpgrades,flightShieldCap} from './arcade-upgrades-v8.mjs';
// Deterministic 30 Hz rules. Arrays have explicit bounds for mobile and server replay.
export const EXTRA_GAMES = [
  {id:'danmaku',name:'星庭流萤',tag:'弹幕 · 无尽模式',description:'在花瓣与星轨之间，寻找属于你的空隙',keys:'WASD / 方向键移动，Shift 精细移动；手机拖动画面',color:'#d0aff2',number:7},
  {id:'maze',name:'月光迷宫',tag:'探索 · 百关挑战',description:'收集星屑、避开守卫，穿越百座变化的迷宫',keys:'WASD / 方向键，或下方方向按钮；收集光核可反击守卫',color:'#f0d68c',number:8},
  {id:'fighter',name:'苍穹航线',tag:'飞行 · 百关挑战',description:'自动开火，选择永久增益，突破空中防线',keys:'WASD / 方向键移动，手机拖动画面；每关结束选择一项增益',color:'#93cee8',number:9}
];
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function createExpanded(s){
  Object.assign(s,{level:1,lives:3,event:null,invincible:0});
  if(s.game==='maze'){makeMaze(s);return;}
  Object.assign(s,{x:180,y:405,bullets:[],enemies:[],shots:[],drops:[],stageTick:0});
  if(s.game==='fighter')Object.assign(s,Object.fromEntries(FLIGHT_UPGRADES.map(v=>[v.id,0])),{power:1,phase:'flight',choices:[],kills:0});
}
function move(s,actions){
  const slow=actions.includes('focus'),v=(s.game==='fighter'?4.2+s.speed*.25:4)*(slow?.45:1);
  let dx=0,dy=0;
  for(const a of actions){if(a==='left')dx=-1;if(a==='right')dx=1;if(a==='up')dy=-1;if(a==='down')dy=1;}
  const target=actions.find(a=>typeof a==='object'&&a!==null);
  if(target){dx=target.x-s.x;dy=target.y-s.y;}else{const d=Math.hypot(dx,dy)||1;dx=dx/d*v;dy=dy/d*v;}
  s.x=clamp(s.x+dx,12,348);s.y=clamp(s.y+dy,45,456);
}
function bullet(s,x,y,angle,speed,r=4,color=0){if(s.bullets.length<600)s.bullets.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,r,color});}
function hurt(s){
  if(s.invincible>s.tick)return;
  const armor=(s.armor||0)*15;
  if(s.shield){s.shield--;s.invincible=s.tick+45+armor;}else{s.lives--;s.invincible=s.tick+75+armor;if(s.lives<=0)s.over=true;}
  s.event={tick:s.tick,kind:'hurt',x:s.x,y:s.y};
}
function recover(s,cleared){if(cleared%5===0&&s.lives<3){s.lives++;s.event={tick:s.tick,kind:'recover',text:'通关补给 · 恢复一次机会'};}}
function shotsHit(s){
  for(const b of s.bullets){const ox=b.x,oy=b.y,slow=s.slowfield&&Math.hypot(b.x-s.x,b.y-s.y)<80?1-s.slowfield*.12:1;b.x+=b.vx*slow;b.y+=b.vy*slow;const vx=b.x-ox,vy=b.y-oy,t=clamp(((s.x-ox)*vx+(s.y-oy)*vy)/(vx*vx+vy*vy||1),0,1);if(Math.hypot(ox+t*vx-s.x,oy+t*vy-s.y)<b.r+3-(s.afterburner||0)*.5){hurt(s);b.dead=true;}}
  s.bullets=s.bullets.filter(b=>!b.dead&&b.x>-20&&b.x<380&&b.y>-30&&b.y<500);
}
function danmaku(s,actions){
  move(s,actions);s.level=1+Math.floor(s.tick/900);const t=s.tick,phase=Math.floor(t/900)%3,cx=180+Math.sin(t/120)*105,cy=92;
  const interval=Math.max(8,26-Math.floor(s.level/2));
  if(t%interval===0){
    const n=Math.min(28,12+s.level),speed=1.3+Math.min(2.4,s.level*.09);
    for(let i=0;i<n;i++){
      const angle=phase===0?i*TAU/n+t*.018:phase===1?Math.PI/2+(i-n/2)*.18+Math.sin(t*.02)*.7:i*TAU/n-t*.014;
      bullet(s,cx,cy,angle,speed+(phase===2?(i%3)*.3:0),phase===1?3:4,phase);
    }
  }
  if(t%90===0){const angle=Math.atan2(s.y-40,s.x-180);for(let i=-2;i<=2;i++)bullet(s,180,40,angle+i*.12,2.2+Math.min(2,s.level*.06),5,3);}
  shotsHit(s);s.score=Math.floor(t/3); // Time is the only score source; no client awards.
}
function choose(s,a){
  if(!a?.startsWith?.('upgrade:'))return false;const key=a.slice(8);if(!s.choices.includes(key))return false;
  if(key==='repair')s.lives=Math.min(3,s.lives+1);
  else if(key==='shield')s.shield=Math.min(flightShieldCap(s),s.shield+1);
  else {s[key]++;if(key==='bulwark')s.shield++;}
  s.phase='flight';s.choices=[];s.stageTick=0;s.kills=0;s.level++;s.invincible=s.tick+60;
  s.shield=Math.min(flightShieldCap(s),s.shield+s.barrier);return true;
}
function damageEnemy(s,e,damage){
  if(e.hp<=0)return;e.hp-=damage;
  if(e.hp>0&&s.execute&&e.hp/e.max<=s.execute*.08)e.hp=0;
  if(e.hp<=0){s.kills++;s.score+=e.heavy?80+s.level*4:15+s.level;if(s.drops.length<12&&rng(s)<.1+s.salvage*.05)s.drops.push({x:e.x,y:e.y,kind:rng(s)<.5?'shield':'burst'});s.event={tick:s.tick,kind:'explosion',x:e.x,y:e.y};}
}
function fighter(s,actions){
  if(s.phase==='upgrade'){for(const a of actions)if(choose(s,a))break;return;}
  move(s,actions);s.stageTick++;const t=s.stageTick,level=s.level;
  const overclock=t<=180?s.overdrive:0;
  const fire=(vx,vy)=>{if(s.shots.length<140)s.shots.push({x:s.x,y:s.y-12,vx,vy,damage:(s.power+overclock)*(rng(s)<s.critical*.1?2:1),hit:[]});};
  if(t%Math.max(2,10-s.rapid-overclock)===0){for(let i=-s.wings;i<=s.wings;i++)fire(i*.9,-8);for(let i=1;i<=s.spread;i++){fire(-1.6-i*.8,-7);fire(1.6+i*.8,-7);}}
  if(s.volley&&t%Math.max(8,36-s.volley*8)===0)fire(0,7);
  const duration=660+Math.min(540,level*6),spacing=Math.max(10,40-Math.floor(level/2));
  if(t<duration&&t%spacing===0&&s.enemies.length<36){const heavy=t%(spacing*6)===0,hp=Math.ceil((heavy?12:3)+level*(heavy?2.4:.65));s.enemies.push({id:t,x:24+rng(s)*312,y:-20,phase:rng(s)*TAU,hp,max:hp,heavy,age:0});}
  if(s.pulse&&t%Math.max(120,330-s.pulse*60)===0){s.bullets=s.bullets.filter(b=>Math.hypot(b.x-s.x,b.y-s.y)>100);for(const e of s.enemies)if(Math.hypot(e.x-s.x,e.y-s.y)<130)damageEnemy(s,e,s.power*(2+s.pulse));s.event={tick:s.tick,kind:'pulse',x:s.x,y:s.y};}
  for(const e of s.enemies){e.age++;e.y+=e.heavy?.6+level*.003:1+Math.min(1.4,level*.012);e.x=clamp(e.x+Math.sin(e.age*.035+e.phase)*(e.heavy?.35:1.1),15,345);
    if(e.y>30&&e.y<350&&e.age%Math.max(25,100-Math.floor(level*.6))===0){const a=Math.atan2(s.y-e.y,s.x-e.x);for(let i=e.heavy?-1:0;i<=(e.heavy?1:0);i++)bullet(s,e.x,e.y,a+i*.2,1.7+Math.min(2.5,level*.03),4,e.heavy?3:0);}
    if(Math.hypot(e.x-s.x,e.y-s.y)<(e.heavy?22:15)){hurt(s);e.hp=0;}
  }
  for(const b of s.shots){
    if(s.homing&&t%6===0&&b.vy<0){let nearest=null,distance=Infinity;for(const e of s.enemies){const d=Math.abs(e.x-b.x)+Math.abs(e.y-b.y);if(e.hp>0&&e.y<b.y&&d<distance){distance=d;nearest=e;}}if(nearest)b.vx=clamp(b.vx+Math.sign(nearest.x-b.x)*s.homing*.3,-4,4);}
    b.x+=b.vx;b.y+=b.vy;
    for(const e of s.enemies)if(e.hp>0&&!b.hit.includes(e.id)&&Math.abs(e.x-b.x)<(e.heavy?23:13)&&Math.abs(e.y-b.y)<(e.heavy?25:17)){
      damageEnemy(s,e,b.damage*(e.heavy?1+s.heavy*.4:1));b.hit.push(e.id);b.dead=b.hit.length>s.pierce;
      if(s.chain&&!b.chained){const other=s.enemies.find(n=>n!==e&&n.hp>0&&Math.hypot(n.x-e.x,n.y-e.y)<80);if(other){damageEnemy(s,other,b.damage*s.chain*.4);b.chained=true;}}
      if(b.dead)break;
    }
  }
  s.shots=s.shots.filter(b=>!b.dead&&b.y>-20&&b.y<500&&b.x>0&&b.x<360);s.enemies=s.enemies.filter(e=>e.hp>0&&e.y<510);
  for(const d of s.drops){d.y+=1.5;const distance=Math.hypot(d.x-s.x,d.y-s.y);if(s.magnet&&distance<30+s.magnet*35){d.x+=(s.x-d.x)*.14;d.y+=(s.y-d.y)*.14;}if(Math.hypot(d.x-s.x,d.y-s.y)<20){d.dead=true;if(d.kind==='shield')s.shield=Math.min(flightShieldCap(s),s.shield+1);else{s.bullets=[];for(const e of s.enemies)e.hp=Math.max(1,e.hp-s.power*5);}s.score+=20;}}
  s.drops=s.drops.filter(d=>!d.dead&&d.y<490);shotsHit(s);
  if(!s.over&&t>=duration&&!s.enemies.length){s.score+=200*level;recover(s,level);if(s.regeneration&&level%5!==0&&level%(5-s.regeneration)===0)s.lives=Math.min(3,s.lives+1);s.bullets=[];s.shots=[];s.drops=[];if(level===100){s.over=true;s.won=true;}else{const pool=availableFlightUpgrades(s);if(!pool.length)pool.push('repair');s.choices=[];const count=Math.min(3,pool.length);while(s.choices.length<count){const i=Math.floor(rng(s)*pool.length);s.choices.push(pool.splice(i,1)[0]);}s.phase='upgrade';}}
}
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
function makeMaze(s){
  const w=19,h=23,cells=Array(w*h).fill(1),stack=[[1,1]];cells[w+1]=0;
  while(stack.length){const [x,y]=stack[stack.length-1],options=DIRS.filter(([dx,dy])=>x+dx*2>0&&x+dx*2<w-1&&y+dy*2>0&&y+dy*2<h-1&&cells[(y+dy*2)*w+x+dx*2]);if(!options.length){stack.pop();continue;}const [dx,dy]=options[Math.floor(rng(s)*options.length)];cells[(y+dy)*w+x+dx]=0;cells[(y+dy*2)*w+x+dx*2]=0;stack.push([x+dx*2,y+dy*2]);}
  // Join corridors into loops; every pellet remains reachable from the DFS tree.
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(cells[y*w+x]&&rng(s)<.18&&((!cells[y*w+x-1]&&!cells[y*w+x+1])||(!cells[(y-1)*w+x]&&!cells[(y+1)*w+x])))cells[y*w+x]=0;
  const pellets=cells.map(v=>v?0:1);pellets[w+1]=0;for(const [x,y] of [[1,21],[17,1],[17,21]])pellets[y*w+x]=2;
  Object.assign(s,{cells,pellets,remaining:pellets.filter(Boolean).length,x:1,y:1,dir:1,wanted:1,mazeStep:0,powerUntil:0,ghosts:Array.from({length:Math.min(5,2+Math.floor((s.level-1)/20))},(_,i)=>({x:17,y:21-i*2,dir:3,homeX:17,homeY:21-i*2,rest:90+i*20}))});
}
function open(s,x,y){return x>=0&&x<19&&y>=0&&y<23&&!s.cells[y*19+x];}
function distanceMap(s,x,y){const d=new Int16Array(437).fill(-1),q=[y*19+x];d[q[0]]=0;for(let head=0;head<q.length;head++){const n=q[head],cx=n%19,cy=Math.floor(n/19);for(const [dx,dy] of DIRS){const nx=cx+dx,ny=cy+dy,index=ny*19+nx;if(open(s,nx,ny)&&d[index]<0){d[index]=d[n]+1;q.push(index);}}}return d;}
function maze(s,actions){
  for(const a of actions){const n=['up','right','down','left'].indexOf(a);if(n>=0)s.wanted=n;}
  const interval=Math.max(3,6-Math.floor((s.level-1)/35));s.mazeStep++;
  const oldX=s.x,oldY=s.y;
  if(s.mazeStep%interval===0){let [dx,dy]=DIRS[s.wanted];if(open(s,s.x+dx,s.y+dy))s.dir=s.wanted;[dx,dy]=DIRS[s.dir];if(open(s,s.x+dx,s.y+dy)){s.x+=dx;s.y+=dy;}
    const i=s.y*19+s.x;if(s.pellets[i]){if(s.pellets[i]===2)s.powerUntil=s.tick+Math.max(120,270-s.level);s.score+=s.pellets[i]===2?50:10;s.pellets[i]=0;s.remaining--;}
  }
  const scared=s.powerUntil>s.tick,dist=s.mazeStep%(interval+1)===0?distanceMap(s,s.x,s.y):null;
  for(const g of s.ghosts){const gx=g.x,gy=g.y;if(g.rest>0){g.rest--;continue;}if(dist){let options=DIRS.map(([dx,dy],dir)=>({x:g.x+dx,y:g.y+dy,dir})).filter(p=>open(s,p.x,p.y));const forward=options.filter(p=>p.dir!==(g.dir+2)%4);if(forward.length)options=forward;options.sort((a,b)=>(dist[a.y*19+a.x]-dist[b.y*19+b.x])*(scared?-1:1));const p=options[rng(s)<.12?Math.floor(rng(s)*options.length):0];if(p){g.x=p.x;g.y=p.y;g.dir=p.dir;}}
    if((g.x===s.x&&g.y===s.y)||(gx===s.x&&gy===s.y&&g.x===oldX&&g.y===oldY)){if(scared){s.score+=100;g.x=g.homeX;g.y=g.homeY;g.rest=100;}else if(s.invincible<=s.tick){hurt(s);s.x=1;s.y=1;s.dir=1;s.wanted=1;for(const other of s.ghosts){other.x=other.homeX;other.y=other.homeY;other.rest=80;}break;}}
  }
  if(!s.over&&!s.remaining){s.score+=s.level*100;recover(s,s.level);if(s.level===100){s.won=true;s.over=true;}else{s.level++;makeMaze(s);s.invincible=s.tick+60;}}
}
export function stepExpanded(s,actions){if(s.game==='danmaku')danmaku(s,actions);else if(s.game==='fighter')fighter(s,actions);else maze(s,actions);}

