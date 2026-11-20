import {activeDesign} from './desktop-themes.mjs';

export const ILLUSTRATIONS = [
  {id:'town',name:'暮色小镇',file:'hero.webp'},
  {id:'observatory',name:'星海遗迹',file:'adventure.webp'}
];
export const WALLPAPER_DEFAULTS = {wallpaperMode:'plain',wallpaperImageSource:'file',backgroundImage:'',backgroundVideo:'',
  backgroundColor:'',backgroundOpacity:.77,backgroundPositionX:50,backgroundPositionY:50,backgroundFit:'cover'};
const modes=['plain','image','video'];
const imageSources=['file',...ILLUSTRATIONS.map(item=>item.id)];

// Derive the old active wallpaper once. Existing files, including inactive choices, stay in the player's settings.
export function wallpaperPreferences(settings){
  if(modes.includes(settings.wallpaperMode))return {wallpaperMode:settings.wallpaperMode,
    wallpaperImageSource:imageSources.includes(settings.wallpaperImageSource)?settings.wallpaperImageSource:'file'};
  const scene=settings.desktopBackdrop==='scene'&&activeDesign(settings).scene;
  const illustration=ILLUSTRATIONS.find(item=>item.file===scene);
  return {wallpaperMode:settings.backgroundVideo?'video':settings.backgroundImage||illustration?'image':'plain',
    wallpaperImageSource:settings.backgroundImage||!illustration?'file':illustration.id};
}
export function wallpaperPatch(settings,input){
  let {wallpaperMode,wallpaperImageSource}=wallpaperPreferences(settings);
  if(input.wallpaperMode!=null){
    if(!modes.includes(input.wallpaperMode))throw Error('壁纸类型无效');
    wallpaperMode=input.wallpaperMode;
  }else if(input.backgroundVideo||input.backgroundImage!=null||input.backgroundVideo!=null||input.desktopBackdrop!=null){
    const inferred=wallpaperPreferences({...settings,...input,wallpaperMode:undefined});
    wallpaperMode=inferred.wallpaperMode;wallpaperImageSource=inferred.wallpaperImageSource;
  }
  if(input.wallpaperImageSource!=null){
    if(!imageSources.includes(input.wallpaperImageSource))throw Error('静态壁纸来源无效');
    wallpaperImageSource=input.wallpaperImageSource;
  }
  return {wallpaperMode,wallpaperImageSource};
}
export function wallpaperSource(settings){
  const {wallpaperMode,wallpaperImageSource}=wallpaperPreferences(settings);
  if(wallpaperMode==='plain')return null;
  const video=wallpaperMode==='video';
  if(!video&&wallpaperImageSource!=='file'){
    const artwork=ILLUSTRATIONS.find(item=>item.id===wallpaperImageSource);
    return artwork?{url:'./media/'+artwork.file,video:false}:null;
  }
  const raw=video?settings.backgroundVideo:settings.backgroundImage;
  if(typeof raw!=='string'||!raw)return null;
  if(!video&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(raw))return {url:raw,video:false};
  const file=/^(?:hxz-media:\/\/local|http:\/\/hxz-media\.localhost)\/([a-f0-9-]{36}\.(?:png|jpe?g|webp|mp4|webm))$/.exec(raw);
  return file&&video===/\.(mp4|webm)$/.test(file[1])?{url:'http://hxz-media.localhost/'+file[1],video}:null;
}
