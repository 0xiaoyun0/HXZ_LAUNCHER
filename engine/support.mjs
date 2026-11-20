import {remoteJSON} from '../packages/engine/core/io.mjs';

export async function supportRequest(session,input) {
  const method=input.method||'GET';
  const url=new URL(input.path,'https://support.invalid');
  const match=/^\/api\/feedback(?:\/([\w-]{16,80}))?$/.exec(url.pathname);
  if(url.origin!=='https://support.invalid'||!match||!['GET','POST'].includes(method))throw Error('不支持的工单操作');
  const params=new URLSearchParams();
  let body;
  if(method==='GET'&&!match[1]){
    params.set('scope','mine');
    for(const key of ['status','q','offset'])if(url.searchParams.has(key))params.set(key,url.searchParams.get(key));
  }else if(method==='POST'){
    const keys=match[1]?['body','updated']:['category','title','body','report','requestId','version','platform'];
    body=Object.fromEntries(keys.filter(key=>Object.hasOwn(input.body||{},key)).map(key=>[key,input.body[key]]));
    if(match[1]&&input.body?.action==='reopen')body.action='reopen';
  }
  const auth=await session();
  const response=await remoteJSON(auth.base+url.pathname+(params.size?'?'+params:''),{
    method,headers:{Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(20000),redirect:'error'
  });
  if(Object.hasOwn(response,'manager'))response.manager=false;
  return response;
}
