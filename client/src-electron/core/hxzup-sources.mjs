import {remoteJSON} from './io.mjs';
import {networkFailure} from './network-errors.mjs';
import {normalizeUpdateUrl} from '../../../server/shared/server-presets.mjs';
export {normalizeUpdateUrl};

// Read status and installation profile from the same source, keeping maintenance authoritative.
export async function readUpdateSource(urls,{signal,profile=false,log=()=>{},request=remoteJSON}={}){
  if(!Array.isArray(urls)||!urls.length||urls.length>16)throw Error('请设置 1 至 16 个 HXZ UP 地址');
  const sources=[...new Set(urls.map(normalizeUpdateUrl))];
  let failure,onlyNetwork=true;
  for(const [index,base] of sources.entries()){
    signal?.throwIfAborted();
    try{
      log(`[HXZ UP] 连接 ${index+1}/${sources.length} · ${base}`);
      const attempt={signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(8000)])};
      const status=await request(base+'/version.json',attempt);
      if(!status||typeof status!=='object'||(!status.maintenance&&typeof status.version!=='string'))throw Error('更新版本信息无效');
      if(status.maintenance)return {base,status};
      const game=profile?await request(base+'/game-profile.json',attempt):undefined;
      if(profile&&(!game||typeof game.gameVersion!=='string'||!game.gameVersion.trim()))throw Error('此地址尚未发布游戏配置');
      log(`[HXZ UP] 已连接 · ${base}`);
      return {base,status,profile:game};
    }catch(error){
      signal?.throwIfAborted();failure=error;onlyNetwork&&=networkFailure(error);
      log(`[HXZ UP] 地址不可用 · ${base} · ${error.message}${index+1<sources.length?'；尝试下一个地址':''}`);
    }
  }
  const error=Error('所有 HXZ UP 地址均不可用：'+failure?.message);error.code=onlyNetwork?'HXZUP_OFFLINE':'HXZUP_INVALID';throw error;
}
