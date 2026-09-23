import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createBoard,legalMoves,playMove} from '../../server/shared/board-games.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_PATH?pathToFileURL(process.env.PLAYWRIGHT_PATH).href:'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.setDefaultTimeout(5000);
 let match;const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeBinding('nativeCall',async(_,raw)=>{
  const {id,op,input}=JSON.parse(raw);
  let data=op==='state'?{connected:true,hasAccount:true,user:{uid:'fixture',name:'测试角色'},profiles:[],users:[],messages:[],room:''}:op==='appUpdate'?{currentVersion:'0.4.5',currentBuild:40503,phase:'idle'}:op==='api'?{items:[],total:0,more:false,minecraft:[],create:[]}:true;
  if(op==='api'&&input.path==='/api/boards'&&input.method==='POST'){
   const state=createBoard(input.body.game);
   if(state.game==='gomoku'){state.board[0]='a';state.board[224]='b';}
   match={id:'fixture-board',side:'a',a:{name:'测试角色'},b:{name:'机器人'},mode:'bot',level:1,deadline:Date.now()+300000,state,legal:legalMoves(state)};data=match;
  }else if(op==='api'&&input.path==='/api/boards/fixture-board'){
   if(input.method==='POST'&&input.body.action==='move'){match.state=playMove(match.state,input.body.move);match.legal=legalMoves(match.state);}
   data=match;
  }
  await page.evaluate(value=>window.HXZEvent('result',value),{id,data,error:null});
 });
 await page.addInitScript(()=>{window.HXZNative={call:raw=>window.nativeCall(raw)};});
 await page.goto(process.env.MOBILE_PREVIEW_URL||'http://127.0.0.1:5195');
 const nav=page.getByRole('navigation',{name:'主导航'});
 await nav.getByRole('button',{name:'我的',exact:true}).tap();
 const range=page.getByRole('button',{name:'聊天记录范围',exact:true});await range.scrollIntoViewIfNeeded();
 const label=await range.evaluate(el=>{const p=el.closest('label'),text=[...p.childNodes].find(n=>n.nodeType===3&&n.textContent.trim())||p.querySelector('span');const r=document.createRange();r.selectNodeContents(text);const b=r.getBoundingClientRect();return {width:b.width,height:b.height};});
 if(label.width<label.height)failures.push('聊天记录范围竖排: '+JSON.stringify(label));
 await range.tap();await page.getByRole('option',{name:'1 周',exact:true}).tap();assert.match(await range.textContent(),/1 周/);
 await nav.getByRole('button',{name:'游戏',exact:true}).tap();
 for(const [game,name,columns,rows] of [['gomoku','五子棋',15,15],['xiangqi','象棋',9,10],['chess','国际象棋',8,8]]){
  await page.locator('.strategy-card').filter({has:page.locator('.strategy-art.'+game)}).tap();
  await page.getByRole('button',{name:'挑战机器人 · 初识',exact:true}).tap();
  await page.locator('.board-players').waitFor();
  for(const [width,height,font] of [[320,640,15],[390,844,22],[844,390,15]]){
   await page.setViewportSize({width,height});await page.evaluate(size=>document.documentElement.style.fontSize=size+'px',font);
   const sizes=await page.locator('.strategy-board').evaluate(el=>{
    const board=el.getBoundingClientRect(),cells=[...el.querySelectorAll('.board-cell')];
    return {board:{width:board.width,height:board.height},cells:cells.map(c=>{const b=c.getBoundingClientRect(),p=c.querySelector('.board-piece'),r=p?.getBoundingClientRect(),s=p&&getComputedStyle(p),outline=s&&s.outlineStyle!=='none'?parseFloat(s.outlineWidth):0;return {width:b.width,height:b.height,piece:r?{width:r.width,height:r.height,outline}:null,inside:b.left>=board.left&&b.right<=board.right+1&&b.bottom<=board.bottom+1,pieceFits:!r||r.width+2*outline<=b.width+1&&r.height+2*outline<=b.height+1};}),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   if(sizes.cells.length!==columns*rows||sizes.cells.some(c=>Math.abs(c.width-c.height)>1||!c.inside||!c.pieceFits)||sizes.overflow)failures.push(game+' '+width+'px: '+JSON.stringify({board:sizes.board,cell:sizes.cells[0]}));
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='15px');
  // Bottom/edge cells must remain reachable through the ordinary page scroll.
  const last=page.locator('.board-cell').last();await last.scrollIntoViewIfNeeded();assert(await last.isVisible());
  if(game!=='gomoku'){await last.tap();assert(await last.evaluate(el=>el.classList.contains('chosen')));}
  await page.getByRole('button',{name:'← 游戏库',exact:true}).tap();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log('PASS: history label/selection and three boards retain square cells, bounded pieces, reachable edges at phone/landscape sizes and large text.');
}finally{await browser.close();}
