import assert from 'node:assert/strict';

export async function switchWorkspace(page,lite){
  const desired=lite?'lite':'full';
  if(await page.locator('.launcher-frame').getAttribute('data-shell')===desired)return;
  if(lite)await page.getByRole('button',{name:'设置',exact:true}).click();
  else {
    await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'设置',exact:true}).click();
    await page.getByRole('navigation',{name:'极简设置分类'}).getByRole('link',{name:'启动器',exact:true}).click();
  }
  await page.getByRole('button',{name:'切换到'+(lite?'极简版':'完整工作台'),exact:true}).click({timeout:40000});
  await page.locator('.launcher-frame[data-shell='+desired+']').waitFor();
}
export const openFullWorkspace=page=>switchWorkspace(page,false);

export async function checkLiteHome(page,native,{names,searchedInstance,capture,cold}){
  if(!cold)await switchWorkspace(page,true);
  const main=page.locator('main'),nav=page.getByRole('navigation',{name:'主导航'});
  const home=main.getByRole('heading',{name:'极简启动',exact:true}),full=main.getByRole('heading',{name:'启动游戏',exact:true});
  const liteLabel=page.locator('.launcher-frame[data-shell=lite]'),prompt=page.getByRole('dialog',{name:'切换工作区'});
  await home.waitFor({timeout:40000});await liteLabel.waitFor();
  assert.deepEqual(await nav.getByRole('link').allTextContents(),['启动','下载','设置']);
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
  assert.equal((await page.locator('.launcher-brand').innerText()).trim(),'幻想镇');
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
  await page.getByRole('dialog',{name:'登录幻想镇'}).waitFor();await page.keyboard.press('Escape');

  await nav.getByRole('link',{name:'设置',exact:true}).click();
  await main.getByRole('link',{name:'账号与角色'}).click();
  await main.getByRole('heading',{name:'账号与角色',exact:true}).waitFor();await liteLabel.waitFor();
  assert.equal(new URL(page.url()).hash,'#/lite/settings/account');
  await nav.getByRole('link',{name:'下载',exact:true}).click();
  await main.getByRole('link',{name:'模组与资源'}).click();
  await main.getByRole('button',{name:'切换实例'}).click();
  await picker.getByRole('textbox').fill(names[0]);await picker.getByRole('button',{name:new RegExp(names[0])}).first().click();
  await main.locator('.resource-target strong').filter({hasText:names[0]}).waitFor();
  await main.getByRole('button',{name:'切换实例'}).click();await picker.getByRole('textbox').fill(searchedInstance);
  await picker.getByRole('button',{name:new RegExp(searchedInstance)}).click();
  assert.equal(new URL(page.url()).hash,'#/lite/download/addons');
  await nav.getByRole('link',{name:'启动',exact:true}).click();
  await main.getByRole('heading',{name:searchedInstance,exact:true}).waitFor();
  await openFullWorkspace(page);await full.waitFor();
  await main.locator('.resume-panel').getByText(searchedInstance,{exact:true}).waitFor();
  await page.goBack();await prompt.getByRole('button',{name:'留在完整工作台'}).click();
  assert.equal(new URL(page.url()).hash,'#/');

  await switchWorkspace(page,true);
  await page.waitForFunction(async()=> (await window.launcher.invoke('state',{localOnly:true})).value.settings.liteStartup===true);
  await page.getByRole('link',{name:'幻想镇首页'}).click();
  assert.ok((await native('settings.save',{selectedInstance:names[1]})).ok);
  await page.reload();await home.waitFor();
  const entry=new URL(page.url());entry.hash='';
  await page.goto('about:blank');await page.goto(entry.href);await home.waitFor({timeout:40000});
  await openFullWorkspace(page);await full.waitFor();
  assert.ok((await native('settings.save',{liteStartup:false})).ok);
  await page.reload();await full.waitFor();
  console.log('单一启动入口、设置切换与冷启动记忆、共用实例、同页资源切换、历史返回和游客登录门禁均通过。');
}
