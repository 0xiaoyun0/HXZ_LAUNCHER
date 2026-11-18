import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {createHash,createPublicKey,randomUUID,verify} from 'node:crypto';
import path from 'node:path';
import semver from 'semver';

const maximum=512*1024*1024;
const remote=value=>{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('更新源必须使用 HTTPS');return u.href;};
export function updates({home,version,architecture,channel,installed,launch,isBusy,emit,fetcher=fetch}) {
 let manifest,active,autoChecked=false;
 let state={version,installed:!!channel&&installed,distribution:installed?'setup':'portable',managed:!!channel&&installed,phase:channel&&installed?'尚未检查':'本地测试版',available:false,ready:false,percent:0};
 const set=change=>{state={...state,...change};emit({type:'app-update',...state});return {...state};};
 const dir=path.join(home,'updates'),target=()=>path.join(dir,manifest.sha256+'.exe');
 async function readManifest(){
   const response=await fetcher(remote(channel.url),{signal:AbortSignal.timeout(12000),redirect:'error'});
   if(!response.ok)throw Error('更新源暂时不可用');
   let length=0;const chunks=[];for await(const chunk of response.body){length+=chunk.length;if(length>256*1024)throw Error('更新清单过大');chunks.push(chunk);}
   const envelope=JSON.parse(Buffer.concat(chunks).toString('utf8')),payload=Buffer.from(envelope.payload,'base64');
   const key=createPublicKey({key:Buffer.from(channel.publicKey,'base64'),format:'der',type:'spki'});
   if(key.asymmetricKeyType!=='ed25519'||!verify(null,payload,key,Buffer.from(envelope.signature,'base64')))throw Error('更新签名无效');
   const record=JSON.parse(payload.toString('utf8')),asset=record.assets?.[architecture];
   if(record.format!=='hxz-third-update-v1'||!semver.valid(record.version))throw Error('更新清单版本无效');
   if(!semver.gt(record.version,version))return null;
   if(!asset||!Number.isSafeInteger(asset.size)||asset.size<=0||asset.size>maximum||!/^[a-f0-9]{64}$/.test(asset.sha256))throw Error('更新文件描述无效');
   return {...asset,url:remote(asset.url),version:record.version};
 }
 async function validFile(){if(!manifest)return false;try{const file=target(),stat=await fs.stat(file);if(stat.size!==manifest.size)return false;const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex')===manifest.sha256;}catch{return false;}}
 async function check(){
   const next=await readManifest();manifest=next;
   const ready=await validFile();
   return set({phase:ready?'更新已下载':next?'发现新版本':'已是最新版本',version:next?.version||version,available:!!next,ready,percent:ready?100:0});
 }
 async function download(){
   if(!manifest)await check();if(!manifest)return {...state};if(await validFile())return set({phase:'更新已下载',ready:true,percent:100});
   await fs.mkdir(dir,{recursive:true});const temp=path.join(dir,randomUUID()+'.part');
   try{
     const response=await fetcher(manifest.url,{signal:AbortSignal.timeout(180000),redirect:'follow'});
     if(!response.ok)throw Error('安装包下载失败');if(response.url)remote(response.url);
     let count=0,last=-1;const h=createHash('sha256');
     await pipeline(response.body,new Transform({transform(chunk,_,cb){count+=chunk.length;if(count>manifest.size){cb(Error('更新内容超过清单大小'));return;}h.update(chunk);const pct=Math.floor(100*count/manifest.size);if(pct!==last){last=pct;set({phase:'正在下载',percent:pct});}cb(null,chunk);}}),createWriteStream(temp,{flags:'wx'}));
     if(count!==manifest.size||h.digest('hex')!==manifest.sha256)throw Error('安装包完整性校验失败');
     await fs.rename(temp,target());return set({phase:'更新已下载',ready:true,percent:100});
   }finally{await fs.rm(temp,{force:true});}
 }
 async function invoke(action){
   if(action==='app-update.status')return {...state};
   if(!state.managed){if(action==='app-update.check')return {...state};throw Error('当前本地版本使用完整包升级');}
   if(active)throw Error('已有更新操作正在进行');
   active=true;
   try{
     if(action==='app-update.check')return await check();
     if(action==='app-update.download')return await download();
     if(action==='app-update.install'){if(isBusy())throw Error('请先结束正在运行的游戏和下载');if(!await validFile())throw Error('请重新下载更新');await launch({sha256:manifest.sha256});return set({phase:'正在打开安装程序'});}
     throw Error('未知版本操作');
   }catch(e){set({phase:e.message});throw e;}finally{active=false;}
 }
 return {invoke,autoCheck(enabled){if(enabled&&state.managed&&!autoChecked){autoChecked=true;const timer=setTimeout(()=>{void invoke('app-update.check').catch(()=>{});},4500);timer.unref?.();}}};
}
