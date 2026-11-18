export const BREAKOUT_BUFFS=[
 {id:'wide',name:'延展挡板',mark:'↔'},{id:'slow',name:'时缓领域',mark:'↓'},{id:'shield',name:'底部护盾',mark:'◈'},
 {id:'repair',name:'修复机会',mark:'+'},{id:'heavy',name:'重击球',mark:'重'},{id:'blast',name:'连锁爆破',mark:'爆'},
 {id:'gold',name:'双倍收获',mark:'×2'},{id:'guide',name:'引导反弹',mark:'导'},{id:'breaker',name:'钢墙瓦解',mark:'裂'}
];
export function awardBrick(s){s.combo++;s.score+=(10*s.level+Math.min(50,(s.combo-1)*5))*(s.goldUntil>s.tick?2:1);}
export function applyBreakoutBuff(s,key,origin){
 if(!BREAKOUT_BUFFS.some(v=>v.id===key))return;
 s.lastBuff={key,until:s.tick+120};
 if(key==='wide')s.wideUntil=s.tick+600;
 if(key==='slow')s.slowUntil=s.tick+450;
 if(key==='shield')s.shields=Math.min(2,s.shields+1);
 if(key==='repair'){if(s.lives<3)s.lives++;else s.shields=Math.min(2,s.shields+1);}
 if(key==='heavy')s.heavyUntil=s.tick+600;
 if(key==='gold')s.goldUntil=s.tick+600;
 if(key==='guide')s.guideUntil=s.tick+600;
 if(key==='breaker'){const stone=s.bricks.find(b=>b.alive&&b.stone);if(stone)stone.alive=false;else s.shields=Math.min(2,s.shields+1);}
 if(key==='blast')for(const b of s.bricks)if(b!==origin&&b.alive&&!b.stone&&Math.hypot(b.x-origin.x,b.y-origin.y)<60){b.hp-=2;if(b.hp<=0){b.alive=false;awardBrick(s);}}
}
