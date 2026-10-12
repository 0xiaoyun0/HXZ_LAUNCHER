// Fixed-step, seeded rules. Rendering and device input never affect scoring.
export const CLASSIC_GAMES = [
 {id:'tanks',number:10,name:'星堡双卫',tag:'坦克防守 · 单人 / 双人联网',description:'守住星灯基地，与伙伴穿越二十轮防线',keys:'WASD / 方向键移动，J / 空格开火；双人模式各自使用自己的设备加入同一个社区房间',color:'#96cfc5'},
 {id:'merge',number:13,name:'云朵 2048',tag:'数字益智 · 无限合成',description:'轻推云朵，让相同数字相遇',keys:'方向键 / WASD 或滑动画面；相同数字每次只合并一次',color:'#c9b9ee'},
 {id:'snake',number:14,name:'青柠贪吃蛇',tag:'经典街机 · 逐级加速',description:'收集果实，规划路线，让小蛇慢慢长大',keys:'方向键 / WASD 或滑动画面转向；不能直接掉头',color:'#afcf91'},
 {id:'mines',number:15,name:'星野扫雷',tag:'逻辑推理 · 安全首步',description:'用数字找到二十颗星雷，点亮整片星野',keys:'点击翻开；右键 / 长按插旗；点击已揭数字可快速展开周围；首步保证安全',color:'#e9c59c'}
];
const rand=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
const dirs={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
export function createClassic(s){
 s.level=1;s.event=null;
 if(s.game==='merge'){s.cells=Array(16).fill(0);s.moves=0;spawnTile(s);spawnTile(s);}
 if(s.game==='snake'){Object.assign(s,{snake:[{x:8,y:9},{x:7,y:9},{x:6,y:9}],direction:'right',turns:[],nextMove:9,fruit:null});spawnFruit(s);}
 if(s.game==='mines')Object.assign(s,{cols:9,rows:12,mineCount:20,cells:Array(108).fill(0),open:Array(108).fill(false),flags:Array(108).fill(false),ready:false,revealed:0,exploded:-1});
 if(s.game==='tanks'){Object.assign(s,{lives:6,coop:false,bullets:[],effects:[],enemies:[],players:[{x:140,y:380,dir:'up',hp:3,cool:0,invincible:90},{x:220,y:380,dir:'up',hp:3,cool:0,invincible:90}],nextSpawn:70,spawned:0,kills:0,phase:'fight',pickups:[]});tankMap(s);}
}
function spawnTile(s){const empty=s.cells.flatMap((n,i)=>n?[]:[i]);if(empty.length)s.cells[empty[Math.floor(rand(s)*empty.length)]]=rand(s)<.9?2:4;}
function moveTiles(s,dir){
 const before=[...s.cells],motion=[];
 for(let line=0;line<4;line++){
  const indices=Array.from({length:4},(_,i)=>dir==='left'?line*4+i:dir==='right'?line*4+3-i:dir==='up'?i*4+line:(3-i)*4+line);
  const values=indices.filter(i=>s.cells[i]).map(i=>({value:s.cells[i],from:i}));indices.forEach(i=>s.cells[i]=0);
  let to=0;for(let i=0;i<values.length;i++){
   const item=values[i],next=values[i+1],merged=next?.value===item.value,dest=indices[to++];s.cells[dest]=item.value*(merged?2:1);motion.push({from:item.from,to:dest,value:item.value});
   if(merged){motion.push({from:next.from,to:dest,value:next.value});s.score+=s.cells[dest];i++;}
  }
 }
 if(before.some((v,i)=>v!==s.cells[i])){s.moves++;s.event={tick:s.tick,motion};spawnTile(s);}
 s.level=Math.max(1,Math.log2(Math.max(...s.cells))-1);s.achieved=s.cells.some(n=>n>=2048);
 s.over=s.cells.every(Boolean)&&s.cells.every((v,i)=>(i%4===3||v!==s.cells[i+1])&&(i>=12||v!==s.cells[i+4]));
}
function spawnFruit(s){const free=[];for(let y=0;y<18;y++)for(let x=0;x<18;x++)if(!s.snake.some(p=>p.x===x&&p.y===y))free.push({x,y});if(!free.length){s.won=s.over=true;return;}s.fruit=free[Math.floor(rand(s)*free.length)];}
const neighbours=(s,i)=>{const a=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=i%s.cols+dx,y=Math.floor(i/s.cols)+dy;if((dx||dy)&&x>=0&&x<s.cols&&y>=0&&y<s.rows)a.push(y*s.cols+x);}return a;};
function plantMines(s,first){const safe=new Set([first,...neighbours(s,first)]),free=s.cells.map((_,i)=>i).filter(i=>!safe.has(i));for(let i=free.length-1;i>0;i--){const j=Math.floor(rand(s)*(i+1));[free[i],free[j]]=[free[j],free[i]];}for(const i of free.slice(0,s.mineCount))s.cells[i]=-1;for(let i=0;i<s.cells.length;i++)if(s.cells[i]!==-1)s.cells[i]=neighbours(s,i).filter(j=>s.cells[j]===-1).length;s.ready=true;}
function reveal(s,i){
 if(s.flags[i]||s.open[i])return;if(!s.ready)plantMines(s,i);
 if(s.cells[i]===-1){s.exploded=i;s.over=true;s.event={tick:s.tick};return;}
 const queue=[i];while(queue.length){const n=queue.pop();if(s.open[n]||s.flags[n]||s.cells[n]===-1)continue;s.open[n]=true;s.revealed++;if(!s.cells[n])queue.push(...neighbours(s,n));}
 s.score=s.revealed*10;if(s.revealed===s.cells.length-s.mineCount){s.won=s.over=true;s.score+=1000+Math.max(0,1800-Math.floor(s.tick/30));}s.event={tick:s.tick};
}
function tankMap(s){
 s.walls=[];for(let row=1;row<12;row++)for(let col=0;col<12;col++)if(row%3===1&&col%3!==1&&!(col===5||col===6))s.walls.push({x:24+col*26,y:50+row*26,hp:(col+row+s.level)%7===0?-1:2});
 s.enemies=[];s.bullets=[];s.spawned=0;s.nextSpawn=s.tick+60;s.phase='fight';s.pickups=[];s.players.forEach((p,i)=>{p.x=140+i*80;p.y=380;p.invincible=s.tick+90;});
}
const hitsWall=(s,x,y,r)=>s.walls.some(w=>x+r>w.x&&x-r<w.x+24&&y+r>w.y&&y-r<w.y+24);
function moveTank(s,p,d,speed){p.dir=d;const [dx,dy]=dirs[d],x=p.x+dx*speed,y=p.y+dy*speed;if(x>=36&&x<=324&&y>=60&&y<=400&&!hitsWall(s,x,y,10)&&!(x>159&&x<201&&y>397)){p.x=x;p.y=y;return true;}return false;}
function fireTank(s,p,team){if(s.tick<p.cool)return;p.cool=s.tick+(team==='enemy'?Math.max(28,70-s.level):p.rapid>s.tick?7:14);const [dx,dy]=dirs[p.dir];s.bullets.push({x:p.x+dx*15,y:p.y+dy*15,dx:dx*5.8,dy:dy*5.8,team});}
function tankStep(s,actions){
 if(s.tick===1&&actions.includes('mode:coop'))s.coop=true;
 const players=s.players.slice(0,s.coop?2:1);
 players.forEach((p,i)=>{if(p.hp<=0)return;const prefix=i?'p2:':'',d=actions.find(a=>typeof a==='string'&&dirs[a.replace(prefix,'')]&&a.startsWith(prefix)&&(!i?!a.startsWith('p2:'):true));if(d)moveTank(s,p,d.replace(prefix,''),2.5);if(actions.includes(prefix+'fire'))fireTank(s,p,'player');});
 if(s.phase==='rest'){if(s.tick>=s.nextWave){s.level++;tankMap(s);}return;}
 const total=4+s.level;
 if(s.spawned<total&&s.tick>=s.nextSpawn&&s.enemies.length<6){const col=[50,180,310][s.spawned%3];if(!s.enemies.some(e=>Math.hypot(e.x-col,e.y-60)<30)){s.enemies.push({id:s.spawned,x:col,y:60,dir:'down',hp:1+Math.floor(s.level/6),cool:s.tick+45,turn:s.tick+30});s.spawned++;}s.nextSpawn=s.tick+Math.max(35,90-s.level*2);}
 for(const e of s.enemies){if(s.tick>=e.turn){e.dir=rand(s)<.55?'down':['left','right','up'][Math.floor(rand(s)*3)];e.turn=s.tick+25+Math.floor(rand(s)*40);}if(!moveTank(s,e,e.dir,.7+Math.min(.8,s.level*.045)))e.turn=0;fireTank(s,e,'enemy');}
 for(const b of s.bullets){for(let sub=0;sub<2&&!b.dead;sub++){b.x+=b.dx/2;b.y+=b.dy/2;if(b.x<20||b.x>340||b.y<42||b.y>426){b.dead=true;break;}const wall=s.walls.find(w=>b.x>=w.x-2&&b.x<=w.x+26&&b.y>=w.y-2&&b.y<=w.y+26);if(wall){if(wall.hp>0)wall.hp--;b.dead=true;continue;}
  if(b.team==='enemy'&&Math.abs(b.x-180)<17&&b.y>403){s.lives--;b.dead=true;s.effects.push({x:180,y:414,tick:s.tick});continue;}
  const targets=b.team==='enemy'?players:s.enemies;const p=targets.find(p=>p.hp>0&&Math.hypot(p.x-b.x,p.y-b.y)<13);if(p){b.dead=true;if(!(p.invincible>s.tick)){p.hp--;if(b.team==='enemy'){p.invincible=s.tick+65;if(p.hp>0){p.x=140+players.indexOf(p)*80;p.y=380;}}else if(p.hp<=0){s.score+=100+s.level*10;s.kills++;if(s.kills%4===0)s.pickups.push({x:p.x,y:p.y,kind:s.kills%8?'rapid':'heal',expires:s.tick+300});}s.effects.push({x:p.x,y:p.y,tick:s.tick});}}
 }}
 s.walls=s.walls.filter(w=>w.hp!==0);s.bullets=s.bullets.filter(b=>!b.dead).slice(-160);s.enemies=s.enemies.filter(e=>e.hp>0);s.effects=s.effects.filter(e=>s.tick-e.tick<15);
 for(const p of players.filter(p=>p.hp>0))for(const q of s.pickups)if(!q.used&&Math.hypot(p.x-q.x,p.y-q.y)<23){q.used=true;if(q.kind==='heal')p.hp=Math.min(3,p.hp+1);else p.rapid=s.tick+240;}
 s.pickups=s.pickups.filter(q=>!q.used&&q.expires>s.tick);
 if(s.lives<=0||players.every(p=>p.hp<=0)){s.lives=Math.max(0,s.lives);s.over=true;}
 else if(s.spawned>=total&&!s.enemies.length){s.score+=s.level*100;if(s.level>=20){s.over=s.won=true;}else{s.phase='rest';s.nextWave=s.tick+90;for(const p of players)p.hp=Math.min(3,p.hp+1);s.lives=Math.min(6,s.lives+1);}}
}
export function stepClassic(s,actions){
 if(s.game==='merge'){const dir=actions.find(a=>dirs[a]);if(dir)moveTiles(s,dir);}
 if(s.game==='snake'){
  for(const a of actions){if(!dirs[a]||s.turns.length>=2)continue;const d=s.turns.at(-1)||s.direction;if(a!==d&&dirs[a][0]+dirs[d][0]!==0||a!==d&&dirs[a][1]+dirs[d][1]!==0)s.turns.push(a);}
  if(s.tick>=s.nextMove){s.direction=s.turns.shift()||s.direction;const [dx,dy]=dirs[s.direction],head={x:s.snake[0].x+dx,y:s.snake[0].y+dy},grow=head.x===s.fruit.x&&head.y===s.fruit.y;
   if(head.x<0||head.x>=18||head.y<0||head.y>=18||s.snake.slice(0,grow?undefined:-1).some(p=>p.x===head.x&&p.y===head.y)){s.over=true;return;}
   s.previousSnake=s.snake.map(p=>({...p}));s.snake.unshift(head);if(grow){s.score+=100;s.level=1+Math.floor(s.score/500);s.event={tick:s.tick};spawnFruit(s);}else s.snake.pop();s.moveTick=s.tick;s.moveInterval=Math.max(3,9-Math.floor(s.score/600));s.nextMove=s.tick+s.moveInterval;
  }
 }
 if(s.game==='mines')for(const a of actions){if(s.over)break;if(typeof a!=='string')continue;const [kind,str]=a.split(':'),i=Number(str);if(!Number.isInteger(i)||i<0||i>=s.cells.length)continue;if(kind==='flag'&&!s.open[i])s.flags[i]=!s.flags[i];if(kind==='reveal'){if(s.open[i]&&s.cells[i]>0&&neighbours(s,i).filter(j=>s.flags[j]).length===s.cells[i]){for(const j of neighbours(s,i)){reveal(s,j);if(s.over)break;}}else reveal(s,i);}}
 if(s.game==='tanks')tankStep(s,actions);
}
export function validClassicAction(game,a){
 if(game==='mines')return typeof a==='string'&&/^(flag|reveal):(\d|[1-9]\d|10[0-7])$/.test(a);
 if(game==='tanks')return ['left','right','up','down','fire'].includes(a);
 return ['merge','snake'].includes(game)&&typeof a==='string'&&Object.hasOwn(dirs,a);
}
