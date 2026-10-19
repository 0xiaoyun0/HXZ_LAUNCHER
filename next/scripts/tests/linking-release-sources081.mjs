import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {publicLinkingSource} from '../linking-release-sources.mjs';

for(const number of [1,2])test('release story '+number+' removes provenance while preserving the entire playable export',async()=>{
 const name=`linking-volume${number}-reality081.mjs`,source=await fs.readFile(new URL('../../apps/community-server/src/'+name,import.meta.url));
 const bytes=await publicLinkingSource(name,source);
 const original=await import('data:text/javascript;base64,'+source.toString('base64'));
 const published=await import('data:text/javascript;base64,'+bytes.toString('base64'));
 assert.deepEqual(published['realityVolume'+number],original['realityVolume'+number]);
 assert.deepEqual(published.sourceMap,[]);
 assert.equal(published['realityVolume'+number].entries.length,12);
 assert.ok(!bytes.toString().toLowerCase().includes('hxzrpg'));
 assert.deepEqual(await publicLinkingSource(name,bytes),bytes,'update packaging is idempotent');
 assert.deepEqual(await fs.readFile(new URL('../../apps/community-server/src/'+name,import.meta.url)),source,'working source is unchanged');
 // Exercise the guard for both author sources and already sanitized public sources.
 const broken=Buffer.from(source.toString().replace('export const sourceMap','export const renamedMap'));
 await assert.rejects(publicLinkingSource(name,broken),/Unexpected author map boundary/);
});
