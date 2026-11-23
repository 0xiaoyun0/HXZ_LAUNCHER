import assert from 'node:assert/strict';

export async function checkPlayerActionMotion(page,native,capture){
  const nav=page.getByRole('navigation',{name:'主导航'});
  await nav.getByRole('link',{name:'游戏',exact:true}).click();
  await page.getByRole('button',{name:'添加账号',exact:true}).click();
  const entry=page.locator('.entry-dialog');
  await entry.getByRole('textbox',{name:'邮箱或用户名'}).fill('林间旅人');
  await entry.getByRole('button',{name:'注册',exact:true}).click();
  await entry.getByRole('heading',{name:'创建皮肤站账号'}).waitFor();await capture('windows-register');
  await page.evaluate(()=>{
    const original=window.launcher.invoke;window.entryTargets=[];
    window.launcher.invoke=async function(action,input){
      if(action==='external.open'){
        window.entryTargets.push(input.url);
        if(window.entryTargets.length===1)return {ok:false,error:'无法打开默认浏览器'};
        window.launcher.invoke=original;return {ok:true,value:true};
      }
      return original.call(this,action,input);
    };
  });
  const register=entry.getByRole('button',{name:'前往皮肤站注册'});await register.click();await entry.getByRole('alert').waitFor();
  await register.click();await entry.getByText('已请求浏览器打开注册页').waitFor();
  assert.deepEqual(await page.evaluate(()=>window.entryTargets),Array(2).fill('https://skin.hxzmc.top/auth/register'));
  await entry.getByRole('button',{name:'已有账号，返回登录'}).click();
  assert.equal(await entry.getByRole('textbox',{name:'邮箱或用户名'}).inputValue(),'林间旅人');
  assert.ok(await entry.getByRole('textbox',{name:'邮箱或用户名'}).evaluate(el=>el===document.activeElement));
  await capture('windows-login');await entry.getByRole('button',{name:'返回上一页'}).click();await entry.waitFor({state:'hidden'});

  const row=page.locator('.desk-instance-list .home-instance-row').first(),id=await row.getAttribute('data-flow-key');
  await row.locator('.instance-info').click();
  assert.equal(await page.locator('.home-detail-card .instance-swap').getAttribute('data-instance'),id);
  await page.getByRole('button',{name:'一年',exact:true}).click();
  await page.locator('.calendar-chart[data-range="52"] .calendar-sweep').waitFor();
  await page.getByRole('button',{name:'半年',exact:true}).click();

  // Keep the actual WebView snapshot open long enough to resize during its update.
  // The browser can discard that frame; the route and its controls still have to work.
  const viewport=await page.evaluate(()=>{
    const start=document.startViewTransition.bind(document);
    document.startViewTransition=callback=>{
      document.startViewTransition=start;
      return start(async()=>{
        await callback();
        await new Promise(done=>{window.finishResizeFrame=done;});
      });
    };
    return {width:innerWidth,height:innerHeight};
  });
  await nav.getByRole('link',{name:'游戏库',exact:true}).click();
  await page.waitForFunction(()=>typeof window.finishResizeFrame==='function');
  try{await page.setViewportSize({width:viewport.width-70,height:viewport.height});}
  finally{await page.evaluate(()=>{window.finishResizeFrame();delete window.finishResizeFrame;});}
  await page.getByRole('button',{name:'本地实例',exact:true}).waitFor();
  await page.setViewportSize(viewport);
  await page.getByRole('button',{name:'本地实例',exact:true}).click();
  await page.getByRole('button',{name:'排序与刷新'}).click();
  await page.getByRole('button',{name:'按名称排序'}).click();
  await page.getByRole('button',{name:'收藏',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.direct-game-card').length===3);
  await page.getByRole('button',{name:/全部游戏/}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.direct-game-card').length===24);
  await page.keyboard.press('Control+k');
  const finder=page.getByRole('dialog'),field=finder.getByRole('textbox');await field.press('ArrowDown');await page.keyboard.press('ArrowDown');
  const current=finder.locator('.guided-results>button:focus');
  assert.equal(await current.getAttribute('data-selected'),'true');await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');assert.ok(await field.evaluate(el=>el===document.activeElement));
  await field.fill('游戏库');await field.press('Enter');await finder.waitFor({state:'hidden'});
  assert.equal(new URL(page.url()).hash,'#/library');

  await nav.getByRole('link',{name:'社区',exact:true}).click();
  const chat=page.getByPlaceholder('聊点什么吧…');await chat.waitFor({timeout:25000});
  const message='我在大厅，准备进服。';
  await chat.fill(message);await chat.press('Enter');await page.locator('.chat-send[data-dispatch="1"]').waitFor();
  await page.locator('.chat-message.own').getByText(message,{exact:true}).waitFor();
  assert.equal(await chat.inputValue(),'');assert.equal(await page.locator('.chat-message.own').getByText(message,{exact:true}).count(),1);

  await nav.getByRole('link',{name:'游戏',exact:true}).click();
  await page.locator('.featured-game .launch-motion').waitFor();
  await page.evaluate(()=>{
    const seen=new Set(),button=document.querySelector('.featured-game .launch-motion');
    const observe=new MutationObserver(()=>{seen.add(button.dataset.launchState);});
    observe.observe(button,{attributes:true,attributeFilter:['data-launch-state']});
    window.launchMotionStates=()=>{observe.disconnect();return [...seen];};
  });
  const launch=page.locator('.featured-game');
  await launch.getByRole('button',{name:'继续游玩'}).click();
  await page.locator('.task-drawer').waitFor();
  await page.locator('.task-stage-list>li').first().waitFor({timeout:90000});await capture('windows-task-flow');
  await page.getByRole('button',{name:'收起任务',exact:true}).click();
  await launch.getByRole('button',{name:'停止游戏'}).waitFor({timeout:90000});
  const phases=await page.evaluate(()=>window.launchMotionStates());assert.ok(phases.includes('preparing'),JSON.stringify(phases));
  await launch.getByRole('button',{name:'停止游戏'}).click();await launch.getByRole('button',{name:'继续游玩'}).waitFor();
  await page.waitForFunction(async()=>!(await window.launcher.invoke('state',{localOnly:true})).value.running);
  assert.ok((await native('state',{localOnly:true})).ok);
}
