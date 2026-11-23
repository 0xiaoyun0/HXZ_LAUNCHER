import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {download,noLinks} from './io.mjs';

export async function prepareDirectHelper({resources,dependencies,metadata,command,config,signal,log}){
 const dir=path.join(command.cwd,'.hxzl'),jar=path.join(dir,'direct-lobby.jar'),control=path.join(dir,'direct-lobby.properties');
 await noLinks(jar);await noLinks(control);await fs.mkdir(dir,{recursive:true});
 let classes={};const mapping=metadata.downloads?.client_mappings;
 if(mapping?.url&&/^[a-f0-9]{40}$/i.test(mapping.sha1||'')){
  const target=path.join(dependencies,'direct-lobby',mapping.sha1+'.txt');
  await download(mapping.url,target,{sha1:mapping.sha1,signal,maxSize:32*1024*1024});
  const input=createReadStream(target),lines=createInterface({input,crlfDelay:Infinity});
  try{for await(const line of lines){const match=line.match(/^(net\.minecraft\.(?:client\.Minecraft|client\.server\.IntegratedServer)) -> ([\w.$]+):$/);if(match)classes[match[1].endsWith('.Minecraft')?'clientClass':'serverClass']=match[2];if(Object.keys(classes).length===2)break;}}finally{lines.close();input.destroy();}
 }
 await fs.copyFile(path.join(resources,'direct-lobby/direct-lobby.jar'),jar);
 const payload=`port=${config.port}\nclientClass=${classes.clientClass||'net.minecraft.client.Minecraft'}\nserverClass=${classes.serverClass||'net.minecraft.client.server.IntegratedServer'}\n`;
 await fs.writeFile(control,payload,'ascii');
 command.args.unshift('-javaagent:.hxzl/direct-lobby.jar');
 log('[联机] 本地助手已就绪，进入单人世界后自动开放。');
 let stopped=false;const timer=setInterval(()=>{if(!stopped)void fs.utimes(control,new Date(),new Date()).catch(()=>{});},10000);timer.unref?.();
 return async()=>{stopped=true;clearInterval(timer);await fs.unlink(control).catch(()=>{});};
}
