import test from 'node:test';
import assert from 'node:assert/strict';
import {statusAddressCandidates} from '../src/server-online.mjs';

test('default server status checks have a direct endpoint fallback when SRV host has no A record',()=>{
 assert.deepEqual(statusAddressCandidates('s1.hxzmc.top'),['ipv4.hxzmc.top:19999','s1.hxzmc.top']);
 assert.deepEqual(statusAddressCandidates(' S1.HXZMC.TOP '),['ipv4.hxzmc.top:19999','S1.HXZMC.TOP']);
 assert.deepEqual(statusAddressCandidates('s2.hxzmc.top'),['ipv4.hxzmc.top:19998','s2.hxzmc.top']);
 assert.deepEqual(statusAddressCandidates('s3.hxzmc.top'),['ipv4.hxzmc.top:25599','s3.hxzmc.top']);
 assert.deepEqual(statusAddressCandidates('custom.example:25565'),['custom.example:25565']);
});
