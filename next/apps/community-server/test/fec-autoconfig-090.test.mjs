import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createFecAutoconfig} from '../src/fec-autoconfig.mjs';

test('community upgrade bootstraps three default HXZRE origins and persists tokens', async () => {
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'hxz-fec-'));
  const ports = [45000 + (process.pid % 500), 45500 + (process.pid % 500), 46000 + (process.pid % 500)];
  const previous = {ports: process.env.HXZ_FEC_PORTS, host: process.env.HXZ_FEC_PUBLIC_HOST};
  process.env.HXZ_FEC_PORTS = ports.join(',');
  process.env.HXZ_FEC_PUBLIC_HOST = '127.0.0.1';
  const emptyFec = () => ({enabled: true, origin: '', token: '', dataShards: 8, parityShards: 24, shardSize: 1000, recoveryTimeoutMs: 200, maxRetries: 5, cacheBlocks: 256});
  const input = [
    {id: 'HXZ-survival', address: 's1.hxzmc.top', fec: emptyFec()},
    {id: 'HXZ-mod-1', address: 's2.hxzmc.top', fec: emptyFec()},
    {id: 'HXZ-mod-2', address: 's3.hxzmc.top', fec: emptyFec()}
  ];
  const manager = createFecAutoconfig({data, resources: path.resolve('resources'), enabled: true});
  try {
    const output = manager.apply(input);
    assert.deepEqual(output.map(item => item.fec.origin), ports.map(port => `127.0.0.1:${port}`));
    assert.ok(output.every(item => item.fec.token.length >= 16));
    for (const item of output) assert.equal((await fs.readFile(path.join(data, 'hxzre', item.id + '.token'), 'utf8')).trim(), item.fec.token);
  } finally {
    await manager.close();
    await fs.rm(data, {recursive: true, force: true});
    if (previous.ports === undefined) delete process.env.HXZ_FEC_PORTS; else process.env.HXZ_FEC_PORTS = previous.ports;
    if (previous.host === undefined) delete process.env.HXZ_FEC_PUBLIC_HOST; else process.env.HXZ_FEC_PUBLIC_HOST = previous.host;
  }
});
