import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {statusAddressCandidates} from './server-online.mjs';

// The three public server aliases are documented by the launcher and resolve
// to these direct TCP endpoints.  Keeping this map beside the status fallback
// means an upgraded community service can configure FEC without a dashboard
// edit or a client update.
const DEFAULTS = Object.freeze([
  {id: 'HXZ-survival', target: '127.0.0.1:19999', port: 40000},
  {id: 'HXZ-mod-1', target: '127.0.0.1:19998', port: 40001},
  {id: 'HXZ-mod-2', target: '127.0.0.1:25599', port: 40002}
]);

const HOST = /^(?:\[[0-9a-f:]+\]|[a-z0-9][a-z0-9.-]*|\d{1,3}(?:\.\d{1,3}){3})$/i;

function port(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 65535 ? number : fallback;
}

function publicHost(value) {
  const host = String(value || 'ipv4.hxzmc.top').trim();
  if (!HOST.test(host) || host.length > 253) throw Error('HXZ_FEC_PUBLIC_HOST 无效');
  return host;
}

function parsePorts(value) {
  const values = String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  const ports = DEFAULTS.map((entry, index) => port(values[index], entry.port));
  if (new Set(ports).size !== ports.length) throw Error('HXZ_FEC_PORTS 不能重复');
  return ports;
}

function parseTargets(value) {
  const values = String(value || '').split(',').map(item => item.trim());
  return DEFAULTS.map((entry, index) => values[index] || entry.target);
}

function tokenFromFile(file, fallback) {
  try {
    const value = fs.readFileSync(file, 'utf8').trim();
    if (value.length >= 16 && value.length <= 512 && !/[\r\n]/.test(value)) return value;
  } catch {}
  fs.writeFileSync(file, fallback, {encoding: 'utf8', mode: 0o600});
  return fallback;
}

function tokenFile(data, id) {
  return path.join(data, 'hxzre', id + '.token');
}

function validTarget(value) {
  const match = String(value || '').match(/^(\[[0-9a-f:]+\]|\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/i);
  return !!match && net.isIP(match[1].replace(/^\[|\]$/g, '')) > 0 && port(match[2], 0) > 0;
}

function managedOrigin(value, host, ports) {
  if (typeof value !== 'string') return false;
  const match = value.trim().match(/^(.*):(\d{1,5})$/);
  return !!match && match[1].toLowerCase() === host.toLowerCase() && ports.includes(Number(match[2]));
}

/**
 * Configure and supervise the three default HXZRE origins.  The community
 * service and the Minecraft endpoints are on the same public host in the
 * production layout.  HXZ_FEC_AUTO=0 disables this migration for a custom
 * deployment; all manually configured presets continue to work.
 */
export function createFecAutoconfig({data, resources, log = () => {}, enabled} = {}) {
  const auto = enabled ?? process.env.HXZ_FEC_AUTO !== '0';
  const children = new Map();
  let closed = false;
  let settings;
  try {
    const targetOverride = String(process.env.HXZ_FEC_TARGETS || '').trim();
    settings = {
      host: publicHost(process.env.HXZ_FEC_PUBLIC_HOST),
      ports: parsePorts(process.env.HXZ_FEC_PORTS),
      targets: parseTargets(targetOverride),
      targetOverride: !!targetOverride
    };
    settings.targets = settings.targets.map((value, index) => {
      const candidate = value || DEFAULTS[index].target;
      if (!validTarget(candidate)) throw Error('HXZ_FEC_TARGETS 中存在无效地址');
      return candidate;
    });
  } catch (error) {
    log('[HXZRE] 自动配置已跳过：' + error.message);
    return {apply: value => value, close: async () => {}};
  }

  const binary = path.join(resources || '', 'hxzre', 'bin', process.platform === 'win32' ? 'mc-tcp-fec.exe' : 'mc-tcp-fec');
  if (!auto || !fs.existsSync(binary)) {
    if (auto) log('[HXZRE] 未找到 origin 运行时，保留原服务器连接');
    return {apply: value => value, close: async () => {}};
  }
  try {
    fs.mkdirSync(path.join(data, 'hxzre'), {recursive: true});
  } catch (error) {
    log('[HXZRE] token 目录不可写，保留原服务器连接：' + error.message);
    return {apply: value => value, close: async () => {}};
  }

  function start(entry, token, file) {
    if (closed || children.has(entry.id)) return;
    const child = spawn(binary, [
      'origin', '--listen', `0.0.0.0:${entry.port}`, '--target', entry.target, '--token', token,
      '--token-file', file
    ], {stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true});
    children.set(entry.id, child);
    child.stderr.on('data', chunk => {
      const text = String(chunk).trim();
      if (text) log(`[HXZRE ${entry.id}] ${text.slice(0, 600)}`);
    });
    child.once('error', error => log(`[HXZRE ${entry.id}] origin 启动失败：${error.message}`));
    child.once('exit', (code, signal) => {
      children.delete(entry.id);
      if (closed) return;
      log(`[HXZRE ${entry.id}] origin 已退出（${signal || code || 0}），1 秒后重试`);
      setTimeout(() => start(entry, token, file), 1000).unref();
    });
    log(`[HXZRE ${entry.id}] origin ${entry.target} ← UDP ${settings.host}:${entry.port}`);
  }

  function apply(presets) {
    if (!auto || !Array.isArray(presets)) return presets;
    return presets.map((preset, index) => {
      const entry = DEFAULTS.find(item => item.id === preset.id) || DEFAULTS[index];
      if (!entry || preset.fec?.enabled !== true) return preset;
      const candidate = statusAddressCandidates(preset.address || '').find(value => /:(\d{1,5})$/.test(value));
      const candidatePort = candidate?.match(/:(\d{1,5})$/)?.[1];
      const target = settings.targetOverride ? settings.targets[index] : ((candidate && validTarget(candidate)) ? candidate : (candidatePort ? `127.0.0.1:${candidatePort}` : settings.targets[index] || entry.target));
      const origin = managedOrigin(preset.fec?.origin, settings.host, settings.ports)
        ? preset.fec.origin.trim()
        : `${settings.host}:${settings.ports[index]}`;
      const file = tokenFile(data, entry.id);
      let token;
      try {
        token = tokenFromFile(file, randomBytes(32).toString('base64url'));
      } catch (error) {
        log(`[HXZRE ${entry.id}] token 保存失败：${error.message}`);
        return preset;
      }
      const fec = {...preset.fec, enabled: true, origin, token};
      start({...entry, target, port: settings.ports[index]}, token, file);
      return {...preset, fec};
    });
  }

  async function close() {
    closed = true;
    const pending = [...children.values()].map(child => new Promise(resolve => {
      if (child.exitCode != null || child.signalCode != null) return resolve();
      const timer = setTimeout(() => {child.kill(); resolve();}, 2000);
      child.once('exit', () => {clearTimeout(timer); resolve();});
      child.kill();
    }));
    await Promise.all(pending);
    children.clear();
  }

  return {apply, close};
}

export {DEFAULTS as DEFAULT_FEC_ORIGINS};
