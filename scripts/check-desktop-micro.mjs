import {checkPlayerActionMotion} from './check-player-action-motion.mjs';
import {checkCardDrag} from './check-card-drag.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function recordInteractions(page,exercise){
  if(!process.env.HXZ3_CAPTURE_MOTION)return exercise();
  const dest=path.resolve(process.env.HXZ3_CAPTURE_MOTION);
  await fs.mkdir(dest,{recursive:true});
  const session=await page.context().newCDPSession(page),frames=[];
  session.on('Page.screencastFrame',({data,sessionId,metadata})=>{
    frames.push({data,time:metadata.timestamp});
    void session.send('Page.screencastFrameAck',{sessionId}).catch(()=>{});
  });
  await session.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:1250,maxHeight:825,everyNthFrame:1});
  try{await exercise();}finally{
    await session.send('Page.stopScreencast');await session.detach();
    const timeline=[];
    for(const [i,frame] of frames.entries()){
      const name=String(i).padStart(5,'0')+'.jpg';
      await fs.writeFile(path.join(dest,name),Buffer.from(frame.data,'base64'));
      timeline.push({name,time:frame.time});
    }
    await fs.writeFile(path.join(dest,'frames.json'),JSON.stringify(timeline));
  }
}

export async function checkMicroInteractions(page,native,capture){
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1250,height:825});
  const mainNav=page.getByRole('navigation',{name:'主导航'});
  const shortcuts=page.getByRole('navigation',{name:'快捷导航'});
  const original=(await native('state',{localOnly:true})).value.settings;
  await mainNav.getByRole('link',{name:'游戏',exact:true}).click();await page.locator('#workspace-main .game-home').waitFor();
  await mainNav.getByRole('link',{name:'游戏库',exact:true}).click();await page.locator('#workspace-main .play-library').waitFor();
  await page.goBack();await page.locator('#workspace-main[data-page-direction=back] .game-home').waitFor();
  await page.goForward();await page.locator('#workspace-main[data-page-direction=forward]').waitFor();
  assert.equal(new URL(page.url()).hash,'#/library');
  const search=page.getByRole('button',{name:'搜索实例或功能',exact:true}),hint=page.getByRole('tooltip');
  await search.hover();await hint.getByText(/Ctrl K/).waitFor();
  assert.ok(await hint.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}));
  await page.keyboard.press('Escape');await hint.waitFor({state:'hidden'});

  await page.evaluate(()=>{
    let frame;const empty=[],openings=new Set(),visited=new Set();
    const sample=()=>{
      const route=location.hash,main=document.querySelector('#workspace-main');
      if(main&&['#/music','#/arcade'].includes(route)){
        visited.add(route);
        const content=[...main.querySelectorAll('h1,h2,[role=status],.game-catalog-grid,.game-overlay')].some(el=>el.getClientRects().length>0);
        if(!content&&!empty.includes(route))empty.push(route);
        if(main.querySelector('.module-opening'))openings.add(route);
      }
      frame=requestAnimationFrame(sample);
    };
    frame=requestAnimationFrame(sample);
    window.finishModulePaintCheck=()=>{cancelAnimationFrame(frame);return {empty,visited:[...visited],openings:[...openings]};};
  });
  await recordInteractions(page,async()=>{
    await mainNav.getByRole('link',{name:'游戏',exact:true}).click();
    await checkCardDrag(page);await checkPlayerActionMotion(page,native,capture);
    await mainNav.getByRole('link',{name:'游戏',exact:true}).click();
    await shortcuts.getByRole('link',{name:'音乐播放器',exact:true}).click();
    const modes=page.getByRole('radiogroup',{name:'播放模式'});
    const volume=page.getByRole('slider',{name:'音量',exact:true});
    await volume.waitFor();
    await page.locator('.play-buttons').getByRole('button',{name:'播放',exact:true}).click();
    await page.locator('.play-morph[data-playing=true]').waitFor();
    await page.locator('.play-buttons').getByRole('button',{name:'暂停',exact:true}).click();
    await page.locator('.play-morph[data-playing=false]').waitFor();
    await modes.getByRole('radio',{name:'列表循环',exact:true}).click();
    await modes.getByRole('radio',{name:'随机播放',exact:true}).click();
    await modes.locator('input[value=shuffle]:checked').waitFor({state:'attached'});
    assert.equal(await modes.getAttribute('data-direction'),'right');
    await modes.getByRole('radio',{name:'单曲循环',exact:true}).click();
    await modes.locator('input[value=single]:checked').waitFor({state:'attached'});
    assert.equal(await modes.getAttribute('data-direction'),'left');
    const box=await volume.boundingBox(),x=box.x+box.width*.18,y=box.y+box.height*.5;
    await volume.evaluate(el=>{
      const bars=el.parentElement.querySelector('.wake-bars');
      const observer=new MutationObserver(()=>{if([...bars.children].some(i=>Number(i.style.getPropertyValue('--wake-height'))>.35)){el.dataset.sawWake='true';observer.disconnect();}});
      observer.observe(bars,{subtree:true,attributes:true,attributeFilter:['style']});
    });
    await page.mouse.move(x,y);await page.mouse.down();
    for(const fraction of [.35,.55,.78,.88,.7,.58]){
      await page.mouse.move(box.x+box.width*fraction,y,{steps:6});
    }
    await page.mouse.up();
    assert.equal(await volume.getAttribute('data-saw-wake'),'true');
    const before=Number(await volume.inputValue());await volume.focus();await page.keyboard.press('ArrowRight');
    const after=Number(await volume.inputValue());assert.ok(after>before);
    await page.waitForFunction(async value=>(await window.launcher.invoke('state',{localOnly:true})).value.settings.musicVolume===value,after);
    await page.locator('#workspace-main').evaluate(el=>el.scrollTo({top:0,behavior:'instant'}));
    await search.hover();await hint.waitFor();await capture('micro-music');
    await page.keyboard.press('Escape');await search.click();
    await page.getByRole('dialog').getByRole('textbox').fill('内存');
    await page.keyboard.press('Escape');
    await mainNav.getByRole('link',{name:'小游戏',exact:true}).click();
    const favorite=page.locator('.game-catalog-card .game-favorite').first();
    await favorite.click();await page.getByRole('button',{name:'我的收藏',exact:true}).click();
    assert.equal(await page.locator('.game-catalog-card').count(),1);
    await favorite.click();await page.getByRole('button',{name:'全部游戏',exact:true}).click();
    await shortcuts.getByRole('link',{name:'音乐播放器',exact:true}).click();
  });

  const paint=await page.evaluate(()=>window.finishModulePaintCheck());
  assert.deepEqual(paint.empty,[],'音乐和小游戏加载时每一帧都应保留页面内容');
  assert.equal(paint.visited.length,2);console.log('原生扩展首帧覆盖',paint);
  const modes=page.getByRole('radiogroup',{name:'播放模式'});
  await page.evaluate(()=>{
    const previous=window.launcher.invoke;
    window.launcher.invoke=async function(action,input){
      if(action==='settings.save'&&input.musicPlayMode){
        window.launcher.invoke=previous;
        return {ok:false,error:'EACCES: permission denied while saving settings'};
      }
      return previous.call(this,action,input);
    };
  });
  await modes.getByRole('radio',{name:'随机播放',exact:true}).click();
  const notice=page.locator('.third-toast.error');await notice.waitFor();
  assert.equal(await modes.getByRole('radio',{name:'单曲循环'}).isChecked(),true);
  await notice.hover();await page.waitForFunction(()=>document.querySelector('.third-toast')?.hasAttribute('data-paused'));
  assert.equal(await notice.locator('.notice-fuse').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
  await notice.getByRole('button',{name:'关闭提示'}).focus();await page.mouse.move(5,5);
  assert.equal(await notice.getAttribute('data-paused'),'');
  // Real errors expire after 12 seconds. Keeping keyboard focus must suspend the actual timer.
  await page.waitForTimeout(12100);assert.ok(await notice.isVisible());
  await capture('micro-recovery');await page.keyboard.press('Enter');await notice.waitFor({state:'hidden'});
  await modes.getByRole('radio',{name:'随机播放',exact:true}).click();
  await modes.locator('input[value=shuffle]:checked').waitFor({state:'attached'});

  await page.getByRole('button',{name:'设置',exact:true}).click();
  const memory=page.getByRole('spinbutton',{name:'最大内存 MB'});
  await page.getByRole('radio',{name:'手动设置',exact:true}).click();await memory.waitFor();
  const initial=await memory.inputValue(),unit=page.locator('.scrub-unit');
  await unit.scrollIntoViewIfNeeded();
  const box=await unit.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+25,y,{steps:5});
  assert.ok(Number(await memory.inputValue())>Number(initial));
  await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await memory.inputValue(),initial);
  assert.equal((await native('state',{localOnly:true})).value.settings.defaultMemoryMB,original.defaultMemoryMB);

  await mainNav.getByRole('link',{name:'小游戏',exact:true}).click();
  const shelf=page.locator('.game-catalog-card').first();
  await shelf.locator('img[data-refine=ready]').waitFor();
  const star=shelf.locator('.game-favorite'),was=await star.getAttribute('aria-pressed');
  await star.click();assert.notEqual(await star.getAttribute('aria-pressed'),was);await star.click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
  await star.click();assert.equal(await star.locator('svg').evaluate(el=>el.getAnimations().length),0);await star.click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  const saved=await native('settings.save',{musicVolume:original.musicVolume,musicPlayMode:original.musicPlayMode||'list'});
  assert.ok(saved.ok);await page.reload();
  console.log('原生音乐拖动与键盘持久化、双向弹性选中、图标提示、错误停留与恢复、内存拖动取消、封面收藏及减少动效通过。');
}
