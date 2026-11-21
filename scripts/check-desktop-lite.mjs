import assert from 'node:assert/strict';

export async function openFullWorkspace(page){
  await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'更多',exact:true}).click();
  await page.getByRole('navigation',{name:'启动器工具'}).getByRole('link',{name:'完整工作台',exact:true}).click();
}

export async function checkLiteHome(page,native,{names,searchedInstance,capture,cold}){
  if(!cold)await page.getByRole('link',{name:'极简版',exact:true}).click({timeout:40000});
  const main=page.locator('main'),nav=page.getByRole('navigation',{name:'主导航'});
  const heading=main.getByRole('heading',{name:'极简启动',exact:true});
  await heading.waitFor({timeout:40000});
  assert.deepEqual(await nav.getByRole('link').allTextContents(),['启动','下载','设置','更多']);
  await main.getByRole('heading',{name:names[0],exact:true}).waitFor();
  await capture('lite-start');
  await nav.getByRole('link',{name:'下载',exact:true}).click();
  await main.getByRole('heading',{name:'下载与安装',exact:true}).waitFor();
  assert.match(page.url(),/#\/workshop\/install$/);
  await nav.getByRole('link',{name:'设置',exact:true}).click();
  await main.locator('.memory-setting').waitFor();
  await nav.getByRole('link',{name:'启动',exact:true}).click();
  await main.getByRole('heading',{name:names[0],exact:true}).waitFor();
  const switcher=main.getByRole('button',{name:'版本选择',exact:true});
  await main.getByRole('button',{name:'版本设置',exact:true}).click();
  await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
  await switcher.click();
  const picker=page.getByRole('dialog',{name:'版本选择'}),search=picker.getByRole('textbox');
  await picker.getByRole('button',{name:'下一页'}).click();
  await search.fill('does-not-match-any-instance');
  await picker.getByText('没有找到匹配的实例。',{exact:false}).waitFor();
  await search.press('Escape');
  await main.getByRole('heading',{name:names[0],exact:true}).waitFor();
  await switcher.click();await search.fill(searchedInstance);
  await picker.getByRole('button',{name:new RegExp(searchedInstance)}).click();
  await main.getByRole('heading',{name:searchedInstance,exact:true}).waitFor();
  assert.equal((await native('state')).value.settings.selectedInstance,searchedInstance);
  await main.getByRole('button',{name:'启动游戏',exact:true}).click();
  const login=page.getByRole('dialog');await login.waitFor();await page.keyboard.press('Escape');
  await nav.getByRole('link',{name:'更多',exact:true}).click();
  await page.getByRole('navigation',{name:'启动器工具'}).getByRole('link',{name:'游戏库',exact:true}).click();
  await main.locator('.play-library').waitFor();
  await nav.getByRole('link',{name:'启动',exact:true}).click();
  await main.getByRole('heading',{name:searchedInstance,exact:true}).waitFor();
  await openFullWorkspace(page);
  await main.getByRole('heading',{name:'启动游戏',exact:true}).waitFor();
  await page.getByRole('link',{name:'外观',exact:true}).click();
  const preference=page.getByRole('switch',{name:'默认打开极简版'});
  await preference.check();
  await page.waitForFunction(async()=> (await window.launcher.invoke('state',{localOnly:true})).value.settings.liteStartup===true);
  await page.getByRole('link',{name:'幻想镇首页'}).click();
  assert.ok((await native('settings.save',{selectedInstance:names[1]})).ok);
  await page.reload();await heading.waitFor();
  await openFullWorkspace(page);
  await main.getByRole('heading',{name:'启动游戏',exact:true}).waitFor();
  assert.ok((await native('settings.save',{liteStartup:false})).ok);
  await page.reload();await main.getByRole('heading',{name:'启动游戏',exact:true}).waitFor();
  console.log('Lite launcher: resume, keyboard cancellation, paged search, persisted selection, guest sign-in, default entry and return to full verified.');
}
