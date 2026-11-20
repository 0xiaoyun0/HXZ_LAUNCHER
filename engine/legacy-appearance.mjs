import fs from 'node:fs/promises';
import path from 'node:path';
import {normalizeCardStyle} from '../packages/engine/core/card-layout.mjs';
import {cacheWallpaper,mediaPath,mediaReference} from '../packages/engine/core/media.mjs';
import {readLayoutPackage} from '../packages/engine/core/layout-package.mjs';
import {noLinks} from '../packages/engine/core/io.mjs';

async function readOld(appData){
  if(!appData)return null;
  const dir=path.join(appData,'幻想镇启动器'),file=path.join(dir,'settings.json');
  const info=await fs.lstat(file).catch(()=>null);
  if(!info?.isFile()||info.size>16*1024*1024)return null;
  await noLinks(file);
  let old;
  try{old=JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));}catch{return null;}
  return {old,dir};
}
export async function legacyCardPackage(appData){
  const source=await readOld(appData);if(!source?.old)return null;
  const {cardLayouts,cardPlacements,widgets}=source.old;
  const layout=readLayoutPackage({format:'hxz-card-layout',version:1,name:'本机 0.9.2 卡片布局',appearance:false,layout:{cardLayouts,cardPlacements,widgets}});
  return layout.counts.pages||layout.counts.widgets||layout.counts.moved?layout:null;
}
export async function legacyAppearance(appData,home,service,apply=false,scope='all'){
  if(!['all','surface','wallpaper'].includes(scope))throw Error('请选择要接回的外观项目');
  const copyWallpaper=apply&&scope!=='surface';
  const source=await readOld(appData);if(!source)return {available:false};
  const {old,dir}=source;
  if(!old||typeof old!=='object'||!['theme','cardStyle','backgroundImage','backgroundVideo'].some(k=>Object.hasOwn(old,k)))return {available:false};
  const card=normalizeCardStyle(old.cardStyle);
  const appearance={theme:old.theme==='dark'?'dark':'light',cardStyle:card,desktopBackdrop:'plain',accentColor:/^#[a-f0-9]{6}$/i.test(old.accentColor)?old.accentColor:'#5668bc'};
  for(const key of ['backgroundPositionX','backgroundPositionY','backgroundOpacity'])if(Number.isFinite(old[key]))appearance[key]=old[key];
  if(['cover','contain','100% 100%'].includes(old.backgroundFit))appearance.backgroundFit=old.backgroundFit;
  if(/^#[a-f0-9]{6}$/i.test(old.backgroundColor))appearance.backgroundColor=old.backgroundColor;
  const ref=old.backgroundVideo||old.backgroundImage;
  let kind='无壁纸',missing=Boolean(ref);
  if(mediaReference(ref)&&/\.(png|jpe?g|webp|mp4|webm)$/i.test(ref)){
    const source=mediaPath(dir,ref),ext=path.extname(source).slice(1),video=['mp4','webm'].includes(ext);
    const stat=await fs.lstat(source).catch(()=>null);
    if(stat?.isFile()&&stat.size>0&&stat.size<=(video?50:8)*1024*1024){
      await noLinks(source);kind=video?'动态壁纸':'图片壁纸';missing=false;
      if(copyWallpaper)appearance[video?'backgroundVideo':'backgroundImage']=await cacheWallpaper(home,await fs.readFile(source),ext);
    }
  }else if(typeof ref==='string'&&ref.length<=12*1024*1024){
    const match=/^data:image\/(png|jpeg|webp);base64,([a-z0-9+/=]+)$/i.exec(ref);
    if(match){kind='图片壁纸';missing=false;if(copyWallpaper)appearance.backgroundImage=await cacheWallpaper(home,Buffer.from(match[2],'base64'),match[1]);}
  }
  const preview={available:true,kind,missing,radius:card.radius,opacity:Math.round(card.opacity*100)};
  if(apply){
    const {theme,accentColor,cardStyle,desktopBackdrop,...background}=appearance;
    const patch=scope==='wallpaper'?{}:{themeChange:{op:'legacy',appearance:{theme,accentColor,cardStyle}}};
    if(copyWallpaper&&!missing)Object.assign(patch,background,{wallpaperMode:background.backgroundVideo?'video':background.backgroundImage?'image':'plain',wallpaperImageSource:'file'});
    if(Object.keys(patch).length)await service.invoke('settings.save',patch);
  }
  return preview;
}
