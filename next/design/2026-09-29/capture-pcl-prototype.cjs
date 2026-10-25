const { chromium } = require('playwright-core');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1240, height: 800 }, deviceScaleFactor: 1.5 });
  await page.goto('http://127.0.0.1:5186');
  await page.waitForFunction(() => !document.querySelector('#monitor-updated').textContent.includes('获取最新状态'));
  await page.screenshot({ path: path.join(__dirname, '幻想镇-启动页.png') });
  console.log(await page.locator('.content').evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight })));
  await page.locator('.open-monitor').click();
  await page.screenshot({ path: path.join(__dirname, '幻想镇-服务监控.png') });
  await page.locator('#close-monitor').click();
  await page.locator('#customize-open').click();
  await page.screenshot({ path: path.join(__dirname, '幻想镇-卡片个性化.png') });
  await browser.close();
})();
