import {useEffect,useState} from 'react';

export const cardNames={servers:'社区服务器',notices:'服务器公告',topics:'近期讨论'} as const;
export type CardId=keyof typeof cardNames;
export type Slot='background'|'cover';
export type Source='plain'|'scene'|'custom';
export type Visual={kind:'image'|'video';blob:Blob;poster?:Blob};
export type TownLayout={background:Source;cover:Source;backgroundFocus:number;coverFocus:number;shade:number;order:CardId[];hidden:CardId[]};
const allCards=Object.keys(cardNames) as CardId[];
const defaults:TownLayout={background:'plain',cover:'plain',backgroundFocus:50,coverFocus:50,shade:60,order:allCards,hidden:[]};
type LayoutState={layout:TownLayout;media:Partial<Record<Slot,Visual>>};

function layoutFrom(value:Partial<TownLayout>|undefined):TownLayout{
  const cards=(items:unknown)=>Array.isArray(items)?items.filter((item):item is CardId=>allCards.includes(item)):[];
  const percent=(v:unknown,base:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(100,v)):base;
  return {...defaults,...value,background:value?.background==='custom'?'custom':'plain',cover:value?.cover==='custom'||value?.cover==='scene'?value.cover:'plain',
    backgroundFocus:percent(value?.backgroundFocus,50),coverFocus:percent(value?.coverFocus,50),shade:percent(value?.shade,60),
    order:[...new Set([...cards(value?.order),...allCards])],hidden:[...new Set(cards(value?.hidden))]};
}

let database:Promise<IDBDatabase>|undefined;
function openDatabase(){
  if(!database)database=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open('fantasy-town-appearance',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('appearance');
    request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=undefined;};resolve(db);};
    request.onerror=()=>reject(request.error);
  }).catch(error=>{database=undefined;throw error;});
  return database;
}

async function readLayout():Promise<LayoutState>{
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('appearance'),store=tx.objectStore('appearance');
    const profile=store.get('layout'),background=store.get('background'),cover=store.get('cover');
    tx.oncomplete=()=>resolve({layout:layoutFrom(profile.result),media:{background:background.result,cover:cover.result}});
    tx.onabort=()=>reject(tx.error);
  });
}

type AssetChange={slot:Slot;value:Visual|null};
type Change=(layout:TownLayout)=>TownLayout;
async function writeLayout(change:Change,asset?:AssetChange):Promise<TownLayout>{
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('appearance','readwrite'),store=tx.objectStore('appearance'),previous=store.get('layout');
    let next:TownLayout;
    previous.onsuccess=()=>{
      next=layoutFrom(change(layoutFrom(previous.result)));
      store.put(next,'layout');
      if(asset){if(asset.value)store.put(asset.value,asset.slot);else store.delete(asset.slot);}
    };
    tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(tx.error);
  });
}

export function useTownPersonalization(){
  const [state,setState]=useState<LayoutState>({layout:defaults,media:{}}),[ready,setReady]=useState(false);
  useEffect(()=>{let live=true;readLayout().then(value=>{if(live)setState(value);})
    .catch(()=>{}).finally(()=>{if(live)setReady(true);});return ()=>{live=false;};},[]);
  const save=async(change:Change,asset?:AssetChange)=>{
    try{
      const layout=await writeLayout(change,asset);
      setState(prev=>({layout,media:asset?{...prev.media,[asset.slot]:asset.value??undefined}:prev.media}));
    }catch(error){throw new Error(error instanceof DOMException&&error.name==='QuotaExceededError'?'手机可用存储空间不足。请换一个较小的文件后重试。':'暂时无法保存外观，请重试。');}
  };
  return {...state,ready,save};
}
export type Personalization=ReturnType<typeof useTownPersonalization>;

export function useLocalMedia(blob:Blob|undefined){
  const [asset,setAsset]=useState<{blob:Blob;url:string}>();
  useEffect(()=>{
    if(!blob){setAsset(undefined);return;}
    const url=URL.createObjectURL(blob);setAsset({blob,url});return ()=>URL.revokeObjectURL(url);
  },[blob]);
  return asset?.blob===blob?asset?.url:undefined;
}

async function picture(source:CanvasImageSource,width:number,height:number,maxEdge:number){
  if(!width||!height)throw Error('未能读取画面，请选择其他文件。');
  const scale=Math.min(1,maxEdge/Math.max(width,height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const fromVideo=source instanceof HTMLVideoElement;
  const context=canvas.getContext('2d',{willReadFrequently:fromVideo});if(!context)throw Error('当前 WebView 无法读取图片。');
  context.drawImage(source,0,0,canvas.width,canvas.height);
  if(fromVideo){
    // Some Android decoders report loadeddata before a frame has reached the canvas.
    const sample=document.createElement('canvas');sample.width=12;sample.height=12;
    const read=sample.getContext('2d',{willReadFrequently:true});
    if(!read)throw Error('当前 WebView 无法读取视频画面。');
    read.drawImage(canvas,0,0,12,12);
    if(!read.getImageData(0,0,12,12).data.some((value,index)=>index%4===3&&value>0))throw Error('未能读取视频的静态画面，请尝试其他视频。');
  }
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('图片无法保存。')),'image/webp',.9));
}

async function videoPoster(video:HTMLVideoElement){
  const capture=()=>picture(video,video.videoWidth,video.videoHeight,1440);
  if(Number.isFinite(video.duration)&&video.duration>.02){
    await new Promise<void>(resolve=>{
      const done=()=>{clearTimeout(timer);video.removeEventListener('seeked',done);resolve();};
      const timer=setTimeout(done,1800);video.addEventListener('seeked',done);
      video.currentTime=Math.min(.2,video.duration/3);
    });
  }
  try{return await capture();}catch{
    // Let the compositor present the next decoded frame before extracting the still.
    await video.play().catch(()=>{});
    await new Promise(resolve=>setTimeout(resolve,180));
    return capture();
  }
}

export async function importVisual(file:File,kind:'image'|'video'):Promise<Visual>{
  const url=URL.createObjectURL(file);
  try{
    if(kind==='image'){
      if(file.type==='image/svg+xml')throw Error('请使用照片或 PNG、JPEG、WebP 等位图。');
      const image=new Image();image.src=url;
      try{await image.decode();}catch{throw Error('这张图片读不出来，请选择手机可打开的照片。');}
      return {kind,blob:await picture(image,image.naturalWidth,image.naturalHeight,2160)};
    }
    const video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
    try{
      await new Promise<void>((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(Error('视频首帧读取超时，请选择其他视频。')),18000);
        video.onloadeddata=()=>{clearTimeout(timeout);resolve();};
        video.onerror=()=>{clearTimeout(timeout);reject(Error('手机无法播放这个视频，请更换 MP4 或 WebM 文件。'));};video.src=url;
      });
      const poster=await videoPoster(video);
      return {kind,blob:file.slice(0,file.size,file.type||'video/mp4'),poster};
    }finally{video.onloadeddata=null;video.onerror=null;video.removeAttribute('src');video.load();}
  }finally{URL.revokeObjectURL(url);}
}
