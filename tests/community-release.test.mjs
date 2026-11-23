import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {verifyCommunityRelease} from '../scripts/verify-community-release.mjs';
import {updateManifest} from '../apps/community-server/src/update-trust.mjs';

test('release staging rejects a trusted old community feed and missing or partial server attachments', async t => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'hxz-community-release-'));
  t.after(() => fs.rm(folder,{recursive:true,force:true}));
  const feed = path.join(folder,'community-update.json');
  await fs.copyFile(new URL('../apps/community-server/test/fixtures/community-update-091.json',import.meta.url),feed);
  const signed = updateManifest(JSON.parse(await fs.readFile(feed,'utf8')));
  const staged = version => verifyCommunityRelease(folder,version,{flat:true});
  await assert.rejects(staged('0.10.0'), /社区签名清单必须指向本次发布/);
  await assert.rejects(staged(signed.version), {code:'ENOENT'});
  await fs.writeFile(path.join(folder,signed.file.url),'partial');
  await assert.rejects(staged(signed.version), /社区更新包长度/);
});
