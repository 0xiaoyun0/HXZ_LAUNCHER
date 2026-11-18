import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright-core';
import sharp from 'sharp';
import {createBoard,legalMoves,playMove} from '../server/shared/board-games.mjs';

const assets=path.resolve('public/media/games');
await fs.mkdir(assets,{recursive:true});
const script=await build({stdin:{contents:"export {GAMES,createGame,step} from './server/shared/arcade-engine.mjs';export {createRenderer} from './packages/games/arcade-renderer.mjs';",resolveDir:process.cwd()},bundle:true,format:'iife',globalName:'Games',platform:'browser',write:false});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const p=await browser.newPage({viewport:{width:600,height:375},deviceScaleFactor:1});
 await p.setContent('<body style="margin:0;display:grid;place-items:center;width:100vw;height:100vh;background:#1c2936"><canvas></canvas></body>');
 await p.addScriptTag({content:script.outputFiles[0].text});
 const ids=await p.evaluate(()=>Games.GAMES.map(v=>v.id));
 async function save(id){const data=await p.screenshot();await sharp(data).webp({quality:88}).toFile(path.join(assets,id+'.webp'));}
 for(const id of ids){
   await p.evaluate(id=>{
     const canvas=document.querySelector('canvas'),state=Games.createGame(id,711);
     for(let tick=0;tick<105&&!state.ended;tick++)Games.step(state,id==='runner'&&tick===90?['jump']:[]);
     const renderer=Games.createRenderer(canvas,id,{preview:true});renderer.draw(state,1,1750);renderer.dispose();
     canvas.style.cssText='width:auto;height:100vh;max-width:100vw;object-fit:contain';
   },id);
   await save(id);
 }
 for(const id of ['gomoku','chess','xiangqi']){
   const s=createBoard(id);
   if(id==='gomoku'){for(const n of [112,113,97,127,81,96,65]){const move=legalMoves(s).find(m=>m.to===n);if(move)playMove(s,move);}}
   await p.evaluate(({id,board})=>{
     const canvas=document.querySelector('canvas');canvas.width=600;canvas.height=375;canvas.style.cssText='width:100vw;height:100vh';const c=canvas.getContext('2d');
     c.fillStyle=id==='chess'?'#2a3736':'#d3ac79';c.fillRect(0,0,600,375);
     const w=id==='chess'?8:id==='xiangqi'?9:15,h=id==='xiangqi'?10:w,cell=id==='gomoku'?22:id==='chess'?40:34;
     const startX=(600-w*cell)/2,startY=(375-h*cell)/2;
     const signs=id==='chess'?{p:'♟',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞'}:{r:'車',h:'馬',e:'象',a:'士',k:'將',c:'炮',p:'卒'};
     board.forEach((v,i)=>{const x=startX+(i%w)*cell,y=startY+Math.floor(i/w)*cell;
       if(id==='chess'){c.fillStyle=(i%w+Math.floor(i/w))%2?'#749184':'#e2e3c8';c.fillRect(x,y,cell,cell);}
       else {c.strokeStyle='#866541';c.strokeRect(x,y,cell,cell);}
       if(!v)return;c.textAlign='center';c.textBaseline='middle';const cx=x+cell/2,cy=y+cell/2;
       if(id!=='chess'){c.fillStyle=id==='xiangqi'?'#efcc8b':v==='a'?'#242a2c':'#eaecdf';c.beginPath();c.arc(cx,cy,cell*.42,0,Math.PI*2);c.fill();}
       if(id!=='gomoku'){c.font=(cell*.8)+'px "Segoe UI Symbol","Microsoft YaHei",serif';c.fillStyle=v[0]==='a'?(id==='chess'?'#faf9f2':'#a13629'):'#232925';c.fillText(signs[v[1]]||'',cx,cy+1);}
     });
   },{id,board:s.board});
   await save(id);
 }
 await p.evaluate(()=>{
   const canvas=document.querySelector('canvas'),c=canvas.getContext('2d');c.fillStyle='#263149';c.fillRect(0,0,600,375);
   c.strokeStyle='#aeb8d7';c.lineWidth=2;c.beginPath();c.ellipse(300,191,130,75,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<6;i++){const r=i*Math.PI/3,x=300+155*Math.cos(r),y=190+100*Math.sin(r);c.fillStyle='#c9cfe3';c.beginPath();c.arc(x,y,16,0,Math.PI*2);c.fill();c.fillStyle='#374463';c.textAlign='center';c.textBaseline='middle';c.font='15px Segoe UI';c.fillText(String(i+1),x,y);}
 });await save('werewolf');
 console.log(ids.length+' playable game frames, three rule-based board positions and one six-player seating diagram.');
}finally{await browser.close();}
