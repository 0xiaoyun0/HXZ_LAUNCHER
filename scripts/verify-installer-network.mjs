import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await fs.mkdir(path.join(root,'.test'),{recursive:true});
const out=await fs.mkdtemp(path.join(root,'.test/network-regression-'));
const home=process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21';
const jar=path.join(root,'client/resources/hxzup/updater-1.0.3.jar');
function run(tool,args){const result=spawnSync(path.join(home,'bin',tool+'.exe'),args,{stdio:'inherit',windowsHide:true,timeout:45000});if(result.error)throw result.error;if(result.status)process.exit(result.status);}
run('javac',['-encoding','UTF-8','--release','8','-Xlint:-options','-cp',jar,'-d',out,...['Network','GameInstaller','ForgeInstaller'].map(n=>path.join(root,'client/installer-java/up/hxz',n+'.java')),...['NetworkCleanupRegression','NetworkConcurrencyRegression'].map(n=>path.join(root,'client/test/java',n+'.java'))]);
run('java',['-cp',out+path.delimiter+jar,process.argv[2]==='concurrency'?'up.hxz.NetworkConcurrencyRegression':'up.hxz.NetworkCleanupRegression',out,...process.argv.slice(2)]);
