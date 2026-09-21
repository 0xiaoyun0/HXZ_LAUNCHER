import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";
import { downloadSources } from "./sources.mjs";
import { setTimeout as delay } from "node:timers/promises";

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
function preferHealthy(urls){return [...urls].sort((a,b)=>(sourceFailures.get(new URL(a).host)>Date.now()?1:0)-(sourceFailures.get(new URL(b).host)>Date.now()?1:0));}
export async function remoteJSON(url, options = {}) {
  const candidates =
    !options.method || options.method === "GET" ? downloadSources(url) : [url];
  let failure;
  for (const candidate of preferHealthy(candidates))
    try {
      return await remoteJSONOnce(candidate, options);
    } catch (error) {
      if (options.signal?.aborted) throw error;
      failure = error;
    }
  throw failure;
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
    throw Error("服务未返回有效数据");
  }
  if (!r.ok)
    throw Error(
      value.errorMessage || value.error || `服务请求失败 (${r.status})`
    );
  return value;
}
export async function download(url, file, options = {}) {
  let failure;
  const candidates = [
    ...new Set([
      ...(options.urls || []).flatMap(downloadSources),
      ...downloadSources(url)
    ])
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    let retryable = false, retryAfter = 0;
    for (const candidate of preferHealthy(candidates)) {
      try {
        const result=await downloadOne(candidate,file,options);sourceFailures.delete(new URL(candidate).host);return result;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        failure = error;
        if(error.retryable!==false)sourceFailures.set(new URL(candidate).host,Date.now()+15000);
        retryable ||= error.retryable !== false;
        retryAfter=Math.max(retryAfter,Math.min(60000,error.retryAfter||0));
      }
    }
    if (!retryable || attempt === 2) break;
    await delay(Math.max(retryAfter,options.retryDelay ?? 1000 * 2 ** attempt + Math.floor(Math.random()*250)), undefined, {
      signal: options.signal
    });
  }
  throw failure;
}
async function downloadOne(
  url,
  file,
  {
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
  const temp = file + "." + randomUUID() + ".part";
  let bytes = 0;
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
      headers,
      signal: transferSignal
    });
    if (!r.ok || !r.body) {
      await r.body?.cancel();
      const error = Error(`下载失败 (${r.status}): ${u.hostname}`);
      error.retryable = r.status === 408 || r.status === 429 || r.status >= 500;
      const after=r.headers.get('retry-after');
      if((r.status===429||r.status===503)&&after){
        const ms=/^\d+$/.test(after)?Number(after)*1000:Date.parse(after)-Date.now();
        if(Number.isFinite(ms)){error.retryAfter=Math.max(0,ms);if(ms>60000)error.retryable=false;}
      }
      throw error;
    }
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
          total: size || Number(r.headers.get("content-length")) || 0,
          source: u.hostname
        });
        done(null, chunk);
      }
    });
    await pipeline(
      Readable.fromWeb ? Readable.fromWeb(r.body) : Readable.from(readBody(r.body)),
      meter,
      createWriteStream(temp, { flags: "wx" }),
      { signal: transferSignal }
    );
    if (sums.some(check => check.sum.digest("hex") !== check.expected))
      throw Error("下载内容校验不一致");
    if (size != null && size >= 0 && bytes !== size)
      throw Error("下载文件大小不一致");
    await noLinks(file);
    await fs.rename(temp, file);
    onTransfer({ bytes, total: bytes, verified: true, source: u.hostname });
  } finally {
    clearTimeout(idle);
    await fs.rm(temp, { force: true }).catch(() => {});
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
export async function extractNative(archive, root, exclude = []) {
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
