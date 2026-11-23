import {el,beijing} from './dom.mjs';
import {assetStore} from './asset-store.mjs';
import {decodeAsset,imageEditor} from './image-editor.mjs';
import {clipEditor} from './clip-editor.mjs';
import {communityImage} from '../community/image-upload.mjs';

export function assetLibrary(ctx,publish){
 const store=assetStore((ctx.server||'community')+'|'+ctx.uid),{surface}=ctx,{button,dialog,field,select,row}=surface,cleanups=new Set();let closing=false;
 function track(cleanup){cleanups.add(cleanup);cleanup.node?.addEventListener('close',()=>cleanups.delete(cleanup),{once:true});if(closing){cleanup();cleanups.delete(cleanup);}}
 async function save(blob,input){
  const meta={...input};if(blob.type.startsWith('image/')){const image=await decodeAsset(blob);try{meta.width=image.width;meta.height=image.height;const canvas=el('canvas'),scale=Math.min(1,360/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);meta.thumbnail=canvas.toDataURL('image/webp',.7);}finally{image.close();}}
  if(closing)throw Error('素材库已关闭');return store.save(meta,blob);
 }
 async function open(){
  const d=dialog('我的素材库');d.node.classList.add('hub-library-dialog');const tools=el('div','','hub-tools'),search=field(tools,'搜索名称或标签'),type=select(tools,'素材类型',[['all','全部素材'],['image','图片'],['video','视频'],['favorite','收藏']], 'all'),input=field(d.content,'导入图片 / 视频','','file');input.accept='image/png,image/jpeg,image/webp,video/mp4,video/webm';input.multiple=true;
  const status=el('p','','hub-muted'),grid=el('div','','hub-asset-grid'),pager=el('div','','hub-actions');d.content.append(tools,status,grid,pager);let items=[],page=0,ticket=0;
  function draw(){const query=search.value.trim().toLocaleLowerCase(),filtered=items.filter(v=>(v.name+' '+v.album+' '+v.tags.join(' ')).toLocaleLowerCase().includes(query)&&(type.value==='all'||type.value==='favorite'?type.value!=='favorite'||v.favorite:v.type.startsWith(type.value+'/')));page=Math.min(page,Math.max(0,Math.ceil(filtered.length/18)-1));grid.replaceChildren();pager.replaceChildren();status.textContent=items.length+' / 300 份素材 · '+(items.reduce((n,v)=>n+v.size,0)/1048576).toFixed(1)+' / 256 MB · 仅存于本机';
   for(const item of filtered.slice(page*18,page*18+18)){const card=row(item.name),preview=el('button','','hub-asset-preview');preview.type='button';preview.setAttribute('aria-label','打开素材 '+item.name);preview.onclick=()=>void inspect(item).catch(e=>surface.report(e,d.content));if(item.thumbnail){const image=el('img');image.src=item.thumbnail;image.alt='';image.loading='lazy';preview.append(image);}else preview.append(el('span',item.type.startsWith('video/')?'视频片段':'图片'));card.prepend(preview);card.append(el('small',item.album+' · '+(item.size/1048576).toFixed(1)+' MB'),el('small',item.tags.join(' · ')),button(item.favorite?'取消收藏':'收藏',async()=>{await store.update(item.id,{favorite:!item.favorite});await load();}));grid.append(card);}
   if(!filtered.length)surface.empty(grid,'导入截图或短片，整理后可以编辑并投稿到作品展厅。');if(page)pager.append(button('上一页',()=>{page--;draw();}));pager.append(el('small',filtered.length+' 份匹配素材'));if((page+1)*18<filtered.length)pager.append(button('下一页',()=>{page++;draw();}));
  }
  async function load(){const current=++ticket,next=await store.list();if(current!==ticket||!d.node.isConnected)return;items=next;draw();}
  search.oninput=()=>{page=0;draw();};type.onchange=()=>{page=0;draw();};
  input.onchange=async()=>{input.disabled=true;try{for(const file of input.files){if(!d.node.isConnected||closing)break;status.textContent='正在导入 '+file.name;await save(file,{name:file.name});}}catch(e){surface.report(e,d.content);}finally{input.value='';input.disabled=false;if(d.node.isConnected)await load();}};
  async function inspect(item){
   const blob=await store.get(item.id);if(!blob)throw Error('素材已被删除，请刷新');const detail=dialog(item.name),url=URL.createObjectURL(blob),media=el(item.type.startsWith('image/')?'img':'video','','hub-asset-full');media.src=url;if(media.tagName==='VIDEO'){media.controls=true;media.playsInline=true;media.preload='metadata';}else media.alt=item.name;detail.content.append(media);
   const release=()=>{if(media.tagName==='VIDEO'){media.pause();media.removeAttribute('src');media.load();}URL.revokeObjectURL(url);cleanups.delete(release);};cleanups.add(release);detail.node.addEventListener('close',release,{once:true});
   const form=el('div','','hub-form-grid');detail.content.append(form);const name=field(form,'素材名称',item.name),album=field(form,'相册 / 分组',item.album),tags=field(form,'标签 · 用逗号分隔',item.tags.join('，'));detail.content.append(el('small','导入于 '+beijing(item.created),'hub-muted'));
   detail.footer.append(button('保存整理',async()=>{await store.update(item.id,{name:name.value,album:album.value,tags:tags.value.split(/[,，]/)});await load();detail.close();}),button('删除本机副本',()=>surface.confirm('删除素材库中的副本？','不会删除最初导入的外部文件。',async()=>{await store.remove(item.id);detail.close();await load();})));
   const afterSave=async(b,info)=>{await save(b,{...info,album:item.album,tags:item.tags});await load();};
   if(item.type.startsWith('image/')){
    detail.footer.append(button('编辑截图',async()=>track(await imageEditor(ctx,blob,item.name,afterSave))),button('投稿到作品展厅',async()=>{const bitmap=await decodeAsset(blob),canvas=el('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();const file=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));if(!file)throw Error('无法生成投稿图片');const value=await ctx.request('/api/media/upload','POST',{scope:'hub',image:await communityImage(file)});detail.close();d.close();publish('work',{title:item.name,images:[value.url],tags:item.tags,data:{category:'photo'}});},true));
   }else detail.footer.append(button('截取片段',()=>track(clipEditor(ctx,blob,item.name,afterSave))));
   if(ctx.exportAsset)detail.footer.append(button('导出文件',async()=>ctx.exportAsset(blob,item.name)));
  }
  d.onClose(close=>input.disabled?surface.report(Error('正在导入，请等待当前素材保存完成'),d.content):close());await load();
 }
 return {button:()=>button('我的素材 · 整理与编辑',open),close:async()=>{closing=true;for(const fn of cleanups)fn();cleanups.clear();await store.close();}};
}
