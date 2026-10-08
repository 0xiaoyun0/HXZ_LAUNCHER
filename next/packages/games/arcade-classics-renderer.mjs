const text=(c,t,x,y,size=14,color='#e7eef8',align='left')=>{c.font=`600 ${size}px "Segoe UI","Microsoft YaHei",sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(t,x,y);};
const box=(c,x,y,w,h,r,color)=>{c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
const dot=(c,x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
function ground(c,top,bottom){const g=c.createLinearGradient(0,0,0,480);g.addColorStop(0,top);g.addColorStop(1,bottom);c.fillStyle=g;c.fillRect(0,0,360,480);}
const tankViews=new WeakMap();
export function drawClassic(c,s,alpha=1,reduce=false){
 if(s.game==='merge'){
  ground(c,'#f3f0fa','#e5eaf7');text(c,'云朵 2048',22,35,17,'#555477');text(c,s.achieved?'已达成 2048 · 继续合成':'每一次相遇，都离目标更近',22,60,12,'#81809b');
  box(c,16,80,328,328,20,'#d4d9e9');const colors=['#eef2fc','#e6e4fa','#d5d5f4','#c8c5ee','#b5bce8','#9caee0','#8f9edb','#a38ad3','#b284c7','#cc8eaa','#dea587','#dfbc79','#c8c478'];
  const cell=(n,i,x,y)=>{const p=Math.min(colors.length-1,Math.max(0,Math.log2(n)-1));box(c,x,y,72,72,13,n?colors[p]:'#e2e6f1');if(n)text(c,String(n),x+36,y+45,n>=16384?19:n>=1024?24:31,n<=16?'#535779':'#fff','center');};
  const moving=!reduce&&s.event&&s.tick-s.event.tick<4,ends=new Set(moving?s.event.motion.map(m=>m.to):[]);for(let i=0;i<16;i++)cell(ends.has(i)?0:s.cells[i],i,24+i%4*80,88+Math.floor(i/4)*80);
  if(!reduce&&s.event&&s.tick-s.event.tick<4){const t=Math.min(1,(s.tick-s.event.tick+alpha)/4);for(const m of s.event.motion)if(m.from!==m.to){const x=24+(m.from%4+(m.to%4-m.from%4)*t)*80,y=88+(Math.floor(m.from/4)+(Math.floor(m.to/4)-Math.floor(m.from/4))*t)*80;cell(m.value,m.to,x,y);}}
  text(c,'移动 '+s.moves+' 次',24,442,13,'#717b98');text(c,'最高 '+Math.max(...s.cells),336,442,13,'#717b98','right');text(c,'方向键 · 滑动 · 屏幕方向按钮',180,466,11,'#868da4','center');return;
 }
 if(s.game==='snake'){
  ground(c,'#edf5e7','#dbe9dd');text(c,'青柠果园',20,33,17,'#425e4c');text(c,'长度 '+s.snake.length,340,33,13,'#637f68','right');
  box(c,12,58,336,336,14,'#94b39b');for(let y=0;y<18;y++)for(let x=0;x<18;x++)box(c,18+x*18,64+y*18,18,18,0,(x+y)%2?'#d9e7cc':'#dfebd5');
  const f=s.fruit;dot(c,27+f.x*18,73+f.y*18,6.7,'#db9578');dot(c,25+f.x*18,70+f.y*18,2,'#f5caaa');box(c,26+f.x*18,64+f.y*18,3,5,1,'#607b4d');
  const t=reduce?1:Math.min(1,(s.tick-(s.moveTick||0)+alpha)/(s.moveInterval||9));
  for(let i=s.snake.length-1;i>=0;i--){const p=s.snake[i],old=s.previousSnake?.[i]||p,x=27+(old.x+(p.x-old.x)*t)*18,y=73+(old.y+(p.y-old.y)*t)*18;box(c,x-8,y-8,16,16,i?5:6,i?'#7caa71':'#497a5a');if(!i){const eyes=s.direction==='left'?[[-3,-3],[-3,3]]:s.direction==='right'?[[3,-3],[3,3]]:s.direction==='up'?[[-3,-3],[3,-3]]:[[-3,3],[3,3]];for(const [ex,ey]of eyes)dot(c,x+ex,y+ey,1.6,'#f1f5e9');}}
  text(c,'第 '+s.level+' 档速度',20,426,14,'#4f6d55');text(c,'收集 '+s.score/100+' 颗果实',340,426,13,'#637f68','right');text(c,'避开边界与身体 · 不可直接掉头',180,454,12,'#71816c','center');return;
 }
 if(s.game==='mines'){
  ground(c,'#eef1f8','#e0e7f2');text(c,'星野扫雷',22,31,17,'#4c627a');text(c,'剩余 '+(s.mineCount-s.flags.filter(Boolean).length),338,31,13,'#73849c','right');
  box(c,16,48,328,388,14,'#c6d2e1');const palette=['','#5875b6','#55927c','#c5837c','#8874aa','#af8864','#579baa','#666680','#3c5870'];
  for(let i=0;i<s.cells.length;i++){const x=22+i%9*35.2,y=54+Math.floor(i/9)*31.4,n=s.cells[i],open=s.open[i],mine=n===-1&&s.over;
   box(c,x,y,33,29.2,5,open?'#ecf1f8':i===s.exploded?'#e1a19b':mine?'#d1b5b3':'#9baec8');if(!open&&!mine){box(c,x+2,y+1,29,3,1,'#bdcbdc');}
   if(mine){dot(c,x+16.5,y+14,6,'#576679');for(let a=0;a<4;a++){c.strokeStyle='#576679';c.lineWidth=2;c.beginPath();const angle=a*Math.PI/4;c.moveTo(x+16.5-Math.cos(angle)*9,y+14-Math.sin(angle)*9);c.lineTo(x+16.5+Math.cos(angle)*9,y+14+Math.sin(angle)*9);c.stroke();}}
   else if(s.flags[i]){c.strokeStyle='#536d87';c.lineWidth=2;c.beginPath();c.moveTo(x+12,y+6);c.lineTo(x+12,y+24);c.stroke();c.fillStyle='#e8b478';c.beginPath();c.moveTo(x+13,y+6);c.lineTo(x+25,y+11);c.lineTo(x+13,y+16);c.fill();}
   else if(open&&n>0)text(c,n,x+16.5,y+21,17,palette[n],'center');
   if(s.cursor===i){c.strokeStyle='#f9f4c9';c.lineWidth=2;c.strokeRect(x+1,y+1,31,27);}
  }
  text(c,s.ready?'已点亮 '+s.revealed+' / 88':'首步安全 · 共 20 颗星雷',180,458,12,'#73849c','center');return;
 }
 if(s.game!=='tanks')return;
 ground(c,'#eaf0e7','#d7e3d8');text(c,'星灯防线',24,28,16,'#526c66');text(c,'WAVE '+String(s.level).padStart(2,'0')+' / 20',336,28,12,'#71867e','right');
 box(c,18,43,324,389,15,'#9fb5aa');for(let row=0;row<14;row++)for(let col=0;col<12;col++)box(c,24+col*26,50+row*26,26,26,0,(row+col)%2?'#d2decf':'#cbd8c9');
 for(const w of s.walls){box(c,w.x,w.y,24,24,3,w.hp<0?'#829ba5':'#c49f87');box(c,w.x+2,w.y+2,20,3,1,w.hp<0?'#adbec4':'#e1c6ae');c.strokeStyle=w.hp<0?'#667f8a':'#9e7866';c.lineWidth=1;c.strokeRect(w.x+4,w.y+8,16,12);if(w.hp===1){c.beginPath();c.moveTo(w.x+12,w.y);c.lineTo(w.x+8,w.y+11);c.lineTo(w.x+15,w.y+20);c.stroke();}}
 box(c,162,403,36,24,5,'#637f89');dot(c,180,406,10,s.lives?'#ffe6a3':'#8a8e83');text(c,'★',180,411,15,'#b99a60','center');
 let v=tankViews.get(c);const now=performance.now();if(!v||s.tick<v.tick){v={points:new Map(),time:now,tick:s.tick};tankViews.set(c,v);}const dt=Math.min(.1,(now-v.time)/1000);v.time=now;v.tick=s.tick;
 function tank(p,color,isPlayer,key){if(p.hp<=0)return;const last=v.points.get(key);if(last&&Math.hypot(last.x-p.x,last.y-p.y)<60&&!reduce){const t=1-Math.exp(-35*dt);p={...p,x:last.x+(p.x-last.x)*t,y:last.y+(p.y-last.y)*t};}v.points.set(key,{x:p.x,y:p.y});c.save();c.translate(p.x,p.y);c.rotate(({up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2})[p.dir]);box(c,-12,-12,6,25,3,'#4e686d');box(c,6,-12,6,25,3,'#4e686d');for(let y=-9;y<12;y+=6){box(c,-11,y,4,2,0,'#869998');box(c,7,y,4,2,0,'#869998');}box(c,-8,-11,16,23,4,color);box(c,-3,-21,6,18,2,'#4f747a');dot(c,0,0,7,color);dot(c,-2,-2,3,'#ffffff55');c.restore();if(isPlayer){for(let n=0;n<3;n++)dot(c,p.x-7+n*7,p.y+18,2,n<p.hp?'#4e8d75':'#a6b8aa');if(p.invincible>s.tick){c.strokeStyle='#74bddd99';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,18,0,Math.PI*2);c.stroke();}}}
 for(const q of s.pickups){dot(c,q.x,q.y,10,q.kind==='heal'?'#eda7a0':'#edd590');text(c,q.kind==='heal'?'+':'»',q.x,q.y+5,16,'#6d7468','center');}
 for(const [i,p] of s.enemies.entries())tank(p,'#c69198',false,'enemy:'+s.level+':'+(p.id??i));s.players.slice(0,s.coop?2:1).forEach((p,i)=>tank(p,i?'#91aad9':'#85b9a3',true,'player:'+i));if(v.points.size>40)for(const k of v.points.keys())if(k.startsWith('enemy:')&&!k.startsWith('enemy:'+s.level+':'))v.points.delete(k);
 for(const b of s.bullets){dot(c,b.x,b.y,4,b.team==='enemy'?'#b45c6f':'#f8eac6');dot(c,b.x,b.y,1.5,'#fff4d5');}
 for(const e of s.effects){const age=(s.tick-e.tick+alpha)/15;c.globalAlpha=1-age;dot(c,e.x,e.y,5+age*18,'#f4d8a1');c.globalAlpha=1;}
 text(c,'基地 '+s.lives+' / 6',24,454,13,'#557168');text(c,'击退 '+s.kills,336,454,13,'#557168','right');
 if(s.phase==='rest'){box(c,70,186,220,86,14,'#f2f5e8ed');text(c,'防线守住了',180,222,20,'#56746a','center');text(c,'下一波即将到来 · 已补给',180,249,12,'#7d8d7f','center');}
}
