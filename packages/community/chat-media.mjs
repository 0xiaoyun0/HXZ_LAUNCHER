export const CHAT_MEDIA_LIMIT=4;
export async function uploadChatFiles(files,request,remaining=4){
  const list=[...files];if(list.length>remaining)throw Error('每条消息最多四张图片');
  const items=[];
  try{for(const file of list){
    if(file.size>8*1024*1024)throw Error(file.name+' 超过 8 MB，请缩小后重试');
    const type=file.type||({gif:'image/gif',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[file.name.split('.').pop().toLowerCase()]);
    if(!['image/png','image/jpeg','image/gif','image/webp'].includes(type))throw Error('支持 PNG、JPEG、GIF 和 WebP 图片');
    const encoded=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('图片读取失败'));reader.onload=()=>resolve(String(reader.result).replace(/^data:[^;]*;/,'data:'+type+';'));reader.readAsDataURL(file);});
    const item=await request('/api/chat-media/upload','POST',{image:encoded});items.push({...item,preview:URL.createObjectURL(file),name:file.name});
  }return items;}catch(error){disposeChatFiles(items);throw error;}
}
export function disposeChatFiles(items){for(const item of items)if(item.preview?.startsWith('blob:'))URL.revokeObjectURL(item.preview);}
export function chatAttachmentUrl(item,base=''){return /^\/api\/chat-media\/[a-f0-9]{64}\/(message\/\d+|saved\/[-\w]{16,80})$/.test(item?.url||'')?base+item.url:'';}
