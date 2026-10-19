import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import './build-linking-story-preview081.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),source=path.join(root,'apps/linking');
for(const args of [['scripts/patch-rolling-number.mjs'],['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/vite/bin/vite.js','build']]){
  const result=spawnSync(process.execPath,args,{cwd:source,stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status||1);
}
for(const relative of ['public/linking','mobile/web/public/linking','apps/community-server/public/linking']){
  const target=path.resolve(root,relative);if(!target.startsWith(root+path.sep)||!target.endsWith(path.sep+'linking'))throw Error('Unsafe generated output path');
  // These are generated static applications, never community data or profiles.
  await fs.rm(target,{recursive:true,force:true});
  await fs.mkdir(target,{recursive:true});await fs.cp(path.join(source,'dist'),target,{recursive:true});
}
console.log('LINKING bundled for desktop, Android WebView and community admin console.');
