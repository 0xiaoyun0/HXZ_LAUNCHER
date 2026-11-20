import assert from 'node:assert/strict';
import path from 'node:path';

export async function verifyWorkspaces(page,directory){
  const home=page.getByRole('link',{name:'游戏',exact:true}),board=page.locator('[data-board=home]');
  const settings=()=>page.getByRole('link',{name:'外观',exact:true}).click(),panel=name=>page.getByRole('navigation',{name:'外观设置分区'}).getByRole('button',{name,exact:true}).click();
  const shot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(directory,'workspace-'+name+'.png'),animations:'disabled'});};
  const select=async(id,name)=>{
    await page.getByRole('button',{name:'使用'+name,exact:true}).click();
    await page.waitForFunction(id=>document.querySelector('.launcher-frame')?.dataset.workspace===id,id);
  };
  await home.click();await settings();await page.locator('.workspace-choice').first().waitFor();await shot('settings');
  for(const [id,name] of [['classic','经典工作台'],['library','实例控制台'],['journal','游玩手记']]){
    await select(id,name);await home.click();await board.locator('.featured-game').waitFor();await board.locator('.calendar-grid').waitFor();
    const [role,games,calendar,detail]=await Promise.all(['.home-role-card','.instances-card','.calendar-card','.home-detail-card'].map(selector=>board.locator(selector).boundingBox()));
    if(id==='classic')assert.ok(role.x<games.x&&calendar.y>games.y);
    if(id==='library'){
      assert.ok(detail.x>games.x&&games.width>detail.width);
      await board.getByRole('button',{name:'收藏',exact:true}).click();
      assert.equal(await board.locator('.featured-game').count(),0);
      await board.getByRole('button',{name:'全部',exact:true}).click();
    }
    if(id==='journal'){assert.ok(calendar.x>games.x&&Math.abs(calendar.y-games.y)<2);await board.locator('.journal-entries a').first().waitFor();}
    await shot(id);
    if(id!=='classic'){
      const surface=id==='library'?['observatory','星海观测站']:['paper','纸上工坊'];
      await settings();await panel('颜色与窗格');await page.getByRole('button',{name:'使用'+surface[1]}).click();
      await page.waitForFunction(skin=>document.documentElement.dataset.skin===skin,surface[0]);await home.click();await board.locator('.calendar-grid').waitFor();
      await shot(id+'-surface');await settings();await panel('颜色与窗格');await page.getByRole('button',{name:'使用小镇微光'}).click();
      await page.waitForFunction(()=>document.documentElement.dataset.skin==='town');await home.click();
    }
    if(id==='library'){
      await page.getByRole('link',{name:'游戏库',exact:true}).first().click();
      await page.locator('.direct-game-grid[data-view=list] .direct-game-card').first().waitFor();
      await shot('library-list');await page.getByLabel('游戏库视图').selectOption('cards');
      await page.locator('.direct-game-grid[data-view=cards]').waitFor();await page.reload();
      await page.locator('.direct-game-grid[data-view=cards]').waitFor();await page.getByLabel('游戏库视图').selectOption('auto');
      await page.locator('.direct-game-grid[data-view=list]').waitFor();await home.click();
    }
    await page.setViewportSize({width:780,height:540});
    await board.locator('.game-board:not([data-columns]) > .instances-card .resume-panel .launch-primary').waitFor();
    const action=await board.locator('.game-board > .instances-card .resume-panel .launch-primary').boundingBox();
    assert.ok(action.y+action.height<504&&action.x>=0&&action.x+action.width<=780);
    if(id==='journal')await shot('compact');
    await page.setViewportSize({width:1360,height:880});await board.locator('.game-board[data-columns]').waitFor();await settings();
  }
  await page.getByRole('button',{name:'整理布局'}).click();
  const shelf=page.getByRole('dialog');await shelf.getByRole('switch',{name:'保留游玩手记'}).uncheck();
  await shelf.getByRole('button',{name:'完成'}).click();await page.getByRole('button',{name:'使用游玩手记'}).waitFor({state:'detached'});
  await page.getByRole('button',{name:'整理布局'}).click();await shelf.getByRole('switch',{name:'保留游玩手记'}).check();await shelf.getByRole('button',{name:'完成'}).click();
  await select('library','实例控制台');await home.click();await board.getByRole('button',{name:'我的角色卡片选项'}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('显示我的角色').uncheck();await dialog.getByRole('button',{name:'完成'}).click();
  await board.locator('.home-role-card').waitFor({state:'detached'});
  await settings();await select('classic','经典工作台');await home.click();await board.locator('.home-role-card').waitFor();
  await settings();await select('library','实例控制台');await home.click();assert.equal(await board.locator('.home-role-card').count(),0);
  await board.getByRole('button',{name:'卡片',exact:true}).click();await dialog.getByRole('button',{name:'恢复默认布局'}).click();await dialog.getByLabel('显示我的角色').check();await dialog.getByRole('button',{name:'完成'}).click();
  await settings();await select('classic','经典工作台');
  const toggle=name=>page.getByRole('switch',{name,exact:true});
  for(const name of ['上次游玩焦点','顶栏快捷导航','底栏音乐控制'])await toggle(name).uncheck();
  await toggle('首页快捷入口').check();await page.reload();await home.click();
  assert.equal(await board.locator('.featured-game').count(),0);await board.locator('.resume-panel .launch-primary').waitFor();
  assert.equal(await page.locator('.bar-shortcuts,.launcher-mini').count(),0);await board.getByRole('navigation',{name:'首页快捷入口'}).getByRole('link',{name:'音乐播放器'}).click();
  await page.locator('[data-board=music]').waitFor();await home.click();await settings();
  for(const name of ['上次游玩焦点','顶栏快捷导航','底栏音乐控制'])await toggle(name).check();
  await toggle('首页快捷入口').uncheck();
  await panel('壁纸');await page.getByRole('button',{name:'静态图片',exact:true}).click();
  await page.getByRole('button',{name:'星海遗迹',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.launcher-wallpaper img')?.src.endsWith('adventure.webp'));
  await panel('颜色与窗格');await page.getByRole('button',{name:'使用纸上工坊'}).click();
  await page.reload();await page.waitForFunction(()=>document.querySelector('.launcher-wallpaper img')?.naturalWidth>0);
  assert.match(await page.locator('.launcher-wallpaper img').getAttribute('src'),/adventure\.webp$/);
  await page.getByRole('button',{name:'使用小镇微光'}).click();await panel('壁纸');
  const missing='http://hxz-media.localhost/a1b2c3d4-0000-4321-9876-123456789012.png';
  const missingResult=await page.evaluate(async value=>window.launcher.invoke('settings.save',{wallpaperMode:'image',wallpaperImageSource:'file',backgroundImage:value}),missing);
  assert.ok(missingResult.ok);await page.reload();await page.locator('.wallpaper-recovery').waitFor();
  await page.getByRole('button',{name:'重试',exact:true}).click();await page.locator('.wallpaper-recovery').waitFor();
  await page.getByRole('button',{name:'暮色小镇',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.launcher-wallpaper img')?.naturalWidth>0);
  await page.getByRole('button',{name:'纯色',exact:true}).click();await page.locator('.launcher-wallpaper img').waitFor({state:'detached'});await home.click();
  console.log('三套首页、分布局卡片、自选模块、独立壁纸、坏文件恢复及最小窗口通过');
}
