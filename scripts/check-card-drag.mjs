import assert from 'node:assert/strict';

export async function checkCardDrag(page){
  await page.setViewportSize({width:1250,height:825});
  const handle=page.getByRole('button',{name:'拖动我的角色',exact:true});
  await handle.scrollIntoViewIfNeeded();
  const original=await page.evaluate(async()=>(await window.launcher.invoke('state',{localOnly:true})).value.settings.cardLayouts);
  await page.evaluate(()=>{
    const samples=new Set();let frame;
    const tick=()=>{for(const animation of document.getAnimations())if(animation.id.startsWith('card-settle-'))samples.add(animation.id);frame=requestAnimationFrame(tick);};
    tick();window.dragMotionSample=()=>[...samples];window.stopDragMotionSample=()=>cancelAnimationFrame(frame);
  });
  const box=await handle.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  if(process.env.HXZ3_CAPTURE_MOTION)await page.waitForTimeout(380);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y+8);
  await page.locator('.card-drag-preview').waitFor();
  await page.evaluate(()=>{
    const grid=document.querySelector('[data-card-grid][data-dragging]'),read=grid.getBoundingClientRect;
    let reads=0,frame=0,last=performance.now();const gaps=[];
    grid.getBoundingClientRect=function(){reads++;return read.call(this);};
    const tick=time=>{if(time>last)gaps.push(time-last);last=time;frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);
    window.finishDragSample=()=>{cancelAnimationFrame(frame);delete grid.getBoundingClientRect;gaps.sort((a,b)=>a-b);return {frames:gaps.length,p95:+(gaps[Math.floor(gaps.length*.95)]||0).toFixed(1),worst:+(gaps.at(-1)||0).toFixed(1),boardReads:reads};};
  });
  for(const delta of [78,150,235,102,27,178,18])await page.mouse.move(x+delta,y+12+delta*.2,{steps:12});
  const stats=await page.evaluate(()=>window.finishDragSample());
  await page.keyboard.press('Escape');await page.mouse.up();
  await page.locator('.card-drag-preview').waitFor({state:'hidden'});
  console.log('原生连续拖动（84 个移动事件）',JSON.stringify(stats));
  assert.ok(stats.frames>0&&stats.boardReads<=3,'连续拖动重复测量了整个网格 '+stats.boardReads+' 次');
  await page.waitForFunction(()=>window.dragMotionSample().includes('card-settle-return'));
  assert.deepEqual(await page.evaluate(async()=>(await window.launcher.invoke('state',{localOnly:true})).value.settings.cardLayouts),original);
  await page.waitForFunction(()=>!document.getAnimations().some(a=>a.id==='card-settle-return'));

  // Change tracks, then release between grid lines so the actual card has a visible snap distance.
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+227,y+82,{steps:22});
  if(process.env.HXZ3_CAPTURE_MOTION)await page.waitForTimeout(280);
  const preview=page.locator('.card-drag-preview');
  assert.ok(await preview.evaluate(el=>getComputedStyle(el).transitionProperty.includes('transform')));
  assert.equal(await page.locator('[data-card-id][data-gesture]').evaluate(el=>getComputedStyle(el).transitionProperty),'none');
  await page.mouse.up();
  await page.waitForFunction(()=>window.dragMotionSample().includes('card-settle-drop'));
  if(process.env.HXZ3_CAPTURE_MOTION)await page.waitForTimeout(540);
  const undo=page.getByRole('button',{name:'撤销',exact:true});await undo.click();
  await page.waitForFunction(async initial=>JSON.stringify((await window.launcher.invoke('state',{localOnly:true})).value.settings.cardLayouts)===JSON.stringify(initial),original);
  const size=page.getByRole('button',{name:'调整大小我的角色',exact:true});
  await size.scrollIntoViewIfNeeded();
  const corner=await size.boundingBox(),sx=corner.x+corner.width*.5,sy=corner.y+corner.height*.5;
  await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+98,sy+76,{steps:24});
  await preview.waitFor();await page.mouse.up();
  await page.locator('[data-card-id=roles][data-fixed][data-landed]').waitFor();
  if(process.env.HXZ3_CAPTURE_MOTION)await page.waitForTimeout(340);
  await undo.click();await page.locator('[data-card-id=roles]:not([data-fixed])').waitFor();
  await page.evaluate(()=>window.stopDragMotionSample());
}
