import {randomBytes, randomUUID, createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import {parseEnv, promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
import {defaultOrigins, packagedClients} from '../apps/community-server/src/client-origins.mjs';

// Preserve unrelated configuration byte for byte, including comments, BOM and line endings.
export function repairedEnv(text) {
  const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
  const source = text.slice(bom.length);
  const before = parseEnv(source);
  const current = before.HXZ_ORIGINS?.trim() || '';
  const present = new Set(current.split(',').map(value => value.trim()));
  const missing = packagedClients.map(client => client.origin).filter(origin => !present.has(origin));
  if (!missing.length) return text;
  const next = current ? [current, ...missing].join(',') : defaultOrigins.join(',');
  const rows = [...source.matchAll(/^([ \t]*(?:export[ \t]+)?HXZ_ORIGINS[ \t]*=[ \t]*)([^\r\n]*)/gm)];
  let result;
  if (!rows.length) {
    const eol = source.includes('\r\n') ? '\r\n' : '\n';
    result = source + (source && !source.endsWith('\n') ? eol : '') + 'HXZ_ORIGINS=' + next + eol;
  } else {
    if (rows.length !== 1) throw Error('找到多行 HXZ_ORIGINS。请在生效的那一行末尾加入两个官方来源。');
    const [row, prefix, rhs] = rows[0];
    const quote = ['"', "'", '`'].includes(rhs[0]) ? rhs[0] : '';
    const end = quote ? rhs.lastIndexOf(quote) : 0;
    if (quote && end < 1) throw Error('HXZ_ORIGINS 使用了多行引号，请把该项整理为单行再运行。');
    const suffix = quote ? rhs.slice(end + 1) : rhs.match(/[ \t]*(?:#.*)?$/)[0];
    if (quote && !/^[ \t]*(?:#.*)?$/.test(suffix)) throw Error('HXZ_ORIGINS 引号后有未识别的内容，请检查该行。');
    const line = prefix + quote + next + quote + (suffix.startsWith('#') ? ' ' : '') + suffix;
    result = source.slice(0, rows[0].index) + line + source.slice(rows[0].index + row.length);
  }
  const after = parseEnv(result);
  const expected = {...before, HXZ_ORIGINS:next};
  if (Object.keys(after).length !== Object.keys(expected).length ||
      Object.keys(expected).some(key => after[key] !== expected[key])) {
    throw Error('配置中有复杂的多行或重复定义。请在 HXZ_ORIGINS 中手动加入两个官方来源。');
  }
  return bom + result;
}

async function readConfig(root) {
  const file = path.join(root, '.env');
  const info = await fs.lstat(file).catch(error => {
    if (error.code === 'ENOENT') throw Error('找不到 .env。请把工具解压到实际启动社区服务的目录。');
    throw error;
  });
  if (!info.isFile()) throw Error('.env 由链接或挂载管理，请在它的实际配置源中操作。');
  const bytes = await fs.readFile(file);
  let text;
  try { text = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(bytes); }
  catch { throw Error('.env 的编码不是 UTF-8，请手动在 HXZ_ORIGINS 中补入官方来源。'); }
  const settings = parseEnv(text.replace(/^\uFEFF/, ''));
  const manifest = await fs.readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse).catch(() => null);
  if (manifest?.name !== 'hxz-launcher-community' && !('HXZ_ORIGINS' in settings || 'HXZ_SKIN_API' in settings)) {
    throw Error('这个目录未识别为幻想镇社区服务端。请选含「启动社区服务.bat」或社区 .env 的目录。');
  }
  return {file, info, bytes, text, settings};
}

export async function repair(root) {
  const {file, info, bytes, text} = await readConfig(root);
  const updated = repairedEnv(text);
  if (text === updated) return null;
  const id = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8);
  const backup = file + '.before-community-' + id;
  const temp = file + '.community-' + id + '.tmp';
  const handle = await fs.open(temp, 'wx', 0o600);
  let backupHandle, saved = false;
  try {
    try {
      backupHandle = await fs.open(backup, 'wx', 0o600);
      if (process.platform === 'win32') {
        // Node's numeric mode does not copy a Windows ACL. Protect the empty files first.
        const shell = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
        const copyAcl = [
          "$ErrorActionPreference='Stop'",
          '$source=[IO.File]::GetAccessControl($env:HXZ_ENV_ORIGINAL)',
          '$sid=[Security.Principal.SecurityIdentifier]',
          'foreach ($file in @($env:HXZ_ENV_TEMP, $env:HXZ_ENV_BACKUP)) {',
          '  $target=[IO.File]::GetAccessControl($file)',
          '  $sections=[Security.AccessControl.AccessControlSections]::Access',
          '  if ($source.GetOwner($sid).Value -ne $target.GetOwner($sid).Value) { $sections=$sections -bor [Security.AccessControl.AccessControlSections]::Owner }',
          '  if ($source.GetGroup($sid).Value -ne $target.GetGroup($sid).Value) { $sections=$sections -bor [Security.AccessControl.AccessControlSections]::Group }',
          '  $target.SetSecurityDescriptorBinaryForm($source.GetSecurityDescriptorBinaryForm(), $sections)',
          '  [IO.File]::SetAccessControl($file,$target)',
          '}'
        ].join('\n');
        await promisify(execFile)(shell, ['-NoProfile','-NonInteractive','-Command',copyAcl],
          {windowsHide:true, env:{...process.env, HXZ_ENV_ORIGINAL:file, HXZ_ENV_TEMP:temp, HXZ_ENV_BACKUP:backup}})
          .catch(() => { throw Error('无法保留原 .env 的文件权限。请用管理该服务的 Windows 账号运行。'); });
      } else {
        const owner = await handle.stat();
        if (owner.uid !== info.uid || owner.gid !== info.gid) await handle.chown(info.uid, info.gid);
        await handle.chmod(info.mode & 0o777);
      }
      await handle.writeFile(updated, 'utf8');
      await handle.sync();
      await backupHandle.writeFile(bytes);
      await backupHandle.sync();
      saved = true;
    } finally { await Promise.all([handle.close(), backupHandle?.close()]); }
    if (!(await fs.readFile(file)).equals(bytes)) throw Error('.env 刚被其他程序修改，请重新运行修复。');
    await fs.rename(temp, file);
    return backup;
  } finally {
    await fs.rm(temp, {force:true});
    if (backupHandle && !saved) await fs.rm(backup, {force:true});
  }
}

function chatHandshake(base, origin) {
  const url = new URL(base + '/ws');
  const key = randomBytes(16).toString('base64');
  const expected = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, {signal:AbortSignal.timeout(6000), headers:{
      Origin:origin, Connection:'Upgrade', Upgrade:'websocket',
      'Sec-WebSocket-Version':'13', 'Sec-WebSocket-Key':key
    }});
    request.on('upgrade', (response, socket) => {
      socket.destroy();
      if (response.statusCode === 101 && response.headers['sec-websocket-accept'] === expected) resolve();
      else reject(Error('握手应答无效'));
    });
    request.on('response', response => { response.resume(); reject(Error('HTTP ' + response.statusCode)); });
    request.on('error', reject);
  });
}

export async function verifyClients(base, report = console.log) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search)
    throw Error('请使用社区的 HTTP 或 HTTPS 根地址。');
  base = url.href.replace(/\/$/, '');
  const health = await fetch(base + '/health', {redirect:'error', signal:AbortSignal.timeout(6000)});
  if (!health.ok) throw Error('健康检查返回 HTTP ' + health.status);
  const status = await health.json();
  if (status.service !== 'hxz-community' || !status.ok) throw Error('该地址返回的不是幻想镇社区健康状态。');
  report('社区服务版本 ' + status.version);
  let ok = true;
  for (const {name, origin} of packagedClients) {
    try {
      const preflight = await fetch(base + '/api/points', {method:'OPTIONS', redirect:'error',
        headers:{Origin:origin, 'Access-Control-Request-Method':'GET', 'Access-Control-Request-Headers':'authorization'},
        signal:AbortSignal.timeout(6000)});
      const headers = key => (preflight.headers.get(key) || '').toLowerCase().split(',').map(v => v.trim());
      if (preflight.status !== 204 || preflight.headers.get('access-control-allow-origin') !== origin ||
          !headers('access-control-allow-methods').includes('get') || !headers('access-control-allow-headers').includes('authorization')) {
        throw Error('预检 HTTP ' + preflight.status + '，请核对运行中服务的 HXZ_ORIGINS');
      }
      report(name + ' 接口通过');
    } catch (error) { ok = false; report(name + ' 接口失败 · ' + (error.cause?.code || error.message)); }
    try { await chatHandshake(base, origin); report(name + ' 聊天握手通过'); }
    catch (error) { ok = false; report(name + ' 聊天握手失败 · ' + (error.code || error.message)); }
  }
  return ok;
}

async function main() {
  const [action, directory = '.', publicBase] = process.argv.slice(2);
  const root = path.resolve(directory);
  if (action === 'repair' && !publicBase) {
    const backup = await repair(root);
    console.log(backup ? '已补齐 Windows 和 Android 来源，原配置备份在 ' + path.basename(backup) : '两个官方来源均已配置。');
    console.log('请通过原来的方式重启整个社区服务，然后运行「检查社区连接」。Docker Compose 部署请重新创建 community 容器。');
  } else if (action === 'check') {
    let base = publicBase;
    if (!base) {
      const {settings} = await readConfig(root);
      const host = settings.HOST || '127.0.0.1';
      const local = host === '0.0.0.0' ? '127.0.0.1' : host === '::' ? '[::1]' : host.includes(':') && !host.startsWith('[') ? '[' + host + ']' : host;
      base = 'http://' + local + ':' + (settings.PORT || '8787');
    }
    if (!await verifyClients(base)) process.exitCode = 1;
  } else throw Error('请运行 node community-connection.mjs repair 服务端目录，或 check 服务端目录 [公网地址]');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    const code = error.cause?.code || error.code;
    const reason = ['EACCES','EPERM'].includes(code) ? '权限不足，请用有权读写 .env 的服务管理员账号运行。' :
      code === 'ECONNREFUSED' ? '社区服务端口没有接受连接，请确认服务已启动并核对 .env 中的端口。' : (error.cause?.code || error.message);
    console.error(reason);
    process.exitCode = 1;
  });
}
