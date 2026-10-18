export async function exportAsset(invoke,blob,name){
 const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/webm':'webm','video/mp4':'mp4'}[blob.type];if(!extension||blob.size>64*1024*1024)throw Error('无法导出此素材');
 const filename=String(name).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100).replace(/\.(png|jpe?g|webp|webm|mp4)$/i,'')+'.'+extension;
 const task=await invoke({action:'begin',name:filename,mime:blob.type,size:blob.size});if(!task?.id)return;let finished=false;
 try{let index=0;for(let start=0;start<blob.size;start+=192*1024){const bytes=new Uint8Array(await blob.slice(start,start+192*1024).arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));await invoke({action:'chunk',id:task.id,index:index++,data:btoa(raw)});}await invoke({action:'finish',id:task.id});finished=true;}finally{if(!finished)await invoke({action:'abort',id:task.id}).catch(()=>{});}
}
