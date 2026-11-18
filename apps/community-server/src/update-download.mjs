import fs from 'node:fs/promises';import path from 'node:path';import {createReadStream} from 'node:fs';import {createHash} from 'node:crypto';
const digest=async(file)=>{const hash=createHash('sha512');for await(const bytes of createReadStream(file))hash.update(bytes);return hash.digest('hex');};
export async function downloadUpdate(url,file,manifest,{signal,onProgress=()=>{}}={}){
 await fs.mkdir(path.dirname(file),{recursive:true});let offset=await fs.stat(file).then(s=>s.size,()=>0);
 if(offset===manifest.file.size){if(await digest(file)===manifest.file.sha512)return file;await fs.rm(file);offset=0;}
 if(offset>manifest.file.size){await fs.rm(file);offset=0;}
 const controller=new AbortController(),combined=signal?AbortSignal.any([signal,controller.signal]):controller.signal;let timer=setTimeout(()=>controller.abort(Error('更新节点连接超时')),8000);
 let handle;try{
  const res=await fetch(url,{signal:combined,headers:offset?{Range:'bytes='+offset+'-'}:{}});clearTimeout(timer);
  if(!res.ok){await res.body?.cancel();throw Error('更新节点 HTTP '+res.status);}
  if(offset&&res.status===206){const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(res.headers.get('content-range')||'');if(!match||Number(match[1])!==offset||Number(match[3])!==manifest.file.size){await res.body.cancel();throw Error('更新断点响应无效');}}
  else if(res.status===200)offset=0;else{await res.body?.cancel();throw Error('更新下载响应无效');}
  handle=await fs.open(file,offset?'a':'w');const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(Error('更新节点传输停滞，可继续下载')),20000);};reset();
  for await(const bytes of res.body){reset();if(offset+bytes.length>manifest.file.size)throw Error('更新包超过声明长度');let written=0;while(written<bytes.length){const r=await handle.write(bytes,written,bytes.length-written);if(!r.bytesWritten)throw Error('无法写入更新缓存');written+=r.bytesWritten;}offset+=bytes.length;onProgress(offset,manifest.file.size);}
  await handle.close();handle=null;if(offset!==manifest.file.size)throw Error('更新包未下载完整，可继续下载');
  if(await digest(file)!==manifest.file.sha512){await fs.rm(file,{force:true});throw Error('更新包校验不符，已丢弃并尝试其他节点');}return file;
 }finally{clearTimeout(timer);controller.abort();await handle?.close();}
}
