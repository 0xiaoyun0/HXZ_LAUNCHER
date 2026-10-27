import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('0.9.0 embeds the HXZRE native runtime with a verified manifest',async()=>{
 const manifest=JSON.parse(await fs.readFile('resources/hxzre/module.json','utf8'));
 const binary=await fs.readFile('resources/hxzre/bin/mc-tcp-fec.exe');
 const sha256=createHash('sha256').update(binary).digest('hex');
 assert.equal(manifest.id,'hxzre');
 assert.equal(manifest.kind,'native-runtime-module');
 assert.equal(manifest.entrypoints['windows-x64'],'bin/mc-tcp-fec.exe');
 assert.equal(sha256,manifest.sha256);
 assert.ok(binary.length>1024*1024);
});
