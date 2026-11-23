import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright-core';
import {communityExtension} from '../engine/community-extension.mjs';
import {extractNative} from '../packages/engine/core/io.mjs';
import {listenLoopback} from '../apps/community-server/test/helpers/loopback.mjs';
import {communityFixture} from './check-community-session.mjs';

// Exercise the actual double-click tools against the originally published server binary.
assert.equal(process.platform, 'win32');
assert.ok(process.env.HXZ092_RELEASE, '设置 HXZ092_RELEASE 为原版 0.9.2 发布目录');
const release = path.resolve('release/0.10.0');
const serverZip = path.join(release, 'server/HXZ-Community-0.10.0-windows-x64.zip');
assert.equal(createHash('sha256').update(await fs.readFile(serverZip)).digest('hex'),
  '5d15526f4a16173781ab2e3c18fbc86b9b1189bb39b02b942b9f7ff6c42bccf9');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'hxz-connection-repair-'));
const root = path.join(temp, '社区 服务端'), home = path.join(temp, 'launcher');
let service, browser, app, fixture, serviceEnd;
const sample = await fs.readFile(path.join(process.env.HXZ092_RELEASE, 'server/幻想镇社区服务端/.env.example'), 'utf8');
assert.match(sample, /^HXZ_ORIGINS=null,file:\/\/,http:\/\/127\.0\.0\.1:9000,http:\/\/localhost:9000\r?$/m);

async function port() {
  const socket = net.createServer();
  const value = await listenLoopback(socket);
  await new Promise(resolve => socket.close(resolve));
  return value;
}
const serverPort = await port(), base = 'http://127.0.0.1:' + serverPort;
async function waitFor(read, label, duration = 25000) {
  const until = Date.now() + duration;
  while (Date.now() < until) { try { const value = await read(); if (value) return value; } catch {} await delay(150); }
  throw Error(label);
}
const health = () => fetch(base + '/health', {signal:AbortSignal.timeout(900)}).then(r => r.json());
async function start() {
  service = spawn(path.join(root, 'node.exe'), ['--env-file=.env', 'supervisor.mjs'], {
    cwd:root, stdio:'ignore', windowsHide:true, env:{...process.env, HXZ_ADMIN_PASSWORD:randomUUID(), HXZ_FEC_AUTO:'0'}});
  serviceEnd = once(service, 'exit');
  await waitFor(async () => (await health()).version === '0.10.0', '正式服务端没有启动');
}
async function stop() {
  if (!service) return;
  if (service.exitCode === null && !service.signalCode) service.kill();
  await serviceEnd;
  await waitFor(() => health().then(() => false, () => true), '隔离服务未退出');
  service = null;
}
function batch(name, code) {
  const run = spawnSync(process.env.ComSpec, ['/d','/c',name], {cwd:root, input:'\r\n', encoding:'utf8', windowsHide:true, timeout:30000});
  assert.equal(run.status, code, (run.stdout || '') + (run.stderr || ''));
  return run.stdout;
}

try {
  await extractNative(serverZip, root);
  await extractNative(path.join(release, 'server-tools/HXZ-Community-0.10.0-connection-repair.zip'), root);
  await fs.mkdir(home);
  const dist = path.join(release, 'windows-x64');
  fixture = await communityFixture(home, dist, '幻想镇 3rd.exe');
  const original = sample.replace(/^PORT=8787/m, 'PORT=' + serverPort)
    .replace(/^HXZ_SKIN_API=[^\r\n]*/m, 'HXZ_SKIN_API=' + fixture.skinUrl);
  await fs.writeFile(path.join(root, '.env'), original);
  await start();
  const rejected = batch('检查社区连接.bat', 1);
  for (const client of ['Windows','Android']) assert.ok(rejected.includes(client + ' 接口失败 · 预检 HTTP 403'));
  console.log('正式 0.10.0 加载 0.9.2 配置，两个客户端均复现 HTTP 403。');
  assert.match(batch('修复社区连接.bat', 0), /已补齐/);
  const backups = (await fs.readdir(root)).filter(name => name.startsWith('.env.before-community-'));
  assert.equal(backups.length, 1);
  assert.equal(await fs.readFile(path.join(root, backups[0]), 'utf8'), original);
  assert.match(batch('修复社区连接.bat', 0), /均已配置/);
  assert.equal((await fs.readdir(root)).filter(name => name.startsWith('.env.before-community-')).length, 1);
  batch('检查社区连接.bat', 1); // Saving the file alone must not claim that the running supervisor reloaded.
  await stop(); await start();
  const accepted = batch('检查社区连接.bat', 0);
  for (const client of ['Windows','Android']) {
    assert.ok(accepted.includes(client + ' 接口通过'));
    assert.ok(accepted.includes(client + ' 聊天握手通过'));
  }
  assert.equal((await fetch(base + '/health', {headers:{Origin:'https://unknown.example'}})).status, 403);
  console.log('两个批处理实际运行通过，原配置精确备份，重启后四项通过，其他来源仍被拒绝。');

  const catalog = JSON.parse(await fs.readFile('.runtime/official-extensions.json', 'utf8'));
  const definition = catalog.community, plugin = path.join(release, 'extensions', definition.name);
  await communityExtension({home,id:'community',definition,choose:async () => ({filePaths:[plugin]})})('extension.import');
  const gameRoot = path.join(home, 'game');
  await fs.mkdir(gameRoot);
  await fs.writeFile(path.join(home, 'settings.json'), JSON.stringify({communityUrl:base, gameRoot,
    onboardingDone:true, autoReportErrors:false, liteStartup:false}));
  const debugPort = await port();
  app = spawn(fixture.exe, [], {windowsHide:true, stdio:'ignore', env:{...process.env, HXZ3_QA_INSTANCE:'1',
    HXZ3_QA_BACKGROUND:'1', HXZ3_HOME:home, APPDATA:path.join(home,'roaming'), WEBVIEW2_USER_DATA_FOLDER:path.join(home,'webview'),
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=' + debugPort + ' --remote-debugging-address=127.0.0.1'}});
  const page = await waitFor(async () => {
    browser ??= await chromium.connectOverCDP('http://127.0.0.1:' + debugPort, {timeout:1000});
    return browser.contexts().flatMap(c => c.pages()).find(p => p.url().startsWith('http://tauri.localhost'));
  }, '正式 WebView2 窗口没有就绪', 45000);
  await page.getByRole('navigation', {name:'主导航'}).getByRole('link', {name:'社区',exact:true}).click();
  await page.getByRole('button', {name:'登录账号',exact:true}).click();
  await fixture.login(page);
  const chat = page.getByPlaceholder('聊点什么吧…');
  const message = '隔离服务连接验收 ' + randomUUID().slice(0, 8);
  await chat.fill(message, {timeout:25000});
  await page.getByRole('button', {name:'发送消息'}).click();
  await page.getByText(message, {exact:true}).first().waitFor();
  await page.reload();
  await page.getByText(message, {exact:true}).first().waitFor({timeout:25000});
  console.log('Windows x64 原生 WebView2 使用临时皮肤站账号登录并收发聊天，重载后从服务端取回原消息。');
  await fs.copyFile(path.join(root, backups[0]), path.join(root, '.env'));
  await stop(); await start();
  batch('检查社区连接.bat', 1);
  console.log('恢复备份、重启后重现原先 403，回退验证通过。');
} finally {
  if (browser) await browser.close().catch(() => {});
  if (app && app.exitCode === null && !app.signalCode) { const exited = once(app, 'exit'); app.kill(); await exited; }
  await stop();
  if (fixture) await fixture.close();
  assert.equal(path.dirname(temp), os.tmpdir());
  assert.ok(path.basename(temp).startsWith('hxz-connection-repair-'));
  await fs.rm(temp, {recursive:true, force:true, maxRetries:10, retryDelay:300});
}
