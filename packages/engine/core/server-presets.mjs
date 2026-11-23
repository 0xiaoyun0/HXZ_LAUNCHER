import {DEFAULT_SERVERS,normalizePresets} from '../../../server/shared/server-presets.mjs';
import path from 'node:path';
import {json,writeJSON,remoteJSON,endpoint} from './io.mjs';
export {DEFAULT_SERVERS};

export async function createPresetCatalog(data,community,previousCache){
  const file=path.join(data,'server-presets-cache.json');
  const defaults=()=>structuredClone(DEFAULT_SERVERS);
  const lifetime=new AbortController();
  let servers=defaults(),source='',checked=0,pending=null,pendingSource='';
  function alignSource(){
    let base='';try{base=endpoint(community());}catch{/* Invalid legacy addresses only affect remote features. */}
    if(base!==source){source=base;servers=defaults();checked=0;pending=null;}
    return base;
  }
  async function restore(read){
    if(!read)return false;
    try{
      const saved=await read();
      if(saved?.source!==source)return false;
      servers=normalizePresets(saved.servers);return true;
    }catch{return false;}
  }
  alignSource();
  if(!await restore(()=>json(file)))await restore(previousCache);
  return {
    list(){
      alignSource();
      return servers.map(p=>({...p,builtin:true,placeholder:!p.enabled,version:p.version||'跟随整合包',loader:p.loader||(p.profileSource==='manual'?'原版':'跟随整合包')}));
    },
    dispose:()=>lifetime.abort(),
    async refresh({force=false,strict=false}={}){
      const base=alignSource();
      if(!base){if(strict)throw Error('社区服务地址无效，请在设置中恢复官方地址');return servers;}
      if(lifetime.signal.aborted||(!force&&!pending&&Date.now()-checked<60000))return servers;
      if(!pending||pendingSource!==base){
        pendingSource=base;
        const request=(async()=>{
          const response=await remoteJSON(base+'/api/server-presets',{signal:AbortSignal.any([lifetime.signal,AbortSignal.timeout(5000)])});
          const next=normalizePresets(response.servers);
          lifetime.signal.throwIfAborted();
          if(base!==alignSource())return;
          await writeJSON(file,{source:base,servers:next});
          if(base===alignSource())servers=next;
        })();
        pending=request;
        const done=()=>{if(pending===request){checked=Date.now();pending=null;}};
        void request.then(done,done);
      }
      try{await pending;}catch{if(strict)throw Error('服务器配置刷新失败，仍可使用当前服务器列表。请检查社区地址或稍后重试。');}
      return servers;
    }
  };
}
