import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {chromium} from 'playwright-core';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
const {createCommunity}=await import(pathToFileURL(path.resolve(process.env.HXZ_SERVER_ROOT||'apps/community-server','src/server.mjs')));

const data=await mkdtemp(path.join(tmpdir(),'hxz-admin-ui092-'));
const service=createCommunity({data,fecAuto:false});
service.server.listen(0,'127.0.0.1');await once(service.server,'listening');
const base='http://127.0.0.1:'+service.server.address().port;
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1400,height:960}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/admin/');
 const password=(await readFile(path.join(data,'初始管理员密码.txt'),'utf8')).match(/初始密码：([^\n]+)/)[1];
 await page.locator('#login-form input[name=password]').fill(password);
 await page.locator('#login-form button').click();
 await page.locator('#workspace').waitFor({state:'visible',timeout:10000});
 assert.deepEqual(errors,[],'后台登录不可有脚本错误');
 await fetch(base+'/api/error-reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:randomUUID(),version:'0.9.2',platform:'win32-x64',message:'本地验收：测试错误上报',context:{os:'Windows test'}})});
 const tabs=await page.locator('[data-tab]').evaluateAll(nodes=>nodes.map(node=>node.dataset.tab));
 for(const tab of tabs){
  await page.locator(`[data-tab="${tab}"]`).click();
  assert.equal(await page.locator(`[data-view="${tab}"]`).evaluate(node=>node.hidden),false,'管理页应切换成功：'+tab);
  await page.waitForTimeout(120);
 }
 await page.locator('[data-tab=servers]').click();
 await page.locator('#servers-fields fieldset').first().waitFor();
 assert.deepEqual(errors,[],'后台所有管理入口应可使用');
 await page.locator('[data-tab=runtime]').click();await page.getByText('实际运行的社区服务',{exact:true}).waitFor();
 await mkdir('.preview/screens',{recursive:true});await page.screenshot({path:'.preview/screens/admin092-runtime.png',fullPage:true});
 const refreshed=page.waitForResponse(r=>r.request().method()==='GET'&&r.url().includes('/api/admin/error-reports?'));await page.locator('[data-tab=errors]').click();await refreshed;await page.getByText('本地验收：测试错误上报',{exact:true}).waitFor();await page.getByLabel('处理状态').selectOption('resolved');await page.getByLabel('处理人',{exact:true}).fill('本地验收');await page.getByLabel('处理说明',{exact:true}).fill('已通过浏览器验证');const saved=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/api/admin/error-reports/'));await page.getByRole('button',{name:'保存处理记录',exact:true}).click();const response=await saved;assert.equal(response.request().postDataJSON().status,'resolved');assert.equal(response.ok(),true,await response.text());await page.getByText(/已解决 · 1 次/).waitFor();await page.screenshot({path:'.preview/screens/admin092-errors.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS admin login and '+tabs.length+' management tabs');
}finally{
 await browser?.close();await service.close();
 assert.ok(path.resolve(data).startsWith(path.resolve(tmpdir())+path.sep));
 await rm(data,{recursive:true,force:true});
}
