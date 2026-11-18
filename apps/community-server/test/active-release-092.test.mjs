import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {selectActiveRelease} from '../src/active-release.mjs';

test('full community upgrade supersedes old active update; newer valid updates still activate',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-active092-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const base=path.join(root,'installed'),data=path.join(root,'data'),target=path.join(data,'.updates/releases/0.9.1');
 await fs.mkdir(base,{recursive:true});await fs.mkdir(path.join(target,'src'),{recursive:true});
 await fs.writeFile(path.join(target,'package.json'),JSON.stringify({version:'0.9.1'}));await fs.writeFile(path.join(target,'src/server.mjs'),'');
 const envelope=JSON.parse(await fs.readFile(new URL('./fixtures/community-update-091.json',import.meta.url),'utf8'));
 await fs.writeFile(path.join(data,'.updates/active.json'),JSON.stringify({target,envelope}));
 await fs.writeFile(path.join(base,'package.json'),JSON.stringify({version:'0.9.2'}));
 assert.equal(await selectActiveRelease({base,data}),base);
 await fs.writeFile(path.join(base,'package.json'),JSON.stringify({version:'0.9.0'}));
 assert.equal(await selectActiveRelease({base,data}),target);
 await fs.writeFile(path.join(target,'package.json'),JSON.stringify({version:'0.8.0'}));
 assert.equal(await selectActiveRelease({base,data}),base);
 await fs.writeFile(path.join(data,'.updates/active.json'),JSON.stringify({target:base,envelope}));
 assert.equal(await selectActiveRelease({base,data}),base);
});
