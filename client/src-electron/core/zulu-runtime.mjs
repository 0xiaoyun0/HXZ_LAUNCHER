import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { remoteJSON, download, inside, noLinks, exists, extractNative, writeJSON, json } from './io.mjs';
import { systemArchitecture } from './platform.mjs';
import { inspectJava, findJava } from './minecraft.mjs';
import { runtimeHome } from './game-storage.mjs';
const API = 'https://api.azul.com/metadata/v1/zulu/packages/';

export async function ensureZulu(gameRoot, metadata, signal, onProgress = () => {}) {
  const major = Number(metadata.javaVersion?.majorVersion || 8), architecture = systemArchitecture();
  if (process.platform !== 'win32' || !Number.isInteger(major) || major < 8 || major > 99)
    throw Error('请在设置中选择适用于此游戏的 Java');
  const base = runtimeHome(gameRoot), home = inside(base, `zulu-${major}-${architecture}`);
  await noLinks(home);
  const record = path.join(home, 'runtime.json');
  if (await exists(record)) {
    try {
      const binary = inside(home, (await json(record)).binary), found = await inspectJava(binary);
      if (found.major === major && found.architecture === architecture) return binary;
    } catch { /* Rebuild an incomplete runtime separately. */ }
  }
  onProgress({ phase: `查询 Zulu Java ${major} · ${architecture}`, completed: 0, total: 0 });
  const query = new URLSearchParams({ java_version: String(major), os: 'windows',
    arch: architecture === 'arm64' ? 'arm' : 'x86', hw_bitness: architecture === 'ia32' ? '32' : '64',
    archive_type: 'zip', java_package_type: 'jre', javafx_bundled: 'false', release_status: 'ga',
    availability_types: 'CA', latest: 'true', page_size: '5' });
  const packages = await remoteJSON(API + '?' + query, { signal });
  const selected = Array.isArray(packages) && packages.find(p => p.java_version?.[0] === major && /^[\da-f-]{36}$/i.test(p.package_uuid));
  if (!selected) throw Error(`Zulu 未提供当前 ${architecture} 系统的 Java ${major}，请手动选择兼容的 Java 或使用支持此游戏的系统`);
  const info = await remoteJSON(API + selected.package_uuid, { signal });
  if (info.java_version?.[0] !== major || info.os !== 'windows' || info.archive_type !== 'zip' ||
      info.hw_bitness !== (architecture === 'ia32' ? 32 : 64) || info.arch !== (architecture === 'arm64' ? 'arm' : 'x86') ||
      !/^[a-f\d]{64}$/i.test(info.sha256_hash) || !/^https:\/\/cdn\.azul\.com\/zulu\/bin\/[^/]+\.zip$/.test(info.download_url))
    throw Error('Zulu 安装包信息或校验值无效');
  const cache = inside(base, 'downloads/' + info.sha256_hash + '.zip');
  // Azul's metadata size can be rounded (observed 49264400 vs 49264410).
  // Its SHA-256 is authoritative; use HTTP Content-Length for progress instead.
  await download(info.download_url, cache, { sha256: info.sha256_hash, maxSize:512*1024*1024, signal,
    onTransfer: t => onProgress({ phase: `下载 Zulu Java ${major}`, completed: t.bytes, total: t.total, unit: 'bytes', detail: t.source }) });
  const stage = inside(base, '.prepare-' + randomUUID());
  await noLinks(stage);
  try {
    onProgress({ phase: `安装 Zulu Java ${major}`, completed: 0, total: 0 });
    await extractNative(cache, stage, [], signal);
    signal?.throwIfAborted();
    const folders = await fs.readdir(stage, { withFileTypes: true });
    const folder = folders.find(e => e.isDirectory() && !e.isSymbolicLink() && e.name.startsWith('zulu'));
    if (!folder) throw Error('Zulu 安装包没有运行目录');
    const binary = folder.name + '/bin/java.exe', checked = await inspectJava(inside(stage, binary));
    if (checked.major !== major || checked.architecture !== architecture) throw Error('下载的 Java 版本或架构不匹配');
    await writeJSON(path.join(stage, 'runtime.json'), { binary, sha256: info.sha256_hash });
    if (await exists(home)) await fs.rename(home, inside(base, '.previous-' + randomUUID()));
    await fs.rename(stage, home);
    return inside(home, binary);
  } finally { await fs.rm(stage, { recursive: true, force: true }).catch(() => {}); }
}

export async function chooseJava({ gameRoot, preferred, metadata, signal, onProgress, log = () => {}, chinesePaths = true }) {
  const required = metadata.javaVersion?.majorVersion || 8;
  if (preferred) {
    try {
      const selected = await inspectJava(preferred);
      if (selected.major < required) throw Error(`至少需要 Java ${required}，选择的是 ${selected.major}`);
      log(`[Java] 使用手动指定的 Java ${selected.version} · ${selected.architecture} · ${selected.path}`);
      return selected.path;
    } catch (error) { log('[Java] 指定运行环境不可用：' + error.message + '；自动准备匹配版本'); }
  }
  const options = await findJava({ roots: [runtimeHome(gameRoot)], chinesePaths });
  const selected = options.find(j => j.major === required && j.architecture === systemArchitecture());
  if (selected) { log(`[Java] 自动选择 Java ${selected.version} · ${selected.architecture} · ${selected.path}`); return selected.path; }
  return ensureZulu(gameRoot, metadata, signal, onProgress);
}
