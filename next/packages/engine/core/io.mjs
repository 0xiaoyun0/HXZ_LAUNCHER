import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import {downloadRanges} from "./range-download.mjs";
import { downloadSources, getDownloadMode } from "./sources.mjs";
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
let downloadLimit=32,activeDownloads=0,downloadObserver=()=>{};
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
  if(getDownloadMode()==='official'){
    let failure;for(const candidate of candidates)try{return await remoteJSONOnce(candidate,options);}catch(error){options.signal?.throwIfAborted();failure=error;sourceStatus(error,candidate,1);sourceFailures.set(new URL(candidate).host,Date.now()+15000);}throw failure;
  }
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
// All aliases of a target share one writer. A cancelled subscriber cannot cancel
// somebody else's transfer; the last subscriber releases the network operation.
const pendingDownloads=new Map();
export function download(url,file,options={}){
  options.signal?.throwIfAborted();
  const resolved=path.resolve(file),key=process.platform==='win32'?resolved.toLowerCase():resolved,signature=JSON.stringify([options.size,options.sha1,options.sha256,options.sha512,options.sha1||options.sha256||options.sha512?'':url]);
  let entry=pendingDownloads.get(key);
  if(entry?.controller.signal.aborted)return entry.settled.then(()=>download(url,file,options));
  if(entry&&entry.signature!==signature)return Promise.reject(Error('同一目标文件存在冲突的下载声明'));
  if(!entry){
    entry={signature,controller:new AbortController(),listeners:new Set(),started:false};entry.settled=new Promise(resolve=>entry.settle=resolve);pendingDownloads.set(key,entry);
  }
  const promise=new Promise((resolve,reject)=>{
    const listener={resolve,reject,progress:options.onProgress,transfer:options.onTransfer,signal:options.signal};
    listener.abort=()=>{entry.listeners.delete(listener);reject(options.signal.reason);if(!entry.listeners.size)entry.controller.abort(options.signal.reason);};
    entry.listeners.add(listener);options.signal?.addEventListener('abort',listener.abort,{once:true});
  });
  if(!entry.started){entry.started=true;
    const notify=(field,value)=>{for(const listener of entry.listeners)listener[field]?.(value);};
    downloadFile(url,file,{...options,signal:entry.controller.signal,onProgress:n=>notify('progress',n),onTransfer:v=>notify('transfer',v)}).then(()=>complete(),error=>complete(error));
    function complete(error){pendingDownloads.delete(key);for(const listener of entry.listeners){listener.signal?.removeEventListener('abort',listener.abort);if(error)listener.reject(error);else listener.resolve();}entry.listeners.clear();entry.settle();}
  }
  return promise;
}
async function downloadFile(url, file, options = {}) {
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
  if(options.size>=(options.segmentThreshold??4*1024*1024)&&(options.sha1||options.sha256||options.sha512)&&await segmentedDownload(preferHealthy(candidates),file,options))return;
  const resumable=Boolean(options.sha1||options.sha256||options.sha512);
  const partials=candidates.map(candidate=>file+'.'+createHash('sha256').update(candidate+JSON.stringify([options.sha1,options.sha256,options.sha512])).digest('hex').slice(0,20)+'.partial');
  let committed=false;
  try {
  let until=Infinity;const retained=new Map(),budget=options.retryBudgetMs??120000;
  for(const partial of partials)retained.set(partial,await fs.stat(partial).then(s=>s.size,()=>0));
  for (let attempt = 0; ; attempt++) {
    let retryable = false, retryAfter = 0;
    // Two independent streams at most per file; all files share the same budget.
    // The first fully verified file wins. Other streams write to separate staging
    // paths and are cancelled before the winner is atomically committed.
    const ordered=preferHealthy(candidates);
    const groupSize=getDownloadMode()==='official'?1:2;
    for (let start=0;start<ordered.length;start+=groupSize) {
      const group=ordered.slice(start,start+groupSize), controller=new AbortController(),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
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
        options.signal?.throwIfAborted();await noLinks(file);await fs.rename(winner,file);committed=true;return;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        failure=failures[failures.length-1]||error;
        let advanced=false;for(const candidate of group){const partial=partials[candidates.indexOf(candidate)],bytes=await fs.stat(partial).then(s=>s.size,()=>0);advanced||=bytes>(retained.get(partial)||0);retained.set(partial,bytes);}
        if(!Number.isFinite(until)||advanced)until=Date.now()+budget;
        retryable ||= failures.some(e=>e.retryable===true||networkFailure(e));
        retryAfter=Math.max(retryAfter,...failures.map(e=>e.retryAfter||0));
      }finally{controller.abort();await Promise.allSettled(requests);await Promise.all(staged.map(p=>fs.rm(p,{force:true}).catch(()=>{})));}
    }
    if (!retryable || attempt>0&&Date.now()>=until) break;
    const wait=Math.max(retryAfter,options.retryDelay ?? Math.min(30000,1000 * 2 ** Math.min(attempt,5)) + Math.floor(Math.random()*250));
    if(attempt>0&&Date.now()+wait>=until)break;
    await delay(wait, undefined, {
      signal: options.signal
    });
  }
  throw failure;
  }finally{if(committed){const identity=createHash('sha256').update(JSON.stringify([options.size,options.sha1,options.sha256,options.sha512])).digest('hex').slice(0,20);await Promise.all([...partials,file+'.'+identity+'.ranges.partial',file+'.'+identity+'.ranges.partial.json'].map(p=>fs.rm(p,{force:true}).catch(()=>{})));}}
}
async function segmentedDownload(urls,file,options){
 return downloadRanges(urls,file,options,{slot:downloadSlot,hash,noLinks,writeJSON,limit:downloadLimit,active:()=>pendingDownloads.size,report:downloadObserver});
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
    onTransfer = () => {},
    stallWindowMs = 10000
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
    let paceTime=Date.now(),paceBytes=0;
    const meter = new Transform({
      transform(chunk, _, done) {
        touch();
        bytes += chunk.length;
        paceBytes+=chunk.length;
        if(Date.now()-paceTime>=stallWindowMs){const minimum=size-bytes>256*1024&&pendingDownloads.size<=Math.max(1,downloadLimit/4)?32:2;if(paceBytes<Math.max(512,stallWindowMs*minimum)){const error=Error('下载节点持续低速，正在切换备用来源');error.network=true;done(error);return;}paceTime=Date.now();paceBytes=0;}
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
    retain=Boolean(resumeFile&&(networkFailure(error)||error.retryable||signal?.aborted));
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
