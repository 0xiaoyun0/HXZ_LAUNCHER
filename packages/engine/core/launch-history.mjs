import path from 'node:path';import {randomUUID} from 'node:crypto';import {json,writeJSON,noLinks} from './io.mjs';

export function launchHistory(home){
 const file=path.join(home,'launch-history.json');let queue=Promise.resolve();
 const read=async()=>{await noLinks(file);const data=await json(file).catch(e=>{if(e.code==='ENOENT')return [];throw e;});if(!Array.isArray(data)||data.length>200)throw Error('启动记录格式无效');return data;};
 const mutate=work=>{const job=queue.catch(()=>{}).then(async()=>{const rows=await read(),result=work(rows);await writeJSON(file,rows.slice(-200));return result;});queue=job.catch(()=>{});return job;};
 return {
  start({instance,root,preparationMs,memoryMB,javaVersion,architecture}){const key=randomUUID();return mutate(rows=>{rows.push({id:key,instance:String(instance).slice(0,100),root:path.resolve(root),started:Date.now(),preparationMs:Math.max(0,Math.round(preparationMs)),memoryMB:Number(memoryMB)||0,javaVersion:String(javaVersion).slice(0,50),architecture:String(architecture).slice(0,15),ended:0,exitCode:null,status:'running'});return key;});},
  finish(key,{code,signal='',stopped=false,failedToStart=false}){return mutate(rows=>{const row=rows.find(v=>v.id===key);if(!row||row.ended)return;row.ended=Date.now();row.exitCode=Number.isInteger(code)?code:null;row.signal=String(signal||'').slice(0,40);row.status=failedToStart?'failed':stopped?'stopped':code===0&&!signal?'normal':'crash';});},
  async list(root,instance){await queue;return (await read()).filter(row=>row.root?.toLowerCase()===path.resolve(root).toLowerCase()&&row.instance===instance).reverse().slice(0,30);},
  migrate(from,to){return mutate(rows=>{for(const row of rows)if(row.root?.toLowerCase()===path.resolve(from).toLowerCase())row.root=path.resolve(to);});}
 };
}
