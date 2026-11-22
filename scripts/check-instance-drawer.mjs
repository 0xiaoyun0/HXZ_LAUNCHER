import assert from 'node:assert/strict';
import path from 'node:path';

export async function checkInstanceDrawer(page,artifacts,gameName='模组一服'){
  const nav=page.getByRole('navigation',{name:'主导航'});
  await nav.getByRole('link',{name:'游戏库',exact:true}).click();
  const card=page.locator('.direct-game-card').filter({has:page.getByRole('heading',{name:gameName,exact:true})});
  const open=card.getByRole('button',{name:'管理',exact:true});
  await open.click();
  const drawer=page.getByRole('dialog',{name:'实例管理'}),board=drawer.locator('[data-board=instance-overview]');
  await board.locator('[data-card-id]').first().waitFor();
  await drawer.getByRole('button',{name:'刷新实例状态'}).click();
  const issues=[];
  const font=await page.evaluate(async()=>(await window.launcher.invoke('state',{localOnly:true})).value.settings.fontSize??16);
  for(const [width,height,size] of [[1920,1032,font],[1250,825,font],[780,540,font],[780,540,22]]){
    await page.setViewportSize({width,height});
    if(size!==font){
      assert.ok(await page.evaluate(async n=>(await window.launcher.invoke('settings.save',{fontSize:n})).ok,size));
      await page.reload();await open.click();await board.waitFor();
    }
    await board.evaluate(async()=>{await document.fonts.ready;await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
    const metrics=await board.evaluate(root=>{
      const cards=[...root.querySelectorAll('[data-card-id]')],titles=[],gaps=[],headMargins=[];
      const rects=cards.map(c=>c.getBoundingClientRect());
      for(const [i,c] of cards.entries()){
        const heading=c.querySelector('header h2'),r=rects[i],label=heading.getBoundingClientRect();
        titles.push(Math.round(label.left-r.left));
        headMargins.push(parseFloat(getComputedStyle(heading.closest('header')).marginTop));
        const next=rects.filter(b=>b.top>=r.bottom-1&&Math.min(b.right,r.right)-Math.max(b.left,r.left)>8).sort((a,b)=>a.top-b.top)[0];
        if(next)gaps.push(Math.round(next.top-r.bottom));
      }
      const content=root.closest('.instance-content');
      const nested=cards.filter(c=>parseFloat(getComputedStyle(c.querySelector('.instance-block')).borderLeftWidth)>0).length;
      const grid=root.querySelector('[data-card-grid]'),runtime=root.querySelector('[data-card-id="panel-3"] .runtime-block'),files=root.querySelector('[data-card-id="panel-2"] .file-shortcuts');
      const defaultWide=grid.hasAttribute('data-packed')&&!grid.hasAttribute('data-custom');
      const balanced=!!runtime&&!!files&&(!defaultWide||runtime.getBoundingClientRect().top<files.getBoundingClientRect().top);
      return {titles,gaps,headMargins,nested,wide:content.scrollWidth-content.clientWidth,duplicate:root.querySelectorAll('.file-shortcuts h3').length,balanced};
    });
    if(metrics.titles.some(x=>x<12)||metrics.gaps.some(x=>x<8)||metrics.headMargins.some(x=>x!==0)||metrics.nested||metrics.wide>1||metrics.duplicate||!metrics.balanced)issues.push({width,height,size,...metrics});
    console.log('实例卡片实测',width,size,JSON.stringify(metrics));
    await page.screenshot({path:path.join(artifacts,'instance-overview-'+width+(size!==font?'-large':'')+'.png'),animations:'disabled'});
  }
  const scroll=drawer.locator('.instance-content'),grip=board.getByRole('button',{name:'拖动安装状态',exact:true});
  await grip.scrollIntoViewIfNeeded();
  const start=await grip.boundingBox(),area=await scroll.boundingBox(),scrollTop=await scroll.evaluate(el=>el.scrollTop);
  await page.mouse.move(start.x+start.width/2,start.y+start.height/2);await page.mouse.down();
  try{
    await page.mouse.move(start.x+start.width/2,area.y+area.height-4,{steps:8});
    await page.waitForFunction(top=>document.querySelector('.instance-content').scrollTop>top+20,scrollTop,{timeout:4000});
  }finally{await page.keyboard.press('Escape');await page.mouse.up();}
  await drawer.waitFor();await board.locator('.card-drag-preview').waitFor({state:'hidden'});
  await scroll.evaluate(el=>el.scrollTo(0,0));
  await board.locator('.board-card-heading').first().hover();await page.mouse.wheel(0,450);
  await page.waitForFunction(()=>document.querySelector('.instance-content').scrollTop>0);
  await drawer.getByRole('button',{name:'日志',exact:true}).click();
  await drawer.locator('.instance-log-panel').waitFor();
  await drawer.getByRole('button',{name:'概览',exact:true}).click();await board.waitFor();
  await drawer.locator('.instance-tabs').getByRole('button',{name:'卡片',exact:true}).click();
  const manage=page.getByRole('dialog',{name:'整理本页卡片'});await manage.waitFor();await page.keyboard.press('Escape');await manage.waitFor({state:'hidden'});
  await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
  assert.ok(await open.evaluate(el=>el===document.activeElement));
  const layouts=await page.evaluate(async()=>(await window.launcher.invoke('state',{localOnly:true})).value.settings.cardLayouts);
  const key='instance-overview.compact';
  try{
    const saved=await page.evaluate(async cardLayouts=>window.launcher.invoke('settings.save',{cardLayouts}),{...layouts,[key]:{...layouts?.[key],hidden:['panel-2'],locked:['panel-3']}});
    assert.ok(saved.ok,saved.error);await page.reload();await open.click();
    await drawer.locator('[data-card-id="panel-3"][data-locked] .runtime-block').waitFor();
    assert.equal(await drawer.locator('.file-shortcuts').count(),0);
    await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
  }finally{
    await page.evaluate(async({cardLayouts,fontSize})=>window.launcher.invoke('settings.save',{cardLayouts,fontSize}),{cardLayouts:layouts??{},fontSize:font});
  }
  await page.setViewportSize({width:1250,height:825});
  assert.deepEqual(issues,[],'实例抽屉的标题边距、卡间距、单层边框和滚动边界');
  console.log('实例管理抽屉通过，宽度 1920 / 1250 / 780，概览与日志往返。');
}
