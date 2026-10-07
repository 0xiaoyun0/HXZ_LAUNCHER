import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Fixed, independently retriable ranges with a work queue: a fast connection
// takes another block instead of waiting for a slow quarter of the file.
export async function downloadRanges(urls,file,options,{slot,hash,noLinks,writeJSON,limit,active=()=>1,report}){
 const identity=createHash('sha256').update(JSON.stringify([options.size,options.sha1,options.sha256,options.sha512])).digest('hex').slice(0,20);
 const temp=file+'.'+identity+'.ranges.partial',index=temp+'.json';
 const block=Math.max(2*1024*1024,Math.ceil(options.size/1024));
 const count=Math.ceil(options.size/block),workers=Math.min(8,count,limit);
 if(workers<2)return false;
 const controller=new AbortController(),signal=options.signal?AbortSignal.any([options.signal,controller.signal]):controller.signal;
 let handle,done=Array(count).fill(false),received=Array(count).fill(0),next=0,save=Promise.resolve(),success=false,invalid=false;
 const tasks=[];
 await fs.mkdir(path.dirname(file),{recursive:true});await noLinks(temp);await noLinks(index);
 try{
  const state=await fs.readFile(index,'utf8').then(JSON.parse).catch(()=>null),stat=await fs.stat(temp).catch(()=>null);
  if(state?.identity===identity&&state.block===block&&Array.isArray(state.done)&&state.done.length===count&&stat?.size===options.size)done=state.done.map(v=>v===true);
  handle=await fs.open(temp,stat?'r+':'wx');await handle.truncate(options.size);
  received=done.map((yes,i)=>yes?Math.min(block,options.size-i*block):0);
  const persist=()=>{const snapshot={identity,block,done:[...done]};save=save.then(()=>writeJSON(index,snapshot));return save;};
  for(let w=0;w<workers;w++)tasks.push((async()=>{
   while(next<count){const part=next++;if(done[part])continue;signal.throwIfAborted();
    const start=part*block,end=Math.min(options.size,start+block)-1;let failure;
    for(const url of urls){
     let release,timer;const timeout=new AbortController(),transfer=AbortSignal.any([signal,timeout.signal]);
     const touch=()=>{clearTimeout(timer);timer=setTimeout(()=>timeout.abort(Error('分段下载长时间没有数据')),options.idleTimeoutMs??20000);};
     try{
      release=await slot(transfer);touch();
      const res=await fetch(url,{headers:{...options.headers,'Accept-Encoding':'identity',Range:`bytes=${start}-${end}`},signal:transfer});
      if(res.status!==206||res.headers.get('content-range')!==`bytes ${start}-${end}/${options.size}`){await res.body?.cancel();throw Error('节点不支持可靠的分段下载');}
      received[part]=0;let position=start,paceTime=Date.now(),paceBytes=0;
      for await(const chunk of res.body){touch();paceBytes+=chunk.length;const window=options.stallWindowMs??10000;if(Date.now()-paceTime>=window){const minimum=end-position>256*1024&&active()<=Math.max(1,limit/4)?32:2;if(paceBytes<Math.max(512,window*minimum))throw Error('下载节点持续低速，切换备用来源');paceTime=Date.now();paceBytes=0;}if(position+chunk.length>end+1)throw Error('分段长度超出范围');let offset=0;
       while(offset<chunk.length){const {bytesWritten}=await handle.write(chunk,offset,chunk.length-offset,position);if(!bytesWritten)throw Error('无法写入下载文件');offset+=bytesWritten;position+=bytesWritten;}
       received[part]+=chunk.length;options.onProgress?.(chunk.length);options.onTransfer?.({bytes:received.reduce((a,b)=>a+b,0),total:options.size,source:new URL(url).hostname});
      }
      if(position!==end+1)throw Error('分段下载不完整');done[part]=true;await persist();failure=null;break;
     }catch(e){if(signal.aborted)throw signal.reason;failure=e;}
     finally{clearTimeout(timer);release?.();}
    }
    if(failure)throw failure;
   }
  })());
  await Promise.all(tasks);await save;await handle.close();handle=null;
  for(const [algorithm,expected] of Object.entries({sha1:options.sha1,sha256:options.sha256,sha512:options.sha512}))if(expected&&await hash(temp,algorithm)!==expected.toLowerCase()){invalid=true;throw Error('分段下载校验失败');}
  signal.throwIfAborted();await noLinks(file);await fs.rename(temp,file);success=true;
  options.onTransfer?.({bytes:options.size,total:options.size,verified:true,source:'分段校验完成'});return true;
 }catch(error){if(options.signal?.aborted)throw options.signal.reason;report({message:'分段下载不可用，保留进度并尝试完整文件下载',source:new URL(urls[0]).hostname});return false;}
 finally{controller.abort();await Promise.allSettled(tasks);await save.catch(()=>{});await handle?.close();if(success||invalid){await fs.rm(temp,{force:true});await fs.rm(index,{force:true});}}
}
