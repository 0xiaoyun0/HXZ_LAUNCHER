// Isolated design review server. Read-only public monitoring; no launcher APIs.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = __dirname;
const publicStatus = 'http://uptime.hxzmc.top';
const mainPath = '/design/2026-09-29/fantasytown-prototype.html';
const files = new Map([
  [mainPath, [path.join(root, 'fantasytown-prototype.html'), 'text/html; charset=utf-8']],
  ['/design/2026-09-29/status-preview-data.js', [path.join(root, 'status-preview-data.js'), 'text/javascript; charset=utf-8']],
  ['/public/media/hero.webp', [path.resolve(root, '../../public/media/hero.webp'), 'image/webp']],
]);
let cached, pending;
async function json(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Monitor HTTP ${response.status}`);
  return response.json();
}
async function status() {
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 30000) return cached;
  if (pending) return pending;
  pending = (async () => {
    const [config, beats] = await Promise.all([
      json(publicStatus + '/api/status-page/hxz'),
      json(publicStatus + '/api/status-page/heartbeat/hxz'),
    ]);
    cached = {
      source: publicStatus + '/status/hxz', fetchedAt: new Date().toISOString(),
      groups: (config.publicGroupList || []).map(group => ({
        name: group.name,
        monitors: (group.monitorList || []).map(monitor => {
          const latest = [...(beats.heartbeatList?.[monitor.id] || [])].sort((a,b) => String(a.time).localeCompare(String(b.time))).pop();
          return { id: monitor.id, name: monitor.name, type: monitor.type, status: latest?.status ?? -1,
            time: latest?.time ?? null, ping: latest?.ping ?? null, uptime24: beats.uptimeList?.[monitor.id + '_24'] ?? null };
        }),
      })),
      incident: config.incident || null, maintenance: config.maintenanceList || [],
    };
    return cached;
  })().finally(() => { pending = null; });
  return pending;
}
http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  if (pathname === '/') { response.writeHead(302, { Location: mainPath }); response.end(); return; }
  if (pathname === '/api/status') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    try { response.end(JSON.stringify(await status())); }
    catch { response.writeHead(502); response.end(JSON.stringify({ error: '监控暂时无法获取', previous: cached || null })); }
    return;
  }
  const file = files.get(pathname);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  try { response.setHeader('Content-Type', file[1]); response.end(await fs.readFile(file[0])); }
  catch { response.writeHead(404); response.end('Not found'); }
}).listen(5186, '127.0.0.1', () => console.log('Design preview: http://127.0.0.1:5186'));
