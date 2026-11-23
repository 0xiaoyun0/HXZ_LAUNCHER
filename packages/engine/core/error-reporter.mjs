import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {sanitizeReport} from '../../../server/shared/report-sanitize.mjs';
import {writeJSON} from './io.mjs';

export async function createErrorReporter({data,enabled,version,send}){
 const file=path.join(data,'error-outbox.json');let queue=[],writing=Promise.resolve(),flushing=null,closed=false,lastError='',lastSent=0;
 try{const rows=JSON.parse(await fs.readFile(file,'utf8'));if(Array.isArray(rows))queue=rows.slice(-200);}catch{}
 const save=()=>{const snapshot=JSON.parse(JSON.stringify(queue));writing=writing.catch(()=>{}).then(()=>writeJSON(file,snapshot));return writing;};
 const flush=async()=>{
  if(closed||!enabled()||flushing)return flushing;
  flushing=(async()=>{for(let i=0;i<10&&queue.length&&!closed&&enabled();i++){
   const event=queue[0];try{await send(event);queue=queue.filter(v=>v.eventId!==event.eventId);lastSent=Date.now();lastError='';await save();}
   catch(error){lastError=sanitizeReport(error.message,500);break;}
  }})().finally(()=>flushing=null);return flushing;
 };
 const timer=setInterval(()=>void flush(),60000);timer.unref();
 return {
  async capture({message,detail='',category='launcher',context={}}){
   if(closed||!enabled()||!message)return;
   const safe={};for(const [k,v] of Object.entries({...context,os:os.type()+' '+os.release(),arch:process.arch,clientTime:new Date().toISOString()}))safe[k]=sanitizeReport(v,300);
   queue.push({eventId:randomUUID(),version,platform:process.platform+'-'+process.arch,category,message:sanitizeReport(message,1000),detail:sanitizeReport(detail,32000),context:safe});
   queue=queue.slice(-200);await save();void flush();
  },flush,
  status:()=>({enabled:enabled(),pending:queue.length,lastSent,lastError}),
  async clear(){queue=[];await save();},
  async close(){closed=true;clearInterval(timer);await flushing;await writing;}
 };
}
