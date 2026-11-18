import net from 'node:net';
import {lookup, Resolver} from 'node:dns/promises';
import {performance} from 'node:perf_hooks';
import {publicAddress} from './direct-wire.mjs';

// A TCP connect measurement from this device, not the monitoring server's ping.
export function serviceAddress(value, minecraft = false) {
  if (typeof value !== 'string' || value.length > 2048 || !value.trim()) return null;
  try {
    const text = value.trim(), web = /^https?:\/\//i.test(text);
    if (!web && !/^(?:[a-z\d][a-z\d.-]*|\[[a-f\d:]+\])(?::\d{1,5})?$/i.test(text)) return null;
    const url = new URL(web ? text : 'tcp://' + text);
    if (url.username || url.password) return null;
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const port = Number(url.port || (web ? url.protocol === 'https:' ? 443 : 80 : 25565));
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
    return {host, port, srv: minecraft && !url.port && !net.isIP(host), address: `${net.isIPv6(host) ? '[' + host + ']' : host}:${port}`};
  } catch { return null; }
}

export function monitorTargets(monitors, presets, source) {
  const aliases = {'原版生存群组服':'HXZ-survival', '原版生存群组':'HXZ-survival', '模组一服':'HXZ-mod-1', '模组二服':'HXZ-mod-2'};
  return monitors.slice(0, 32).map(m => {
    let target = null;
    // Only use endpoints actually published by the monitor, or a known service's
    // configured address. Monitor IDs alone are not a reliable service mapping.
    if (/^https?:\/\//i.test(m.url || '')) target = serviceAddress(m.url);
    if (!target && m.hostname && m.port) target = serviceAddress(`${net.isIPv6(m.hostname) ? '[' + m.hostname + ']' : m.hostname}:${m.port}`);
    const name = String(m.name || '').trim();
    const preset = presets.find(p => p.name === name || p.id === aliases[name]);
    if (!target && preset?.address) target = serviceAddress(preset.address, true);
    if (!target && name === '皮肤站') target = serviceAddress('https://skin.hxzmc.top');
    if (!target && name === 'Uptime-监控') target = serviceAddress(source);
    return {id: String(m.id), ...target, ...(target ? {} : {unavailable: true})};
  });
}

export function probeService(target, {signal, timeout = 4000, resolve = lookup, resolver = new Resolver(), connect = net.connect, allowedAddress = publicAddress} = {}) {
  const started = performance.now();
  return new Promise(finish => {
    let done = false, timer, srvTimer, remaining = 0;
    const sockets = new Set(), scheduled = new Set();
    const result = (state, extra = {}) => {
      if (done) return;
      done = true;
      clearTimeout(timer); clearTimeout(srvTimer);
      for (const id of scheduled) clearTimeout(id);
      for (const socket of sockets) socket.destroy();
      resolver.cancel();
      signal?.removeEventListener('abort', abort);
      finish({state, address: target.address, measuredAt: Date.now(), ...extra});
    };
    const abort = () => result('cancelled');
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, {once: true});
    timer = setTimeout(() => result('timeout'), timeout);
    const dial = (ip, port) => {
      if (done) return;
      let socket;
      const failed = () => { if (--remaining === 0) result('unreachable'); };
      try { socket = connect({host: ip.address, port, family: ip.family}); }
      catch { failed(); return; }
      sockets.add(socket);
      socket.once('connect', () => result('ok', {ms: Math.max(1, Math.round(performance.now() - started)), family: ip.family}));
      socket.once('error', failed);
    };
    const start = async () => {
      let {host, port} = target;
      if (target.srv) {
        const rows = await Promise.race([
          resolver.resolveSrv('_minecraft._tcp.' + host).catch(() => []),
          new Promise(resolve => { srvTimer = setTimeout(() => { resolver.cancel(); resolve([]); }, Math.min(700, timeout)); })
        ]);
        clearTimeout(srvTimer);
        const entry = rows.sort((a, b) => a.priority - b.priority || b.weight - a.weight).find(r => r.name && r.port > 0 && r.port <= 65535);
        if (entry) { host = entry.name; port = entry.port; }
      }
      if (done) return;
      let ips;
      try { ips = net.isIP(host) ? [{address: host, family: net.isIP(host)}] : await resolve(host, {all: true, verbatim: true}); }
      catch { result('dns'); return; }
      if (done) return;
      ips = ips.filter((ip, i) => ips.findIndex(other => other.address === ip.address) === i && allowedAddress(ip.address)).slice(0, 8);
      if (!ips.length) { result('unavailable'); return; }
      // Try the other address family promptly instead of waiting on broken IPv6.
      const opposite = ips.findIndex(ip => ip.family !== ips[0].family);
      if (opposite > 1) ips.splice(1, 0, ...ips.splice(opposite, 1));
      remaining = ips.length;
      ips.forEach((ip, i) => {
        if (!i) dial(ip, port);
        else scheduled.add(setTimeout(() => dial(ip, port), i * 200));
      });
    };
    void start().catch(() => result('unreachable'));
  });
}

export function createLatencyMonitor({targets, probe = probeService, cacheMs = 30000}) {
  const jobs = new Map(), cache = new Map(), queue = [];
  let active = 0, disposed = false;
  const pump = () => {
    while (active < 4 && queue.length) {
      const next = queue.shift();
      if (next.signal.aborted) { next.resolve({state: 'cancelled'}); continue; }
      active++;
      Promise.resolve().then(next.run).then(next.resolve, next.reject).finally(() => { active--; pump(); });
    }
  };
  const schedule = (run, signal) => new Promise((resolve, reject) => { queue.push({run, signal, resolve, reject}); pump(); });
  const cancel = (owner, requestId) => { jobs.get(`${owner}:${requestId}`)?.abort(); return {ok: true}; };
  return {
    cancel,
    cancelOwner(owner) { for (const [key, job] of jobs) if (key.startsWith(`${owner}:`)) job.abort(); },
    dispose() { disposed = true; for (const job of jobs.values()) job.abort(); cache.clear(); },
    async measure(owner, input) {
      if (disposed || !/^[\w-]{1,96}$/.test(input?.requestId || '') || !Array.isArray(input.ids) || input.ids.length > 32) throw Error('延迟检测请求无效');
      const key = `${owner}:${input.requestId}`;
      if (jobs.has(key) || jobs.size >= 4) throw Error('正在检测，请稍后刷新');
      const controller = new AbortController(); jobs.set(key, controller);
      try {
        const catalog = await targets();
        if (controller.signal.aborted) return {items: []};
        const ids = new Set(input.ids.map(String)), pending = new Map();
        const items = await Promise.all(catalog.filter(t => ids.has(t.id)).map(async target => {
          if (target.unavailable) return {id: target.id, state: 'unknown'};
          const cacheKey = `${target.address}:${target.srv ? 1 : 0}`;
          const saved = cache.get(cacheKey);
          if (saved && Date.now() - saved.measuredAt < cacheMs) return {...saved, id: target.id};
          if (!pending.has(cacheKey)) pending.set(cacheKey, schedule(async () => {
            const value = await probe(target, {signal: controller.signal});
            if (value.state !== 'cancelled') {
              if (cache.size >= 128) cache.delete(cache.keys().next().value);
              cache.set(cacheKey, value);
            }
            return value;
          }, controller.signal));
          return {...await pending.get(cacheKey), id: target.id};
        }));
        return {items: controller.signal.aborted ? [] : items};
      } finally { if (jobs.get(key) === controller) jobs.delete(key); }
    }
  };
}
