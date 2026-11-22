import assert from 'node:assert/strict';

export async function checkPlayerSurfaces(page,native,capture,communityUrl){
  const shortcuts=page.getByRole('navigation',{name:'快捷导航'});
  await page.evaluate(()=>{
    const invoke=window.launcher.invoke.bind(window.launcher);
    let requests=0,done;const wait=new Promise(resolve=>{done=resolve;});
    window.finishMusicDelay=()=>{window.launcher.invoke=invoke;done();};
    window.launcher.invoke=async(action,input)=>{
      if(action!=='music.account.status')return invoke(action,input);
      const first=++requests===1;
      if(first)await wait;
      const result=await invoke(action,input);
      if(!first)window.musicReloaded=true;
      return result;
    };
  });
  try{
    await shortcuts.getByRole('link',{name:'音乐播放器',exact:true}).click();
    const loading=page.getByRole('status',{name:'正在加载页面内容'});await loading.waitFor();
    const font=await page.evaluate(()=>document.documentElement.style.getPropertyValue('--font-size'));
    for(const [width,height,size] of [[1920,1032,16],[1250,825,16],[780,540,22]]){
      await page.setViewportSize({width,height});
      await page.locator('main').evaluate((el,size)=>{document.documentElement.style.setProperty('--font-size',size+'px');el.scrollTop=el.scrollHeight;},size);
      assert.ok(await loading.evaluate(el=>{
        const r=el.getBoundingClientRect(),header=el.closest('.launcher-bar')?.getBoundingClientRect(),main=document.querySelector('#workspace-main').getBoundingClientRect();
        return header&&Math.abs(r.bottom-header.bottom)<=2&&r.bottom<=main.top+1&&r.width>=header.width-2&&r.height<=4;
      }),'加载条应贴住顶栏底边，滚轮不能把它带进标题区');
    }
    await page.evaluate(font=>document.documentElement.style.setProperty('--font-size',font),font);
    await page.setViewportSize({width:1250,height:825});await page.locator('main').evaluate(el=>{el.scrollTop=0;});await capture('entry-loading');
    await shortcuts.getByRole('link',{name:'LINKING 档案馆'}).click();
    await page.frameLocator('iframe[title*="档案探索"]').locator('.activity-card').first().waitFor();
    await shortcuts.getByRole('link',{name:'音乐播放器',exact:true}).click();
    await page.waitForFunction(()=>window.musicReloaded===true);
    assert.ok(await page.locator('.launcher-bar').evaluate(bar=>new Promise(resolve=>{
      const visible=()=>Boolean(bar.querySelector('.page-load-indicator'));
      let appeared=visible();
      const observer=new MutationObserver(()=>{appeared||=visible();});
      observer.observe(bar,{childList:true,subtree:true});
      setTimeout(()=>{observer.disconnect();resolve(!appeared&&!visible());},350);
    })),'返回音乐后，上一次访问的慢请求不应重新显示加载条');
  }finally{await page.evaluate(()=>window.finishMusicDelay());}
  await shortcuts.getByRole('link',{name:'LINKING 档案馆'}).click();
  const reader=page.frameLocator('iframe[title*="档案探索"]');
  await reader.locator('.activity-card').first().waitFor();
  assert.equal(await reader.getByRole('button',{name:'管理活动'}).count(),0);
  assert.equal(await page.getByRole('button',{name:/作者工具|随包剧情预览/}).count(),0);
  const readerRoot=reader.locator('html[data-player-reader=true]');
  await readerRoot.waitFor({state:'attached'});
  const pageId=await readerRoot.evaluate(el=>el.dataset.fixtureVisit=String(performance.now()));
  await page.emulateMedia({reducedMotion:'reduce'});
  await reader.locator('html[data-reduced=true]').waitFor({state:'attached'});
  assert.equal(await readerRoot.getAttribute('data-fixture-visit'),pageId);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await reader.locator('html[data-reduced=false]').waitFor({state:'attached'});
  await capture('entry-linking');
  try{
    assert.ok((await native('settings.save',{communityUrl:'http://127.0.0.1:9'})).ok);await page.reload();
    const archive=page.locator('.linking-archive-host'),retry=archive.getByRole('button',{name:'重新连接'});
    await retry.waitFor({timeout:25000});
    assert.equal(await page.locator('main').getByRole('button',{name:/重试|重新连接|连接社区/}).count(),1);
    assert.equal(await page.locator('main .community-page-heading,main .social-connection').count(),0);
    assert.ok(await archive.evaluate(el=>Math.abs(el.getBoundingClientRect().height-document.querySelector('#workspace-main').getBoundingClientRect().height)<2));
    await capture('entry-linking-offline');await retry.click();await retry.waitFor({timeout:25000});
  }finally{await native('settings.save',{communityUrl});await page.reload();}
  await reader.locator('.activity-card').first().waitFor();
  console.log('慢请求下顶栏进度位置、切页再返回的旧请求、档案区在线与离线、管理员玩家视图、单一重试及恢复通过。');
}
