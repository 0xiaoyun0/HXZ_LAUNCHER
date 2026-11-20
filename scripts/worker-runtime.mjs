import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {createHash,randomUUID} from 'node:crypto';

export const architecture=process.argv.includes('--ia32')?'ia32':'x64';
export const workerDirectory=path.resolve('.runtime',architecture==='ia32'?'engine-ia32':'engine');
export async function workerRuntime(){
 if(architecture==='x64'){
   if(process.platform!=='win32'||process.arch!=='x64'||Number(process.versions.node.split('.')[0])<24)throw Error('Windows x64 构建需要 Node 24+ x64');
   return process.execPath;
 }
 const version='22.23.5',sha='a6f12cfaa84f16d1cfb36ccca361e155acee9e8a4e47fdc3a684cda361ad245a';
 const dir=path.resolve('.runtime/vendor'),file=path.join(dir,'node-v'+version+'-x86.exe');
 async function digest(name){const h=createHash('sha256');for await(const part of createReadStream(name))h.update(part);return h.digest('hex');}
 if(await digest(file).catch(()=>'')===sha)return file;
 await fs.mkdir(dir,{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';
 try{const response=await fetch('https://nodejs.org/download/release/v'+version+'/win-x86/node.exe',{signal:AbortSignal.timeout(180000)});if(!response.ok)throw Error('下载 32 位运行时失败');await pipeline(response.body,createWriteStream(temp,{flags:'wx'}));if(await digest(temp)!==sha)throw Error('32 位运行时 SHA-256 不匹配');await fs.rename(temp,file);return file;}finally{await fs.rm(temp,{force:true});}
}
