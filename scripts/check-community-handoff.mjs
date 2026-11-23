import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash, randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as delay} from 'node:timers/promises';
import {extractNative} from '../packages/engine/core/io.mjs';

// Run an original Windows server against disposable data. --github preserves all
// updater URLs. The local run changes only those URLs and exercises recovery.
const github = process.argv.includes('--github');
const oldRelease = process.env.HXZ092_RELEASE;
assert.ok(oldRelease, '设置 HXZ092_RELEASE 为原版 0.9.2 发布目录');
const original = path.join(oldRelease, 'server/HXZ-Community-0.9.2-windows-x64.zip');
const checksum = createHash('sha256');
for await (const chunk of createReadStream(original)) checksum.update(chunk);
assert.equal(checksum.digest('hex'), 'dec12fa7817c71789899e037b5767dc444da5c2345a637bade77c3011b65739f', '0.9.2 官方完整包');
const {version} = JSON.parse(await fs.readFile('package.json', 'utf8'));
const release = path.resolve('release', version);
const archive = 'HXZ-Community-' + version + '-update.zip';
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'hxz-community-handoff-'));
const app = path.join(temp, 'server'), data = path.join(temp, 'data');
const updateDir = path.join(data, '.updates');
const password = randomBytes(32).toString('hex');
let proc, stopped, fixture, origin, token;
let damagedDownload = false;

async function eventually(read, matches, message, timeout = 100000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    assert.ok(proc && proc.exitCode === null && proc.signalCode === null, '隔离服务已退出');
    let value;
    try { value = await read(); } catch { /* During restart the port briefly closes. */ }
    if (value && matches(value)) return value;
    await delay(250);
  }
  assert.fail(message);
}

async function api(route, input) {
  const response = await fetch(origin + route, {
    method: input ? 'POST' : 'GET', signal: AbortSignal.timeout(32000),
    headers: {'Content-Type':'application/json', ...(token ? {Authorization:'Bearer ' + token} : {})},
    body: input ? JSON.stringify(input) : undefined
  });
  assert.ok(response.ok, route + ' HTTP ' + response.status);
  return response.json();
}
const updates = input => api('/api/admin/updates', input);
const readJSON = file => fs.readFile(file, 'utf8').then(JSON.parse);
const walletId = '00000000000040008000000000000042';
const envSample = 'HXZ_HANDOFF_SAMPLE=retained\n';
function wallet(file) {
  const db = new DatabaseSync(file, {readOnly:true});
  try { return db.prepare('SELECT balance FROM points_wallet WHERE uid=?').get(walletId)?.balance; }
  finally { db.close(); }
}
async function start() {
  const executable = process.platform === 'win32' ? path.join(app, 'node.exe') : process.execPath;
  proc = spawn(executable, ['--env-file=.env','supervisor.mjs'], {
    cwd:app, windowsHide:true, stdio:'ignore',
    env:{...process.env, HOST:'127.0.0.1', PORT:new URL(origin).port, HXZ_DATA:data,
      HXZ_FEC_AUTO:'0', HXZ_ADMIN_PASSWORD:password}
  });
  stopped = once(proc, 'exit');
}
async function stop() {
  if (proc && proc.exitCode === null && proc.signalCode === null) proc.kill();
  if (stopped) await stopped;
  if (!origin || !proc) return;
  for (let i = 0; i < 50; i++) {
    try { await api('/health'); } catch { return; }
    await delay(100);
  }
  throw Error('隔离子进程仍占用测试端口');
}
async function localAttachments() {
  fixture = http.createServer(async (req, res) => {
    if (req.url === '/latest/download/community-update.json') {
      res.setHeader('Content-Type','application/json');
      return createReadStream(path.join(release,'updates/community-update.json')).pipe(res);
    }
    if (req.url !== '/download/v' + version + '/' + archive) return res.writeHead(404).end();
    const file = path.join(release, 'server', archive);
    res.setHeader('Content-Length', (await fs.stat(file)).size);
    if (!damagedDownload) return createReadStream(file).pipe(res);
    // Same size as the release, different first byte. The real updater must reject it.
    res.write(Buffer.from([0]));
    createReadStream(file, {start:1}).pipe(res);
  });
  fixture.listen(0,'127.0.0.1');
  await once(fixture,'listening');
  const trust = path.join(app,'src/update-trust.mjs');
  const originalText = await fs.readFile(trust,'utf8');
  const patched = originalText.replace(/^export const ROOT=.*;$/m,
    "export const ROOT='http://127.0.0.1:" + fixture.address().port + "';")
    .replace(/^export const SOURCES=.*;$/m, "export const SOURCES=[''];");
  assert.ok(patched.includes("SOURCES=['']") && patched.includes(String(fixture.address().port)));
  await fs.writeFile(trust,patched);
}

try {
  await extractNative(original, app);
  await fs.writeFile(path.join(app,'.env'),envSample);
  if (!github) await localAttachments();
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  origin = 'http://127.0.0.1:' + socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  await start();
  await eventually(() => api('/health'), h => h.version === '0.9.2', '旧服务未启动');
  token = (await api('/api/admin/login',{username:'admin',password})).token;
  const initial = await updates();
  assert.deepEqual(initial.options,{autoCheck:true,autoApply:false,hour:4});
  assert.ok(initial.supervised);
  const database = path.join(data, 'community.sqlite');
  const db = new DatabaseSync(database);
  try { db.prepare('INSERT INTO points_wallet(uid,name,balance) VALUES(?,?,?)').run(walletId,'验收角色','17'); }
  finally { db.close(); }
  const sessionKey = await fs.readFile(path.join(data,'session.key'));
  const checked = await updates({action:'check'});
  assert.equal(checked.available?.version,version,'0.9.2 原版检查更新应发现当前服务端');
  console.log('原版后台检查到了已签名的 ' + version);
  if (!github) {
    damagedDownload = true;
    await updates({action:'download'});
    const failure = await eventually(updates,s => s.stage === 'error','损坏的更新应被拒绝');
    assert.match(failure.error,/校验/);
    assert.equal((await api('/health')).version,'0.9.2');
    damagedDownload = false;
    await updates({action:'download'});
    await eventually(updates,s => s.stage === 'ready','正确的包应能重试');
    // Simulate files becoming unavailable after verification, on the isolated disk.
    const ready = await readJSON(path.join(updateDir,'ready.json'));
    assert.ok(path.resolve(ready.target).startsWith(path.resolve(updateDir,'releases') + path.sep));
    await fs.rename(path.join(ready.target,'src/server.mjs'),path.join(ready.target,'src/server.off'));
    await updates({action:'apply'});
    const rolledBack = await eventually(updates,s => s.current === '0.9.2' && s.last?.rolledBack,'旧数据库和服务没有恢复');
    assert.equal(rolledBack.last.ok,false);
    assert.equal(wallet(database),'17');
    console.log('损坏包被拒绝，新进程启动失败后已恢复旧版及积分记录');
    await updates({action:'check'});
    await updates({action:'download'});
    await eventually(updates,s => s.stage === 'ready','回滚后应能再次下载');
  }
  const toNextHour = 3600000 - Date.now() % 3600000;
  if (toNextHour < 75000) await delay(toNextHour + 1000);
  const hour = Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
  const options = {autoCheck:true,autoApply:true,hour};
  await updates({action:'settings',...options});
  assert.deepEqual((await updates()).options,options);
  if (github) {
    await stop();
    await start();
    const restarted = await eventually(updates,s => s.current === '0.9.2','旧版应从保存的维护时段开始');
    assert.deepEqual(restarted.options,options);
    assert.equal(restarted.available,null);
  }
  // After this reboot the public run has no pending package or in-memory check.
  // Discovery, download and apply all belong to the original one-minute timer.
  await eventually(updates,s => s.current === version && s.last?.ok && s.last.version === version,
    '维护时段未自动切换到新服务端',185000);
  assert.equal((await api('/health')).version,version);
  assert.equal(wallet(database),'17');
  const result = await readJSON(path.join(updateDir,'last-result.json'));
  assert.equal(wallet(path.join(result.backup,'community.sqlite')),'17');
  assert.deepEqual(await fs.readFile(path.join(data,'session.key')),sessionKey);
  assert.equal(await fs.readFile(path.join(app,'.env'),'utf8'),envSample);
  assert.deepEqual((await updates()).options,options);
  await stop();
  await start();
  await eventually(updates,s => s.current === version && s.supervised,'重启后未继续运行已安装版本');
  assert.equal(wallet(database),'17');
  console.log((github?'公开 GitHub':'隔离发布源，含损坏包重试与启动失败回滚') +
    '：0.9.2 → ' + version + ' 定时安装完成；原会话、积分、配置、数据库备份及重启版本通过。');
} finally {
  await stop();
  if (fixture) await new Promise(resolve => fixture.close(resolve));
  if (path.dirname(temp) === os.tmpdir() && path.basename(temp).startsWith('hxz-community-handoff-')) {
    await fs.rm(temp,{recursive:true,force:true,maxRetries:8,retryDelay:350});
  }
}
