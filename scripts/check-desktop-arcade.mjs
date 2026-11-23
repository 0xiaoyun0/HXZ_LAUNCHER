import assert from 'node:assert/strict';

const hall=page=>page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'小游戏',exact:true});
const ranking=page=>page.getByRole('navigation',{name:'小游戏与积分'}).getByRole('link',{name:'积分排行榜'});
const metadata=page=>page.locator('.game-session-metrics');

export async function checkGuestCatalog(page){
  await hall(page).click();
  await page.getByRole('button',{name:'街机挑战'}).click();
  const names=await page.locator('.game-catalog-card h2').allTextContents();
  assert.equal(names.length,20);
  for(const name of names){
    await page.getByRole('button',{name:'游玩'+name,exact:true}).click();
    const canvas=page.getByLabel(name+' 游戏画面');
    await canvas.waitFor();
    assert.ok(await canvas.evaluate(el=>el.width>0&&el.height>0&&el.getBoundingClientRect().width>0),name);
    await page.getByRole('button',{name:'开始游戏',exact:true}).click();
    await metadata(page).getByText('本机练习').waitFor();
    await page.locator('.game-overlay.countdown').waitFor({state:'hidden'});
    await page.getByRole('button',{name:'返回游戏厅',exact:true}).click();
    const leaving=page.getByRole('dialog',{name:'结束本局并离开？'}),shelf=page.locator('.game-catalog-grid');
    await Promise.race([leaving.waitFor(),shelf.waitFor()]);
    if(await leaving.isVisible())await leaving.getByRole('button',{name:'结算并离开'}).click();
    await shelf.waitFor();
  }
  await page.evaluate(()=>{location.hash='/arcade/board/gomoku?match=legacy-invite';});
  await page.locator('.login-gate').getByRole('heading',{name:'五子棋'}).waitFor();
  assert.equal(new URL(page.url()).hash,'#/community/arcade/board/gomoku?match=legacy-invite');
  console.log('All 20 arcade games started in guest practice; board invitations preserved their destination through the sign-in gate.');
}

export async function checkLocalGames(page,capture){
  const network=[];
  const observe=req=>{if(req.url().includes('/api/arcade/'))network.push(req.url());};
  page.on('request',observe);
  try{
    await hall(page).click();
    const catalog=page.getByLabel('24 款游戏',{exact:true});
    await catalog.waitFor();assert.equal(await catalog.locator('article').count(),24);
    await page.waitForFunction(async()=>{const covers=[...document.querySelectorAll('.game-catalog-cover img')];return covers.length===24&&(await Promise.all(covers.map(async img=>{img.loading='eager';try{await img.decode();return img.naturalWidth>0;}catch{return false;}}))).every(Boolean);});
    await capture('arcade-hall');
    const search=page.getByRole('textbox',{name:'搜索小游戏'});await search.fill('林间疾跑');
    await page.getByRole('button',{name:'收藏林间疾跑',exact:true}).click();
    await page.getByRole('button',{name:'我的收藏',exact:true}).click();
    assert.equal(await page.locator('.game-catalog-card').count(),1);
    await page.getByRole('button',{name:'游玩林间疾跑'}).click();
    await page.getByRole('button',{name:'开始游戏',exact:true}).click();
    await metadata(page).getByText('本机练习').waitFor();
    const resume=page.getByRole('button',{name:'继续游戏',exact:true});
    await page.getByRole('button',{name:'设置',exact:true}).click();
    await page.getByRole('dialog',{name:'结束本局并离开？'}).getByRole('button',{name:'返回游戏'}).click();
    await resume.click();
    await page.getByRole('button',{name:'再来一局',exact:true}).waitFor({timeout:30000});
    await page.waitForFunction(()=>Number(document.querySelector('.arcade-personal-best b')?.textContent)>0);
    await page.getByRole('button',{name:'返回游戏厅',exact:true}).click();
    await ranking(page).click();
    assert.equal(new URL(page.url()).hash,'#/points');
    await page.getByRole('heading',{name:'我的积分'}).waitFor();
    await page.getByRole('button',{name:'登录账号',exact:true}).waitFor();
    await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'游戏',exact:true}).click();
    assert.deepEqual(network,[],'无插件的本机练习不能访问计分服务器');
  }finally{page.off('request',observe);}
}

export async function checkCommunityGames(page,capture,fixture){
  await hall(page).click();
  await page.getByRole('button',{name:'游玩林间疾跑'}).click();
  await page.locator('.game-rank-card .my-rank').waitFor();
  await page.getByRole('button',{name:'开始游戏',exact:true}).click();
  await metadata(page).getByText('社区计分').waitFor();
  await page.getByText('成绩已同步至社区排行榜',{exact:true}).waitFor({timeout:30000});
  await page.locator('.game-rank-card .rank-list').getByText('林间旅人').waitFor();
  await page.getByRole('button',{name:'长期',exact:true}).click();
  await page.getByText('长期最高纪录 · 不重置').waitFor();
  await page.locator('.game-rank-card .my-rank').getByText('第 1 名').waitFor();

  await ranking(page).click();
  const board=page.locator('.points-ranking');
  await board.locator('.rank-list').getByText('林间旅人').waitFor();
  assert.equal((await board.locator('.rank-list li strong').first().textContent()).replace(/\s+/g,' '),'3 分');
  await capture('arcade-rankings');
  await board.getByRole('button',{name:'年度总榜'}).click();
  await board.getByText('这一期还没有上榜记录。').waitFor();
  fixture.seedAnnualBoard();
  await board.getByRole('button',{name:'本周积分'}).click();
  await board.getByRole('button',{name:'年度总榜'}).click();
  await board.locator('.my-rank').getByText('第 51 名').waitFor();
  assert.equal(await board.locator('.rank-list li').count(),50);
  await board.getByRole('button',{name:'下一页'}).click();
  await board.locator('.rank-list').getByText('林间旅人').waitFor();
  assert.equal(await board.locator('.rank-list li').count(),1);
  assert.ok(await board.getByRole('button',{name:'下一页'}).isDisabled());
  const fail=url=>url.pathname==='/api/points/leaderboard';
  await page.route(fail,route=>route.abort('failed'));
  try{
    await board.getByRole('button',{name:'本周积分'}).click();
    await board.getByRole('alert').waitFor();
    assert.equal(await board.locator('.my-rank').count(),0);
  }finally{await page.unroute(fail);}
  await board.getByRole('button',{name:'重试读取榜单'}).click();
  await board.locator('.my-rank').getByText('第 1 名').waitFor();
  await board.getByRole('link',{name:'我的积分'}).click();
  await page.waitForFunction(()=>document.querySelector('.wallet-balance strong')?.textContent==='0');
  await page.getByRole('textbox',{name:'积分兑换码'}).fill(fixture.rewardCode());
  await page.getByRole('button',{name:'兑换',exact:true}).click();
  await page.locator('.wallet-layout .setting-line').filter({hasText:'兑换码奖励'}).waitFor();
  assert.equal(await page.locator('.wallet-balance strong').textContent(),'12');
  await capture('arcade-wallet');
  await page.locator('.wallet-balance').getByRole('link',{name:'积分排行榜'}).click();
  await board.getByText('15 分',{exact:true}).first().waitFor();

  await hall(page).click();
  await page.getByRole('button',{name:'棋类对弈'}).click();
  assert.equal(await page.locator('.game-catalog-card').count(),3);
  await page.getByRole('button',{name:'游玩五子棋'}).click();
  const ready=page.getByRole('button',{name:'创建联机房间',exact:true});
  await ready.click();
  await page.getByRole('button',{name:'关闭房间',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'确认',exact:true}).click();
  await page.getByRole('link',{name:'返回小游戏厅'}).click();
  await page.getByRole('button',{name:'游玩月下圆桌'}).click();
  await page.getByRole('button',{name:'创建房间',exact:true}).waitFor();
  assert.equal(await page.locator('main details,main select').count(),0);
  await page.getByRole('link',{name:'返回小游戏厅'}).click();
  await page.getByRole('button',{name:'游玩星堡双卫'}).click();
  await page.getByRole('link',{name:'进入双人合作大厅'}).click();
  await page.getByRole('button',{name:'单人练习'}).click();
  await page.getByRole('heading',{name:'星堡双卫',exact:true}).first().waitFor();
  await page.locator('.game-rank-card .my-rank').waitFor();
  await page.getByRole('button',{name:'开始游戏',exact:true}).click();
  await metadata(page).getByText('社区计分').waitFor();
  await page.waitForFunction(()=>document.querySelector('.game-session-metrics')?.textContent.includes('0:01'));
  await hall(page).click();
  const leaving=page.getByRole('dialog',{name:'结束本局并离开？'});
  await leaving.getByRole('button',{name:'返回游戏'}).click();
  await page.getByRole('button',{name:'继续游戏',exact:true}).waitFor();
  fixture.dropNextArcadeFinish();
  await hall(page).click();
  await leaving.getByRole('button',{name:'结算并离开'}).click();
  await leaving.getByRole('alert').waitFor();
  await leaving.getByRole('button',{name:'重试并离开'}).click();
  await page.locator('.game-catalog-grid').waitFor();
}
