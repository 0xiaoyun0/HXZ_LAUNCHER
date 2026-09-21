import {shapes,ghostRow} from '../../../server/shared/arcade-engine.mjs';
const COLORS=['','#75cbd4','#e5c573','#b3a0e2','#8bb2e2','#e9aa7d','#94cbaa','#dc969c'];
function box(c,x,y,w,h,r,fill){c.fillStyle=fill;c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.fill();}
function label(c,text,x,y,size=12,color='#a4b9b0',align='left'){c.fillStyle=color;c.font=`${size}px "Segoe UI","Microsoft YaHei",sans-serif`;c.textAlign=align;c.fillText(text,x,y);}
function tree(c,x,y,size,color){c.fillStyle=color;c.fillRect(x-size*.055,y-size*.1,size*.11,size*.35);for(let i=0;i<3;i++){const w=size*(.28+i*.13),top=y-size+i*size*.2;c.beginPath();c.moveTo(x,top);c.lineTo(x+w,top+size*.5);c.lineTo(x-w,top+size*.5);c.fill();}}
function block(c,x,y,size,color,ghost=false){if(ghost){c.strokeStyle=color+'70';c.lineWidth=1;c.strokeRect(x+2,y+2,size-4,size-4);return;}box(c,x+1,y+1,size-2,size-2,3,color);c.fillStyle='#ffffff35';c.fillRect(x+4,y+3,size-8,2);c.fillStyle='#00000019';c.fillRect(x+3,y+size-5,size-6,2);}
export function drawPiece(c,color,x,y,size=12){if(!color)return;const shape=shapes[color-1];for(let dy=0;dy<shape.length;dy++)for(let dx=0;dx<shape[dy].length;dx++)if(shape[dy][dx])block(c,x+dx*size,y+dy*size,size,COLORS[color]);}
export function createRenderer(canvas,id,{preview=false}={}){
 const c=canvas.getContext('2d',{alpha:false}),height=id==='runner'?260:480,dpr=Math.min(2,globalThis.devicePixelRatio||1);
 canvas.width=360*dpr;canvas.height=height*dpr;c.setTransform(dpr,0,0,dpr,0,0);
 const background=document.createElement('canvas');background.width=360*dpr;background.height=height*dpr;const b=background.getContext('2d');b.scale(dpr,dpr);
 const sky=b.createLinearGradient(0,0,0,height);sky.addColorStop(0,id==='blocks'?'#171b30':id==='runner'?'#1b3c40':'#242237');sky.addColorStop(1,id==='runner'?'#386b5d':'#111d25');b.fillStyle=sky;b.fillRect(0,0,360,height);
 if(id==='runner'){
  b.fillStyle='#e4e8b8';b.beginPath();b.arc(282,48,21,0,Math.PI*2);b.fill();b.fillStyle='#f1edcd16';b.beginPath();b.arc(282,48,37,0,Math.PI*2);b.fill();
  for(const [y,color] of [[140,'#355953'],[165,'#31554c']]){b.fillStyle=color;b.beginPath();b.moveTo(0,260);for(let x=0;x<=360;x+=30)b.lineTo(x,y+Math.sin(x*.018)*22+Math.cos(x*.03)*10);b.lineTo(360,260);b.fill();}
 } else {
  b.fillStyle='#ffffff14';for(let i=0;i<40;i++)b.fillRect((i*71+17)%360,(i*43+11)%height,1,1);
  if(id==='blocks'){box(b,20,10,242,460,8,'#0b141dc4');b.strokeStyle='#ffffff07';for(let x=0;x<=10;x++){b.beginPath();b.moveTo(21+x*24,12);b.lineTo(21+x*24,468);b.stroke();}for(let y=0;y<=20;y++){b.beginPath();b.moveTo(21,12+y*22.7);b.lineTo(261,12+y*22.7);b.stroke();}}
  else{b.strokeStyle='#ffffff08';for(let y=210;y<470;y+=30){b.beginPath();b.moveTo(0,y);b.lineTo(360,y);b.stroke();}for(let x=0;x<361;x+=40){b.beginPath();b.moveTo(180,205);b.lineTo(x,480);b.stroke();}}
 }
 let last=0,lastEvent=-1,particles=[],trail=[];
 const reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 return {
  draw(s,alpha=1,now=0){
   const dt=last?Math.min(40,now-last)/1000:0;last=now;c.setTransform(dpr,0,0,dpr,0,0);c.drawImage(background,0,0,360,height);
   const prev=s.renderPrevious||{},mix=(a,v)=>a==null?v:a+(v-a)*alpha;
   if(id==='runner'){
    const time=s.tick+alpha;
    for(const [speed,size,y,color] of [[.65,57,173,'#284d45'],[1.35,70,186,'#1c4138']])for(let i=0;i<9;i++)tree(c,((i*61-time*speed)%550+550)%550-65,y,size+(i%3)*9,color);
    c.fillStyle='#244238';c.fillRect(0,202,360,58);c.fillStyle='#83a475';c.fillRect(0,201,360,3);c.fillStyle='#152e2960';for(let i=0;i<12;i++)c.fillRect(((i*43-time*3)%520+520)%520-40,218+i%3*11,12+i%3*5,2);
    const speed=4+Math.min(4,s.tick/1800);
    for(const o of s.obstacles){const x=o.x+speed*(1-alpha),y=202-o.h;box(c,x,y,o.w,o.h,4,'#a78359');c.fillStyle='#d3b081';c.fillRect(x+3,y+3,o.w-6,3);c.strokeStyle='#674f3b';c.beginPath();c.moveTo(x+o.w*.65,y+10);c.lineTo(x+o.w*.5,y+o.h-3);c.stroke();c.fillStyle='#466f46';c.fillRect(x-2,y-4,o.w+4,6);}
    const y=172-mix(prev.y,s.y),stride=s.y?0:Math.sin(time*.8)*4;
    // Small explorer with scarf and a backpack; body retains the collision rectangle.
    c.fillStyle='#122a2540';c.beginPath();c.ellipse(58,205,14-s.y*.03,3,0,0,Math.PI*2);c.fill();
    box(c,42,y+11,9,17,3,'#987447');box(c,48,y+10,18,16,3,'#b6dca0');box(c,50,y,20,14,4,'#efd3a5');box(c,48,y-3,22,7,3,'#617f53');c.fillStyle='#203530';c.fillRect(63,y+5,3,3);c.fillStyle='#cf976c';c.fillRect(47,y+13,20,3);c.fillRect(38,y+15+Math.sin(time*.3),12,4);c.fillStyle='#243c32';c.fillRect(49,y+25,6,5+stride);c.fillRect(61,y+25,6,5-stride);
    if(s.y===0&&!s.over&&!reduce)for(let i=0;i<4;i++){c.fillStyle='#d4dfa3'+['40','30','20','10'][i];c.fillRect(36-i*9-(time*2%9),196-i%2*3,3,2);}
    label(c,'FOREST RUN',16,25,11,'#b7d1bb');label(c,Math.floor(s.tick/6)+' m',344,25,12,'#e3edcf','right');
   }
   if(id==='blocks'){
    const cell=(x,y,color,ghost=false)=>block(c,21+x*24,12+y*22.7,22.7,COLORS[color],ghost);
    for(let y=0;y<20;y++)for(let x=0;x<10;x++)if(s.board[y][x])cell(x,y,s.board[y][x]);
    if(!s.over){const ghost=ghostRow(s);for(let y=0;y<s.shape.length;y++)for(let x=0;x<s.shape[y].length;x++)if(s.shape[y][x]){cell(s.x+x,ghost+y,s.color,true);cell(s.x+x,s.y+y,s.color);}}
    label(c,'下一个',280,33,11);s.next.slice(0,3).forEach((color,i)=>drawPiece(c,color,278,48+i*55,14));
    label(c,'暂存 C',280,240,11);drawPiece(c,s.held,278,256,14);label(c,'等级',280,330,11);label(c,String(s.level).padStart(2,'0'),280,360,27,'#e7def4');label(c,'消除行',280,406,11);label(c,String(s.lines),280,434,22,'#e7def4');
    if(s.event&&s.tick-s.event.tick<16){c.globalAlpha=Math.max(0,1-(s.tick-s.event.tick)/16)*.5;c.fillStyle='#f0e5ff';for(const row of s.event.rows)c.fillRect(22,12+row*22.7,238,22);c.globalAlpha=1;label(c,s.event.text,140,206,22,'#fff','center');}
   }
   if(id==='breakout'){
    label(c,'SECTOR '+String(s.level).padStart(2,'0'),16,29,11,'#c4b4df');label(c,'● '.repeat(s.lives),344,29,13,'#e6b28d','right');
    for(const brick of s.bricks)if(brick.alive){const row=Math.round((brick.y-62)/24),colors=['#c4a6dc','#bdafd9','#8dbfce','#91c9b6','#d8c598'];box(c,brick.x,brick.y,31,17,3,colors[row]);c.fillStyle='#ffffff40';c.fillRect(brick.x+3,brick.y+2,25,2);if(brick.hp>1){c.strokeStyle='#ffffffb0';c.lineWidth=1;c.strokeRect(brick.x+4,brick.y+5,23,7);}}
    const x=mix(prev.ballX,s.ball.x),y=mix(prev.ballY,s.ball.y),px=mix(prev.paddle,s.paddle);
    if(!reduce&&dt&&(!trail.length||Math.abs(trail[trail.length-1].x-x)+Math.abs(trail[trail.length-1].y-y)>1)){trail.push({x,y});if(trail.length>10)trail.shift();}
    for(let i=0;i<trail.length;i++){c.globalAlpha=i/trail.length*.18;c.fillStyle='#fff0cb';c.beginPath();c.arc(trail[i].x,trail[i].y,2+i/trail.length*3,0,Math.PI*2);c.fill();}c.globalAlpha=1;
    const beam=c.createLinearGradient(px-40,0,px+40,0);beam.addColorStop(0,'#ccad82');beam.addColorStop(.5,'#fff0cc');beam.addColorStop(1,'#ccad82');box(c,px-40,432,80,9,4,beam);c.fillStyle='#fff7db';c.beginPath();c.arc(x,y,5.5,0,Math.PI*2);c.fill();
    if(s.serve)label(c,'准备 · '+Math.ceil(s.serve/30),180,316,16,'#efe3d6','center');
    else if(s.combo>1)label(c,s.combo+' 连击',180,280,18,'#e5ceb1','center');
    if(s.event&&s.event.tick!==lastEvent&&!reduce){lastEvent=s.event.tick;for(let i=0;i<8&&particles.length<40;i++)particles.push({x:s.event.x,y:s.event.y,vx:Math.cos(i*Math.PI/4)*45,vy:Math.sin(i*Math.PI/4)*45,life:.45});}
    for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=65*dt;c.globalAlpha=Math.max(0,p.life/.45);c.fillStyle='#f0d7b5';c.fillRect(p.x,p.y,2,2);}c.globalAlpha=1;particles=particles.filter(p=>p.life>0);
   }
   if(!preview){c.fillStyle='#ffffff08';c.fillRect(0,0,360,1);}
  },
  dispose(){particles=[];trail=[];background.width=background.height=1;}
 };
}
