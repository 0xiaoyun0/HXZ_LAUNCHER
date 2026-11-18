import fs from 'node:fs/promises';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {queryMinecraftStatus} from './minecraft-connection.mjs';
import {minecraftHandshakeProxy} from './minecraft-proxy.mjs';

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

async function resolvePeer(value) {
  const input = value.trim();
  const bracketed = input.match(/^\[([^\]]+)\]:(\d{1,5})$/);
  const plain = input.match(/^(.+):(\d{1,5})$/);
  const host = bracketed?.[1] || plain?.[1];
  const port = bracketed?.[2] || plain?.[2];
  if (!host || !port) throw Error('FEC origin 地址无效');
  const address = net.isIP(host) ? host : (await dns.lookup(host, {all: false})).address;
  return net.isIPv6(address) ? `[${address}]:${port}` : `${address}:${port}`;
}

/**
 * Start the optional native FEC edge for a configured server preset.
 * A missing origin, token, binary, or a startup failure is reported to the
 * caller as a normal error so launch can fall back to the original address.
 */
export async function startFecEdge({resources, preset, signal, log = () => {},probeTimeout=3500}) {
  const config = preset?.fec;
  if (!config?.enabled || !validOrigin(config.origin) || typeof config.token !== 'string' || !config.token.trim()) return null;
  if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('当前平台没有可用的 FEC 原生模块');
  const binary = path.join(resources, 'hxzre', 'bin', 'mc-tcp-fec.exe');
  await fs.access(binary);
  const manifest=JSON.parse(await fs.readFile(path.join(resources,'hxzre/module.json'),'utf8'));
  if(createHash('sha256').update(await fs.readFile(binary)).digest('hex')!==manifest.sha256)throw Error('HXZRE 运行时校验失败，请重新安装启动器');
  const peer=await resolvePeer(config.origin);
  const args = [
    'edge', '--listen', '127.0.0.1:0', '--peer', peer,
    '--data-shards', String(numberArg(config.dataShards, 8, 1, 200)),
    '--parity-shards', String(numberArg(config.parityShards, 24, 1, 200)),
    '--shard-size', String(numberArg(config.shardSize, 1000, 256, 1200)),
    '--recovery-timeout-ms', String(numberArg(config.recoveryTimeoutMs, 200, 10, 60000)),
    '--max-retries', String(numberArg(config.maxRetries, 5, 0, 20)),
    '--cache-blocks', String(numberArg(config.cacheBlocks, 256, 1, 4096))
  ];
  const child = spawn(binary, args, {env:{...process.env,MC_FEC_TOKEN:config.token.trim()},stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
  let settled = false;
  const result = new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(Error('FEC edge 启动超时')), 10000);
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value);
    };
    const line = () => {let buffer='';return raw => {
      buffer+=String(raw);const lines=buffer.split(/\r?\n/);buffer=lines.pop().slice(-8192);
      for (const value of lines) {
        if (!value) continue;
        const match = value.match(READY);
        if (match) {
          finish(null, {address: match[1], udp: match[2]});
        } else log('[FEC] ' + value.slice(0, 800));
      }
    };};
    child.stdout.on('data', line());
    child.stderr.on('data', line());
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
    let status;
    try{status=await queryMinecraftStatus(value.address,{handshakeAddress:preset.address||value.address,signal,timeout:probeTimeout,resolveSrv:false});}
    catch(error){throw Error('HXZRE 端到端连接验证失败：'+error.message);}
    log(`[FEC] 已通过 MC 双向连接验证 ${value.address} → ${config.origin}`);
    const proxy=await minecraftHandshakeProxy(value.address,preset.address||value.address);
    let stopped = false;
    return {
      address: proxy.address,
      udp: value.udp,
      verified:true,status,
      async stop() {
        if (stopped) return;
        stopped = true;
        await proxy.close();
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

