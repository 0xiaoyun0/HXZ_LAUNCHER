import {el} from './dom.mjs';
import {bilibiliPlayer} from '../../server/shared/bilibili.mjs';

export function bilibiliStage(parent,{title,source,onError}){
 let frame=null,last='',ended=false;
 const box=el('div','','hub-bilibili-stage');parent.append(box);
 function pause(){frame?.remove();frame=null;last='';box.replaceChildren(el('p','共同放映已暂停','hub-muted'));}
 function sync({position,playing,enabled,stamp,force=false}){
  if(ended)return;if(!playing||!enabled||document.hidden){pause();return;}
  const key=source+'|'+stamp;if(frame&&last===key&&!force)return;last=key;frame?.remove();
  const loading=el('p','正在载入 B站播放器…','hub-bilibili-loading');frame=el('iframe');frame.title=title+' · B站播放器';frame.src=bilibiliPlayer(source,position,true);frame.setAttribute('allow','autoplay; fullscreen; picture-in-picture');frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('allowfullscreen','');frame.onload=()=>loading.remove();frame.onerror=()=>{loading.textContent='B站播放器未能载入';onError?.('B站播放器未能载入，可以点击重新同步或打开原站。');};box.replaceChildren(loading,frame);
 }
 return {sync,pause,close:()=>{ended=true;frame?.remove();frame=null;box.remove();}};
}
