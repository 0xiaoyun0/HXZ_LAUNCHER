import assert from 'node:assert/strict';

export async function checkFirstVisit(page,native,capture,lite=false){
  const home=lite?'/lite':'/';
  await native('settings.save',{onboardingDone:false,fontSize:16});
  await page.evaluate(p=>{location.hash=p;},home);
  await page.setViewportSize({width:1250,height:825});await page.reload();
  const entry=page.getByRole('dialog',{name:'登录幻想镇'}),guest=entry.getByRole('button',{name:'先以游客身份浏览'});
  await guest.waitFor();await entry.locator('.welcome-picture img').evaluate(img=>img.decode());
  await capture('entry-sign-in');
  assert.ok(await entry.getByRole('button',{name:'登录幻想镇'}).isDisabled());
  await entry.getByRole('textbox',{name:'邮箱或用户名'}).fill('guide-fixture');
  await entry.getByLabel('密码',{exact:true}).fill('only-a-test');
  await entry.getByRole('button',{name:'显示密码'}).click();
  assert.equal(await entry.locator('input[name=password]').getAttribute('type'),'text');
  await entry.getByRole('button',{name:'隐藏密码'}).click();
  await native('settings.save',{fontSize:22});await page.setViewportSize({width:780,height:540});await page.reload();
  await guest.waitFor();await guest.scrollIntoViewIfNeeded();assert.ok(await guest.isVisible());
  assert.ok(await entry.locator('.welcome-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
  assert.equal(await entry.evaluate(el=>el.getAnimations({subtree:true}).some(a=>a.effect?.getTiming().duration>1)),false);
  await guest.click();await entry.waitFor({state:'hidden'});
  const tour=page.getByRole('complementary',{name:'新手引导'});
  await tour.getByRole('heading',{name:'选择游戏实例'}).waitFor();await capture('entry-guide');
  await tour.getByRole('button',{name:'下一步'}).click();await tour.getByRole('heading',{name:'安装游戏'}).waitFor();
  assert.equal(new URL(page.url()).hash,lite?'#/lite/download':'#/workshop/install');
  await tour.getByRole('button',{name:'上一步'}).click();await tour.getByRole('heading',{name:'选择游戏实例'}).waitFor();
  await tour.getByRole('button',{name:'下一步'}).click();await tour.getByRole('button',{name:'下一步'}).click();
  await tour.getByRole('heading',{name:'调整启动设置'}).waitFor();await page.locator('.memory-setting').waitFor();
  await tour.getByRole('button',{name:'完成引导'}).click();await tour.waitFor({state:'hidden'});
  assert.equal((await native('state',{localOnly:true})).value.settings.onboardingDone,true);
  await native('settings.save',{fontSize:16});await page.setViewportSize({width:1250,height:825});await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('link',{name:'幻想镇首页'}).click();await page.reload();await page.locator('.launcher-frame main h1').first().waitFor();
  assert.equal(await entry.count(),0);assert.equal(await tour.count(),0);
  if(lite){
    await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'设置'}).click();
    await page.getByRole('navigation',{name:'极简设置分类'}).getByRole('link',{name:'启动器'}).click();
  }else{
    await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('link',{name:'帮助与反馈',exact:true}).click();
  }
  await page.getByRole('link',{name:'新手引导'}).click();await tour.getByRole('button',{name:'跳过引导'}).click();await tour.waitFor({state:'hidden'});
  console.log('首次登录、最小窗大字号、显示密码、游客、三步导航、完成/跳过/重看和减少动态效果通过。');
}
