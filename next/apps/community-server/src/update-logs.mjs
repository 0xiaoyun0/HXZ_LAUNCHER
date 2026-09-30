export const UPDATE_GROUPS = ['survival','mod-1','mod-2'];
export function normalizeSources(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k=>!UPDATE_GROUPS.includes(k))) throw Error('更新日志分组无效');
  const result={}, seen=new Set();
  for(const id of UPDATE_GROUPS) {
    const raw=input[id] || '';
    if(typeof raw!=='string'||raw.length>2000)throw Error('更新日志地址无效');
    if(!raw.trim()){result[id]='';continue;}
    const url=new URL(raw.trim());
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||/\/(?:version|changelog)\.json\/?$/.test(url.pathname))throw Error('请填写 HXZ UP 客户端根地址，不能填写 JSON 文件或带查询参数的地址');
    const base=url.href.replace(/\/+$/,'');
    if(seen.has(base))throw Error('三个服不能绑定相同的 HXZ UP 地址，请使用各自整合包的接入路径');
    seen.add(base);result[id]=base;
  }
  return result;
}
export function createUpdateLogs(getSources) {
  const cache=new Map();
  async function json(url) {
    const r=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:'error'});
    if(!r.ok)throw Error('更新服务返回 HTTP '+r.status);
    let size=0;const chunks=[];
    for await(const chunk of r.body){if((size+=chunk.length)>2*1024*1024)throw Error('更新日志响应过大');chunks.push(chunk);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  async function read(groupId,source) {
    const base={groupId,source,entries:[],checkedAt:Date.now()};
    if(!source)return {...base,status:'unconfigured'};
    try {
      const before=await json(source+'/version.json');
      if(before.maintenance)return {...base,status:'maintenance'};
      if(typeof before.version!=='string'||!before.version||before.version.length>200)throw Error('更新服务缺少有效版本标识');
      const logs=await json(source+'/changelog.json?version='+encodeURIComponent(before.version));
      const after=await json(source+'/version.json');
      if(after.maintenance)return {...base,status:'maintenance'};
      if(after.version!==before.version)throw Error('服务正在发布新版本，请稍后刷新');
      if(!Array.isArray(logs.history)||logs.history.length>10000)throw Error('更新日志格式无效');
      const entries=logs.history.slice(0,100).map((e,i)=>{
        if(!e||typeof e.version!=='string'||typeof e.content!=='string'||typeof e.date!=='string')throw Error('更新日志条目无效');
        return {id:groupId+':'+i+':'+e.version.slice(0,100),version:e.version.slice(0,100),date:e.date.slice(0,100),content:e.content.slice(0,12000)};
      });
      return {...base,status:'ready',publishedVersion:before.version,currentVersion:String(logs.currentVersion||'').slice(0,100),entries};
    }catch(error){return {...base,status:'error',error:error.message};}
  }
  return async()=>Promise.all(UPDATE_GROUPS.map(async groupId=>{
    const source=getSources()[groupId]||'', key=groupId+'\n'+source, now=Date.now();
    let entry=cache.get(groupId);
    if(!entry||entry.key!==key||entry.expires<now){entry={key,expires:now+30000,promise:read(groupId,source)};cache.set(groupId,entry);}
    return entry.promise;
  }));
}
