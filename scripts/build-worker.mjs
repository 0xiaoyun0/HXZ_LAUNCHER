import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {createPublicKey} from 'node:crypto';
import {UPDATE_PUBLIC_KEY} from '../packages/engine/core/update-public-key.mjs';
import {RELEASE_ROOT} from '../packages/engine/core/update-sources.mjs';
import {bundleNetwork} from './bundle-network.mjs';

import {architecture,workerDirectory,workerRuntime} from './worker-runtime.mjs';
const dir=workerDirectory;
const url=process.env.HXZ3_UPDATE_URL,publicKey=process.env.HXZ3_UPDATE_PUBLIC_KEY;
if(!!url!==!!publicKey)throw Error('签名更新构建需要同时指定 HXZ3_UPDATE_URL 与 HXZ3_UPDATE_PUBLIC_KEY');
const entries=JSON.parse(await fs.readFile('.runtime/official-extensions.json','utf8'));
const modules=Object.fromEntries(Object.entries(entries).map(([id,{files,...meta}])=>[id,meta]));
const channel=url?{url,publicKey}:{
  format:'legacy092',url:RELEASE_ROOT+'/latest/download/'+(architecture==='ia32'?'latest-ia32.json':'latest.json'),
  publicKey:createPublicKey(UPDATE_PUBLIC_KEY).export({type:'spki',format:'der'}).toString('base64')
};
await fs.mkdir(dir,{recursive:true});
await build({entryPoints:['engine/main.mjs'],outfile:path.join(dir,'engine.cjs'),bundle:true,format:'cjs',platform:'node',target:architecture==='ia32'?'node22':'node24',plugins:[bundleNetwork],define:{__HXZ_OFFICIAL_EXTENSIONS__:JSON.stringify(modules),__HXZ_UPDATE_CHANNEL__:JSON.stringify(channel),'import.meta.url':'__engineUrl','import.meta.dirname':'__dirname'},banner:{js:'const __engineUrl = require("node:url").pathToFileURL(__filename).href;'},logLevel:'info'});
await fs.copyFile(await workerRuntime(),path.join(dir,'node.exe'));
for(const name of ['direct-lobby','hxzup','hxzre','installer','licenses'])await fs.cp(path.join('resources',name),path.join(dir,'resources',name),{recursive:true});
await fs.copyFile('apps/community-server/Node-LICENSE.txt',path.join(dir,'Node-LICENSE.txt'));
