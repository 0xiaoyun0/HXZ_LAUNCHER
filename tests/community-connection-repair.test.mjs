import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {parseEnv} from 'node:util';
import {repair, repairedEnv} from '../scripts/repair-community-connection.mjs';

const clients = 'http://tauri.localhost,https://appassets.androidplatform.net';

test('repair preserves existing sites, formatting, comments and every unrelated byte', () => {
  const header = '\uFEFF# 原部署\r\nOTHER="a # b"\r\n';
  const tail = '\t# 允许的网站\r\nANOTHER=keep';
  const prefix = ' export HXZ_ORIGINS = ';
  for (const quote of ['"', "'", '']) {
    const old = 'https://forum.example,null,file://';
    const source = header + prefix + quote + old + quote + tail;
    const expected = header + prefix + quote + old + ',' + clients + quote + tail;
    assert.equal(repairedEnv(source), expected);
    assert.equal(repairedEnv(expected), expected);
  }
  const one = 'HXZ_ORIGINS=http://tauri.localhost,https://my.example\n';
  assert.equal(repairedEnv(one), one.trimEnd() + ',https://appassets.androidplatform.net\n');
  for (const input of ['OTHER=keep', 'OTHER=keep\r\n', 'HXZ_ORIGINS=', 'HXZ_ORIGINS= # comment']) {
    const fixed = repairedEnv(input);
    assert.ok(parseEnv(fixed).HXZ_ORIGINS.split(',').includes('file://'));
    assert.ok(parseEnv(fixed).HXZ_ORIGINS.endsWith(clients));
    assert.equal(repairedEnv(fixed), fixed);
  }
  assert.throws(() => repairedEnv('HXZ_ORIGINS=null\nHXZ_ORIGINS=file://'), /多行/);
  assert.throws(() => repairedEnv('OTHER="first\nHXZ_ORIGINS=file://\nlast"'), /多行|重复/);
});

test('repair keeps an exact backup and reruns without creating a second backup', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hxz-服务配置-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  const file = path.join(root, '.env');
  const sample = Buffer.from('\uFEFF# test\r\nHXZ_ORIGINS=null,file://\r\nSITE=one\r\n');
  await fs.writeFile(file, sample, {mode:0o600});
  const acl = (target, protect = false) => {
    const shell = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
    const command = ["$ErrorActionPreference='Stop'", '$acl=[IO.File]::GetAccessControl($env:HXZ_TEST_CONFIG)',
      ...(protect ? ['$acl.SetAccessRuleProtection($true,$true)', '[IO.File]::SetAccessControl($env:HXZ_TEST_CONFIG,$acl)'] : []),
      '[IO.File]::GetAccessControl($env:HXZ_TEST_CONFIG).Sddl'].join('\n');
    return execFileSync(shell, ['-NoProfile','-NonInteractive','-Command',command],
      {env:{...process.env,HXZ_TEST_CONFIG:target}, encoding:'utf8', windowsHide:true}).trim();
  };
  const originalAcl = process.platform === 'win32' ? acl(file, true) : null;
  const backup = await repair(root);
  assert.deepEqual(await fs.readFile(backup), sample);
  if (originalAcl !== null) {
    assert.ok(originalAcl.includes('D:P'), 'fixture must have a protected DACL');
    assert.equal(acl(backup), originalAcl);
    assert.equal(acl(file), originalAcl);
  }
  assert.equal(await repair(root), null);
  assert.equal((await fs.readdir(root)).length, 2);
  assert.equal(await fs.readFile(file, 'utf8'), repairedEnv(sample.toString('utf8')));
  await fs.writeFile(file, Buffer.from([0xff,0xfe,0x41,0]));
  await assert.rejects(repair(root), /UTF-8/);
  assert.deepEqual(await fs.readFile(file), Buffer.from([0xff,0xfe,0x41,0]));
});
