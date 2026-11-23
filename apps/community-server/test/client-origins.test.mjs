import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {WebSocket} from 'ws';
import {createCommunity} from '../src/server.mjs';
import {listenLoopback} from './helpers/loopback.mjs';

const windows = 'http://tauri.localhost';
const android = 'https://appassets.androidplatform.net';
const legacy = 'null,file://,http://127.0.0.1:9000,http://localhost:9000';

async function fixture(t, configured) {
  const data = await mkdtemp(path.join(os.tmpdir(), 'hxz-client-origins-'));
  const previous = process.env.HXZ_ORIGINS;
  process.env.HXZ_ORIGINS = configured;
  let service;
  try {
    service = createCommunity({data, exchange: async () => ({selectedProfile: {id:'fixture', name:'Player'}})});
  } finally {
    if (previous === undefined) delete process.env.HXZ_ORIGINS;
    else process.env.HXZ_ORIGINS = previous;
  }
  t.after(async () => { await service.close(); await rm(data, {recursive:true, force:true}); });
  const port = await listenLoopback(service.server);
  return 'http://127.0.0.1:' + port;
}

function preflight(base, origin) {
  return fetch(base + '/api/points', {method:'OPTIONS', headers:{origin,
    'Access-Control-Request-Method':'GET', 'Access-Control-Request-Headers':'authorization'}});
}

test('0.9.2 stock origins allow both current clients to read and authenticate on the chat socket', async t => {
  const base = await fixture(t, legacy);
  const token = (await (await fetch(base + '/api/session', {method:'POST', body:'{}'})).json()).token;
  for (const [platform, origin] of [['desktop', windows], ['android', android]]) {
    const response = await preflight(base, origin);
    assert.equal(response.status, 204, platform + ' preflight');
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.ok(!(await fetch(base + '/api/points', {headers:{origin}})).ok);
    const wallet = await fetch(base + '/api/points', {headers:{origin, Authorization:'Bearer ' + token}});
    assert.equal(wallet.status, 200);
    const socket = new WebSocket(base.replace('http:', 'ws:') + '/ws', {origin, handshakeTimeout:3000});
    t.after(() => socket.terminate());
    await once(socket, 'open');
    const ready = once(socket, 'message');
    socket.send(JSON.stringify({type:'auth', token, platform}));
    assert.equal(JSON.parse((await ready)[0]).type, 'ready');
    socket.close();
  }
  assert.equal((await preflight(base, 'https://unrelated.example')).status, 403);
});

test('a deliberately restricted origin list retains its exact client policy', async t => {
  const base = await fixture(t, 'https://forum.example');
  assert.equal((await preflight(base, 'https://forum.example')).status, 204);
  assert.equal((await preflight(base, windows)).status, 403);
  assert.equal((await preflight(base, android)).status, 403);
});
