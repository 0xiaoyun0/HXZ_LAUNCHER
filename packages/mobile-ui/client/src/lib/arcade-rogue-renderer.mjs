import {CARDS} from '../../../server/shared/arcade-rogue.mjs';
const text=(c,t,x,y,size=12,color='#dce9ff',align='left')=>{c.fillStyle=color;c.font=`${size}px "Segoe UI","Microsoft YaHei",sans-serif`;c.textAlign=align;c.fillText(t,x,y);};
function panel(c,x,y,w,h,fill,r=10){c.fillStyle=fill;c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h);c.fill();}
function disc(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function star(c,x,y,r,color,angle=0){c.fillStyle=color;c.beginPath();for(let i=0;i<8;i++){const a=angle+i*Math.PI/4,n=i%2?r*.35:r;c.lineTo(x+Math.cos(a)*n,y+Math.sin(a)*n);}c.closePath();c.fill();}
function avatar(c,x,y,color,enemy=false,boss=false,phase=0){const r=boss?22:enemy?11:12;c.save();c.translate(x,y);c.scale(1+Math.sin(phase)*.04,1-Math.sin(phase)*.025);disc(c,0,r*.8,r*.9,'#09172e55');if(enemy){disc(c,0,0,r,color);c.fillStyle=color;c.beginPath();c.moveTo(-r,-2);c.lineTo(-r-3,-r-6);c.lineTo(0,-r+1);c.lineTo(r+3,-r-6);c.lineTo(r,-2);c.fill();disc(c,-r*.3,-1,2,'#f6edff');disc(c,r*.3,-1,2,'#f6edff');if(boss)star(c,0,-r-8,7,'#ead89e');}else{panel(c,-9,2,18,17,'#a8b9f6',5);disc(c,0,-7,11,'#e7ddff');disc(c,0,-4,8,'#ffebdc');c.fillStyle='#b6baf3';c.beginPath();c.moveTo(-12,-6);c.lineTo(-8,-18);c.lineTo(6,-17);c.lineTo(13,-4);c.lineTo(2,-10);c.lineTo(-4,-7);c.fill();disc(c,-3,-3,1.3,'#345e82');disc(c,4,-3,1.3,'#345e82');star(c,9,-13,4,'#a1e6e0');}c.restore();}
function bar(c,x,y,w,value,max,color){panel(c,x,y,w,5,'#ffffff18',2);panel(c,x,y,w*Math.max(0,Math.min(1,value/max)),5,color,2);}
function sky(c,h){const g=c.createLinearGradient(0,0,360,h);g.addColorStop(0,'#142741');g.addColorStop(1,'#263854');c.fillStyle=g;c.fillRect(0,0,360,h);for(let i=0;i<32;i++)star(c,(i*73+22)%360,(i*97+29)%h,i%5?1:2,'#99bada60');}
export function drawRogue(c,s,alpha=1,reduce=false){
 if(s.game==='deck'){drawDeck(c,s,reduce);return;}sky(c,480);const phase=reduce?0:s.age*.16;
 if(s.game==='dungeon'){
  for(let i=0;i<99;i++){const x=18+i%9*36,y=50+Math.floor(i/9)*36;panel(c,x+1,y+1,34,34,s.walls.includes(i)?'#607398':'#2e455f',3);if(s.walls.includes(i)){c.fillStyle='#91a2be55';c.fillRect(x+3,y+3,30,3);}else if(i%4===0){c.strokeStyle='#638aa125';c.strokeRect(x+8,y+8,18,18);}}
  panel(c,163,52,34,25,s.enemies.length?'#51607c':'#98e3cf',4);star(c,180,64,8,s.enemies.length?'#aebbd3':'#fffce1');
  for(const chest of s.chests){panel(c,chest.x-10,chest.y-7,20,15,chest.open?'#56677e':'#c9b181',3);if(!chest.open)star(c,chest.x,chest.y,4,'#fff0be');}
  text(c,s.enemies.length?'击败守卫，点亮出口':'出口已点亮 · 向上前进',180,471,12,s.enemies.length?'#b2c8df':'#bcefe0','center');
 }else{
  c.strokeStyle='#799cc519';for(let y=50;y<480;y+=32){c.beginPath();c.moveTo(0,y+(s.age*.12%32));c.lineTo(360,y+(s.age*.12%32));c.stroke();}
  for(let i=0;i<6;i++){const x=(i*81+23)%340,y=(i*147+90)%420;disc(c,x,y,14,'#6ab9c01b');star(c,x,y,5,'#8bc7c435');}
 }
 if(s.orbit){c.strokeStyle='#bbaeee66';c.lineWidth=2;c.beginPath();c.arc(s.x,s.y,44+s.orbit*5,0,Math.PI*2);c.stroke();for(let i=0;i<s.orbit+1;i++){const angle=(reduce?0:s.age*.055)+i*Math.PI*2/(s.orbit+1);star(c,s.x+Math.cos(angle)*(44+s.orbit*5),s.y+Math.sin(angle)*(44+s.orbit*5),5,'#cabafa');}}
 for(const e of s.enemies){avatar(c,e.x,e.y,e.hit?'#fff2dc':e.boss?'#b6a4e9':e.kind===1?'#cfadc9':e.kind===2?'#a8b9d9':'#86c7c3',true,e.boss,phase+e.id);if(e.hp<e.max||e.boss)bar(c,e.x-(e.boss?22:12),e.y-(e.boss?34:20),e.boss?44:24,e.hp,e.max,'#ecb2c6');}
 for(const b of s.shots){star(c,b.x,b.y,b.enemy?4:5,b.enemy?'#efaac5':'#c8f4ff',s.age*.05);}
 if(!s.invincible||reduce||s.age%6<3)avatar(c,s.x,s.y,'',false,false,phase);
 for(const e of s.effects){c.globalAlpha=e.age/18;c.strokeStyle=e.type==='nova'?'#a1e6e0':'#cdd5ff';c.lineWidth=e.type==='slash'?6:2;c.beginPath();if(e.type==='slash')c.arc(e.x,e.y,e.radius||50,(e.angle||0)-1.1,(e.angle||0)+1.1);else c.arc(e.x,e.y,(e.radius||24)*(1-e.age/30),0,Math.PI*2);c.stroke();c.globalAlpha=1;}
 panel(c,10,9,340,27,'#112239e8',8);text(c,'生命 '+s.hp+' / '+s.maxHp,20,27,12,'#c6e9de');text(c,s.skill>0?'技能 '+Math.ceil(s.skill/30)+'s':'技能就绪',338,27,12,'#dddcff','right');
 if(s.game==='swarm'){bar(c,13,457,334,s.xp,s.nextXp,'#b4c5f0');text(c,'Lv.'+s.level+' · 击败 '+s.kills,180,448,12,'#dce9ff','center');}
}
function drawDeck(c,s,reduce){sky(c,260);panel(c,12,10,336,29,'#314766',8);text(c,'第 '+s.level+' 场 · 回合 '+s.turn,24,30,13);text(c,'牌组 '+s.deck.length+' 张',336,30,12,'#b7c9e1','right');
 const alive=s.enemies||[];for(let i=0;i<alive.length;i++){const e=alive[i],x=180+(i-(alive.length-1)/2)*102;panel(c,x-43,49,86,111,s.target===i?'#53618b':'#31425f',10);if(!e.hp){text(c,'已击败',x,101,14,'#8499b4','center');continue;}
  avatar(c,x,98,e.boss?'#b6a4e9':'#a1cbd4',true,e.boss,reduce?0:s.tick*.045);text(c,e.name,x,142,11,'#e1e7fc','center');bar(c,x-33,148,66,e.hp,e.max,'#d5a8ca');text(c,(e.intent==='attack'?'攻击 ':'格挡 ')+e.amount,x,68,12,e.intent==='attack'?'#f4c1c1':'#c4eee9','center');if(e.poison)text(c,'毒 '+e.poison,x,83,10,'#bae5b8','center');}
 avatar(c,51,206,'',false);text(c,'生命 '+s.hp+' / '+s.maxHp,78,199,14,'#c8ebdd');text(c,'格挡 '+s.block+' · 能量 '+s.energy+' / '+s.maxEnergy,78,220,13,'#ced9f6');text(c,s.log?.at(-1)||'选择旅札，书写新的路线',180,248,11,'#a9bed9','center');
}
export function mountDeckControls(root,api){
 root.classList.add('rogue-deck-controls');let signature='';
 const draw=()=>{const s=api.game.value;if(!s||s.game!=='deck')return;const next=JSON.stringify([s.hand,s.energy,s.enemies,s.target,s.draw.length,s.discard.length,s.choices,s.over,api.paused.value,api.countdown.value]);if(signature===next)return;signature=next;root.replaceChildren();const locked=s.over||s.choices.length||api.paused.value||api.countdown.value;
  const targets=document.createElement('div');targets.className='deck-targets';for(const [i,e] of s.enemies.entries()){const b=document.createElement('button');b.textContent=e.name+' '+e.hp+'/'+e.max;b.disabled=!!locked||e.hp<=0;b.setAttribute('aria-pressed',String(s.target===i));b.onclick=()=>api.input('target:'+i);targets.append(b);}root.append(targets);
  const hand=document.createElement('div');hand.className='deck-hand';for(const [i,id] of s.hand.entries()){const info=CARDS[id],b=document.createElement('button');b.className='deck-card';b.disabled=!!locked||s.energy<info.cost;const title=document.createElement('strong'),hint=document.createElement('small'),cost=document.createElement('b');title.textContent=info.name;hint.textContent=info.text+(s.strength&&(info.damage||info.all)?'（强化 +'+s.strength+'）':'');cost.textContent=String(info.cost);cost.className='deck-energy';b.append(cost,title,hint);b.setAttribute('aria-label',info.name+'，'+info.cost+' 能量，'+hint.textContent);b.onclick=()=>api.input('card:'+i);hand.append(b);}root.append(hand);
  const footer=document.createElement('div');footer.className='deck-targets';const count=document.createElement('small');count.textContent='抽牌 '+s.draw.length+' · 弃牌 '+s.discard.length;const end=document.createElement('button');end.textContent='结束回合';end.disabled=!!locked;end.onclick=()=>api.input('endturn');footer.append(count,end);root.append(footer);
 };
 draw();const off=api.subscribe(draw);return()=>{off();root.replaceChildren();};
}
