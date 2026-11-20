import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Exercise the installed WebView. Routes with their own content surface declare its selector.
const routes=[
  ['/', '.game-home'],['/library','.play-library'],['/servers','.default-server-card'],['/multiplayer','.lobby-block'],
  ['/workshop','.standard-page'],['/workshop/install','.desktop-panel'],['/workshop/addons','.list-toolbar'],
  ['/workshop/sources','.standard-page'],['/workshop/blueprints','.preference-section'],['/music','.player-now'],
  ['/playtime','.playtime-summary'],['/account','.preference-section'],['/check','.check-list'],['/support','.feedback-center'],
  ['/updates','.launcher-updates'],['/settings','.memory-setting'],['/settings?section=appearance','select[aria-label="界面字号"]'],
  ['/settings?section=downloads','select[aria-label="下载总限速"]'],['/settings?section=network','input[type=url]'],
  ['/settings?section=migration','.preference-section'],['/settings/extensions','.extension-actions'],
  ['/community','.chat-main'],['/community/forum','.forum-page'],['/community/voice','.voice-workspace'],
  ['/community/inbox','.inbox-page'],['/community/guild','.guild-columns'],['/community/linking','.archive-viewport iframe'],
  ['/community/playtime','.pt-toolbar'],['/community/worlds','.hub-page'],['/community/blueprints','.blueprint-grid'],
  ['/community/wallet','.music-find'],['/community/backpack','.inventory-ui .inventory-tabs'],['/community/shop','.shop-products'],
  ['/community/saved','.hub-page'],['/community/events','.hub-page'],['/community/appeals','.hub-page']
];

function measure(){
  const main=document.querySelector('main'),bar=document.querySelector('.launcher-bar'),footer=document.querySelector('.launcher-status');
  const bounds=el=>el.getBoundingClientRect(),view=bounds(main),errors=[];
  if(Math.abs(view.top-bounds(bar).bottom)>2||Math.abs(view.bottom-bounds(footer).top)>2||bounds(footer).bottom>innerHeight+1)errors.push('窗口栏与工作区重叠');
  if(Math.abs(bounds(bar).height-70)>1||Math.abs(bounds(footer).height-36)>1)errors.push('窗口栏高度违背桌面约束');
  const compact=main.clientWidth<=54*parseFloat(getComputedStyle(main).fontSize);
  const board=main.querySelector('.game-board');
  if(board){
    const panels=['.instances-card','.home-role-card','.home-servers-card','.calendar-card','.home-detail-card'].map(s=>board.querySelector(s));
    const tools=[...board.querySelectorAll('.instance-toolbar>label,.instance-toolbar>button,.instance-toolbar>a')].map(el=>bounds(el).height);
    if(Math.max(...tools)-Math.min(...tools)>2)errors.push('首页搜索框和同排操作高度不一致');
    if(panels.some(p=>!p))errors.push('首页缺少约定的任务分区');
    else if(compact){
      for(let i=1;i<panels.length;i++){
        if(bounds(panels[i]).top<bounds(panels[i-1]).bottom-1||!(panels[i-1].compareDocumentPosition(panels[i])&Node.DOCUMENT_POSITION_FOLLOWING)){
          errors.push('窄窗任务卡片的显示或键盘顺序错误');break;
        }
      }
      const resume=board.querySelector('.resume-panel .launch-primary');
      if(main.scrollTop<2&&resume&&bounds(resume).bottom>view.bottom-4)errors.push('继续游玩不在首屏');
    }
  }
  if(compact)for(const grid of main.querySelectorAll('.desktop-panels>.desktop-panel-grid')){
    const children=[...grid.children].filter(el=>el.hasAttribute('data-card-id'));
    if(children.some(el=>bounds(el).width<bounds(grid).width-2))errors.push('窄窗卡片未占满一行 '+grid.parentElement.dataset.board);
  }
  const rail=main.querySelector('.settings-rail');
  if(rail){
    const select=rail.querySelector('select'),form=main.querySelector('.settings-sections');
    if(compact&&(!select||!bounds(select).width||bounds(rail).bottom>bounds(form).top+1))errors.push('窄窗分类占用了表单侧栏');
    if(!compact&&bounds(rail).right>bounds(form).left+1)errors.push('宽窗分类和表单重叠');
  }
  for(const page of main.querySelectorAll(':scope>.launch-page,:scope>.standard-page,:scope>.play-library,.social-workspace .social-content')){
    const rect=bounds(page);
    if(rect.width>1601||Math.abs((rect.left-view.left)-(view.left+main.clientWidth-rect.right))>2)errors.push('页面没有落在居中且限宽的内容区域');
  }
  if(document.documentElement.scrollWidth>innerWidth+1||main.scrollWidth>main.clientWidth+2)errors.push('工作区出现横向滚动 '+main.scrollWidth+'/'+main.clientWidth);
  let lastRight=0;
  for(const el of bar.querySelectorAll('a,button')){
    const r=bounds(el);
    if(r.width&& (r.left<lastRight-1||r.right>innerWidth+1))errors.push('顶栏项目重叠 '+(el.ariaLabel||el.innerText));
    if(r.width)lastRight=r.right;
  }
  if(bar.querySelectorAll('nav a.active').length>1)errors.push('多个顶栏入口同时高亮');
  if(main.querySelector('.react-resizable-handle,.card-layout-toolbar,.react-grid-layout'))errors.push('固定页面挂载了布局编辑器');
  if(main.querySelector('.preference-section .preference-section'))errors.push('设置卡嵌入设置卡');
  const pageTitle=main.querySelector('h1')?.textContent.trim();
  if(pageTitle&&[...main.querySelectorAll('h2')].some(h=>h.getBoundingClientRect().height&&h.textContent.trim()===pageTitle))errors.push('页面标题重复 '+pageTitle);
  const archive=main.querySelector('.archive-viewport iframe');
  if(archive&&bounds(archive).height<view.height*.55)errors.push('档案阅读区域仅有 '+Math.round(bounds(archive).height)+' px');
  for(const panel of main.querySelectorAll('.catalog-panel,.forum-page,.wallet-layout>.desktop-panel,.social-content>.inventory-ui,.social-content>.play-calendar,.launch-page>.launcher-updates')){
    const style=getComputedStyle(panel);
    if(parseFloat(style.borderTopWidth)<1||style.backgroundColor==='rgba(0, 0, 0, 0)')errors.push('工作区缺少可见边界 '+panel.className);
  }
  for(const el of main.querySelectorAll('button,a,input,textarea,select,summary')){
    const r=bounds(el);
    if(r.width<2||r.height<2||r.bottom<view.top||r.top>view.bottom)continue;
    const panel=el.closest('.desktop-panel,.preference-section,.desk-card,.direct-game-card');
    const within=panel?bounds(panel):view;
    if(r.left>=Math.max(view.left,within.left)-2&&r.right<=Math.min(view.right,within.right)+2)continue;
    let parent=el.parentElement,insideScroller=false;
    while(parent&&parent!==main){
      if(['auto','scroll'].includes(getComputedStyle(parent).overflowX)&&parent.scrollWidth>parent.clientWidth){insideScroller=true;break;}
      parent=parent.parentElement;
    }
    if(!insideScroller)errors.push('控件超出工作区或所属卡片 '+(el.ariaLabel||el.innerText||el.name||el.tagName).slice(0,30));
  }
  for(const group of main.querySelectorAll('.desk-actions,.instance-toolbar,.memory-controls,.card-actions,.lobby-tabs,.social-sections,.desktop-panel-grid')){
    const children=[...group.children].filter(el=>{const r=bounds(el);return r.width>2&&r.height>2;});
    children.forEach((element,i)=>{const box=bounds(element);
      for(const other of children.slice(i+1)){const r=bounds(other);
        if(Math.min(box.right,r.right)-Math.max(box.left,r.left)>2&&Math.min(box.bottom,r.bottom)-Math.max(box.top,r.top)>2){
          errors.push('同一操作区内控件重叠 '+group.className);break;
        }
      }
    });
  }
  return [...new Set(errors)];
}

function homeGeometry(){
  return ['.launcher-bar','.game-home .launch-title h1','.instances-card','.instance-toolbar label','.resume-panel .launch-primary'].map(selector=>{
    const el=document.querySelector(selector),r=el.getBoundingClientRect();
    return [Math.round(r.left),Math.round(r.width),Math.round(r.height),getComputedStyle(el).fontSize];
  });
}

export async function verifyDesktopLayout(page,native,directory){
  const output=path.join(directory,'layout');await fs.mkdir(output,{recursive:true});
  const observations=[],overlays=[],failures=[];
  const windows=[[1360,880,16,'light','town'],[1250,825,16,'light','paper'],[1920,1080,16,'light','town'],[1000,660,22,'dark','observatory'],[780,540,16,'light','paper'],[780,540,22,'dark','observatory']];
  for(const [width,height,font,theme,skin] of windows){
    assert.equal((await native('settings.save',{themeChange:{op:'select',id:skin}})).ok,true);
    assert.equal((await native('settings.save',{fontSize:font,theme,animationSpeed:0})).ok,true);
    await page.setViewportSize({width,height});await page.reload();
    await page.waitForFunction(([n,mode,design])=>getComputedStyle(document.documentElement).getPropertyValue('--font-size').trim()===n+'px'&&document.documentElement.dataset.theme===mode&&document.documentElement.dataset.skin===design,[font,theme,skin]);
    let firstHome;
    for(const [route,selector] of routes){
      await page.evaluate(value=>{location.hash=value;},route);
      let issues;
      try{
        await page.locator(selector).first().waitFor({state:'attached',timeout:8000});
        await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
        if(route==='/')firstHome=await page.evaluate(homeGeometry);
        issues=await page.evaluate(measure);
        const bottom=await page.locator('main').evaluate(el=>el.scrollHeight-el.clientHeight);
        if(bottom>2){
          for(const y of [Math.round(bottom/2),bottom]){
            await page.locator('main').evaluate((el,top)=>{el.scrollTop=top;},y);
            issues.push(...await page.evaluate(measure));
          }
          await page.locator('main').evaluate(el=>{el.scrollTop=0;});
          issues=[...new Set(issues)];
        }
      }catch(e){issues=['页面未挂载 '+selector];}
      const reader=route==='/community/linking'?await page.locator('.archive-viewport iframe').evaluateAll(frames=>frames.length?frames[0].getBoundingClientRect().height:0):0;
      const record={route,width,height,font,theme,skin,issues,...(reader?{readerHeight:Math.round(reader)}:{})};observations.push(record);
      if(issues.length)failures.push(record);
      if(width===1360||issues.length||['/','/music','/settings','/community/voice','/community/linking'].includes(route)){
        const name=route.replace(/[^a-z0-9-]/gi,'_')||'home';
        await page.screenshot({path:path.join(output,name+'-'+width+'-'+font+'.png'),animations:'disabled'});
      }
    }
    for(const [route,control] of [['/','实例配置'],['/community/playtime','每周时长榜']]){
      await page.evaluate(value=>{location.hash=value;},route);
      const dialog=page.getByRole('dialog');
      const record={control,width,height,font,theme,skin,issues:[]};
      try{
        await page.getByRole('button',{name:control,exact:true}).click({timeout:8000});
        await dialog.waitFor({state:'visible',timeout:8000});
        record.issues=await dialog.evaluate(el=>{
          const r=el.getBoundingClientRect(),close=el.querySelector('button[aria-label="关闭"]')?.getBoundingClientRect(),issues=[];
          if(Math.min(r.left,r.top,innerWidth-r.right,innerHeight-r.bottom)<15)issues.push('弹窗与窗口之间不足 16 px');
          if(!close||close.right>r.right||close.bottom>r.bottom)issues.push('弹窗关闭键超出对话框');
          if(el.scrollWidth>el.clientWidth+2||!el.contains(document.activeElement))issues.push('弹窗横向溢出或焦点仍在背景');
          return issues;
        });
        if(width===780&&font===22)await page.screenshot({path:path.join(output,control+'-780-22.png'),animations:'disabled'});
      }catch(e){record.issues.push('无法通过页面打开弹窗 '+control);}
      await page.keyboard.press('Escape');
      await dialog.waitFor({state:'hidden',timeout:3000}).catch(()=>record.issues.push('Esc 无法关闭弹窗'));
      overlays.push(record);if(record.issues.length)failures.push(record);
    }
    if(width<=54*font){
      await page.evaluate(()=>{location.hash='/settings';});
      const categories=page.getByRole('combobox',{name:'设置分类',exact:true});
      await categories.selectOption('/settings?section=downloads');
      await page.getByRole('combobox',{name:'下载并发数'}).waitFor();
    }
    await page.evaluate(()=>{location.hash='/';});
    await page.locator('.resume-panel .launch-primary').waitFor();
    assert.deepEqual(await page.evaluate(homeGeometry),firstHome,'访问其他核心和插件页面后，首页几何尺寸必须一致');
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(observations,null,2));
  await fs.writeFile(path.join(output,'dialogs.json'),JSON.stringify(overlays,null,2));
  assert.deepEqual(failures,[],JSON.stringify(failures));
  console.log(routes.length+' desktop routes × '+windows.length+' window and font combinations, '+overlays.length+' dialogs passed.');
}
