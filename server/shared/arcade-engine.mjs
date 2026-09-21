// Pure fixed-step simulation shared by both clients and score verification.
export const GAMES=[
  {id:'runner',name:'林间疾跑',tag:'反应 · 无尽挑战',description:'穿过晨雾与松林，挑战更远的路途',keys:'空格 / W / ↑ 跳跃',color:'#9dd9a8'},
  {id:'blocks',name:'俄罗斯方块',tag:'益智 · 逐级加速',description:'七种方块，无数种解法',keys:'A D / ← → 移动 · W / ↑ 旋转 · S / ↓ 加速 · 空格落下 · C 暂存',color:'#baa6eb'},
  {id:'breakout',name:'打砖块',tag:'街机 · 三关挑战',description:'掌控反弹角度，击碎每一道防线',keys:'A D / ← → 移动，也可拖动挡板',color:'#f1c18d'}
];
export const MAX_TICKS=18000;
export const shapes=[[[1,1,1,1]],[[1,1],[1,1]],[[0,1,0],[1,1,1]],[[1,0,0],[1,1,1]],[[0,0,1],[1,1,1]],[[0,1,1],[1,1,0]],[[1,1,0],[0,1,1]]];
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function createGame(game,seed){
  if(!GAMES.some(g=>g.id===game))throw Error('未知小游戏');
  const s={game,seed:seed>>>0,tick:0,score:0,over:false};
  if(game==='runner')Object.assign(s,{y:0,vy:0,obstacles:[],next:45});
  if(game==='blocks'){Object.assign(s,{board:Array.from({length:20},()=>Array(10).fill(0)),lines:0,level:1,bag:[],next:[],held:0,canHold:true,combo:0,event:null});piece(s);}
  if(game==='breakout'){Object.assign(s,{paddle:180,ball:{x:180,y:410,vx:2.6,vy:-3.8},lives:3,level:1,serve:45,combo:0,event:null});bricks(s);}
  return s;
}
function nextColor(s){if(!s.bag.length){s.bag=[1,2,3,4,5,6,7];for(let i=6;i>0;i--){const j=Math.floor(random(s)*(i+1));[s.bag[i],s.bag[j]]=[s.bag[j],s.bag[i]];}}return s.bag.pop();}
function setPiece(s,color){s.color=color;s.shape=shapes[color-1].map(r=>[...r]);s.x=3;s.y=0;if(!fits(s,s.shape,s.x,s.y))s.over=true;}
function piece(s){while(s.next.length<4)s.next.push(nextColor(s));setPiece(s,s.next.shift());s.canHold=true;}
export function ghostRow(s){let y=s.y;while(fits(s,s.shape,s.x,y+1))y++;return y;}
function fits(s,shape,x,y){return shape.every((row,dy)=>row.every((v,dx)=>!v||(x+dx>=0&&x+dx<10&&y+dy<20&&y+dy>=0&&!s.board[y+dy][x+dx])));}
function drop(s){if(fits(s,s.shape,s.x,s.y+1)){s.y++;return true;}for(let y=0;y<s.shape.length;y++)for(let x=0;x<s.shape[y].length;x++)if(s.shape[y][x])s.board[s.y+y][s.x+x]=s.color;const cleared=[];for(let y=0;y<20;y++)if(s.board[y].every(Boolean))cleared.push(y);const kept=s.board.filter(r=>r.some(v=>!v)),n=20-kept.length;s.combo=n?s.combo+1:0;s.lines+=n;s.score+=(([0,100,300,500,800][n]||0)*s.level)+(n?Math.max(0,s.combo-1)*50:0);s.level=1+Math.floor(s.lines/10);if(n)s.event={tick:s.tick,rows:cleared,text:n===4?'四行消除':n+' 行消除',combo:s.combo};while(kept.length<20)kept.unshift(Array(10).fill(0));s.board=kept;piece(s);return false;}
function bricks(s){s.bricks=Array.from({length:45},(_,i)=>({x:14+i%9*37,y:62+Math.floor(i/9)*24,hp:s.level>1&&i%3===0?2:1,alive:!(s.level===2&&i%9===4||s.level===3&&i%9%2===1&&i<18)}));}
export function step(s,actions=[]){
  if(s.over)return s;
  s.tick++;
  if(s.game==='runner'){
    if(actions.includes('jump')&&s.y===0)s.vy=10.5;
    s.y=Math.max(0,s.y+s.vy);s.vy=s.y? s.vy-.62:0;
    if(--s.next<=0){s.obstacles.push({x:375,w:16+Math.floor(random(s)*15),h:28+Math.floor(random(s)*16)});s.next=45+Math.floor(random(s)*45);}
    const speed=4+Math.min(4,s.tick/1800);
    for(const o of s.obstacles){o.x-=speed;if(o.x<70&&o.x+o.w>44&&s.y<o.h)s.over=true;}
    s.obstacles=s.obstacles.filter(o=>o.x+o.w>0);s.score=Math.floor(s.tick/6);
  } else if(s.game==='blocks'){
    for(const a of actions){if(s.over)break;
      if(a==='left'||a==='right'){const x=s.x+(a==='left'?-1:1);if(fits(s,s.shape,x,s.y))s.x=x;}
      if(a==='rotate'){const r=s.shape[0].map((_,i)=>s.shape.map(row=>row[i]).reverse());for(const dx of [0,-1,1,-2,2])if(fits(s,r,s.x+dx,s.y)){s.shape=r;s.x+=dx;break;}}
      if(a==='down')drop(s);
      if(a==='hold'&&s.canHold){const color=s.color;if(s.held)setPiece(s,s.held);else piece(s);s.held=color;s.canHold=false;}
      if(a==='drop'){while(!s.over&&drop(s)){}break;}
    }
    if(!s.over&&s.tick%Math.max(3,26-s.level*2)===0)drop(s);
  } else {
    let target=s.paddle;
    for(const a of actions){if(a==='left')target-=9;if(a==='right')target+=9;if(typeof a==='object')target=a.x;}
    s.paddle=Math.max(42,Math.min(318,s.paddle+Math.max(-9,Math.min(9,target-s.paddle))));
    const b=s.ball;
    if(s.serve>0){s.serve--;b.x=s.paddle;b.y=410;return s;}
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<6||b.x>354){b.x=Math.max(6,Math.min(354,b.x));b.vx=-b.vx;}if(b.y<6){b.y=6;b.vy=Math.abs(b.vy);}
    if(b.vy>0&&b.y>=424&&b.y<=438&&Math.abs(b.x-s.paddle)<47){b.y=423;b.vy=-(3.8+s.level*.45);b.vx=(b.x-s.paddle)*.1;s.combo=0;s.event={tick:s.tick,x:b.x,y:432,kind:'paddle'};}
    for(const brick of s.bricks)if(brick.alive&&b.x>brick.x-5&&b.x<brick.x+33&&b.y>brick.y-5&&b.y<brick.y+22){brick.hp--;brick.alive=brick.hp>0;b.vy=-b.vy;if(!brick.alive){s.combo++;s.score+=10*s.level+Math.min(50,(s.combo-1)*5);}s.event={tick:s.tick,x:brick.x+15,y:brick.y+9,kind:'brick'};break;}
    if(b.y>485){s.lives--;s.combo=0;if(!s.lives)s.over=true;else{Object.assign(b,{x:s.paddle,y:410,vx:2.6,vy:-(3.8+s.level*.45)});s.serve=45;}}
    if(s.bricks.every(b=>!b.alive)){s.score+=100*s.level;if(s.level>=3){s.over=true;s.won=true;}else{s.level++;bricks(s);s.serve=60;}}
  }
  if(s.tick>=MAX_TICKS)s.over=true;
  return s;
}
export function replay(game,seed,ticks,inputs){
  if(!Number.isInteger(ticks)||ticks<1||ticks>MAX_TICKS||!Array.isArray(inputs)||inputs.length>MAX_TICKS*2)throw Error('游戏记录无效');
  let last=0,perTick=0;
  for(const e of inputs){if(!Array.isArray(e)||e.length!==2||!Number.isInteger(e[0])||e[0]<1||e[0]>ticks||e[0]<last)throw Error('操作顺序无效');perTick=e[0]===last?perTick+1:1;last=e[0];if(perTick>4)throw Error('操作过于频繁');const a=e[1];if(typeof a==='object'&&a!==null){if(game!=='breakout'||Object.keys(a).length!==1||!Number.isFinite(a.x)||a.x<0||a.x>360)throw Error('操作坐标无效');}else if(!['left','right','down','rotate','drop','jump','hold'].includes(a))throw Error('操作无效');}
  const s=createGame(game,seed);let i=0;
  while(s.tick<ticks&&!s.over){const actions=[];while(i<inputs.length&&inputs[i][0]===s.tick+1)actions.push(inputs[i++][1]);step(s,actions);}
  if(s.tick!==ticks||i!==inputs.length)throw Error('游戏结束后的记录无效');
  return s;
}
