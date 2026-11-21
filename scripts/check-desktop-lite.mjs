import assert from 'node:assert/strict';

export async function switchWorkspace(page,lite){
  const from=lite?'完整工作台':'极简版',to=lite?'极简版':'完整工作台';
  await page.getByRole('button',{name:'切换工作区，当前为'+from}).click({timeout:40000});
  const prompt=page.getByRole('dialog',{name:'切换工作区',exact:true});
  await prompt.getByRole('button',{name:'切换到'+to,exact:true}).click();
  await page.getByRole('button',{name:'切换工作区，当前为'+to}).waitFor();
}
export const openFullWorkspace=page=>switchWorkspace(page,false);

export async function checkLiteHome(page,native,{names,searchedInstance,capture,cold}){
  if(!cold)await switchWorkspace(page,true);
  const main=page.locator('main'),nav=page.getByRole('navigation',{name:'主导航'});
  const home=main.getByRole('heading',{name:'极简启动',exact:true}),full=main.getByRole('heading',{name:'启动游戏',exact:true});
  const liteLabel=page.getByRole('button',{name:'切换工作区，当前为极简版'}),prompt=page.getByRole('dialog',{name:'切换工作区'});
  await home.waitFor({timeout:40000});await liteLabel.waitFor();
  assert.deepEqual(await nav.getByRole('link').allTextContents(),['启动','下载','设置','更多']);
  await main.getByRole('heading',{name:names[0],exact:true}).waitFor();
  await capture('lite-start');

  await nav.getByRole('link',{name:'下载',exact:true}).click();
  await main.getByRole('heading',{name:'下载安装',exact:true}).waitFor();
  assert.equal(new URL(page.url()).hash,'#/lite/download');
  await nav.getByRole('link',{name:'设置',exact:true}).click();
  await main.locator('.memory-setting').waitFor();await page.reload();
  await main.locator('.memory-setting').waitFor();await liteLabel.waitFor();
  assert.equal(new URL(page.url()).hash,'#/lite/settings');
  await page.goBack();await main.getByRole('heading',{name:'下载安装',exact:true}).waitFor();
  const brandHome=page.getByRole('link',{name:'幻想镇首页'});
  assert.equal(await brandHome.locator('strong').textContent(),'幻想镇');
  assert.equal((await liteLabel.textContent()).trim(),'极简版');
  await brandHome.click();
  await home.waitFor();assert.equal(await prompt.count(),0);
  await main.getByRole('button',{name:'版本设置',exact:true}).click();
  await page.getByRole('dialog',{name:'实例配置'}).waitFor();await page.keyboard.press('Escape');
  const switcher=main.getByRole('button',{name:'版本选择',exact:true});
  const picker=page.getByRole('dialog',{name:'版本选择'}),search=picker.getByRole('textbox');
  await switcher.click();await picker.getByRole('button',{name:'下一页'}).click();
  await search.fill('does-not-match-any-instance');await picker.getByText('没有找到匹配的实例。',{exact:false}).waitFor();
  await search.press('Escape');await main.getByRole('heading',{name:names[0],exact:true}).waitFor();

  await page.getByRole('button',{name:'搜索实例或功能'}).click();
  const finder=page.getByRole('dialog',{name:'搜索极简版'});
  await finder.getByRole('textbox').fill('小游戏');await finder.getByText('极简版中没有匹配的实例或功能。').waitFor();
  await finder.getByRole('textbox').fill(searchedInstance);
  await finder.getByRole('button',{name:searchedInstance,exact:true}).click();
  await picker.waitFor();assert.equal(await search.inputValue(),searchedInstance);
  await picker.getByRole('button',{name:new RegExp(searchedInstance)}).click();
  await main.getByRole('heading',{name:searchedInstance,exact:true}).waitFor();
  assert.equal((await native('state',{localOnly:true})).value.settings.selectedInstance,searchedInstance);
  await main.getByRole('button',{name:'启动游戏',exact:true}).click();
  await page.getByRole('dialog',{name:'你的幻想镇身份'}).waitFor();await page.keyboard.press('Escape');

  await nav.getByRole('link',{name:'更多',exact:true}).click();
  await main.getByRole('link',{name:'账号与角色'}).click();
  await main.getByRole('heading',{name:'账号与角色',exact:true}).waitFor();await liteLabel.waitFor();
  assert.equal(new URL(page.url()).hash,'#/lite/account');
  await nav.getByRole('link',{name:'更多',exact:true}).click();
  await main.getByRole('link',{name:'切换到完整工作台'}).click();
  await prompt.getByRole('button',{name:'留在极简版'}).click();
  assert.equal(new URL(page.url()).hash,'#/lite/more');await liteLabel.waitFor();
  await nav.getByRole('link',{name:'启动',exact:true}).click();
  await main.getByRole('heading',{name:searchedInstance,exact:true}).waitFor();
  await openFullWorkspace(page);await full.waitFor();
  await main.locator('.resume-panel').getByText(searchedInstance,{exact:true}).waitFor();
  await page.goBack();await prompt.getByRole('button',{name:'留在完整工作台'}).click();
  assert.equal(new URL(page.url()).hash,'#/');

  await page.getByRole('link',{name:'外观',exact:true}).click();
  await page.getByRole('switch',{name:'默认打开极简版'}).check();
  await page.waitForFunction(async()=> (await window.launcher.invoke('state',{localOnly:true})).value.settings.liteStartup===true);
  await page.getByRole('link',{name:'幻想镇首页'}).click();
  assert.ok((await native('settings.save',{selectedInstance:names[1]})).ok);
  await page.reload();await full.waitFor();
  const entry=new URL(page.url());entry.hash='';
  await page.goto('about:blank');await page.goto(entry.href);await home.waitFor({timeout:40000});
  await openFullWorkspace(page);await full.waitFor();
  assert.ok((await native('settings.save',{liteStartup:false})).ok);
  await page.reload();await full.waitFor();
  console.log('Workspace boundary: independent addresses, refresh, history, scoped search, cancellation and explicit switch. Shared selection, guest gate and cold-start preference passed.');
}
