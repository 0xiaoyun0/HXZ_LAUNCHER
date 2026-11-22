import {remoteJSON} from './io.mjs';
import {getDownloadMode} from './sources.mjs';

import {resolveSearchQuery} from './resource-query.mjs';
export {resolveSearchQuery};
const cache=new Map(),pending=new Map();
async function lookup(query,facets,offset){
 const params=new URLSearchParams({query,facets:JSON.stringify(facets),limit:'20',offset:String(offset)}),key=getDownloadMode()+':'+params;
 const saved=cache.get(key);if(saved&&Date.now()-saved.time<300000)return saved.value;
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{try{const value=await remoteJSON('https://api.modrinth.com/v2/search?'+params,{timeoutMs:20000});
  if(!Array.isArray(value.hits)||!Number.isFinite(value.total_hits))throw Error('资源目录返回了不完整的搜索结果');
  if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,{value,time:Date.now()});return value;
 }finally{pending.delete(key);}})();pending.set(key,task);return task;
}
export async function searchContent(input,facets,offset=0){
 const original=String(input||'').normalize('NFKC').trim().slice(0,100),alias=resolveSearchQuery(original);
 let query=alias,first=await lookup(query,facets,0);
 // Keep pagination on one result set. Unknown names still reach the original
 // catalogue verbatim, and an alias with no compatible results can fall back.
 if(!first.total_hits&&alias!==original){query=original;first=await lookup(query,facets,0);}
 const page=Math.max(0,Math.min(10000,Math.floor(Number(offset)||0)));
 const result=page?await lookup(query,facets,page):first;
 return {...result,search_query:query,original_query:original,search_alias:query!==original?query:''};
}
