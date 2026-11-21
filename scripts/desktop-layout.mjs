import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {scan as measureInsets,cardHeadingIssues} from './desktop-insets.mjs';

// Exercise the installed WebView. Routes with their own content surface declare its selector.
const routes=[
  ['/', '.game-home'],['/library','.play-library'],['/servers','.default-server-card'],['/multiplayer','.lobby-block'],
  ['/workshop','.standard-page'],['/workshop/install','.desktop-panel'],['/workshop/addons','.list-toolbar'],
  ['/workshop/sources','.standard-page'],['/workshop/blueprints','.preference-section'],['/music','.player-now'],
  ['/arcade','.game-catalog-grid'],['/arcade/play/runner','.canvas-stage'],['/community/ranking','.points-ranking'],
  ['/community/arcade/board/gomoku','.strategy-board'],['/community/arcade/social/werewolf','.wolf-layout'],['/community/arcade/coop/tanks','.coop-mode-toolbar'],
  ['/playtime','.playtime-summary'],['/playtime?date=2025-01-01','.panel-value'],['/account','.preference-section'],['/check','.check-list'],['/support','.feedback-center'],
  ['/updates','.launcher-updates'],['/settings','.memory-setting'],['/settings?section=appearance','input[aria-label="界面字号"]'],
  ['/settings?section=appearance&panel=surface','.design-options'],['/settings?section=appearance&panel=wallpaper','.wallpaper-modes'],
  ['/settings?section=downloads','input[aria-label="下载总限速"]'],['/settings?section=network','input[type=url]'],
  ['/settings?section=migration','.preference-section'],['/settings/extensions','.extension-actions'],
  ['/community','.chat-main'],['/community/forum','.forum-page'],['/community/voice','.voice-workspace'],
  ['/community/inbox','.inbox-page'],['/community/guild','.guild-columns'],['/community/linking','.archive-viewport iframe'],
  ['/community/playtime','.pt-toolbar'],['/community/worlds','.hub-page'],['/community/blueprints','.blueprint-grid'],
  ['/community/wallet','.music-find'],['/community/backpack','.inventory-ui .inventory-tabs'],['/community/shop','.shop-products'],
  ['/community/saved','.hub-page'],['/community/events','.hub-page'],['/community/appeals','.hub-page'],['/lite','.lite-workspace'],['/lite/more','.lite-more nav']
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
    for(const col of board.querySelectorAll('.board-column')){
      const cards=[...col.children];for(let i=1;i<cards.length;i++)if(bounds(cards[i]).top-bounds(cards[i-1]).bottom<7)errors.push('独立卡片间距不足');
    }
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
  const lite=main.querySelector('.lite-workspace');
  if(lite){
    const rail=bounds(lite.querySelector('.lite-rail')),scene=bounds(lite.querySelector('.lite-scene')),shell=bounds(lite);
    const identity=bounds(lite.querySelector('.lite-identity')),game=bounds(lite.querySelector('.lite-game'));
    const primary=bounds(lite.querySelector('.launch-primary')),actions=bounds(lite.querySelector('.lite-version-actions'));
    if(main.scrollTop<2&&(primary.bottom>view.bottom+1||actions.bottom>view.bottom+1))errors.push('启动或版本操作不在首屏');
    if(identity.bottom>game.top+1||primary.bottom>actions.top+1)errors.push('角色、启动与版本操作发生重叠');
    if(game.left<rail.left||game.right>rail.right+1)errors.push('启动操作越过侧栏');
    if(scene.width>0&&(rail.right>scene.left+1||scene.right>shell.right+1))errors.push('启动栏和背景区域越界');
  }
  const rail=main.querySelector('.settings-rail');
  if(rail){
    const category=rail.querySelector('a[aria-current=page]'),form=main.querySelector('.settings-sections');
    if(rail.querySelector('select'))errors.push('设置分类没有直接显示');
    if(compact&&(!category||!bounds(category).width||bounds(rail).bottom>bounds(form).top+1))errors.push('窄窗分类占用了表单侧栏');
    if(!compact&&bounds(rail).right>bounds(form).left+1)errors.push('宽窗分类和表单重叠');
  }
  const sections=main.querySelector('.settings-sections');
  if(sections){
    const groups=[...sections.querySelectorAll(':scope>.settings-block')];
    for(const [index,group] of groups.entries()){
      if(group.querySelector('.settings-block,.setting-group,.preference-section'))errors.push('设置分组内重复嵌套卡片');
      if(index&&bounds(group).top-bounds(groups[index-1]).bottom<15.5)errors.push('独立设置分组之间不足 16 px');
      for(const row of group.querySelectorAll('.settings-actions')){
        const controls=[...row.children].filter(el=>bounds(el).width);
        for(const [i,el] of controls.entries()){
          const r=bounds(el),prev=i?bounds(controls[i-1]):null;
          if(r.height<35.5)errors.push('设置操作的点击高度不足 36 px');
          if(prev&&(Math.abs(r.top-prev.top)<1?r.left-prev.right:r.top-prev.bottom)<7.5)errors.push('设置操作之间不足 8 px');
        }
      }
      for(const field of group.querySelectorAll('.settings-field')){
        const label=bounds(field.querySelector('label')),input=bounds(field.querySelector('input')),button=bounds(field.querySelector('button'));
        if(input.top-label.bottom<7.5)errors.push('字段名称距输入框不足 8 px');
        if(input.width<Math.min(240,field.clientWidth-42))errors.push('服务地址输入区域过窄');
        if(button.left>=input.right-1&&(Math.abs(input.top-button.top)>1||Math.abs(input.bottom-button.bottom)>1))errors.push('同一行的输入框和操作按钮没有对齐');
      }
    }
    const tab=new URLSearchParams(location.hash.split('?')[1]).get('section');
    const expected=tab==='downloads'?['下载策略','启动器版本']:tab==='network'?['联机连接','HXZRE 运行时']:null;
    if(expected&&groups.map(group=>group.querySelector('h2')?.textContent).join('|')!==expected.join('|'))errors.push('主要设置任务缺少独立分组');
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
  for(const tab of bar.querySelectorAll('nav a')){
    const button=bounds(tab);
    for(const child of tab.children){
      const area=bounds(child);
      if(area.width&&(area.left<button.left-1||area.right>button.right+1))errors.push('导航文字或图标越过按钮 '+tab.getAttribute('aria-label'));
    }
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
  for(const group of main.querySelectorAll('.choice-group,.desk-actions,.instance-toolbar,.memory-controls,.card-actions,.lobby-tabs,.social-sections,.desktop-panel-grid')){
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

// Resize a card inside the same window, as when the player moves it between columns.
async function exerciseCardWidth(page){
  const board=page.locator('main [data-board=home]').first(),grid=board.locator('[data-card-grid]').first();
  const compact=await grid.getAttribute('data-compact'),boardStyle=await board.getAttribute('style');
  try{
    await board.evaluate(el=>{el.style.inlineSize='31em';el.style.maxInlineSize='100%';});
    await page.waitForFunction(()=>document.querySelector('main [data-board=home] [data-card-grid]')?.hasAttribute('data-compact'));
  }finally{
    await board.evaluate((el,style)=>style===null?el.removeAttribute('style'):el.setAttribute('style',style),boardStyle);
    await page.waitForFunction(compact=>document.querySelector('main [data-board=home] [data-card-grid]')?.getAttribute('data-compact')===compact,compact);
  }
  const calendar=page.locator('main .calendar-card > .section-heading').first();
  const original=await calendar.getAttribute('style');
  try{
    let wrapped=false;
    for(const width of ['100%', '34em', '22em', '15em', '11em']){
      const nextLine=await calendar.evaluate((el,width)=>{
        el.style.inlineSize=width;
        el.style.maxInlineSize='100%';
        const title=el.querySelector('h2').getBoundingClientRect(),actions=el.querySelector('.heading-actions').getBoundingClientRect();
        return actions.top>=title.bottom-1;
      },width);
      wrapped||=nextLine;
      assert.deepEqual(await page.evaluate(cardHeadingIssues),[],'卡片宽度 '+width);
    }
    assert.ok(wrapped,'窄卡片应允许整组操作换行');
  }finally{
    await calendar.evaluate((el,style)=>style===null?el.removeAttribute('style'):el.setAttribute('style',style),original);
  }
}

export async function verifyDesktopLayout(page,native,directory){
  const output=path.join(directory,'layout');await fs.mkdir(output,{recursive:true});
  const observations=[],overlays=[],failures=[];
  const windows=[[1360,880,16,'light','town'],[1250,825,16,'light','paper'],[1920,1080,16,'light','town'],[1000,660,22,'dark','observatory'],[780,540,16,'light','paper'],[780,540,22,'dark','observatory']];
  const layouts=['classic','library','journal','library','journal','classic'];
  for(const [index,[width,height,font,theme,skin]] of windows.entries()){
    const workspace=layouts[index];
    assert.equal((await native('settings.save',{themeChange:{op:'select',id:skin}})).ok,true);
    assert.equal((await native('settings.save',{fontSize:font,theme,animationSpeed:0,workspaceLayout:workspace})).ok,true);
    await page.setViewportSize({width,height});await page.reload();
    await page.waitForFunction(([n,mode,design])=>getComputedStyle(document.documentElement).getPropertyValue('--font-size').trim()===n+'px'&&document.documentElement.dataset.theme===mode&&document.documentElement.dataset.skin===design,[font,theme,skin]);
    let firstHome;
    for(const [route,selector] of routes){
      await page.evaluate(value=>{location.hash=value;},route);
      let issues, textInsets;
      try{
        await page.locator(selector).first().waitFor({state:'attached',timeout:8000});
        if(route==='/settings?section=network')await page.locator('.settings-status').getByText(/已内嵌并通过校验|状态暂不可用|模块校验未通过/).waitFor();
        await page.evaluate(()=>document.fonts.ready);
        await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
        if(route==='/'){firstHome=await page.evaluate(homeGeometry);await exerciseCardWidth(page);}
        textInsets=await page.evaluate(measureInsets);
        assert.ok(textInsets.inspected,'页面应具有可测量的文字');
        issues=[...await page.evaluate(measure),...await page.evaluate(cardHeadingIssues),...textInsets.issues];
        if(route==='/community/linking'){
          const archive=await page.locator('.archive-viewport iframe').elementHandle();
          const frame=await archive.contentFrame();
          await frame.locator('.activity-card').first().waitFor({state:'visible'});
          const reader=await frame.evaluate(measureInsets,'body');
          assert.ok(reader.inspected,'档案目录应具有可测量的正文');
          issues.push(...reader.issues.map(issue=>'LINKING '+issue));
        }
        if(route==='/'){
          const search=page.getByRole('textbox',{name:'搜索实例'});
          await search.fill('no-such-instance-for-inset-check');
          await page.getByText('没有匹配的实例。',{exact:true}).waitFor();
          issues.push(...(await page.evaluate(measureInsets)).issues);
          await search.fill('');
          await page.getByText('没有匹配的实例。',{exact:true}).waitFor({state:'hidden'});
        }
        if(!route.startsWith('/settings')){
          const disallowed='select,details,[role="combobox"],[aria-haspopup="menu"],[aria-haspopup="listbox"]';
          if(await page.locator('main').locator(disallowed).count())issues.push('设置以外的页面含下拉式控件');
          if(route==='/community/linking'&&await page.frameLocator('.archive-viewport iframe').locator(disallowed).count())issues.push('档案馆内含下拉式控件');
        }
        if(route==='/support')await page.getByRole('checkbox',{name:'自动提交脱敏的错误报告'}).waitFor();
        if(route==='/workshop/sources'){
          const list=page.locator('.download-source-grid');await list.locator('article').first().waitFor();
          if(await list.evaluate(el=>el.scrollHeight>el.clientHeight+2))issues.push('下载节点有第二条滚动条');
          const next=page.getByRole('navigation',{name:'下载节点分页'}).getByRole('button',{name:'下一页'});const first=await list.locator('strong').first().innerText();
          await next.click();assert.notEqual(await list.locator('strong').first().innerText(),first);
          await page.getByRole('button',{name:'元数据',exact:true}).click();assert.ok(await next.isDisabled());await page.getByRole('button',{name:'全部',exact:true}).click();
        }
        const bottom=await page.locator('main').evaluate(el=>el.scrollHeight-el.clientHeight);
        if(bottom>2){
          for(const y of [Math.round(bottom/2),bottom]){
            await page.locator('main').evaluate((el,top)=>{el.scrollTop=top;},y);
            issues.push(...await page.evaluate(measure));
          }
          await page.locator('main').evaluate(el=>{el.scrollTop=0;});
          issues=[...new Set(issues)];
        }
      }catch(e){issues=['无法检查 '+selector+' '+e.message];}
      const reader=route==='/community/linking'?await page.locator('.archive-viewport iframe').evaluateAll(frames=>frames.length?frames[0].getBoundingClientRect().height:0):0;
      const record={route,width,height,font,theme,skin,workspace,issues,textInsets,...(reader?{readerHeight:Math.round(reader)}:{})};observations.push(record);
      if(issues.length)failures.push(record);
      const settingsExample=['/settings?section=downloads','/settings?section=network'].includes(route)&&(width===1250||width===780&&font===22);
      if(width===1360||issues.length||settingsExample||['/','/lite','/music','/settings','/community/voice','/community/linking'].includes(route)){
        const name=route.replace(/[^a-z0-9-]/gi,'_')||'home';
        await page.screenshot({path:path.join(output,name+'-'+width+'-'+font+'.png'),animations:'disabled'});
      }
    }
    for(const [route,control] of [['/','实例配置'],['/','卡片'],['/community/playtime','每周时长榜']]){
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
        const body=dialog.locator('.dialog-scroll,.modal-body:not(:has(.dialog-scroll))');
        for(const end of [false,true]){
          await body.evaluate((el,end)=>{el.scrollTop=end?el.scrollHeight:0;},end);
          const {inspected,issues}=await page.evaluate(measureInsets,'[role=dialog][data-state=open]');
          assert.ok(inspected,'弹窗应具有可测量的文字');
          record.issues.push(...issues);
          const footer=dialog.locator('.dialog-sections>footer');
          if(await footer.count()){
            const fits=await footer.evaluate(el=>{
              const panel=el.closest('[role=dialog]').getBoundingClientRect(),scroll=el.previousElementSibling.getBoundingClientRect();
              return [...el.querySelectorAll('button')].every(button=>{
                const r=button.getBoundingClientRect();
                return r.top>=scroll.bottom && r.bottom<=panel.bottom-12;
              });
            });
            if(!fits)record.issues.push('弹窗底部操作未完整显示');
          }
        }
        await body.evaluate(el=>{el.scrollTop=0;});
        if(width===780&&font===22)await page.screenshot({path:path.join(output,control+'-780-22.png'),animations:'disabled'});
        if(width===780&&font===22&&control==='实例配置'){
          const field=dialog.getByRole('spinbutton',{name:'窗口宽度'}),save=dialog.getByRole('button',{name:'保存配置'});
          const previous=await field.inputValue(),updated=String(Number(previous)+2);
          for(const value of [updated,previous]){
            await field.fill(value);
            await save.click();await dialog.waitFor({state:'hidden'});
            await page.getByRole('button',{name:control,exact:true}).click();
            assert.equal(await field.inputValue(),value);
          }
        }
      }catch(e){record.issues.push('无法检查弹窗 '+control+' '+e.message);}
      await page.keyboard.press('Escape');
      await dialog.waitFor({state:'hidden',timeout:3000}).catch(()=>record.issues.push('Esc 无法关闭弹窗'));
      overlays.push(record);if(record.issues.length)failures.push(record);
    }
    if(width<=54*font){
      await page.evaluate(()=>{location.hash='/settings';});
      const categories=page.getByRole('navigation',{name:'设置分类',exact:true});
      await categories.getByRole('link',{name:'下载与更新'}).click();
      await page.getByRole('radiogroup',{name:'下载并发数'}).waitFor();
    }
    await page.evaluate(()=>{location.hash='/';});
    await page.locator('.resume-panel .launch-primary').waitFor();
    assert.deepEqual(await page.evaluate(homeGeometry),firstHome,'访问其他核心和插件页面后，首页几何尺寸必须一致');
  }
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify(observations,null,2));
  await fs.writeFile(path.join(output,'dialogs.json'),JSON.stringify(overlays,null,2));
  assert.equal(failures.length,0,JSON.stringify(failures.map(({route,control,width,font,issues})=>({route,control,width,font,issues}))));
  console.log(routes.length+' desktop routes × '+windows.length+' window and font combinations, '+overlays.length+' dialogs passed.');
}
