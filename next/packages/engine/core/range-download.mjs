import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';

// Fixed, independently retriable ranges with a work queue: a fast connection
// takes another block instead of waiting for a slow quarter of the file.
export async function downloadRanges(urls,file,options,{slot,hash,noLinks,writeJSON,limit,active=()=>1,report,throttle=()=>Promise.resolve()}){
 const identity=createHash('sha256').update(JSON.stringify([options.size,options.sha1,options.sha256,options.sha512])).digest('hex').slice(0,20);
 const temp=file+'.'+identity+'.ranges.partial',index=temp+'.json';
 const block=Math.max(2*1024*1024,Math.ceil(options.size/1024));
 const count=Math.ceil(options.size/block),workers=Math.min(8,count,limit);
 if(workers<2)return false;
 const controller=new AbortController(),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
 let handle,done=Array(count).fill(false),received=Array(count).fill(0),next=0,save=Promise.resolve(),success=false,invalid=false,persist=()=>save,lastPersist=0;
 const tasks=[],unavailable=new Set(),cooldowns=new Map();
 await fs.mkdir(path.dirname(file),{recursive:true});await noLinks(temp);await noLinks(index);
 try{
  const state=await fs.readFile(index,'utf8').then(JSON.parse).catch(()=>null),stat=await fs.stat(temp).catch(()=>null);
  const validState=state?.identity===identity&&state.block===block&&Array.isArray(state.done)&&state.done.length===count&&stat?.size===options.size;
  if(validState)done=state.done.map(v=>v===true);
  handle=await fs.open(temp,stat?'r+':'wx');await handle.truncate(options.size);
  received=done.map((yes,i)=>yes?Math.min(block,options.size-i*block):validState&&Number.isSafeInteger(state?.received?.[i])?Math.max(0,Math.min(Math.min(block,options.size-i*block)-1,state.received[i])):0);
  persist=(force=false)=>{if(!force&&Date.now()-lastPersist<250)return save;lastPersist=Date.now();const snapshot={identity,block,done:[...done],received:[...received]};save=save.then(()=>writeJSON(index,snapshot));return save;};
  for(let w=0;w<workers;w++)tasks.push((async()=>{
   while(next<count){const part=next++;if(done[part])continue;signal.throwIfAborted();
    const partStart=part*block,end=Math.min(options.size,partStart+block)-1;let failure;
    sources:for(const url of urls){
     if(unavailable.has(url)||(cooldowns.get(url)||0)>Date.now())continue;
     for(let attempt=1;attempt<=5;attempt++){
     let release,timer;const start=partStart+received[part];const timeout=new AbortController(),transfer=AbortSignal.any([signal,timeout.signal]);
     const touch=()=>{clearTimeout(timer);timer=setTimeout(()=>timeout.abort(Error('分段下载长时间没有数据')),options.idleTimeoutMs??(active()<=Math.max(1,limit/4)?12000:20000));};
     try{
      release=await slot(transfer);timer=setTimeout(()=>timeout.abort(Error('连接分段下载节点超时')),options.connectTimeoutMs??6000);
      const res=await fetch(url,{headers:{...options.headers,'Accept-Encoding':'identity',Range:`bytes=${start}-${end}`},signal:transfer});
      if(res.status!==206||res.headers.get('content-range')!==`bytes ${start}-${end}/${options.size}`){await res.body?.cancel();const e=Error('分段下载节点返回 '+res.status);e.permanent=res.status<500&&![408,429].includes(res.status);if(res.status===429){const raw=res.headers.get('retry-after'),ms=/^\d+$/.test(raw||'')?Number(raw)*1000:Date.parse(raw)-Date.now();cooldowns.set(url,Date.now()+Math.max(1000,Number.isFinite(ms)?ms:10000));e.cooldown=true;}throw e;}
      touch();
      let position=start,paceTime=Date.now(),paceBytes=0;
      for await(const chunk of res.body){touch();paceBytes+=chunk.length;const window=options.stallWindowMs??10000;if(Date.now()-paceTime>=window){const minimum=end-position>256*1024&&active()<=Math.max(1,limit/4)?32:2;if(paceBytes<Math.max(512,window*minimum))throw Error('下载节点持续低速，切换备用来源');paceTime=Date.now();paceBytes=0;}if(position+chunk.length>end+1)throw Error('分段长度超出范围');let offset=0;
       clearTimeout(timer);const waiting=Date.now();await throttle(chunk.length,transfer);paceTime+=Date.now()-waiting;touch();
       while(offset<chunk.length){const {bytesWritten}=await handle.write(chunk,offset,chunk.length-offset,position);if(!bytesWritten)throw Error('无法写入下载文件');offset+=bytesWritten;position+=bytesWritten;}
       received[part]+=chunk.length;options.onProgress?.(chunk.length);options.onTransfer?.({bytes:received.reduce((a,b)=>a+b,0),total:options.size,source:new URL(url).hostname});
      }
      if(position!==end+1)throw Error('分段下载不完整');done[part]=true;await persist();failure=null;break sources;
     }catch(e){if(signal.aborted)throw signal.reason;failure=e;if(e.permanent){unavailable.add(url);break;}if(e.cooldown||String(e.message).includes('持续低速')||attempt===5)break;}
     finally{clearTimeout(timer);release?.();}
     report({source:new URL(url).hostname,message:`分段连接重试 ${attempt}/5，已完成分段保留`});await delay(options.retryDelay??Math.min(2000,250*2**(attempt-1)),undefined,{signal});
     }
    }
    if(failure||!done[part])throw failure||Error('可用分段节点正在冷却');
   }
  })());
  await Promise.all(tasks);await persist(true);await save;await handle.close();handle=null;
  for(const [algorithm,expected] of Object.entries({sha1:options.sha1,sha256:options.sha256,sha512:options.sha512}))if(expected&&await hash(temp,algorithm)!==expected.toLowerCase()){invalid=true;throw Error('分段下载校验失败');}
  signal.throwIfAborted();await noLinks(file);await fs.rename(temp,file);success=true;
  options.onTransfer?.({bytes:options.size,total:options.size,verified:true,source:'分段校验完成'});return true;
 }catch(error){if(options.signal?.aborted)throw options.signal.reason;
   // Keep downloaded bytes when a tail connection fails. The complete file is
   // hash-checked before commit; a partial block is not independently verified.
   if(!invalid&&!error.permanent&&received.some(n=>n>0)){error.partialRanges=true;error.completedRanges=done.filter(Boolean).length;error.completedBytes=received.reduce((a,b)=>a+b,0);throw error;}
   report({message:'此节点不支持可靠分段，尝试完整文件下载',source:new URL(urls[0]).hostname});return false;}
 finally{controller.abort();await Promise.allSettled(tasks);if(!success&&!invalid)await persist(true).catch(()=>{});await save.catch(()=>{});await handle?.close();if(success||invalid){await fs.rm(temp,{force:true});await fs.rm(index,{force:true});}}
}
