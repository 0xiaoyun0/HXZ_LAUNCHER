import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import { downloadSources } from "./sources.mjs";
import { setTimeout as delay } from "node:timers/promises";
import { networkFailure, networkAdvice } from './network-errors.mjs';

export async function json(file) {
  const stat = await fs.stat(file);
  if (stat.size > 32 * 1024 * 1024) throw Error("配置文件过大");
  return JSON.parse(await fs.readFile(file, "utf8"));
}
export async function writeJSON(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + "." + randomUUID() + ".tmp";
  try {
    await fs.writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
    await fs.rename(tmp, file);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}
export async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
export async function hash(file, algorithm = "sha1") {
  const sum = createHash(algorithm);
  for await (const chunk of createReadStream(file)) sum.update(chunk);
  return sum.digest("hex");
}
export function inside(root, relative) {
  if (
    typeof relative !== "string" ||
    relative.includes("\\") ||
    relative.includes(":") ||
    path.isAbsolute(relative) ||
    relative.split("/").some(p => p === "..")
  )
    throw Error("文件路径越界");
  const target = path.resolve(root, relative);
  if (
    target !== path.resolve(root) &&
    !target.startsWith(path.resolve(root) + path.sep)
  )
    throw Error("文件路径越界");
  return target;
}
export async function noLinks(file) {
  let cur = path.resolve(file);
  while (true) {
    try {
      if ((await fs.lstat(cur)).isSymbolicLink())
        throw Error("不允许通过链接修改游戏文件");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
}
export function endpoint(value) {
  const u = new URL(value);
  if (
    u.username ||
    u.password ||
    u.hash ||
    !(
      u.protocol === "https:" ||
      (u.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname))
    )
  )
    throw Error("服务地址需要 HTTPS；本机调试可以使用 HTTP");
  return u.href.replace(/\/$/, "");
}
const sourceFailures=new Map();
let downloadLimit=64,activeDownloads=0,downloadObserver=()=>{};
const downloadQueue=[];
export function configureDownloads({concurrency,onStatus}={}){if([8,16,32,64,128].includes(concurrency))downloadLimit=concurrency;if(onStatus)downloadObserver=onStatus;drainDownloads();}
function drainDownloads(){while(activeDownloads<downloadLimit&&downloadQueue.length){const entry=downloadQueue.shift();if(entry.signal?.aborted){entry.reject(entry.signal.reason);continue;}activeDownloads++;entry.resolve(()=>{activeDownloads--;drainDownloads();});}}
async function downloadSlot(signal){signal?.throwIfAborted();return new Promise((resolve,reject)=>{const entry={signal,resolve:release=>{signal?.removeEventListener('abort',abort);resolve(release);},reject};const abort=()=>{const i=downloadQueue.indexOf(entry);if(i>=0)downloadQueue.splice(i,1);reject(signal.reason);};signal?.addEventListener('abort',abort,{once:true});downloadQueue.push(entry);drainDownloads();});}
const statusTimes=new Map();
function sourceStatus(error,url,attempt){const host=new URL(url).hostname,now=Date.now();if(now-(statusTimes.get(host)||0)>5000){statusTimes.set(host,now);downloadObserver({source:host,attempt,message:networkAdvice(error,host)});}}
function preferHealthy(urls){return [...urls].sort((a,b)=>(sourceFailures.get(new URL(a).host)>Date.now()?1:0)-(sourceFailures.get(new URL(b).host)>Date.now()?1:0));}
export async function remoteJSON(url, options = {}) {
  const until=Date.now()+(options.retryBudgetMs||0);
  for(let attempt=0;;attempt++)try{return await remoteJSONAttempt(url,options);}catch(error){
    if(options.signal?.aborted||!networkFailure(error)||Date.now()>=until)throw error;
    sourceStatus(error,url,attempt+1);
    await delay(Math.min(until-Date.now(),options.retryDelay??Math.min(30000,1000*2**Math.min(attempt,5))),undefined,{signal:options.signal});
  }
}
async function remoteJSONAttempt(url, options = {}) {
  const candidates=preferHealthy(!options.method||options.method==='GET'?downloadSources(url):[url]);
  if(candidates.length===1)return remoteJSONOnce(candidates[0],options);
  const controller=new AbortController(),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
  let failure;
  try{
    for(let at=0;at<candidates.length;at+=2){
      const tasks=candidates.slice(at,at+2).map(async(candidate,index)=>{
        if(index)await delay(250,undefined,{signal});
        try{return await remoteJSONOnce(candidate,{...options,signal});}catch(error){if(!signal.aborted){failure=error;sourceStatus(error,candidate,1);sourceFailures.set(new URL(candidate).host,Date.now()+15000);}throw error;}
      });
      try{return await Promise.any(tasks);}catch(error){if(options.signal?.aborted)throw options.signal.reason;failure ||= error;}
    }
    throw failure;
  }finally{controller.abort();}
}
async function remoteJSONOnce(url, options = {}) {
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
    : AbortSignal.timeout(20000);
  const r = await fetch(url, {
    ...options,
    signal,
    redirect: !options.method || options.method === "GET" ? "follow" : "error"
  });
  let bytes = 0;
  const chunks = [];
  if (r.body)
    for await (const chunk of r.body) {
      bytes += chunk.length;
      if (bytes > 4 * 1024 * 1024) throw Error("服务返回内容过大");
      chunks.push(chunk);
    }
  const text = Buffer.concat(chunks).toString("utf8");
  let value;
  try {
    value = text ? JSON.parse(text) : {};
  } catch {
    const error=Error(r.ok?'服务未返回有效数据':`服务请求失败 (${r.status})`);error.status=r.status;error.network=r.status===408||r.status===429||r.status>=500;throw error;
  }
  if (!r.ok) {
    const error=Error(value.errorMessage || value.error || `服务请求失败 (${r.status})`);
    error.status=r.status;error.network=r.status===408||r.status===429||r.status>=500;throw error;
  }
  return value;
}
export async function download(url, file, options = {}) {
  if(options.size!=null&&(!Number.isSafeInteger(options.size)||options.size<0||options.size>(options.maxSize??8*1024**3)))throw Error('下载文件大小无效或超过上限');
  await noLinks(file);
  if(await exists(file)){
    const checks=Object.entries({sha1:options.sha1,sha256:options.sha256,sha512:options.sha512}).filter(([,v])=>v);
    const size=(await fs.stat(file)).size;
    if(checks.length&&(options.size==null||options.size===size)&&(await Promise.all(checks.map(async([a,v])=>await hash(file,a)===v.toLowerCase()))).every(Boolean)){
      options.onTransfer?.({bytes:size,total:size,verified:true,source:'本地校验'});return;
    }
  }
  let failure;
  const candidates = [
    ...new Set([
      ...(options.urls || []).flatMap(downloadSources),
      ...downloadSources(url)
    ])
  ];
  if(options.size>=(options.segmentThreshold??16*1024*1024)&&(options.sha1||options.sha256||options.sha512)&&await segmentedDownload(preferHealthy(candidates),file,options))return;
  const resumable=Boolean(options.sha1||options.sha256||options.sha512);
  const partials=candidates.map(candidate=>file+'.'+createHash('sha256').update(candidate+JSON.stringify([options.sha1,options.sha256,options.sha512])).digest('hex').slice(0,20)+'.partial');
  try {
  const until=Date.now()+(options.retryBudgetMs??30*60*1000);
  for (let attempt = 0; ; attempt++) {
    let retryable = false, retryAfter = 0;
    // Two independent streams at most per file; all files share the same budget.
    // The first fully verified file wins. Other streams write to separate staging
    // paths and are cancelled before the winner is atomically committed.
    const ordered=preferHealthy(candidates);
    for (let start=0;start<ordered.length;start+=2) {
      const group=ordered.slice(start,start+2), controller=new AbortController(),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
      const staged=group.map(()=>file+'.'+randomUUID()+'.candidate');
      const failures=[];let winner;
      const requests=group.map(async(candidate,index)=>{
        let release;
        try{
          if(index)await delay(options.hedgeDelay??300,undefined,{signal});
          release=await downloadSlot(signal);
          await downloadOne(candidate,staged[index],{...options,signal,resumeFile:resumable?partials[candidates.indexOf(candidate)]:undefined});
          if(signal.aborted)throw signal.reason;
          sourceFailures.delete(new URL(candidate).host);return staged[index];
        }catch(error){if(!signal.aborted){failures.push(error);sourceStatus(error,candidate,attempt+1);if(error.retryable!==false)sourceFailures.set(new URL(candidate).host,Date.now()+15000);}throw error;}
        finally{release?.();}
      });
      try {
        winner=await Promise.any(requests);controller.abort();await Promise.allSettled(requests);
        options.signal?.throwIfAborted();await noLinks(file);await fs.rename(winner,file);return;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        failure=failures[failures.length-1]||error;
        retryable ||= failures.some(e=>e.retryable===true||networkFailure(e));
        retryAfter=Math.max(retryAfter,...failures.map(e=>e.retryAfter||0));
      }finally{controller.abort();await Promise.allSettled(requests);await Promise.all(staged.map(p=>fs.rm(p,{force:true}).catch(()=>{})));}
    }
    if (!retryable || Date.now()>=until) break;
    await delay(Math.max(retryAfter,options.retryDelay ?? Math.min(30000,1000 * 2 ** Math.min(attempt,5)) + Math.floor(Math.random()*250)), undefined, {
      signal: options.signal
    });
  }
  throw failure;
  }finally{await Promise.all(partials.map(p=>fs.rm(p,{force:true}).catch(()=>{})));}
}
async function segmentedDownload(urls,file,options){
  const controller=new AbortController(),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
  const temp=file+'.'+randomUUID()+'.ranges',count=Math.min(4,Math.ceil(options.size/(4*1024*1024))),received=Array(count).fill(0);
  if(count<2)return false;
  await fs.mkdir(path.dirname(file),{recursive:true});let handle;const tasks=[];
  try{
    handle=await fs.open(temp,'wx');await handle.truncate(options.size);
    for(let part=0;part<count;part++)tasks.push((async()=>{
      const start=Math.floor(options.size*part/count),end=Math.floor(options.size*(part+1)/count)-1;let failure;
      for(let attempt=0;attempt<urls.length;attempt++){
        const url=urls[(part+attempt)%urls.length];let release,idle;const timeout=new AbortController(),chunkSignal=AbortSignal.any([signal,timeout.signal]);
        const touch=()=>{clearTimeout(idle);idle=setTimeout(()=>timeout.abort(Error('分段传输超时')),20000);};
        try{
          release=await downloadSlot(chunkSignal);touch();
          const response=await fetch(url,{headers:{...options.headers,'Accept-Encoding':'identity',Range:`bytes=${start}-${end}`},signal:chunkSignal});
          if(response.status!==206||response.headers.get('content-range')!==`bytes ${start}-${end}/${options.size}`){await response.body?.cancel();throw Error('节点不支持可靠的分段下载');}
          received[part]=0;let position=start;
          for await(const chunk of readBody(response.body)){
            touch();if(position+chunk.length>end+1)throw Error('分段长度不一致');
            let offset=0;while(offset<chunk.length){const written=await handle.write(chunk,offset,chunk.length-offset,position);offset+=written.bytesWritten;position+=written.bytesWritten;}
            received[part]+=chunk.length;options.onProgress?.(chunk.length);options.onTransfer?.({bytes:received.reduce((a,b)=>a+b,0),total:options.size,source:new URL(url).hostname});
          }
          if(position!==end+1)throw Error('分段传输不完整');return;
        }catch(e){if(signal.aborted)throw e;failure=e;}finally{clearTimeout(idle);release?.();}
      }throw failure;
    })());
    await Promise.all(tasks);await handle.close();handle=null;
    for(const [algorithm,expected] of Object.entries({sha1:options.sha1,sha256:options.sha256,sha512:options.sha512}))if(expected&&await hash(temp,algorithm)!==expected.toLowerCase())throw Error('分段合并校验失败');
    signal.throwIfAborted();await noLinks(file);await fs.rename(temp,file);options.onTransfer?.({bytes:options.size,total:options.size,verified:true,source:'多源分段校验'});return true;
  }catch(e){if(options.signal?.aborted)throw options.signal.reason;downloadObserver({message:'分段下载不可用，自动改用完整文件下载并重新校验',source:new URL(urls[0]).hostname});return false;}
  finally{controller.abort();await Promise.allSettled(tasks);await handle?.close();await fs.rm(temp,{force:true}).catch(()=>{});}
}
async function downloadOne(
  url,
  file,
  {
    resumeFile,
    sha1,
    sha256,
    sha512,
    size,
    headers,
    maxSize = 8 * 1024 ** 3,
    signal,
    onProgress = () => {},
    onTransfer = () => {}
  } = {}
) {
  await noLinks(file);
  if (await exists(file)) {
    const checks = Object.entries({ sha1, sha256, sha512 }).filter(
      ([, v]) => v
    );
    if (
      checks.length &&
      (size == null || (await fs.stat(file)).size === size) &&
      (
        await Promise.all(
          checks.map(
            async ([a, v]) => (await hash(file, a)) === v.toLowerCase()
          )
        )
      ).every(Boolean)
    ) {
      onTransfer({
        bytes: (await fs.stat(file)).size,
        total: size || (await fs.stat(file)).size,
        verified: true,
        source: "本地校验"
      });
      return;
    }
  }
  const u = new URL(url);
  if (!["http:", "https:"].includes(u.protocol))
    throw Error("不支持的下载地址");
  await noLinks(file);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = resumeFile || file + "." + randomUUID() + ".part";
  await noLinks(temp);
  let bytes = 0,retain=false;
  if(resumeFile)try{const stat=await fs.stat(temp);if(stat.isFile()&&stat.size<=maxSize)bytes=stat.size;else await fs.rm(temp,{force:true});}catch(e){if(e.code!=="ENOENT")throw e;}
  onTransfer({ bytes: 0, total: size || 0, source: u.hostname });
  const sums = Object.entries({ sha1, sha256, sha512 })
    .filter(([, v]) => v)
    .map(([algorithm, expected]) => ({
      sum: createHash(algorithm),
      expected: expected.toLowerCase()
    }));
  const controller = new AbortController();
  let idle = setTimeout(() => controller.abort(Error("下载连接超时")), 20000);
  const transferSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  try {
    const r = await fetch(url, {
      headers:{...headers,'Accept-Encoding':'identity',...(bytes?{Range:'bytes='+bytes+'-'}:{})},
      signal: transferSignal
    });
    if (!r.ok || !r.body) {
      await r.body?.cancel();
      const error = Error(`下载失败 (${r.status}): ${u.hostname}`);
      error.status=r.status;
      error.retryable = r.status === 408 || r.status === 429 || r.status >= 500;
      const after=r.headers.get('retry-after');
      if((r.status===429||r.status===503)&&after){
        const ms=/^\d+$/.test(after)?Number(after)*1000:Date.parse(after)-Date.now();
        if(Number.isFinite(ms))error.retryAfter=Math.max(0,Math.min(ms,30*60*1000));
      }
      throw error;
    }
    if(bytes&&r.status!==206){bytes=0;await fs.rm(temp,{force:true});}
    if(r.status===206){const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(r.headers.get('content-range')||'');if(!range||Number(range[1])!==bytes||(size!=null&&Number(range[3])!==size)){await r.body.cancel();throw Error('断点下载范围不一致');}}
    if(bytes)for await(const chunk of createReadStream(temp)){transferSignal.throwIfAborted();for(const check of sums)check.sum.update(chunk);}
    const initialBytes=bytes;
    const touch = () => {
      clearTimeout(idle);
      idle = setTimeout(
        () => controller.abort(Error("下载长时间没有数据")),
        45000
      );
    };
    touch();
    const meter = new Transform({
      transform(chunk, _, done) {
        touch();
        bytes += chunk.length;
        if (bytes > maxSize) {
          done(Error("文件超过下载上限"));
          return;
        }
        for (const check of sums) check.sum.update(chunk);
        onProgress(chunk.length);
        onTransfer({
          bytes,
          total: size || (Number(r.headers.get("content-length"))||0)+initialBytes,
          source: u.hostname
        });
        done(null, chunk);
      }
    });
    await pipeline(
      Readable.fromWeb ? Readable.fromWeb(r.body) : Readable.from(readBody(r.body)),
      meter,
      createWriteStream(temp, { flags: bytes ? "a" : "w" }),
      { signal: transferSignal }
    );
    if (sums.some(check => check.sum.digest("hex") !== check.expected))
      throw Error("下载内容校验不一致");
    if (size != null && size >= 0 && bytes !== size)
      throw Error("下载文件大小不一致");
    await noLinks(file);
    await fs.rename(temp, file);
    onTransfer({ bytes, total: bytes, verified: true, source: u.hostname });
  } catch(error) {
    if(controller.signal.aborted&&!signal?.aborted){error.network=true;error.retryable=true;}
    retain=Boolean(resumeFile&&(networkFailure(error)||error.retryable)&&!signal?.aborted);
    throw error;
  } finally {
    clearTimeout(idle);
    if(!retain)await fs.rm(temp, { force: true }).catch(() => {});
  }
}
async function* readBody(body) {
  const reader=body.getReader();
  try { for (;;) { const {done,value}=await reader.read(); if(done)return; yield value; } }
  finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
}
export async function parallel(values, fn, limit = 8) {
  let next = 0,
    failure;
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, async () => {
      while (!failure && next < values.length) {
        const i = next++;
        try {
          await fn(values[i], i);
        } catch (error) {
          failure ||= error;
        }
      }
    })
  );
  if (failure) throw failure;
}
export async function extractNative(archive, root, exclude = [], signal) {
  await noLinks(root);
  await fs.mkdir(root, { recursive: true });
  const zip = await new Promise((ok, fail) =>
    yauzl.open(archive, { lazyEntries: true }, (e, z) => (e ? fail(e) : ok(z)))
  );
  let bytes = 0;
  await new Promise((ok, fail) => {
    const abort = e => {
      zip.close();
      fail(e);
    };
    zip.on("error", abort);
    zip.on("end", ok);
    zip.on("entry", entry => {
      (async () => {
        signal?.throwIfAborted();
        if (
          entry.fileName.endsWith("/") ||
          entry.fileName.startsWith("META-INF/") ||
          exclude.some(p => entry.fileName.startsWith(p))
        ) {
          zip.readEntry();
          return;
        }
        if (((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000)
          throw Error("压缩包包含符号链接");
        bytes += entry.uncompressedSize;
        if (bytes > 512 * 1024 * 1024) throw Error("本机库压缩包解压超过上限");
        const target = inside(root, entry.fileName);
        await noLinks(target);
        await fs.mkdir(path.dirname(target), { recursive: true });
        const stream = await new Promise((resolve, reject) =>
          zip.openReadStream(entry, (e, s) => (e ? reject(e) : resolve(s)))
        );
        await pipeline(stream, createWriteStream(target));
        zip.readEntry();
      })().catch(abort);
    });
    zip.readEntry();
  });
}
