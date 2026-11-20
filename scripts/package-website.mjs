import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {archive} from './archive.mjs';
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const out=path.resolve('release',version,'website'), app=path.join(out,'幻想镇官网'), server=path.join(app,'server');
await fs.mkdir(server,{recursive:true});
await build({entryPoints:['apps/website/server/index.mjs'],bundle:true,outfile:path.join(server,'index.mjs'),platform:'node',target:'node24',format:'esm',external:['sharp'],banner:{js:'import {createRequire as makeRequire} from "node:module";const require=makeRequire(import.meta.url);'}});
await fs.cp('apps/website/dist',path.join(app,'dist'),{recursive:true});
for(const name of ['content-defaults.json'])await fs.copyFile(path.join('apps/website/server',name),path.join(server,name));
async function dependency(name,from,to,optional=false) {
  const resolve=createRequire(path.join(from,'package.json'));
  let base;
  for(const lookup of resolve.resolve.paths(name)||[]) {
    const candidate=path.join(lookup,name);
    if(await fs.stat(path.join(candidate,'package.json')).then(x=>x.isFile(),()=>false)){base=await fs.realpath(candidate);break;}
  }
  if(!base){if(optional)return;throw Error('缺少官网依赖 '+name);}
  const pkg=JSON.parse(await fs.readFile(path.join(base,'package.json'),'utf8'));
  const dest=path.join(to,'node_modules',name);
  await fs.cp(base,dest,{recursive:true,filter:src=>!path.relative(base,src).split(path.sep).includes('node_modules')});
  for(const dep of Object.keys(pkg.dependencies||{}))await dependency(dep,base,dest);
  for(const dep of Object.keys(pkg.optionalDependencies||{}))await dependency(dep,base,dest,true);
}
await dependency('sharp',process.cwd(),app);
await fs.copyFile(process.execPath,path.join(app,'node.exe'));await fs.copyFile('apps/community-server/Node-LICENSE.txt',path.join(app,'Node-LICENSE.txt'));
await fs.copyFile('LICENSE',path.join(app,'LICENSE'));
await fs.writeFile(path.join(app,'启动官网.cmd'),'@echo off\r\ncd /d "%~dp0" || exit /b 1\r\n"%~dp0node.exe" server/index.mjs\r\npause\r\n');
await archive(app,path.join(out,'HXZ-Website-'+version+'-windows-x64.zip'),['server/index.mjs','server/content-defaults.json','dist','node_modules','node.exe','Node-LICENSE.txt','LICENSE','启动官网.cmd']);
