// Derived from ContraRun, Apache-2.0. See LICENSE, NOTICE, UPSTREAM.md.
const TUNE = {
  W:256, H:240, TILE:16, SCALE:3, FPS:60,
  runSpeed:1.24, airAccel:0.19, jumpV:4.0, grav:0.125, maxFall:4.5,
  dashSpeed:3.75, runnerSpeed:1.08, cameraFollowSpeed:0.85,
  pBulletSpeed:4.5, eBulletSpeed:2.1,
  fireRates:{rifle:10, M:6, S:14, L:24, F:18},
  respawnInvuln:110, respawnFrames:60,
};
export function contraCore(seed){
 let rng=seed>>>0,actions=new Set();
 const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 const K=Object.fromEntries(['left','right','up','down','jump','fire','dash'].map(k=>[k,()=>actions.has(k)]));
 const actionBuffer={jump:0,fire:0,dash:0};
 const Music={set(){}},sfx=()=>{},clearEnemyVisuals=()=>{};

// ============================ LEVEL (same map as 2D — tests depend on it) ============================
const ROWS=15, GROUND=10;
let MAPW=0; const map=[];
function blankMap(cols){ MAPW=cols; for(let c=0;c<cols;c++){ map[c]=[]; for(let r=0;r<ROWS;r++)map[c][r]='.'; } }
function fillRect(c0,r0,c1,r1,ch){ for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)if(map[c]&&r<ROWS&&r>=0)map[c][r]=ch; }
const ents=[];
function ground(c0,c1,depth){ fillRect(c0,GROUND,c1,Math.min(ROWS-1,GROUND+(depth||4)-1),'D'); for(let c=c0;c<=c1;c++)map[c][GROUND]='G'; }
function waterPit(c0,c1){ fillRect(c0,12,c1,14,'W'); }
function plat(c0,c1,row){ for(let c=c0;c<=c1;c++)map[c][row]='P'; }
function bridgeRow(c0,c1){ for(let c=c0;c<=c1;c++)map[c][GROUND]='B'; }
function E(type,cx,rowY,opts){ ents.push(Object.assign({type,x:cx*16,y:rowY*16},opts||{})); }
const STAGE_META=[
  {name:'COBALT JUNGLE',short:'ZONE 01'},
  {name:'FLOODLINE DELTA',short:'ZONE 02'},
  {name:'IRON CANOPY',short:'ZONE 03'},
];
function buildLevel(){
  blankMap(132); ents.length=0;
  const stage=game.stage||0;
  if(stage===1){
    ground(0,11); waterPit(12,16); ground(17,30);
    waterPit(31,38); bridgeRow(31,38); ground(39,62);
    waterPit(63,69); bridgeRow(63,69); ground(70,95);
    waterPit(96,97); ground(98,110); waterPit(111,112); ground(113,131);
    plat(19,24,7); plat(26,30,6); plat(43,48,7); plat(52,57,5);
    plat(75,80,7); plat(85,91,5); plat(101,106,7);
    E('sniper',22,6); E('turret',29,GROUND-1); E('sniper',46,6);
    E('capsule',49,4,{letter:'S'}); E('turret',58,GROUND-1);
    E('sniper',66,GROUND-1); E('capsule',68,4,{letter:'M'});
    E('sniper',78,6); E('turret',89,GROUND-1); E('capsule',92,4,{letter:'L'});
    E('sniper',104,6); E('turret',108,GROUND-1); E('capsule',119,4,{letter:'F'});
    return;
  }
  if(stage===2){
    ground(0,18); waterPit(19,20); ground(21,39); waterPit(40,41); ground(42,54);
    waterPit(55,68); bridgeRow(55,68); ground(69,95);
    waterPit(96,97); ground(98,110); waterPit(111,112); ground(113,131);
    plat(8,13,7); plat(24,29,6); plat(34,39,5); plat(44,50,7);
    plat(72,77,6); plat(81,86,5); plat(90,95,7); plat(101,108,6);
    E('turret',12,GROUND-1); E('sniper',27,5); E('turret',37,GROUND-1);
    E('capsule',45,4,{letter:'S'}); E('sniper',49,6); E('turret',53,GROUND-1);
    E('sniper',61,GROUND-1); E('capsule',66,4,{letter:'M'});
    E('turret',73,GROUND-1); E('sniper',84,4); E('capsule',88,4,{letter:'L'});
    E('turret',94,GROUND-1); E('sniper',105,5); E('turret',109,GROUND-1);
    E('capsule',120,4,{letter:'F'});
    return;
  }
  ground(0,14); ground(17,30); ground(33,54);
  waterPit(15,16); waterPit(31,32);
  plat(20,24,7); plat(27,31,7); plat(36,40,5);
  E('sniper',28,6); E('sniper',38,4);
  E('capsule',44,4,{letter:'S'});
  E('turret',51,GROUND-1);
  waterPit(55,70); bridgeRow(55,70);
  E('turret',53,GROUND-1); E('sniper',62,GROUND-1);
  E('capsule',66,5,{letter:'M'});
  ground(71,95);
  plat(76,79,7); plat(84,87,6); plat(90,94,7);
  E('sniper',77,6); E('sniper',85,5); E('sniper',92,6);
  E('capsule',88,4,{letter:'L'});
  waterPit(96,97); ground(98,110); waterPit(111,112);
  ground(113,131);
  E('turret',108,GROUND-1);
  E('capsule',118,5,{letter:'F'});
}
const BOSS_COL=126;
// ============================ GAME STATE (same globals as 2D) ============================
let lives=3, score=0, next1up=20000;
const game={state:'title', t:0, shake:0, flash:0, msg:null, msgT:0, finished:0, introT:0, warnT:0, stage:0, campaignClears:0, combo:0, comboT:0};
let player, bullets=[], ebullets=[], enemies=[], pickups=[], parts=[], boss=null;
let camX=0, runnerTimer=0, bridgeState=null, lastCp=24, paused=false;
// Progress anchors are resolved to safe ground separately for each zone.
const CPS=[24,272,896,1136,1568,1808];
let checkpointSpawns=[];
function buildCheckpointSpawns(){
  checkpointSpawns=[];
  for(const anchor of CPS){
    for(let col=Math.floor(anchor/16);col<MAPW-1;col++){
      // A full tile of margin on both sides prevents cliff-edge respawns.
      const safe=[col-1,col,col+1].every(c=>map[c]&&['G','D','S'].includes(map[c][GROUND])&&
        map[c][GROUND-1]==='.'&&map[c][GROUND-2]==='.');
      if(!safe)continue;
      const x=col*16+8, previous=checkpointSpawns[checkpointSpawns.length-1];
      if(!previous||x-previous.x>=64)checkpointSpawns.push({x,y:GROUND*16-0.01});
      break;
    }
  }
}
function flashMsg(m){ game.msg=m; game.msgT=120; }
function newPlayer(x,y){ return {x,y,vx:0,vy:0,onGround:false,prone:false,face:1,aim:'right',
  fireCd:0, jumping:false, jumpT:0, dead:false, deadT:0, invuln:110, weapon:'rifle',
  runT:0, dropT:0, shootT:0, dashCd:0, dashT:0, dashHeld:false,
  jumpHeld:false, jumpBuffer:0, coyote:0, w:10, h:20, inWater:false}; }
function resetStage(){ buildLevel(); buildCheckpointSpawns(); bullets=[];ebullets=[];enemies=[];pickups=[];parts=[];
  clearEnemyVisuals();
  for(const e of ents){
    if(e.type==='sniper')enemies.push({type:'sniper',x:e.x,y:e.y,hp:2+game.finished,t:0,cool:60+((e.x/16)%3)*30,w:12,h:16,alive:true,tele:0});
    if(e.type==='turret')enemies.push({type:'turret',x:e.x,y:e.y+16,hp:4+game.finished*2,t:0,cycle:((e.x/16)%2)*60,open:false,cd:42+((e.x/16)%3)*16,w:14,h:14,alive:true});
    if(e.type==='capsule')enemies.push({type:'capsule',x:e.x,y:e.y,hp:1,letter:e.letter,t:((e.x/16)*7)%40,baseY:e.y,w:10,h:7,alive:true});
  }
  player=newPlayer(24,GROUND*16-20); camX=0; runnerTimer=120; lastCp=24; game.introT=170;
  bridgeState={active:null,seg:-1,end:-1,timer:0};
  const podHp=12+game.finished*4, coreHp=16+game.finished*8;
  boss={x:BOSS_COL*16, pods:[{ox:-20,oy:-30,a:0,hp:podHp,maxHp:podHp,dead:false,cd:90},
                                  {ox:-20,oy:26,a:Math.PI,hp:podHp,maxHp:podHp,dead:false,cd:150}],
        core:{hp:coreHp,maxHp:coreHp,dead:false}, active:false, dying:0, t:0};
}
// ============================ COLLISION ============================
function tileAt(px,py){ const c=(px/16)|0, r=(py/16)|0; if(c<0||c>=MAPW)return 'S'; if(r<0)return '.'; if(r>=ROWS)return '.'; return map[c][r]; }
function isSolid(ch){ return ch==='G'||ch==='D'||ch==='S'||ch==='B'; }
function moveBody(b){
  const res={onGround:false,water:false};
  b.x+=b.vx;
  if(b.vx>0){ const lead=b.x+b.w/2; const ch=tileAt(lead,b.y-b.h/2); const ch2=tileAt(lead,b.y-2);
    if(isSolid(ch)||isSolid(ch2)){
      const preMoveX=b.x-b.vx; const clamped=(((lead)/16)|0)*16-b.w/2-0.01;
      b.x=(clamped>=preMoveX-0.001)?clamped:preMoveX; b.vx=0; } }
  if(b.vx<0){ const lead=b.x-b.w/2; const ch=tileAt(lead,b.y-b.h/2); const ch2=tileAt(lead,b.y-2);
    if(isSolid(ch)||isSolid(ch2)){
      const preMoveX=b.x-b.vx; const clamped=(((lead)/16)|0)*16+16+b.w/2+0.01;
      b.x=(clamped<=preMoveX+0.001)?clamped:preMoveX; b.vx=0; } }
  const prevY=b.y; b.y+=b.vy;
  if(b.vy>=0){ const y=b.y; const mid=tileAt(b.x,y); const l=tileAt(b.x-b.w/2+1,y); const r=tileAt(b.x+b.w/2-1,y);
    const topOf=(ch)=>{ const r=(y/16)|0; return r*16; };
    const platHit=(ch)=>ch==='P'&&prevY<=topOf(ch)+0.5&&b.dropT<=0;
    if(isSolid(mid)||isSolid(l)||isSolid(r)||platHit(mid)||platHit(l)||platHit(r)){
      b.y=((y/16)|0)*16-0.01; b.vy=0; res.onGround=true;
    }
    if(mid==='W'||l==='W'||r==='W'){ res.water=true; }
  } else { const y=b.y-b.h; const ch=tileAt(b.x,y); if(isSolid(ch)){ b.y=(((y)/16)|0)*16+16+b.h+0.01; b.vy=0; } }
  return res;
}
// ============================ PARTICLES (logic shared with renderer) ============================
function spawnBoom(x,y,big){ const n=big?3:1;
  parts.push({x,y,t:0,life:big?30:18,big:!!big,ring:true});
  for(let k=0;k<n;k++) parts.push({x:x+(random()*12-6)*big,y:y+(random()*10-5)*big,t:0,life:big?28:18,big:!!big});
  for(let k=0;k<(big?6:3);k++) parts.push({x:x+(random()*16-8),y:y-(random()*6),t:0,life:big?40:26,smoke:true,vy:-0.3-random()*0.3,vx:(random()-0.5)*0.4});
  for(let k=0;k<(big?8:4);k++) parts.push({x,y,vx:(random()-0.5)*3.2,vy:-1-random()*2.4,t:0,life:30,debris:true});
  if(big)game.shake=Math.max(game.shake,4); else game.shake=Math.max(game.shake,2);
}
function spawnSpark(x,y){ parts.push({x,y,t:0,life:6,spark:true}); }
function spawnDust(x,y,n){ for(let k=0;k<(n||2);k++) parts.push({x:x+(random()*8-4),y:y-1,vx:(random()-0.5)*0.6,vy:-0.2-random()*0.4,t:0,life:14,dust:true}); }
function spawnSplash(x,y){ sfx('splash');
  for(let k=0;k<10;k++) parts.push({x:x+(random()*10-5),y:y,vx:(random()-0.5)*2.4,vy:-1.6-random()*2.2,t:0,life:30,drop:true});
  for(let k=0;k<4;k++) parts.push({x:x+(random()*16-8),y:y-2,vx:(random()-0.5)*0.5,vy:-0.4,t:0,life:28,smoke:true});
}
function updateParts(){ for(const p of parts){ p.t++;
  if(p.smoke){ p.x+=p.vx||0; p.y+=p.vy; }
  if(p.dust){ p.x+=p.vx; p.y+=p.vy; p.vy*=0.92; }
  if(p.debris||p.drop){ p.x+=p.vx; p.y+=p.vy; p.vy+=p.drop?0.14:0.18; if(p.drop&&p.y>199){p.t=p.life;} }
  if(p.grav){ p.vy+=p.grav; p.x+=p.vx; p.y+=p.vy; }
} parts=parts.filter(p=>p.t<p.life); }
// ============================ PLAYER (2D logic verbatim) ============================
function aimDir(){
  const p=player, f=p.face;
  const L=K.left(),R=K.right(),U=K.up(),D=K.down();
  if(p.prone) return f>0?'right':'left';
  if(!p.onGround){
    if(U&&R)return 'ur'; if(U&&L)return 'ul';
    if(D&&L)return 'dl'; if(D&&R)return 'dr';
    if(D&&!L&&!R)return 'down';
    if(U&&!L&&!R)return 'up';
    return f>0?'right':'left';
  }
  if(U&&R)return 'ur'; if(U&&L)return 'ul';
  if(U)return 'up';
  return f>0?'right':'left';
}
function fireWeapon(){
  const p=player; if(p.fireCd>0)return false;
  const a=p.aim; const rate=TUNE.fireRates[p.weapon]||10;
  p.fireCd=rate;
  const px=p.x, py=p.y-(p.prone?4:14);
  const mk=(ang,spd,dmg,kind)=>{ const rad=ang*Math.PI/180;
    bullets.push({x:px+Math.cos(rad)*6,y:py+Math.sin(rad)*6,vx:Math.cos(rad)*spd,vy:Math.sin(rad)*spd,dmg:dmg||1,kind:kind||'n',t:0,ang:rad}); };
  const base={right:0,left:180,up:-90,down:90,ur:-45,ul:-135,dr:45,dl:135}[a];
  if(p.weapon==='S'){ for(const off of [-24,-12,0,12,24]) mk(base+off,4.2,1,'S'); sfx('spread'); }
  else if(p.weapon==='L'){ mk(base,7,3,'L'); sfx('laser'); }
  else if(p.weapon==='F'){ mk(base,2.6,2,'F'); sfx('fireball'); }
  else if(p.weapon==='M'){ mk(base,5,1,'M'); sfx('shot'); }
  else { mk(base,5,1,'n'); sfx('shot'); }
  p.shootT=4;
  return true;
}
function tryFireInput(){
  if(K.fire()){
    actionBuffer.fire=0;
    return fireWeapon();
  }
  if(actionBuffer.fire>0){
    const fired=fireWeapon();
    if(fired)actionBuffer.fire=0;
    else actionBuffer.fire--;
    return fired;
  }
  return false;
}
function updatePlayer(){
  const p=player;
  if(p.invuln>0)p.invuln--;
  if(p.fireCd>0)p.fireCd--;
  if(p.dropT>0)p.dropT--;
  if(p.shootT>0)p.shootT--;
  if(p.dashCd>0)p.dashCd--;
  if(p.dead){ p.deadT++; p.vy+=TUNE.grav; p.y+=p.vy; p.x+=p.vx;
    if(p.deadT>TUNE.respawnFrames){ if(lives>1){ lives--;
        const spawn=checkpointSpawns.find(c=>c.x===lastCp)||checkpointSpawns[0];
        player=newPlayer(spawn.x,spawn.y); player.invuln=TUNE.respawnInvuln;
        player.onGround=true;
        camX=Math.max(0,player.x-60);
      } else { lives=0; game.state='gameover'; Music.set('over'); } }
    return; }
  if(p.onGround&&!p.inWater){
    let secured=false;
    for(const c of checkpointSpawns)if(p.x>=c.x&&lastCp<c.x){lastCp=c.x;secured=true;}
    if(secured)flashMsg('CHECKPOINT SECURED');
  }
  const jumpNow=K.jump();
  const bufferedJump=actionBuffer.jump>0;
  const jumpPressed=bufferedJump||(jumpNow&&!p.jumpHeld);
  const jumpReleased=!jumpNow&&p.jumpHeld;
  p.jumpHeld=jumpNow;
  if(bufferedJump)actionBuffer.jump=0;
  if(jumpPressed)p.jumpBuffer=8;
  else if(p.jumpBuffer>0)p.jumpBuffer--;
  if(p.onGround)p.coyote=6;
  else if(p.coyote>0)p.coyote--;
  if(p.inWater){
    let mvw=0; if(K.left())mvw=-1; if(K.right())mvw=1;
    if(mvw!==0)p.face=mvw;
    p.vx=mvw*1.0;
    if(mvw!==0){ const ahead=tileAt(p.x+mvw*3,200), aheadUp=tileAt(p.x+mvw*3,182);
      if(!isSolid(ahead)&&!isSolid(aheadUp)) p.x+=p.vx; else p.vx=0; }
    p.y=200; p.vy=0; p.onGround=false; p.prone=false;
    if(game.t%13===0) parts.push({x:p.x-p.face*7+(random()*6-3),y:201,t:0,life:24,bubble:true});
    if(jumpPressed){
      let vaulted=false;
      // Search the intended bank first, then the opposite bank as a fallback.
      // This makes the exit reliable even if the last horizontal key-up lands
      // on the same frame as jump.
      const dirs=[p.face,-p.face];
      for(const dir of dirs){
        for(let dc=0.35;dc<=5.5&&!vaulted;dc+=0.35){
          const tx=p.x+dir*dc*16;
          for(let r=0;r<ROWS;r++){ const bankCh=tileAt(tx,r*16+1); if(bankCh==='G'||bankCh==='D'||bankCh==='S'){
            const top=r*16;
            if(!isSolid(tileAt(tx,top-6))&&!isSolid(tileAt(tx,top-16))){
              p.inWater=false; p.face=dir; p.x=tx; p.y=top-0.01; p.vy=0; p.vx=0; p.onGround=true; p.jumping=true; p.jumpBuffer=0; p.coyote=0;
              vaulted=true; sfx('splash'); spawnSplash(tx-dir*8,196); }
            break; } }
        }
        if(vaulted)break;
      }
      if(!vaulted){ p.inWater=false; p.vy=-TUNE.jumpV*1.05; p.jumping=true; p.jumpBuffer=0; p.coyote=0; sfx('splash'); spawnSplash(p.x,p.y); }
    }
    p.aim=p.face>0?'right':'left';
    tryFireInput();
    if(p.x-camX<8)p.x=camX+8;
    if(p.x>MAPW*16-40)p.x=MAPW*16-40;
    return;
  }
  const dashNow=K.dash();
  const dashPressed=actionBuffer.dash>0||(dashNow&&!p.dashHeld);
  if(dashPressed&&p.dashCd<=0){
    actionBuffer.dash=0;
    p.dashT=10; p.dashCd=54; p.invuln=Math.max(p.invuln,12); p.vx=p.face*TUNE.dashSpeed;
    game.shake=Math.max(game.shake,.75); sfx('laser');
    for(let i=0;i<4;i++) parts.push({x:p.x-p.face*(4+i*5),y:p.y-10,t:0,life:10+i*2,dash:true});
  } else if(!dashNow&&actionBuffer.dash>0) actionBuffer.dash--;
  if(dashNow)actionBuffer.dash=0;
  p.dashHeld=dashNow;
  p.prone = p.onGround && K.down() && !jumpNow && p.dashT<=0;
  let mv=0; if(K.left())mv=-1; if(K.right())mv=1;
  if(mv!==0&&!p.prone){ p.face=mv; }
  if(p.dashT>0){
    p.dashT--; p.vx=p.face*TUNE.dashSpeed;
    if(p.dashT%2===0)parts.push({x:p.x-p.face*8,y:p.y-10,t:0,life:9,dash:true});
  } else if(p.onGround){ p.vx=mv*(p.prone?0:TUNE.runSpeed); if(mv!==0&&!p.prone){p.runT++; if(p.runT%14===0) spawnDust(p.x-p.face*5,p.y,1);} }
  else { p.vx+=mv*TUNE.airAccel; p.vx=Math.max(-TUNE.runSpeed,Math.min(TUNE.runSpeed,p.vx)); }
  if(p.jumpBuffer>0&&p.coyote>0&&!p.jumping&&p.dashT<=0){
    if(K.down()){ p.dropT=10; p.vy=1; p.jumpBuffer=0; p.coyote=0; }
    else { p.vy=-TUNE.jumpV; p.jumping=true; p.onGround=false; p.jumpBuffer=0; p.coyote=0; sfx('pickup'); p.runT=0; }
  }
  if(jumpReleased&&p.vy<-1.2)p.vy*=0.55;
  p.vy+=TUNE.grav; if(p.vy>TUNE.maxFall)p.vy=TUNE.maxFall;
  const preVy=p.vy, wasAir=!p.onGround;
  const res=moveBody(p);
  if(res.onGround){ if(wasAir){ p.jumping=false; if(preVy>2.6) spawnDust(p.x,p.y,3); } p.onGround=true; p.jumpT=0; }
  else { p.onGround=false; p.jumpT++; }
  if(p.x-camX<8){ p.x=camX+8; if(p.vx<0)p.vx=0; }
  if(p.x>MAPW*16-40)p.x=MAPW*16-40;
  p.aim=aimDir();
  tryFireInput();
  if(res.water&&p.vy>=0&&p.y>186){ p.inWater=true; p.y=200; p.vy=0; p.onGround=false; p.jumping=false; p.jumpT=0; sfx('splash'); spawnSplash(p.x,196); }
  if(p.y>ROWS*16+8){ killPlayer(true); }
}
function killPlayer(silent){ const p=player; if(p.dead||p.invuln>0)return;
  p.dead=true; p.deadT=0; p.vy=-2.2; p.vx=-p.face*0.8; sfx('die');
  game.combo=0; game.comboT=0;
  if(silent){ spawnSplash(p.x,p.y); }
}
// ============================ ENEMIES (2D logic verbatim) ============================
function aimedShot(x,y,tx,ty,spd){ const dx=tx-x,dy=ty-y; const d=Math.hypot(dx,dy)||1;
  ebullets.push({x,y,vx:dx/d*spd,vy:dy/d*spd,t:0}); }
function updateEnemies(){
  const p=player;
  for(const e of enemies){ if(!e.alive)continue;
    // Authored level enemies must remain available until the player reaches them.
    // Only retire enemies that have genuinely fallen behind the scrolling camera.
    const sx=e.x-camX; if(sx<-56){ e.cull=(e.cull||0)+1; } else e.cull=0;
    e.t++;
    if(e.flyback)continue;
    if(e.type==='runner'){
      e.vx=e.vx??(p.x>e.x?1:-1)*TUNE.runnerSpeed; e.x+=e.vx;
      e.vy=(e.vy||0)+TUNE.grav; e.y+=e.vy;
      const t=tileAt(e.x,e.y);
      if(t==='W'){ e.alive=false; spawnSplash(e.x,e.y); }
      const ch=tileAt(e.x,e.y+1); const ch2=tileAt(e.x,e.y-8);
      if(e.noFloor){ }
      else if((isSolid(ch))&&e.vy>0){ e.y=((e.y/16)|0)*16-0.01; e.vy=0; }
      if(e.y>ROWS*16+16)e.alive=false;
      if(e.shootTimer!==undefined){
        e.shootTimer--;
        if(e.shootTimer<=0){
          if(Math.abs(e.x-p.x)<200){ aimedShot(e.x,e.y-8,p.x,p.y-10,TUNE.eBulletSpeed); sfx('hit'); e.shootTimer=130+(random()*90|0); }
          else e.shootTimer=30;
        }
      }
    }
    if(e.type==='sniper'){
      if(e.noFloor){ e.vy=(e.vy||0)+TUNE.grav; e.y+=e.vy;
        if(tileAt(e.x,e.y)==='W'){ e.alive=false; spawnSplash(e.x,e.y); }
        if(e.y>ROWS*16+16)e.alive=false; continue; }
      if(Math.abs(e.x-p.x)<220){ e.cool--;
        if(e.cool<=0){ e.tele=18; e.cool=110+game.finished*30; }
        if(e.tele>0){ e.tele--; if(e.tele===8){ aimedShot(e.x,e.y-10,p.x,p.y-10,TUNE.eBulletSpeed); sfx('hit'); } }
      }
    }
    if(e.type==='turret'){
      e.cycle=(e.cycle+1)%160;
      e.open=e.cycle>40&&e.cycle<130;
      if(e.open){ e.cd--; if(e.cd<=0){ e.cd=70+game.finished*20;
        const a=Math.atan2(p.y-10-e.y, p.x-e.x);
        for(const off of [-0.25,0,0.25]){ ebullets.push({x:e.x,y:e.y-6,vx:Math.cos(a+off)*TUNE.eBulletSpeed,vy:Math.sin(a+off)*TUNE.eBulletSpeed,t:0}); }
        sfx('hit'); } }
    }
    if(e.type==='capsule'){
      // Keep gameplay motion deterministic. Visual bobbing is applied only to
      // the mesh below, so aiming and collision never depend on render timing.
      e.x-=0.9; e.y=e.baseY;
      if(e.t%40===0) parts.push({x:e.x,y:e.y,t:0,life:10,spark:true});
      if(e.x<camX-360)e.alive=false;
    }
  }
  enemies=enemies.filter(e=>e.alive&&!(e.cull>240));
  runnerTimer--;
  const runnerZone=(camX>40&&camX<700)||(camX>1150&&camX<1500);
  const runnersAlive=enemies.filter(e=>e.type==='runner').length;
  if(runnerTimer<=0&&runnerZone&&runnersAlive<4&&!boss.active){
    runnerTimer=140+random()*80-game.finished*20;
    const side=random()<0.75?1:-1;
    const x=side>0?camX+270:camX-10;
    const shoot=random()<0.35;
    enemies.push({type:'runner',x,y:GROUND*16-1,vx:(side>0?-1:1)*TUNE.runnerSpeed,vy:0,hp:1,w:12,h:14,alive:true,
      shootTimer:shoot?(40+random()*60|0):undefined});
  }
}
function bridgeSpanAt(col){
  if(!map[col]||map[col][GROUND]!=='B')return null;
  let start=col,end=col;
  while(start>0&&map[start-1]&&map[start-1][GROUND]==='B')start--;
  while(end<MAPW-1&&map[end+1]&&map[end+1][GROUND]==='B')end++;
  return {start,end};
}
function updateBridge(){
  const p=player, b=bridgeState;
  const pc=(p.x/16)|0;
  if(!b.active){
    const span=bridgeSpanAt(pc);
    if(span){ b.active=span; b.seg=span.start; b.end=span.end; b.timer=0; }
  }
  if(!b.active)return;
  b.timer--;
  if(b.timer>0)return;
  if(b.seg>b.end){ b.active=null; b.seg=-1; b.end=-1; return; }
  const col=b.seg;
  if(col<pc+1){
    if(map[col]&&map[col][GROUND]==='B'){
      spawnBoom(col*16+8,GROUND*16+6,false); sfx('boom');
      map[col][GROUND]='.';
      for(const e of enemies){ if(e.alive&&Math.abs(e.x-(col*16+8))<14&&!e.flyback)e.noFloor=true; }
      b.timer=26;
    } else b.timer=6;
    b.seg++;
  } else b.timer=8;
}
// ============================ BOSS (2D logic verbatim) ============================
function updateBoss(){
  const b=boss, p=player;
  const arenaX=(BOSS_COL-14)*16;
  if(!b.active&&p.x>arenaX+30){ b.active=true; sfx('alarm'); Music.set('boss'); game.warnT=110; game.shake=3; }
  if(!b.active)return;
  b.t=(b.t||0)+1;
  if(b.dying>0){ b.dying--;
    if(b.dying%9===0){ spawnBoom(b.x-20+random()*60, 120+random()*80,true); sfx('boom'); }
    if(b.dying===0){ score+=5000; game.state='victory'; Music.set('victory'); }
    return;
  }
  for(const pod of b.pods){ if(pod.dead)continue;
    pod.a+=0.02; pod.cd--;
    if(pod.cd<=0){ pod.cd=110-game.finished*10;
      const gx=b.x+pod.ox, gy=GROUND*16-14+pod.oy;
      const ang=Math.atan2((p.y-10)-gy, p.x-gx);
      for(const off of [-0.18,0,0.18])
        ebullets.push({x:gx,y:gy,vx:Math.cos(ang+off)*TUNE.eBulletSpeed*1.15,vy:Math.sin(ang+off)*TUNE.eBulletSpeed*1.15,t:0});
      sfx('hit');
    }
  }
}
function bossPodHit(pod,dmg){ pod.hp-=dmg;
  if(pod.hp<=0){
    pod.dead=true;
    spawnBoom(boss.x+pod.ox,GROUND*16-14+pod.oy,true);
    sfx('boom'); score+=500;
    if(boss.pods.every(p=>p.dead)){
      flashMsg('CORE EXPOSED!');
      game.shake=Math.max(game.shake,4.5);
    }
  } }
// ============================ BULLETS & HITS (2D logic verbatim) ============================
function updateBullets(){
  for(const b of bullets){ b.t++;
    if(b.kind==='L'){ b.x+=b.vx; b.y+=b.vy; }
    else if(b.kind==='F'){ const ph=b.t*0.25;
      b.x+=Math.cos(b.ang)*2.2+Math.cos(ph)*1.1; b.y+=Math.sin(b.ang)*2.2+Math.sin(ph)*1.1; }
    else { b.x+=b.vx; b.y+=b.vy; }
    // 2.5D viewport is 344 units wide (camera x = camX+128 ± 172)
    if(b.x<camX-44||b.x>camX+330||b.y<-10||b.y>ROWS*16+10)b.dead=true;
    if(isSolid(tileAt(b.x,b.y)))b.dead=true;
  }
  for(const b of ebullets){ b.t++; b.x+=b.vx; b.y+=b.vy;
    if(isSolid(tileAt(b.x,b.y)))b.dead=true;
    if(b.x<camX-44||b.x>camX+330||b.y<-10||b.y>ROWS*16||b.t>=600)b.dead=true;
  }
  bullets=bullets.filter(b=>!b.dead); ebullets=ebullets.filter(b=>!b.dead);
  for(const b of bullets){
    for(const e of enemies){ if(!e.alive||e.hp<=0)continue;
      const ex=e.x,ey=e.y;
      // Flying weapon carriers are intentionally generous targets. Their
      // visual shell is larger than the old logic box, and a forgiving hit
      // area makes diagonal shots feel crisp instead of pixel-perfect.
      const ew=e.type==='capsule'?20:(e.w||12), eh=e.type==='capsule'?18:(e.h||14);
      // Ground enemies use y as their feet/baseline, while flying capsules
      // use y as their actual center. Keep those coordinate semantics explicit
      // so the hit volume matches the rendered carrier instead of floating
      // half a capsule-height above it.
      const ecy=e.type==='capsule'?ey:(ey-eh/2);
      if(Math.abs(b.x-ex)<ew/2+2&&Math.abs(b.y-ecy)<eh/2+2){
        b.dead=true; e.hp-=b.dmg;
        if(e.hp<=0){ e.alive=false; score+=({runner:100,sniper:200,turret:300,capsule:500})[e.type]||100;
          game.combo++; game.comboT=150;
          if(game.combo===5||game.combo===10||game.combo===20)flashMsg(game.combo+' HIT COMBO!');
          if(e.type==='runner'){ e.flyback=true; e.alive=true; e.flyT=0; e.vy=-2.5; e.vx=(b.vx>0?1:-1)*1.5; }
          if(e.type==='capsule'){ pickups.push({x:e.x,y:e.y,vy:-1,letter:e.letter,t:0,grounded:false}); }
          spawnBoom(e.x,e.y-6,false); sfx('kill');
        } else spawnSpark(b.x,b.y);
        break;
      } }
    const bs=boss;
    if(!b.dead&&bs&&bs.active&&bs.dying===0){
      for(const pod of bs.pods){ if(pod.dead)continue;
        const gx=bs.x+pod.ox, gy=GROUND*16-14+pod.oy;
        if(Math.abs(b.x-gx)<10&&Math.abs(b.y-gy)<10){ b.dead=true; bossPodHit(pod,b.dmg); break; } }
      if(!b.dead&&!bs.core.dead){
        const cx=bs.x-20, cy=GROUND*16-16;
        if(Math.abs(b.x-cx)<12&&Math.abs(b.y-cy)<16){ b.dead=true;
          if(bs.pods.every(pod=>pod.dead)){
            bs.core.hp-=b.dmg; spawnSpark(b.x,b.y); sfx('hit');
            if(bs.core.hp<=0){ bs.core.dead=true; bs.dying=70; game.flash=20; sfx('boom'); }
          } else { parts.push({x:b.x,y:b.y,t:0,life:10,spark:true,col:'#b080ff'}); }
        }
      }
      if(!b.dead&&b.x>bs.x-4){ spawnSpark(b.x,b.y); b.dead=true; }
    }
  }
  // Combat dash: a short, readable power window that rewards aggressive
  // timing. It clears nearby hostile shots and shoulder-checks runners.
  if(!player.dead&&player.dashT>0){
    for(const b of ebullets){
      if(!b.dead&&Math.abs(b.x-player.x)<16&&Math.abs(b.y-(player.y-10))<18){
        b.dead=true; spawnSpark(b.x,b.y); score+=10;
      }
    }
    for(const e of enemies){
      if(!e.alive||e.flyback||e.type!=='runner')continue;
      if(Math.abs(e.x-player.x)<15&&Math.abs(e.y-player.y)<16){
        e.hp=0; e.flyback=true; e.flyT=0;
        e.vx=player.face*2.2; e.vy=-2.9;
        score+=150; game.combo++; game.comboT=150;
        spawnBoom(e.x,e.y-6,false); sfx('kill');
        game.shake=Math.max(game.shake,1.8);
      }
    }
  }
  if(!player.dead){
    const hb={x:player.x,y:player.y-(player.prone?4:10),w:player.prone?12:8,h:player.prone?8:16};
    for(const b of ebullets){
      if(!b.dead&&Math.abs(b.x-hb.x)<hb.w/2+2&&Math.abs(b.y-hb.y)<hb.h/2+2){
        b.dead=true; killPlayer(); break; } }
    for(const e of enemies){ if(e.alive&&e.type==='runner'&&!e.flyback&&player.dashT<=0){
      if(Math.abs(e.x-player.x)<10&&Math.abs(e.y-player.y)<14){ killPlayer(); break; } } }
  }
  for(const e of enemies){ if(e.flyback){ e.flyT++; e.x+=e.vx; e.vy+=0.2; e.y+=e.vy; if(e.flyT>90)e.alive=false; } }
  enemies=enemies.filter(e=>e.alive);
  bullets=bullets.filter(b=>!b.dead); ebullets=ebullets.filter(b=>!b.dead);
}
function updatePickups(){
  for(const k of pickups){ k.t++;
    if(!k.grounded){ k.vy+=0.15; k.y+=k.vy; const ch=tileAt(k.x,k.y+4);
      if(isSolid(ch)||ch==='P'){ k.y=((k.y+4)/16|0)*16-4; k.vy=0; k.grounded=true; } }
    if(k.y>ROWS*16)k.dead=true;
    if(!player.dead&&Math.abs(k.x-player.x)<12&&Math.abs(k.y-(player.y-8))<14){
      k.dead=true; player.weapon=k.letter; sfx('pickup'); flashMsg(k.letter==='M'?'MACHINE GUN':k.letter==='S'?'SPREAD GUN':k.letter==='L'?'LASER':k.letter==='F'?'FIREBALL':'RAPID'); score+=500;
    }
    if(k.t>700)k.dead=true;
  }
  pickups=pickups.filter(k=>!k.dead);
}
function updateCam(){
  const target=player.x-100;
  const maxCam=(BOSS_COL-14)*16;
  if(target>camX&&camX<maxCam){
    const delta=target-camX;
    const follow=Math.min(10,TUNE.cameraFollowSpeed+delta*.06+(player.dashT>0?.7:0));
    camX=Math.min(target,maxCam,camX+follow);
  }
  camX=Math.max(0,camX);
}

 function snapshot(){return {rng,lives,score,next1up,game,player,bullets,ebullets,enemies,pickups,parts,boss,camX,runnerTimer,bridgeState,lastCp,checkpointSpawns,map,MAPW,actionBuffer,actions:[...actions]};}
 function restore(s){rng=s.rng;lives=s.lives;score=s.score;next1up=s.next1up;Object.assign(game,s.game);player=s.player;bullets=s.bullets;ebullets=s.ebullets;enemies=s.enemies;pickups=s.pickups;parts=s.parts;boss=s.boss;camX=s.camX;runnerTimer=s.runnerTimer;bridgeState=s.bridgeState;lastCp=s.lastCp;checkpointSpawns=s.checkpointSpawns;MAPW=s.MAPW;map.length=0;map.push(...s.map);}
 game.state='play';resetStage();
 return {snapshot,restore:state=>{restore(state);Object.assign(actionBuffer,state.actionBuffer);actions=new Set(state.actions);},step(input){for(const key of ['jump','fire','dash'])if(input.includes(key)&&!actions.has(key))actionBuffer[key]=key==='jump'?8:6;actions=new Set(input);
  for(let n=0;n<2;n++){
   if(['gameover','complete'].includes(game.state))break;
   game.t++;for(const key of ['msgT','warnT','introT','flash'])if(game[key]>0)game[key]--;game.shake*=.85;
   if(game.state==='victory'){game.finished++;game.stage=(game.stage+1)%3;if(game.stage===0){game.campaignClears++;game.state='complete';break;}lives=Math.max(3,lives);game.state='play';resetStage();}
   if(game.state==='play'){updatePlayer();updateEnemies();updateBridge();updateBoss();updateBullets();updatePickups();updateCam();updateParts();if(game.comboT>0&&! --game.comboT)game.combo=0;if(score>=next1up){lives++;next1up+=50000;}}
  }
  return snapshot();
 }};
}
