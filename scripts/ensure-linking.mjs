import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),app=path.join(root,'apps/linking'),cache=path.join(root,'.runtime/linking-source.sha256');
const hash=createHash('sha256');
async function add(file) {
  const info=await fs.stat(file);
  if(info.isDirectory()){for(const item of (await fs.readdir(file)).sort())await add(path.join(file,item));return;}
  if(file.endsWith('story-preview-081.json'))return;
  hash.update(path.relative(root,file));hash.update(await fs.readFile(file));
}
for(const name of ['src','public','scripts','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html'])await add(path.join(app,name));
for(const name of ['apps/community-server/src/linking-volumes081.mjs','apps/community-server/src/linking-observer082.mjs','scripts/build-linking-story-preview081.mjs','scripts/build-linking.mjs'])await add(path.join(root,name));
const signature=hash.digest('hex');
const entries=['public/linking','apps/community-server/public/linking','mobile/web/public/linking'];
const exists=await Promise.all(entries.map(p=>fs.access(path.join(root,p,'index.html')).then(()=>true,()=>false)));
if(!exists.every(Boolean)||await fs.readFile(cache,'utf8').catch(()=>'')!==signature){
  if(!await fs.access(path.join(app,'node_modules/vite/bin/vite.js')).then(()=>true,()=>false)){
    const install=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--no-audit','--no-fund'],{cwd:app,shell:process.platform==='win32',stdio:'inherit'});if(install.status!==0)throw Error('LINKING 依赖安装失败');
  }
  const build=spawnSync(process.execPath,['scripts/build-linking.mjs'],{cwd:root,stdio:'inherit'});if(build.status!==0)throw Error('LINKING 构建失败');
  await fs.mkdir(path.dirname(cache),{recursive:true});await fs.writeFile(cache,signature);
}
