import { createHash, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const COMMUNITY = 'https://qqbot.hxzmc.top';
const GITHUB = 'https://api.github.com/repos/0xiaoyun0/HXZ_LAUNCHER/releases/latest';
const cache = new Map(), pending = new Map(), covers = new Map();
let cacheBytes = 0, coverBytes = 0;
const MAX_BYTES = 12 * 1024 * 1024;
const UPDATE_KEY = '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAp3PXBqjaYfiTErfGIzr1rVo7SXX3lkUdWk23w1LmEf8=\n-----END PUBLIC KEY-----\n';
const knownRelease = JSON.parse(await readFile(new URL('./known-release.json',import.meta.url),'utf8'));

async function fetchJSON(url, signal = AbortSignal.timeout(8000)) {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json', 'User-Agent': 'FantasyTown-Website/1.0' } });
  if (!response.ok) { await response.body?.cancel(); throw new Error(`上游 HTTP ${response.status}`); }
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > MAX_BYTES) throw new Error('上游响应过大');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function normalizeCommunity(data, endpoint) {
  if (endpoint !== 'blueprints') return data;
  return { ...data, items: (data.items ?? []).map(item => {
    const match = typeof item.cover === 'string' && /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(item.cover);
    let cover = '';
    if (match && match[2].length <= 3 * 1024 * 1024 && /^[a-zA-Z0-9-]{1,80}$/.test(item.id)) {
      const bytes = Buffer.from(match[2], 'base64');
      const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
      coverBytes -= covers.get(item.id)?.bytes.length ?? 0;
      covers.set(item.id, { bytes, type: `image/${match[1]}`, etag: `"${hash}"` });
      coverBytes += bytes.length;
      while (covers.size > 32 || coverBytes > 20 * 1024 * 1024) {
        const oldest=covers.keys().next().value;coverBytes-=covers.get(oldest).bytes.length;covers.delete(oldest);
      }
      cover = `/api/blueprint-cover/${item.id}?v=${hash}`;
    }
    return { ...item, cover };
  }) };
}

function normalizeRelease(data) {
  const version = String(data.tag_name ?? '').replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(version) || data.draft || data.prerelease) throw new Error('正式版本信息不完整');
  const filenames = [`HXZ-Launcher-${version}-x64.exe`,`HXZ-Launcher-${version}-ia32.exe`,`HXZ-Community-Android-${version}.apk`,`HXZ-Launcher-${version}-windows-x64-portable.zip`,`HXZ-Launcher-${version}-windows-ia32-portable.zip`];
  const assets = (data.assets ?? []).filter(a => filenames.includes(a.name)).map(a => ({ name: a.name, size: a.size, url: `https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v${version}/${a.name}` }));
  return { version, published: data.published_at, notes: String(data.body ?? '').slice(0, 24000), url: `https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/tag/v${version}`, assets };
}

async function latestRelease() {
  const stop = new AbortController();
  const signal = AbortSignal.any([stop.signal, AbortSignal.timeout(8000)]);
  const tasks = [fetchJSON(GITHUB,signal).then(normalizeRelease)];
  for (const prefix of ['https://gh-proxy.org/','https://ghfast.top/']) {
    tasks.push((async()=>{
      const envelope=await fetchJSON(prefix+'https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/latest/download/latest.json',signal);
      if(typeof envelope.payload!=='string'||envelope.payload.length>350000||typeof envelope.signature!=='string')throw Error('镜像版本信息无效');
      const bytes=Buffer.from(envelope.payload,'base64');
      if(!verify(null,bytes,UPDATE_KEY,Buffer.from(envelope.signature,'base64')))throw Error('版本信息签名无效');
      const data=JSON.parse(bytes.toString('utf8'));
      if(!/^\d+\.\d+\.\d+$/.test(data.version)||data.files?.[0]?.url!==`HXZ-Launcher-${data.version}-x64.exe`)throw Error('发布文件无效');
      const root=`https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/download/v${data.version}/`;
      return {version:data.version,published:data.releaseDate,notes:data.releaseNotes,url:`https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases/tag/v${data.version}`,assets:data.version===knownRelease.version?knownRelease.assets:[{name:data.files[0].url,size:data.files[0].size,url:root+data.files[0].url}]};
    })());
  }
  const valid=tasks.map(task=>task.then(data=>{
    const parts=data.version.split('.').map(Number), baseline=knownRelease.version.split('.').map(Number);
    for(let i=0;i<3;i++){if(parts[i]>baseline[i])break;if(parts[i]<baseline[i])throw Error('版本缓存落后于已知版本');}
    return data;
  }));
  try { return await Promise.any(valid); } finally { stop.abort(); }
}

async function cached(key, fetcher, ttl = 30000) {
  const previous = cache.get(key), now = Date.now();
  if (previous && now - previous.fetchedAt < ttl) return { ...previous, stale: false };
  if (pending.has(key)) return pending.get(key);
  if (pending.size >= 4) throw new Error('查询较多，请稍后重试');
  const job = (async () => {
    try {
      const result = { data: await fetcher(), fetchedAt: Date.now() };
      result.bytes=Buffer.byteLength(JSON.stringify(result.data));
      cacheBytes-=cache.get(key)?.bytes??0;
      cache.set(key, result);
      cacheBytes+=result.bytes;
      while (cache.size > 80 || cacheBytes > 8 * 1024 * 1024) {
        const oldest=cache.keys().next().value;cacheBytes-=cache.get(oldest).bytes;cache.delete(oldest);
      }
      return { ...result, stale: false };
    } catch (error) {
      // Keep a useful last successful response, but visibly identify it as cached.
      if (previous && now - previous.fetchedAt < 30 * 60 * 1000) return { ...previous, stale: true };
      throw error;
    } finally { pending.delete(key); }
  })();
  pending.set(key, job);
  return job;
}

function sendJSON(res, code, data, cacheControl = 'no-store') {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}

export async function handleAPI(req, res) {
  if (req.method !== 'GET') return sendJSON(res, 405, { error: '仅支持公开查询' });
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/blueprint-cover/')) {
      const id = url.pathname.slice('/api/blueprint-cover/'.length);
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) return sendJSON(res, 404, { error: '图片不存在' });
      const cover = covers.get(id);
      if (!cover) return sendJSON(res, 404, { error: '图片缓存已过期，请刷新蓝图列表' });
      if (req.headers['if-none-match'] === cover.etag) { res.writeHead(304); return res.end(); }
      res.writeHead(200, { 'Content-Type': cover.type, 'Content-Length': cover.bytes.length, 'Cache-Control': 'public, max-age=3600', ETag: cover.etag, 'X-Content-Type-Options': 'nosniff' });
      return res.end(cover.bytes);
    }
    let result;
    if (url.pathname === '/api/releases') {
      try { result = await cached('release', latestRelease, 300000); }
      catch { result = {data:knownRelease,fetchedAt:knownRelease.checkedAt,stale:true}; }
    } else {
      const endpoint = url.pathname.replace(/^\/api\/community\//, '');
      if (!/^(overview|notices|forum(?:\/[a-zA-Z0-9-]{1,80})?|blueprints|leaderboard|shop)$/.test(endpoint)) return sendJSON(res, 404, { error: '接口不存在' });
      const upstream = new URL(`${COMMUNITY}/api/public/v1/${endpoint}`);
      for (const field of ['group','sort','q','mc','game','period','year','limit','offset']) {
        const value = url.searchParams.get(field);
        if (value !== null) {
          if (value.length > 100) return sendJSON(res, 400, { error: '查询内容过长' });
          upstream.searchParams.set(field, value);
        }
      }
      if (!upstream.searchParams.has('limit')) upstream.searchParams.set('limit', '6');
      const limit = Number(upstream.searchParams.get('limit'));
      const offset = Number(upstream.searchParams.get('offset') ?? 0);
      if (!Number.isInteger(limit) || limit < 1 || limit > 12 || !Number.isInteger(offset) || offset < 0 || offset > 10000) return sendJSON(res, 400, { error: '分页参数不正确' });
      result = await cached(upstream.href, async () => normalizeCommunity(await fetchJSON(upstream.href), endpoint));
    }
    return sendJSON(res, 200, { ...result.data, _site: { fetchedAt: result.fetchedAt, stale: result.stale } }, 'public, max-age=15');
  } catch (error) {
    console.warn(`[网站接口] ${url.pathname}: ${error.message}`);
    return sendJSON(res, 503, { error: '暂时无法连接服务，请稍后重试。' });
  }
}
