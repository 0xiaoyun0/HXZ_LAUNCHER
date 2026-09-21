import {DEFAULT_SERVERS,normalizePresets} from '../../../server/shared/server-presets.mjs';
import path from 'node:path';
import {exists,json,writeJSON,remoteJSON,endpoint} from './io.mjs';
export {DEFAULT_SERVERS};
export async function createPresetCatalog(data,community) {
  const file=path.join(data,'server-presets-cache.json');
  let servers=JSON.parse(JSON.stringify(DEFAULT_SERVERS)),checked=0,source='',pending;
  const lifetime=new AbortController();
  if(await exists(file))try{const saved=await json(file);servers=normalizePresets(saved.servers);source=saved.source;}catch{}
  return {
    list:()=>servers.map(p=>({...p,builtin:true,placeholder:!p.enabled,version:p.version||'跟随整合包',loader:p.loader||(p.profileSource==='manual'?'原版':'跟随整合包')})),
    dispose:()=>lifetime.abort(),
    async refresh(){
      if(lifetime.signal.aborted)return servers;
      let base;try{base=endpoint(community());}catch{return servers;}
      if(base===source&&Date.now()-checked<60000)return servers;
      if(pending)return pending;
      pending=(async()=>{
        try {
          const response=await remoteJSON(base+'/api/server-presets',{signal:AbortSignal.any([lifetime.signal,AbortSignal.timeout(5000)])});
          const next=normalizePresets(response.servers);
          lifetime.signal.throwIfAborted();await writeJSON(file,{source:base,servers:next});servers=next;source=base;
        } catch(error) {
          if(source!==base){servers=JSON.parse(JSON.stringify(DEFAULT_SERVERS));source=base;}
          // Older/offline community servers retain the last verified configuration.
        } finally {checked=Date.now();pending=null;}
        return servers;
      })();
      return pending;
    }
  };
}
