import assert from 'node:assert/strict';

export async function checkSharedPlay(page,service,base,player,adminToken){
  async function api(route,token,body,headers={}){
    const response=await fetch(base+route,{method:body?'POST':'GET',headers:{
      Authorization:'Bearer '+token,'Content-Type':'application/json',...headers
    },body:body?JSON.stringify(body):undefined});
    const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data;
  }
  const pc=await api('/api/session','',{});
  assert.equal(pc.user.uid,player.uid);
  const {token:bridge}=await api('/api/admin/game-bridges',adminToken,{server:'mod-1',rotate:true});
  const poll=()=>api('/api/game-bridge/poll',bridge,{status:{version:'1.21.1',loader:'neoforge',online:1,max:20,players:[player],capabilities:['status']}},{'X-HXZ-Server':'mod-1'});
  // A saved account just short of a reward. Only authenticated, subsequent polls add new time.
  service.db.prepare('INSERT INTO playtime_accounts(uid,milliseconds,awarded) VALUES(?,?,0)').run(player.uid,86400000-1000);
  await poll();
  const main=page.getByRole('navigation',{name:'主导航'});
  await main.getByRole('link',{name:'小游戏',exact:true}).click();
  const shelf=page.locator('.game-catalog-card');
  await shelf.first().waitFor();
  assert.equal(await shelf.count(),24);
  await shelf.locator('img').evaluateAll(images=>Promise.all(images.map(async image=>{
    image.loading='eager';await image.decode();if(!image.naturalWidth)throw Error('小游戏封面为空');
  })));
  await page.locator('.game-runner .game-catalog-cover').click();
  await page.getByRole('button',{name:'开始游戏',exact:true}).click();
  await page.getByText('社区计分',{exact:true}).waitFor();
  await page.waitForFunction(()=>Number(document.querySelector('.game-score>b')?.textContent.replaceAll(',',''))>0);
  await poll();
  let committedScore;
  await page.route('**/api/arcade/runner/finish',async route=>{
    const committed=await route.fetch();
    assert.equal(committed.status(),200);
    committedScore=(await committed.json()).score;
    await route.abort('connectionreset');
  },{times:1});
  const finish=page.waitForResponse(r=>r.url().endsWith('/api/arcade/runner/finish')&&r.request().method()==='POST');
  await main.getByRole('link',{name:'小游戏',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'结算并离开'}).click();
  await page.getByRole('dialog').getByRole('button',{name:'重试提交'}).click();
  const ack=await finish;assert.equal(ack.status(),200);
  const result=await ack.json();
  assert.ok(result.score>0);assert.equal(committedScore,result.score);
  // An interrupted acknowledgement can be retried from the same character's second session.
  const repeated=await api('/api/arcade/runner/finish',pc.token,ack.request().postDataJSON());
  assert.equal(repeated.score,result.score);
  const board=await api('/api/arcade/runner?period=week',pc.token);
  assert.equal(board.self.score,result.score);
  const calendar=await api('/api/playtime/calendar',pc.token);
  assert.ok(calendar.summary.seconds>=1);
  assert.equal(calendar.rewardSummary.earnedPoints,'5');
  const wallet=await api('/api/points',pc.token);
  assert.equal(wallet.ledger.filter(row=>row.id.startsWith('playtime:')).length,1);
  await page.getByRole('link',{name:'我的积分',exact:true}).click();
  await page.waitForFunction(expected=>document.querySelector('.wallet-balance strong')?.textContent===expected,wallet.balance);
  const nav=page.getByRole('navigation',{name:'社区导航'});
  await nav.getByRole('button',{name:'全部栏目'}).click();
  await page.getByRole('dialog').getByRole('link',{name:'服务器在线记录'}).click();
  await page.getByText('累计获得 5 积分',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'本机游玩'}).count(),0);
  console.log('手机端 24 款小游戏、封面、计分对局、断流重试去重，两份角色会话的在线记录、排行榜及 5 积分账本一致。');
  await nav.getByRole('button',{name:'全部栏目'}).click();
  const directory=page.getByRole('dialog',{name:'社区栏目'});
  const columns=await directory.getByRole('link').evaluateAll(links=>links.map(link=>({label:link.textContent.trim(),hash:link.hash})));
  await directory.getByRole('button',{name:'关闭'}).click();
  for(const column of columns){
    await main.getByRole('link',{name:'社区',exact:true}).click();
    await nav.getByRole('button',{name:'全部栏目'}).click();
    await directory.getByRole('link',{name:column.label,exact:true}).click();
    await page.waitForFunction(hash=>location.hash===hash,column.hash);
    await page.waitForFunction(()=>{
      const scope=document.querySelector('.social-content,.archive-viewport,.guild-viewport');
      return scope&&!scope.innerText.includes('这个社区页面已归档')&&
        ![...scope.querySelectorAll('[role=status]')].some(el=>el.textContent==='正在打开…')&&
        (!!scope.querySelector('iframe')||[...scope.children].some(child=>
          !child.matches('header,.community-page-heading,.social-connection,.arcade-return')&&child.innerText?.trim().length>0));
    });
  }
  console.log('安卓社区目录 '+columns.length+' 个入口均能打开对应内容。');
}
