import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {Transform,Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {extractNative} from '../packages/engine/core/io.mjs';

export function communityExtension({home,resources,definition,id="community",choose,emit=()=>{},fetcher=fetch}){
  if(!['community','music','arcade'].includes(id))throw Error('未知扩展');
  const label={community:'社区',music:'音乐播放器',arcade:'小游戏'}[id];
  const base=path.join(home,'extensions',id),marker=path.join(base,'enabled.json');
  const final=path.join(base,definition.sha256);
  let busy=false;
  async function mark(hash){
    const tmp=path.join(base,'.enabled-'+randomUUID());
    try{await fs.writeFile(tmp,JSON.stringify({sha256:hash,...(!hash?{remove:true}:{})}));await fs.rename(tmp,marker);}
    finally{await fs.rm(tmp,{force:true});}
  }
  async function source(action){
    if(action==='extension.import'){
      const result=await choose({title:'选择'+label+'扩展包',properties:['openFile'],filters:[{name:label+'扩展',extensions:['zip']}]});
      const file=result.filePaths?.[0];return file?createReadStream(file):null;
    }
    // A player can keep the optional download alongside a local distribution, even after running its installer.
    const app=path.resolve(resources,'../..');
    const sourceDir=(await fs.readFile(path.join(app,'installed.flag'),'utf16le').catch(()=>'')).replace(/^\uFEFF/,'');
    const locations=[path.join(app,'extensions'),path.resolve(app,'../extensions')];
    if(path.isAbsolute(sourceDir))locations.unshift(sourceDir);
    for(const location of locations){
      const file=path.join(location,definition.name);
      if((await fs.stat(file).catch(()=>null))?.isFile())return createReadStream(file);
    }
    const response=await fetcher(definition.url,{signal:AbortSignal.timeout(120000),redirect:'error'});
    if(!response.ok){await response.body?.cancel();throw Error('扩展包下载 HTTP '+response.status);}
    if(!response.body)throw Error('扩展包下载中断');
    return Readable.fromWeb(response.body);
  }
  return async action=>{
    if(busy)throw Error('正在处理扩展，请稍候');
    busy=true;let staging;
    try{
      await fs.mkdir(base,{recursive:true});
      if(action==='extension.disable'){await mark('');return {changed:true};}
      if(!['extension.install','extension.import'].includes(action))throw Error('不支持此扩展操作');
      const input=await source(action);if(!input)return {changed:false};
      staging=await fs.mkdtemp(path.join(base,'stage-'));
      const archive=path.join(staging,'package.zip'),folder=path.join(staging,'assets'),hash=createHash('sha256');
      let count=0,percent=-1;
      await pipeline(input,new Transform({transform(chunk,_encoding,done){
        count+=chunk.length;
        if(count>definition.size){done(Error('扩展包校验失败'));return;}
        hash.update(chunk);const next=Math.floor(count/definition.size*100);
        if(next!==percent){percent=next;emit({type:'extension-progress',percent});}
        done(null,chunk);
      }}),createWriteStream(archive,{flags:'wx'}));
      if(count!==definition.size||hash.digest('hex')!==definition.sha256)throw Error('扩展包校验失败，请下载与当前启动器匹配的插件');
      await extractNative(archive,folder);
      // The marker is committed last. Any cancellation, failed transfer or extraction leaves the previous choice intact.
      if(!(await fs.stat(final).catch(()=>null))?.isDirectory())await fs.rename(folder,final);
      else{
        // Restore damaged cached assets atomically, even when re-enabling a previously disabled plugin.
        const restore=async(relative='')=>{for(const item of await fs.readdir(path.join(folder,relative),{withFileTypes:true})){
          const name=path.join(relative,item.name),to=path.join(final,name);
          if(item.isDirectory()){await fs.mkdir(to,{recursive:true});await restore(name);}
          else await fs.rename(path.join(folder,name),to);
        }};await restore();
      }
      await mark(definition.sha256);return {changed:true};
    }finally{
      if(staging&&path.dirname(staging)===base)await fs.rm(staging,{recursive:true,force:true,maxRetries:4}).catch(()=>{});
      busy=false;
    }
  };
}
