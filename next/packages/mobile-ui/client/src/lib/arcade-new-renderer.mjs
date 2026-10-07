import {GARDEN_PATH,gardenRoad,TOWERS} from '../../../server/shared/arcade-new063.mjs';
const circle=(c,x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
function text(c,value,x,y,size=12,color='#314856'){c.fillStyle=color;c.font=`600 ${size}px "Segoe UI","Microsoft YaHei",sans-serif`;c.textAlign='left';c.fillText(value,x,y);}
function person(c,x,y,face,tick,color='#80c7ae',prone=false){
 c.save();c.translate(x,y);c.scale(face,1);if(prone){rect(c,-8,-6,17,5,color);circle(c,7,-7,4,'#ffdbb5');rect(c,8,-5,10,2,'#36576a');}
 else{const gait=Math.sin(tick*.4)*2;rect(c,-5,-8,4,8+gait,'#345269');rect(c,2,-8,4,8-gait,'#345269');rect(c,-7,-21,4,11,'#cbb07d');rect(c,-5,-17,11,11,color);circle(c,1,-22,6,'#ffe0bf');rect(c,-5,-28,12,4,'#547787');rect(c,4,-23,2,2,'#2c4450');rect(c,-4,-17,12,3,'#f4b6ad');rect(c,6,-14,12,3,'#3b596a');}
 c.restore();
}
export function drawNew(c,s){
 if(s.game==='contra'){
  const a=s.contra,p=a.player,cam=a.camX;c.save();c.scale(360/256,360/256);
  const sky=c.createLinearGradient(0,0,0,240);sky.addColorStop(0,['#8dcfd8','#89bfce','#9baeca'][a.game.stage]);sky.addColorStop(1,'#e3ecd1');rect(c,0,0,256,240,sky);circle(c,203-cam*.008,39,18,'#fff5d2');
  for(let i=0;i<10;i++){const x=((i*47-cam*.14)%360+360)%360-50;circle(c,x,88+Math.sin(i)*9,43,'#8bb7a4');circle(c,x+25,135,37,'#6fa693');rect(c,x+11,140,6,100,'#74a291');}
  const t=a.game.t;
  for(let x=Math.max(0,Math.floor(cam/16));x<Math.min(a.MAPW,Math.ceil((cam+256)/16)+1);x++)for(let y=0;y<15;y++){
   const tile=a.map[x]?.[y],px=x*16-cam,py=y*16;if(tile==='.')continue;
   if(tile==='W'){rect(c,px,py,16,16,'#63b7be');rect(c,px+(t*.12%12),py+3,4,1,'#c1eeec');}
   else if(tile==='P'||tile==='B'){rect(c,px,py,16,5,tile==='B'?'#ab9277':'#6b9c87');rect(c,px,py,16,2,'#bdd8ac');}
   else{rect(c,px,py,16,16,tile==='S'?'#7b949a':'#719482');rect(c,px+2,py+5,7,3,'#5e8878');if(tile==='G'){rect(c,px,py,16,4,'#b9dbaa');circle(c,px+4,py,3,'#a4ce99');}}
  }
  for(const e of a.enemies){if(e.dead||e.x-cam<-30||e.x-cam>280)continue;const x=e.x-cam;if(e.type==='capsule'){circle(c,x,e.y,7,'#ffe2a4');text(c,e.letter||'M',x-4,e.y+3,9);}
   else if(e.type==='turret'){circle(c,x,e.y-7,8,'#658b93');rect(c,x-10,e.y-4,20,5,'#4b6c76');rect(c,x-2,e.y-14,16,4,'#becfa9');}
   else person(c,x,e.y,e.face||-1,t,'#d7a9a3');}
  const boss=a.boss;if(boss?.active&&!boss.core?.dead){const x=boss.x-cam;rect(c,x-16,107,42,51,'#66808d');rect(c,x-11,114,32,7,'#b7d9c9');circle(c,x+4,137,12,'#91b9b1');circle(c,x+4,137,7,'#efb4aa');}
  for(const q of a.pickups)if(!q.dead){circle(c,q.x-cam,q.y,6,'#fbdb93');text(c,q.letter,q.x-cam-3,q.y+3,8);}
  for(const q of a.bullets){circle(c,q.x-cam,q.y,q.kind==='L'?2:1.8,'#fff2a1');}
  for(const q of a.ebullets)circle(c,q.x-cam,q.y,2.3,'#df8797');
  for(const q of a.parts){c.globalAlpha=Math.max(0,1-q.t/q.life);circle(c,q.x-cam,q.y,q.spark?1:2,q.bubble?'#cff5ec':'#ffe0a6');}c.globalAlpha=1;
  if(p&&!p.dead){c.globalAlpha=p.invuln>0&&Math.floor(t/4)%2?.55:1;person(c,p.x-cam,p.y,p.face,p.onGround?t:0,'#87cbb7',p.prone);c.globalAlpha=1;}
  text(c,['青苍密林','潮汐三角洲','铁幕穹顶'][a.game.stage],10,17,10);text(c,'装备 '+(p.weapon==='rifle'?'步枪':p.weapon),10,32,8);c.restore();return;
 }
 if(s.game!=='garden')return;
 const left=19,top=38,cell=46;rect(c,0,0,360,480,'#e9f0df');
 text(c,'灯塔花园',20,24,13);text(c,s.wave?'守卫中':'准备下一波',240,24,11);
 for(let i=0;i<63;i++){const x=left+i%7*cell,y=top+Math.floor(i/7)*cell,road=gardenRoad(i);rect(c,x+1,y+1,44,44,road?'#dcd4b7':(i%2?'#d4e3c5':'#dce8cf'));if(!road){circle(c,x+9,y+13,2,'#b4cfa6');circle(c,x+33,y+35,1.5,'#b4cfa6');}}
 c.strokeStyle='#c6bca0';c.lineWidth=2;c.setLineDash([2,6]);c.beginPath();GARDEN_PATH.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](left+(x+.5)*cell,top+(y+.5)*cell));c.stroke();c.setLineDash([]);
 const ex=left+cell*.5,ey=top+7.5*cell;rect(c,ex-10,ey-14,20,30,'#f3ede0');rect(c,ex-14,ey-15,28,5,'#789aad');circle(c,ex,ey-20,8,'#f3d98c');rect(c,ex-3,ey,6,9,'#8ba4b0');
 for(const tower of s.towers){const x=left+(tower.cell%7+.5)*cell,y=top+(Math.floor(tower.cell/7)+.5)*cell,color=tower.type==='frost'?'#8cbcc9':tower.type==='cannon'?'#be8eab':'#91b880';circle(c,x,y+8,17,'#6d92782b');circle(c,x,y,17,'#f2f3de');c.save();c.translate(x,y);c.rotate((tower.aim||0)+Math.PI/2);rect(c,-4,-22,8,20,color);circle(c,0,0,12,color);circle(c,-3,-4,4,'#ffffff70');c.restore();text(c,String(tower.level),x+9,y+17,9);}
 for(const e of s.enemies){const x=left+(e.x+.5)*cell,y=top+(e.y+.5)*cell,bob=Math.sin((s.tick+e.id)*.25)*2,r=e.heavy?16:11;circle(c,x,y+8,r,'#59746f22');circle(c,x,y+bob,r,e.slow>s.tick?'#a5cbd8':e.heavy?'#bca2c7':'#cdaea0');circle(c,x-4,y-2+bob,1.7,'#45515f');circle(c,x+4,y-2+bob,1.7,'#45515f');rect(c,x-r,y-r-7,r*2,3,'#a5b7a8');rect(c,x-r,y-r-7,r*2*Math.max(0,e.hp/e.max),3,'#698e79');}
 for(const e of s.effects){const age=(s.tick-e.tick)/12;c.globalAlpha=1-age;c.strokeStyle=e.type==='frost'?'#8dd7eb':e.type==='cannon'?'#d7a9c3':'#f8db91';c.lineWidth=e.type==='cannon'?5:3;c.beginPath();c.moveTo(left+(e.x+.5)*cell,top+(e.y+.5)*cell);c.lineTo(left+(e.tx+.5)*cell,top+(e.ty+.5)*cell);c.stroke();circle(c,left+(e.tx+.5)*cell,top+(e.ty+.5)*cell,3+age*10,c.strokeStyle);}c.globalAlpha=1;
 text(c,'金币 '+s.coins,20,469,12);text(c,'守护值 '+s.lives,234,469,12);
}
