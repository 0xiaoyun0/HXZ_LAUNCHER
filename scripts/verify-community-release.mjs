import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {json} from 'node:stream/consumers';
import yauzl from 'yauzl';
import {updateManifest} from '../apps/community-server/src/update-trust.mjs';
import {validEntryName} from '../apps/community-server/src/update-archive.mjs';

async function inspectArchive(file, version, updateOnly) {
  const zip = await yauzl.openPromise(file);
  const entries = new Map();
  let packagedVersion;
  try {
    for await (const entry of zip.eachEntry()) {
      const name = entry.fileName;
      assert.ok(!entries.has(name), '重复的服务端文件 ' + name);
      assert.doesNotMatch(name, /^(?:data\/|\.env$)/, '服务端包混入了运行数据');
      if (updateOnly) assert.ok(validEntryName(name), '旧更新器不允许的路径 ' + name);
      entries.set(name, [entry.uncompressedSize, entry.crc32]);
      if (name === 'package.json') {
        assert.ok(entry.uncompressedSize < 128 * 1024);
        packagedVersion = (await json(await zip.openReadStreamPromise(entry))).version;
      }
    }
  } finally { zip.close(); }
  assert.equal(packagedVersion, version, path.basename(file) + ' 内的版本');
  const required = ['src/server.mjs','src/updates.mjs','public/index.html','public/linking/index.html',
    'node_modules/ws/package.json','node_modules/chess.js/package.json','integrations/hxzre/bin/mc-tcp-fec.exe'];
  if (!updateOnly) required.push('supervisor.mjs','node.exe','.env.example','启动社区服务.bat','检查社区版本.ps1');
  for (const name of required) assert.ok(entries.has(name), path.basename(file) + ' 缺少 ' + name);
  return entries;
}

export async function verifyCommunityRelease(root, version, {flat = false} = {}) {
  const archiveDir = flat ? root : path.join(root, 'server');
  const feed = path.join(flat ? root : path.join(root, 'updates'), 'community-update.json');
  const manifest = updateManifest(JSON.parse(await fs.readFile(feed, 'utf8')));
  assert.equal(manifest.version, version, '社区签名清单必须指向本次发布的服务端');
  const archive = path.join(archiveDir, manifest.file.url);
  assert.equal((await fs.stat(archive)).size, manifest.file.size, '社区更新包长度');
  const sha512 = createHash('sha512');
  for await (const chunk of createReadStream(archive)) sha512.update(chunk);
  assert.equal(sha512.digest('hex'), manifest.file.sha512, '社区更新包 SHA-512');
  const full = path.join(archiveDir,'HXZ-Community-' + version + '-windows-x64.zip');
  const [updateEntries, fullEntries] = await Promise.all([
    inspectArchive(archive, version, true), inspectArchive(full, version, false)
  ]);
  for (const [name, checksum] of updateEntries) {
    assert.deepEqual(checksum, fullEntries.get(name), '更新包与完整包的内容不一致 ' + name);
  }
  for (const name of fullEntries.keys()) {
    if (/^(src|public|shared|integrations|node_modules)\//.test(name)) {
      assert.ok(updateEntries.has(name), '完整包中的服务端文件未进入更新包 ' + name);
    }
  }
}
