// Offline build against the user's installed, mapped NeoForge libraries.
// Reads the client only; the output JAR contains our classes and metadata, never Minecraft binaries.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve('integrations/game-bridge/neoforge'),gameRoot=process.argv[2]||'D:/PCL/.minecraft',instance=process.argv[3]||'HXZ-mod-1',jdk=process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21';
const json=JSON.parse(await fs.readFile(path.join(gameRoot,'versions',instance,instance+'.json'),'utf8'));
const libraries=[];
for(const item of json.libraries||[]){const artifact=item.downloads?.artifact?.path;if(artifact){const file=path.join(gameRoot,'libraries',artifact);if(await fs.stat(file).then(s=>s.isFile(),()=>false))libraries.push(file);}}
const neo=json.patches?.find(v=>v.id==='neoforge')?.version||(json.libraries||[]).find(v=>v.name?.startsWith('net.neoforged:neoforge:'))?.name?.split(':')[2];
if(!['21.1.250','21.1.251'].includes(neo))throw Error('Expected the verified 1.21.1 NeoForge client profile');
const patched=path.join(gameRoot,'libraries/net/neoforged/neoforge',neo,`neoforge-${neo}-client.jar`),mapped=path.join(gameRoot,'libraries/net/minecraft/client/1.21.1-20240808.144430/client-1.21.1-20240808.144430-srg.jar');
await fs.access(patched);await fs.access(mapped);
const classes=path.join(root,'build','local-'+neo),out=path.join(root,'build','libs');await fs.mkdir(classes,{recursive:true});await fs.mkdir(out,{recursive:true});
const sources=['BridgeTransport','HxzCommunityBridge'].map(n=>path.join(root,'src/main/java/top/hxzmc/bridge',n+'.java'));
function run(name,args){return new Promise((resolve,reject)=>{const proc=spawn(path.join(jdk,'bin',name+'.exe'),args,{stdio:'inherit',windowsHide:true});proc.on('error',reject);proc.on('exit',code=>code?reject(Error(name+' failed: '+code)):resolve());});}
const universal=path.join(gameRoot,'libraries/net/neoforged/neoforge',neo,`neoforge-${neo}-universal.jar`);
const cp=[...new Set([patched,mapped,universal,...libraries])].join(path.delimiter),quote=s=>JSON.stringify(s.replaceAll('\\','/'));
const args=['--release','21','-encoding','UTF-8','-proc:none','-classpath',cp,'-d',classes,...sources];
const argFile=path.join(root,'build','javac-'+neo+'.args');await fs.writeFile(argFile,args.map(quote).join('\n'));
await run('javac',['@'+argFile]);
await fs.cp(path.join(root,'src/main/resources'),classes,{recursive:true});
const output=path.join(out,'hxz-community-bridge-0.8.0-neoforge-1.21.1.jar');
await run('jar',['--create','--file',output,'-C',classes,'.']);
console.log('Bridge compiled against NeoForge '+neo+': '+output);
