const TAU=Math.PI*2;
const ink=['#eeafd7','#b9b5ff','#90e7d9','#ffd89f'];
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function text(c,t,x,y,size=12,color='#d5e7ed',align='left'){c.font=`${size}px "Segoe UI","Microsoft YaHei",sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(t,x,y);}
function jet(c,x,y,size,color,enemy=false){
 c.save();c.translate(x,y);if(enemy)c.rotate(Math.PI);c.scale(size,size);
 c.fillStyle='#08172280';c.beginPath();c.moveTo(0,-17);c.lineTo(19,13);c.lineTo(0,6);c.lineTo(-19,13);c.fill();
 c.fillStyle=color;c.beginPath();c.moveTo(0,-20);c.lineTo(5,-3);c.lineTo(21,11);c.lineTo(6,8);c.lineTo(4,17);c.lineTo(-4,17);c.lineTo(-6,8);c.lineTo(-21,11);c.lineTo(-5,-3);c.closePath();c.fill();
 c.fillStyle='#f0faff';c.beginPath();c.moveTo(0,-13);c.lineTo(3,2);c.lineTo(-3,2);c.fill();c.fillStyle='#567c92';c.fillRect(-2,4,4,9);c.restore();
}
function maze(c,s,alpha,reduce){
 const cell=18,left=9,top=42;
 c.fillStyle='#101c29';c.fillRect(left,top,342,414);
 for(let y=0;y<23;y++)for(let x=0;x<19;x++){
  const i=y*19+x,px=left+x*cell,py=top+y*cell;
  if(s.cells[i]){c.fillStyle='#244152';c.fillRect(px+1,py+1,16,16);c.fillStyle='#467181';c.fillRect(px+2,py+2,14,2);c.fillStyle='#142d3a';c.fillRect(px+2,py+14,14,2);}
  else if(s.pellets[i]){if(s.pellets[i]===2){circle(c,px+9,py+9,7,'#a7d5e322');circle(c,px+9,py+9,4+(reduce?0:Math.sin(s.tick*.14)),'#a5e9e1');}else circle(c,px+9,py+9,1.7,'#e5d9a6');}
 }
 const mouth=reduce?.25:.18+Math.abs(Math.sin((s.tick+alpha)*.4))*.5,angle=[-Math.PI/2,0,Math.PI/2,Math.PI][s.dir];
 if(s.invincible<=s.tick||s.tick%8<5){c.fillStyle='#f4d884';c.beginPath();c.moveTo(left+s.x*cell+9,top+s.y*cell+9);c.arc(left+s.x*cell+9,top+s.y*cell+9,7,angle+mouth,angle+TAU-mouth);c.closePath();c.fill();}
 s.ghosts.forEach((g,i)=>{const x=left+g.x*cell+9,y=top+g.y*cell+9,scared=s.powerUntil>s.tick;c.globalAlpha=g.rest?.45:1;c.fillStyle=scared?'#7ca7d6':ink[i%4];c.beginPath();c.arc(x,y-1,7,Math.PI,0);c.lineTo(x+7,y+7);for(let k=0;k<4;k++)c.lineTo(x+7-k*4.6,y+(k%2?7:4));c.lineTo(x-7,y-1);c.fill();circle(c,x-2.6,y-1,2.2,'#fff');circle(c,x+2.6,y-1,2.2,'#fff');circle(c,x-2.3,y-1,1,'#172b3c');circle(c,x+2.9,y-1,1,'#172b3c');c.globalAlpha=1;});
 text(c,'月光迷宫 · '+String(s.level).padStart(2,'0')+'/100',12,25);text(c,'◆ '+s.remaining,347,25,12,'#e9d291','right');
 text(c,'● '.repeat(s.lives),12,474,12,'#efc8a0');if(s.powerUntil>s.tick)text(c,'光核 '+Math.ceil((s.powerUntil-s.tick)/30)+'s',345,474,11,'#a4e2d9','right');
}
export function drawExpanded(c,s,alpha,reduce){
 if(s.game==='maze'){maze(c,s,alpha,reduce);return;}
 const t=s.tick+(reduce?0:alpha),prev=s.renderPrevious||{},x=prev.playerX==null?s.x:prev.playerX+(s.x-prev.playerX)*alpha,y=prev.playerY==null?s.y:prev.playerY+(s.y-prev.playerY)*alpha;
 for(let i=0;i<34;i++){const sy=(i*67+t*(s.game==='fighter'?1.3:.2))%500;c.fillStyle=i%3?'#bbdeef40':'#f5dcad80';c.fillRect((i*97+17)%360,sy,1,s.game==='fighter'?4:1);}
 if(s.game==='danmaku'){
  const cx=180+Math.sin(s.tick/120)*105,cy=92;c.save();c.translate(cx,cy);c.rotate(reduce?0:t*.009);
  for(let i=0;i<8;i++){c.rotate(TAU/8);c.fillStyle=i%2?'#d7bcf04a':'#abd8e850';c.beginPath();c.ellipse(0,19,9,27,0,0,TAU);c.fill();}circle(c,0,0,11,'#f3d8ee');circle(c,0,0,6,'#8867ae');c.restore();
  text(c,'星庭流萤 · 第 '+s.level+' 幕',15,25);text(c,'ENDLESS',345,25,10,'#bea5d6','right');
 }else{
  for(const e of s.enemies){jet(c,e.x,e.y,e.heavy?1.2:.75,e.heavy?'#dca2bd':'#9ea9d8',true);if(e.hp<e.max){c.fillStyle='#192739';c.fillRect(e.x-17,e.y-29,34,3);c.fillStyle='#f0bdcb';c.fillRect(e.x-17,e.y-29,34*e.hp/e.max,3);}}
  c.fillStyle='#b5f3f5';for(const b of s.shots)c.fillRect(b.x-1.5,b.y-7,3,12);
  for(const d of s.drops){circle(c,d.x,d.y,10,'#8ed8cc33');c.strokeStyle='#8ed8cc';c.strokeRect(d.x-7,d.y-7,14,14);text(c,d.kind==='shield'?'◇':'✦',d.x,d.y+4,12,'#bcf3d7','center');}
  text(c,'苍穹航线 · '+String(s.level).padStart(2,'0')+'/100',15,25);text(c,'火力 '+s.power,345,25,11,'#b4e5ed','right');
 }
 for(const b of s.bullets){const bx=b.x-b.vx*(1-alpha),by=b.y-b.vy*(1-alpha);circle(c,bx,by,b.r+2,ink[b.color]+'30');circle(c,bx,by,b.r,ink[b.color]);circle(c,bx-1,by-1,Math.max(1,b.r*.4),'#fff5f8');}
 if(s.invincible<=s.tick||s.tick%8<5){
  if(s.game==='fighter'){if(!reduce){c.fillStyle='#9de8f099';c.beginPath();c.moveTo(x-3,y+17);c.lineTo(x,y+27+Math.sin(t)*4);c.lineTo(x+3,y+17);c.fill();}jet(c,x,y,.85,'#c5ebee');}
  else{c.save();c.translate(x,y);c.rotate(Math.PI/4);c.fillStyle='#d6eaf4';c.fillRect(-6,-6,12,12);c.fillStyle='#ac95d8';c.fillRect(-3,-3,6,6);c.restore();}
  circle(c,x,y,2.5,'#ffffff');if(s.shield){c.strokeStyle='#97e2d5';c.lineWidth=1;c.beginPath();c.arc(x,y,23,0,TAU);c.stroke();}
 }
 text(c,'● '.repeat(s.lives),15,469,13,'#edc3bd');if(s.shield)text(c,'护盾 '+s.shield,345,469,11,'#a6e9d5','right');
 if(s.event?.kind==='explosion'&&s.tick-s.event.tick<15&&!reduce){const age=s.tick-s.event.tick;c.strokeStyle='#f9d1a0';c.globalAlpha=1-age/15;c.beginPath();c.arc(s.event.x,s.event.y,8+age*2,0,TAU);c.stroke();c.globalAlpha=1;}
}
