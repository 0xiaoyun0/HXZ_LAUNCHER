const origin='http://uptime.hxzmc.top';
export const monitorSource=origin+'/status/hxz';
let cache=null, pending=null;
async function read(endpoint){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(origin+endpoint,{signal:controller.signal});
    if(!response.ok)throw Error('监控接口 HTTP '+response.status);
    const reader=response.body.getReader(),chunks=[];let length=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2*1024*1024)throw Error('监控响应过大');chunks.push(value);}}
    finally{await reader.cancel().catch(()=>{});}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }finally{clearTimeout(timer);}
}
export async function monitorStatus(){
  if(cache&&Date.now()-cache.fetchedAt<30000)return cache;
  if(pending)return pending;
  pending=(async()=>{
    try{
      const [config,beats]=await Promise.all([read('/api/status-page/hxz'),read('/api/status-page/heartbeat/hxz')]);
      if(!Array.isArray(config.publicGroupList)||!beats.heartbeatList)throw Error('监控数据格式不完整');
      const groups=config.publicGroupList.slice(0,30).map(group=>({name:String(group.name||''),monitors:(group.monitorList||[]).slice(0,100).map(m=>{
        const latest=(beats.heartbeatList[m.id]||[]).reduce((a,b)=>!a||String(b.time)>String(a.time)?b:a,null);
        return {id:m.id,name:String(m.name||''),status:latest?.status??-1,time:latest?.time??null,ping:latest?.ping??null,uptime24:beats.uptimeList?.[m.id+'_24']??null};
      })}));
      cache={source:monitorSource,fetchedAt:Date.now(),groups,error:''};return cache;
    }catch(error){return {...(cache||{source:monitorSource,fetchedAt:0,groups:[]}),error:error.name==='AbortError'?'监控请求超时':error.message};}
  })().finally(()=>{pending=null;});
  return pending;
}
