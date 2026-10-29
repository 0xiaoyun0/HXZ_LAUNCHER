import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import yauzl from 'yauzl';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const candidates = [
  path.join(root, 'release/0.9.1/android/HXZ-Community-Android-0.9.1-90100.apk'),
  path.join(root, 'release/0.9.0/android/HXZ-Community-Android-0.9.0-90001.apk'),
];
const apk = process.env.HXZ_ANDROID_APK || candidates.find(file => fs.existsSync(file)) || candidates[0];
const pageSize = 0x4000;

function openArchive(file) {
  return new Promise((resolve, reject) => yauzl.open(file, {lazyEntries: true}, (error, zip) => error ? reject(error) : resolve(zip)));
}

function entryBytes(file, name) {
  return new Promise((resolve, reject) => openArchive(file).then(zip => {
    zip.on('error', reject);
    zip.on('entry', entry => {
      if (entry.fileName !== name) return zip.readEntry();
      zip.openReadStream(entry, (streamError, stream) => {
        if (streamError) return reject(streamError);
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.once('error', reject);
        stream.once('end', () => { zip.close(); resolve(Buffer.concat(chunks)); });
      });
    });
    zip.once('end', () => reject(new Error(`APK entry missing: ${name}`)));
    zip.readEntry();
  }, reject));
}

function loadSegments(bytes) {
  assert.equal(bytes.subarray(0, 4).toString('hex'), '7f454c46', 'native library must be ELF');
  const klass = bytes[4], endian = bytes[5] === 1 ? 'LE' : 'BE';
  assert.ok(klass === 1 || klass === 2, 'unsupported ELF class');
  assert.equal(endian, 'LE', 'Android native libraries must be little-endian ELF');
  const read = (offset, size) => size === 4 ? bytes.readUInt32LE(offset) : Number(bytes.readBigUInt64LE(offset));
  const phoff = read(klass === 2 ? 32 : 28, klass === 2 ? 8 : 4);
  const phentsize = bytes.readUInt16LE(klass === 2 ? 54 : 42);
  const phnum = bytes.readUInt16LE(klass === 2 ? 56 : 44);
  const segments = [];
  for (let i = 0; i < phnum; i++) {
    const offset = phoff + i * phentsize;
    const type = read(offset, 4);
    if (type !== 1) continue;
    const pOffset = read(offset + (klass === 2 ? 8 : 4), klass === 2 ? 8 : 4);
    const pVaddr = read(offset + (klass === 2 ? 16 : 8), klass === 2 ? 8 : 4);
    const pAlign = read(offset + (klass === 2 ? 48 : 28), klass === 2 ? 8 : 4);
    segments.push({pOffset, pVaddr, pAlign});
  }
  return segments;
}

const names = [];
let resourceTable;
const archive = await openArchive(apk);
await new Promise((resolve, reject) => {
  archive.on('error', reject);
  archive.on('entry', entry => {
    if (/^lib\/[^/]+\/[^/]+\.so$/.test(entry.fileName)) names.push(entry.fileName);
    if (entry.fileName === 'resources.arsc') resourceTable = entry;
    archive.readEntry();
  });
  archive.once('end', resolve);
  archive.readEntry();
});
archive.close();
assert.ok(resourceTable, 'APK must contain resources.arsc');
assert.equal(resourceTable.compressionMethod, 0, 'resources.arsc must be stored, not deflated');
const apkHandle = fs.openSync(apk, 'r');
const localHeader = Buffer.alloc(4);
fs.readSync(apkHandle, localHeader, 0, localHeader.length, resourceTable.relativeOffsetOfLocalHeader + 26);
fs.closeSync(apkHandle);
const resourceDataOffset = resourceTable.relativeOffsetOfLocalHeader + 30 + localHeader.readUInt16LE(0) + localHeader.readUInt16LE(2);
assert.equal(resourceDataOffset % 4, 0, 'resources.arsc data must be aligned to 4 bytes');
const arm64Names = names.filter(name => name.startsWith('lib/arm64-v8a/'));
assert.ok(arm64Names.length > 0, 'APK must contain arm64 native libraries');
for (const name of names) {
  for (const segment of loadSegments(await entryBytes(apk, name))) {
    if (name.startsWith('lib/arm64-v8a/')) {
      assert.ok(segment.pAlign >= pageSize, `${name} has a ${segment.pAlign}-byte PT_LOAD alignment`);
      assert.equal(segment.pOffset % pageSize, segment.pVaddr % pageSize, `${name} has an unaligned PT_LOAD offset`);
    }
  }
}
console.log(`PASS Android baseline compatibility (${names.length} native libraries; ${arm64Names.length} arm64 libraries use 16 KiB segments)`);
