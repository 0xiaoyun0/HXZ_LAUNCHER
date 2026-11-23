const MAX_ITEMS=200,MAX_BYTES=16*1024*1024;
export function knowledgePackage(value){
 if(value?.format!=='hxz-knowledge-1'||!Array.isArray(value.items)||value.items.length>MAX_ITEMS)throw Error('知识库离线包格式无效');
 const ids=new Set(),items=value.items.map(row=>{
  if(!row||typeof row.id!=='string'||row.id.length>100||ids.has(row.id)||typeof row.title!=='string'||typeof row.body!=='string'||row.body.length>30000)throw Error('知识库离线包内容无效');ids.add(row.id);
  let data=row.data;try{if(typeof data==='string')data=JSON.parse(data);}catch{throw Error('知识库版本信息无效');}
  return {id:row.id,title:row.title.slice(0,120),summary:String(row.summary||'').slice(0,300),body:row.body,revision:Math.max(1,Number(row.revision)||1),updated:Number(row.updated)||0,data:{server:['survival','mod-1','mod-2'].includes(data?.server)?data.server:'',version:String(data?.version||'').slice(0,200)}};
 });
 const result={format:'hxz-knowledge-1',generated:Number(value.generated)||Date.now(),total:Math.max(items.length,Number(value.total)||items.length),items};
 if(new TextEncoder().encode(JSON.stringify(result)).byteLength>MAX_BYTES)throw Error('离线正文超过 16 MB，请按服务器分别保存');return result;
}
export function createKnowledgeCache(scope){
 const key=String(scope).slice(0,1000);let opening;
 async function db(){
  if(!globalThis.indexedDB)throw Error('此设备无法保存离线知识库');
  if(!opening)opening=new Promise((resolve,reject)=>{const request=indexedDB.open('hxz-knowledge',1);request.onupgradeneeded=()=>request.result.createObjectStore('packages');request.onsuccess=()=>resolve(request.result);request.onerror=()=>{opening=null;reject(Error('无法打开离线知识库'));};});return opening;
 }
 async function access(mode,fn){const database=await db();return new Promise((resolve,reject)=>{const transaction=database.transaction('packages',mode),request=fn(transaction.objectStore('packages'));transaction.oncomplete=()=>resolve(request.result);transaction.onerror=transaction.onabort=()=>reject(Error('离线资料保存失败，请检查设备剩余空间'));});}
 return {
  async load(server=''){const value=await access('readonly',store=>store.get(key+'|'+server));return value?knowledgePackage(value):null;},
  async save(server,value){const clean=knowledgePackage(value);await access('readwrite',store=>store.put(clean,key+'|'+server));return clean;},
  async remove(server=''){await access('readwrite',store=>store.delete(key+'|'+server));},
  async close(){if(opening){const database=await opening;database.close();opening=null;}}
 };
}
