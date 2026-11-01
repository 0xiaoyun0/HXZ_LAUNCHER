import {minecraftStatus,DEFAULT_STATUS_SERVERS} from '../../../server/shared/minecraft-connection.mjs';

/** Desktop status stays useful when an older/offline community cannot query DNS. */
export function createServerConnection({presets,remote}){
 let pending,cached;
 return {async status({refresh=false}={}){
  if(!refresh&&cached&&Date.now()-cached.at<15000)return cached;
  if(pending)return pending;
  pending=(async()=>{
   let upstream,communityError='';try{upstream=await remote('/api/server-online'+(refresh?'?refresh=1':''));}catch(e){communityError=e.message;}
   const items=await Promise.all(presets().map(async s=>{
    const id=s.id.replace(/^HXZ-/,''),base={id,name:s.name,address:s.address||DEFAULT_STATUS_SERVERS.find(v=>v.id===id)?.address,enabled:s.enabled!==false};
    const known=upstream?.items?.find(item=>item.id===id);
    if(known?.enabled===false||!base.enabled)return {...base,enabled:false,available:false,error:'管理员未启用在线查询'};
    if(known?.available&&Number.isInteger(known.online)&&Date.now()-(known.observed||upstream.at)<45000)return {...base,...known,source:known.source||'community'};
    try{return {...base,...await minecraftStatus(base.address),available:true,source:'desktop-direct'};}
    catch(e){return {...base,available:false,error:e.message,communityError:known?.error||communityError};}
   }));return cached={at:Date.now(),items,communityError,protocol:2};
  })();try{return await pending;}finally{pending=null;}
 }};
}
