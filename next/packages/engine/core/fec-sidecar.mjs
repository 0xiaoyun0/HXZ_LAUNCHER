import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';

const READY = /^MC_FEC_READY\s+mode=edge\s+tcp=(\S+)\s+udp=(\S+)$/;

function validOrigin(value) {
  if (typeof value !== 'string' || value.length > 260) return false;
  const match = value.trim().match(/^(?:\[[0-9a-f:]+\]|[a-z0-9][a-z0-9.-]*|\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})$/i);
  if (!match) return false;
  const port = Number(match[1]);
  return port >= 1 && port <= 65535;
}

function numberArg(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

/**
 * Start the optional native FEC edge for a configured server preset.
 * A missing origin, token, binary, or a startup failure is reported to the
 * caller as a normal error so launch can fall back to the original address.
 */
export async function startFecEdge({resources, preset, signal, log = () => {}}) {
  const config = preset?.fec;
  if (!config?.enabled || !validOrigin(config.origin) || typeof config.token !== 'string' || !config.token.trim()) return null;
  if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('当前平台没有可用的 FEC 原生模块');
  const binary = path.join(resources, 'hxzre', 'bin', 'mc-tcp-fec.exe');
  await fs.access(binary);
  const args = [
    'edge', '--listen', '127.0.0.1:0', '--peer', config.origin.trim(), '--token', config.token.trim(),
    '--data-shards', String(numberArg(config.dataShards, 8, 1, 200)),
    '--parity-shards', String(numberArg(config.parityShards, 24, 1, 200)),
    '--shard-size', String(numberArg(config.shardSize, 1000, 256, 1200)),
    '--recovery-timeout-ms', String(numberArg(config.recoveryTimeoutMs, 200, 10, 60000)),
    '--max-retries', String(numberArg(config.maxRetries, 5, 0, 20)),
    '--cache-blocks', String(numberArg(config.cacheBlocks, 256, 1, 4096))
  ];
  const child = spawn(binary, args, {stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
  let settled = false;
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(Error('FEC edge 启动超时')), 10000);
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value);
    };
    const line = raw => {
      for (const value of String(raw).split(/\r?\n/)) {
        if (!value) continue;
        const match = value.match(READY);
        if (match) {
          finish(null, {address: match[1], udp: match[2]});
        } else log('[FEC] ' + value.slice(0, 800));
      }
    };
    child.stdout.on('data', line);
    child.stderr.on('data', line);
    child.once('error', error => finish(error));
    child.once('exit', code => {
      if (!settled) finish(Error(`FEC edge 退出（${code ?? 'unknown'}）`));
    });
    if (signal) {
      if (signal.aborted) finish(signal.reason || Error('任务已取消'));
      else signal.addEventListener('abort', () => finish(signal.reason || Error('任务已取消')), {once: true});
    }
  });
  try {
    const value = await result;
    log(`[FEC] edge 已就绪 ${value.address} → ${config.origin}`);
    let stopped = false;
    return {
      address: value.address,
      udp: value.udp,
      async stop() {
        if (stopped) return;
        stopped = true;
        if (child.exitCode == null && !child.killed) child.kill();
        await new Promise(resolve => {
          if (child.exitCode != null) return resolve();
          const timer = setTimeout(resolve, 2000);
          child.once('exit', () => {clearTimeout(timer); resolve();});
        });
      }
    };
  } catch (error) {
    if (child.exitCode == null && !child.killed) child.kill();
    throw error;
  }
}

