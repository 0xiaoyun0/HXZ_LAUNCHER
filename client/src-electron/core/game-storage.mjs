import path from 'node:path';
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { inside, noLinks } from './io.mjs';

const execute = promisify(execFile);
export function chooseGameDrive(disks) {
  const candidates = disks.filter(d => /^[D-Z]:$/i.test(d.name) && Number(d.free) >= 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  return candidates.find(d => Number(d.free) >= 50 * 1024 ** 3)?.name || '';
}
export async function defaultGameRoot() {
  if (process.platform !== 'win32') return '';
  try {
    const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      "[IO.DriveInfo]::GetDrives() | ForEach-Object { if ($_.IsReady -and $_.DriveType -eq 'Fixed') { $_.Name.Substring(0,2) + '|' + $_.AvailableFreeSpace.ToString([Globalization.CultureInfo]::InvariantCulture) } }"],
      { windowsHide: true, encoding: 'utf8', timeout: 10000, maxBuffer: 32768 });
    const data = stdout.trim().split(/\r?\n/).map(line=>{const [name,free]=line.trim().split('|');return {name,free};});
    const drive = chooseGameDrive(data);
    return drive ? path.join(drive + '/', 'HXZ-minecraft', '.minecraft') : '';
  } catch { return ''; }
}
export function runtimeHome(gameRoot) {
  if (!gameRoot || !path.isAbsolute(gameRoot)) throw Error('请先选择游戏目录');
  const parent = path.dirname(gameRoot);
  return path.basename(parent).toLowerCase() === 'hxz-minecraft'
    ? path.join(parent, 'java') : path.join(parent, 'HXZ-minecraft', 'java');
}
export function instanceKey(root, id) { return path.resolve(root || '.').toLowerCase() + '|' + id; }
export async function removeInstanceFiles(root, id) {
  if (!root || !path.isAbsolute(root) || typeof id !== 'string' || !id || /[\\/:]/.test(id) || ['.', '..'].includes(id))
    throw Error('无效实例目录');
  const versions = path.resolve(root, 'versions'), target = inside(versions, id);
  await noLinks(target);
  // Shared assets, libraries and saves outside this instance are never removed.
  try { await fs.rm(target, { recursive: true, force: true, maxRetries: 4, retryDelay: 500 }); }
  catch (error) { throw Error('无法删除 ' + target + '。请关闭游戏及占用此目录的程序后重试（' + error.code + '）'); }
}
