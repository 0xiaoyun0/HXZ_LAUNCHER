const LIMIT=256*1024*1024,FILE_LIMIT=64*1024*1024;
const allowed=new Set(['image/png','image/jpeg','image/webp','video/mp4','video/webm']);
export function assetMetadata(input,blob){
 if(!(blob instanceof Blob)||!allowed.has(blob.type)||!blob.size||blob.size>FILE_LIMIT)throw Error('请选择 PNG/JPG/WebP 图片或 MP4/WebM 视频，单个文件不超过 64 MB');
 return {id:input.id||crypto.randomUUID(),name:String(input.name||'未命名素材').trim().slice(0,120)||'未命名素材',album:String(input.album||'未分类').trim().slice(0,60)||'未分类',tags:[...new Set((input.tags||[]).map(v=>String(v).trim().slice(0,30)).filter(Boolean))].slice(0,12),favorite:!!input.favorite,type:blob.type,size:blob.size,created:input.created||Date.now(),updated:Date.now(),width:Math.max(0,Number(input.width)||0),height:Math.max(0,Number(input.height)||0),duration:Math.max(0,Number(input.duration)||0),thumbnail:typeof input.thumbnail==='string'&&input.thumbnail.length<100000&&input.thumbnail.startsWith('data:image/')?input.thumbnail:''};
}
export function assetStore(scope){
 let opening;const prefix=String(scope).slice(0,1000)+'|';
 async function db(){if(!opening)opening=new Promise((resolve,reject)=>{const r=indexedDB.open('hxz-creation-library',1);r.onupgradeneeded=()=>{r.result.createObjectStore('meta');r.result.createObjectStore('blobs');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(Error('无法打开素材库，请检查可用空间'));};});return opening;}
 async function transaction(mode,fn){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(['meta','blobs'],mode);let result;try{fn(tx,value=>result=value);}catch(error){tx.abort();reject(error);return;}tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('素材保存失败，原素材仍然保留'));});}
 const list=()=>transaction('readonly',(tx,done)=>{const r=tx.objectStore('meta').getAll(IDBKeyRange.bound(prefix,prefix+'\uffff'));r.onsuccess=()=>done(r.result.sort((a,b)=>b.updated-a.updated));});
 return {list,async get(id){return transaction('readonly',(tx,done)=>{const r=tx.objectStore('blobs').get(prefix+id);r.onsuccess=()=>done(r.result);});},
  async save(input,blob){const meta=assetMetadata(input,blob);return transaction('readwrite',(tx,done)=>{const store=tx.objectStore('meta'),r=store.getAll(IDBKeyRange.bound(prefix,prefix+'\uffff'));r.onsuccess=()=>{const other=r.result.filter(v=>v.id!==meta.id);if(other.length>=300||other.reduce((n,v)=>n+v.size,blob.size)>LIMIT){tx.abort();return;}store.put(meta,prefix+meta.id);tx.objectStore('blobs').put(blob,prefix+meta.id);done(meta);};});},
  async update(id,input){return transaction('readwrite',(tx,done)=>{const store=tx.objectStore('meta'),r=store.get(prefix+id);r.onsuccess=()=>{if(!r.result){tx.abort();return;}const value={...r.result,...assetMetadata({...r.result,...input,id},new Blob(['x'],{type:r.result.type})),size:r.result.size};store.put(value,prefix+id);done(value);};});},
  async remove(id){return transaction('readwrite',tx=>{tx.objectStore('meta').delete(prefix+id);tx.objectStore('blobs').delete(prefix+id);});},
  async close(){if(opening){(await opening).close();opening=null;}}
 };
}
