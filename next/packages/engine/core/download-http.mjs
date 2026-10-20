// Only representation headers may cross an origin boundary. Custom headers can
// carry API keys too, so an Authorization-only blacklist is insufficient.
const publicHeaders = new Set(['accept', 'accept-encoding', 'user-agent', 'range', 'if-range']);
import {observeSource} from './source-health.mjs';
export function transferHeaders(headers, target, origin) {
  const values = new Headers(headers || {});
  if (new URL(target).origin !== new URL(origin).origin)
    for (const key of [...values.keys()]) if (!publicHeaders.has(key)) values.delete(key);
  return Object.fromEntries(values.entries());
}
export function hasPrivateHeaders(headers) {
  return [...new Headers(headers || {}).keys()].some(key => !publicHeaders.has(key));
}
export async function transferFetch(url, options = {}, origin = url) {
  let current = url;
  for (let i = 0; i < 6; i++) {
    const started=Date.now();let result;
    try{result = await fetch(current, {...options, headers:transferHeaders(options.headers,current,origin), redirect:'manual'});
      observeSource(current,{state:result.ok?'reachable':'error',latencyMs:Date.now()-started,reason:result.ok?'':`文件请求 HTTP ${result.status}`,checkKind:'transfer'});
    }catch(error){observeSource(current,{state:'error',latencyMs:null,reason:options.signal?.aborted?'连接或传输已中止':error.cause?.code||error.message,checkKind:'transfer'});throw error;}
    if (![301,302,303,307,308].includes(result.status)) return result;
    const location = result.headers.get('location');
    await result.body?.cancel();
    if (!location) throw Error('下载重定向缺少地址');
    const next = new URL(location,current);
    if (!['https:','http:'].includes(next.protocol) || next.username || next.password || (new URL(current).protocol==='https:' && next.protocol!=='https:')) throw Error('下载重定向地址无效');
    current = next.href;
  }
  throw Error('下载重定向次数过多');
}
