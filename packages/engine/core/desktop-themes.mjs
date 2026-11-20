import {normalizeCardStyle} from './card-layout.mjs';

export const DESKTOP_THEMES = [
  {id:'town',name:'小镇微光',caption:'暮色城镇 · 轻雾窗格',scene:'hero.webp',theme:'light',accent:'#5769b7',radius:20,opacity:.70,strength:.77},
  {id:'observatory',name:'星海观测站',caption:'深蓝星图 · 青绿微光',scene:'adventure.webp',theme:'dark',accent:'#64c8b4',radius:14,opacity:.78,strength:.82},
  {id:'paper',name:'纸上工坊',caption:'暖白纸色 · 实底细线',scene:'',theme:'light',accent:'#9a532e',radius:8,opacity:1,strength:.65},
];
export const DEFAULT_DESKTOP_THEME=DESKTOP_THEMES[0];
const preset=id=>DESKTOP_THEMES.find(item=>item.id===id);
const custom=id=>typeof id==='string'&&/^custom-[a-f0-9-]{36}$/.test(id);
const legacyId='legacy-092';
export function themeBook(settings){
  const book=settings.desktopThemes;
  const entries=Array.isArray(book?.entries)?book.entries.filter(entry=>entry&&preset(entry.base)&&(preset(entry.id)||custom(entry.id)||entry.id===legacyId)):[];
  const requested=book?.active;
  const active=preset(requested)||entries.some(entry=>entry.id===requested)?requested:DEFAULT_DESKTOP_THEME.id;
  return {...book,active,entries};
}
export function activeDesign(settings){
  const book=themeBook(settings);
  return preset(book.entries.find(entry=>entry.id===book.active)?.base)||preset(book.active)||DEFAULT_DESKTOP_THEME;
}
export function presetAppearance(base=DEFAULT_DESKTOP_THEME){
  return {theme:base.theme,accentColor:base.accent,cardStyle:{color:'',opacity:base.opacity,radius:base.radius},
    desktopBackdrop:base.scene?'scene':'plain',backgroundColor:'',backgroundImage:'',backgroundVideo:'',
    backgroundOpacity:base.strength,backgroundPositionX:50,backgroundPositionY:50,backgroundFit:'cover'};
}
export function captureAppearance(settings){
  const base=presetAppearance(activeDesign(settings)),card=normalizeCardStyle(settings.cardStyle||base.cardStyle);
  const result={...base,cardStyle:{color:card.color,opacity:card.opacity,radius:card.radius}};
  for(const key of Object.keys(base))if(key!=='cardStyle'&&settings[key]!=null)result[key]=settings[key];
  return result;
}

// The active appearance remains in the original settings fields. Save it before switching,
// so edits and legacy clients can use the same settings without a second active copy.
export function changeDesktopTheme(settings,command){
  const book=themeBook(settings),base=activeDesign(settings),current=book.entries.find(entry=>entry.id===book.active);
  const entries=new Map(book.entries.map(entry=>[entry.id,entry]));
  const previous={...current,id:book.active,base:base.id,name:current?.name||base.name,appearance:{...current?.appearance,...captureAppearance(settings)}};
  entries.set(previous.id,previous);
  let id=previous.id;
  switch(command?.op){
    case 'select': id=command.id;break;
    case 'copy': {
      const name=String(command.name||'').trim();
      if(!name||name.length>32)throw Error('方案名称需要 1 至 32 个字符');
      if([...entries.values(),...DESKTOP_THEMES].some(item=>item.name===name))throw Error('已有同名外观方案，请换个名字');
      id='custom-'+crypto.randomUUID();entries.set(id,{id,base:base.id,name,appearance:previous.appearance});break;
    }
    case 'delete':
      if(!custom(id)&&id!==legacyId)throw Error('内置风格可以恢复默认外观');
      entries.delete(id);id=base.id;break;
    case 'reset': entries.set(id,{...previous,appearance:presetAppearance(base)});break;
    case 'legacy': {
      id=legacyId;
      entries.set(id,{id,base:'town',name:'我的 0.9.2',appearance:captureAppearance(command.appearance||{})});
      break;
    }
    default:throw Error('无法识别这个外观操作');
  }
  const entry=entries.get(id),design=preset(entry?.base)||preset(id);
  if(!design)throw Error('这个外观方案已不存在');
  const look=captureAppearance({...presetAppearance(design),...entry?.appearance,desktopThemes:{active:design.id,entries:[]}});
  const raw=settings.desktopThemes?.entries;
  const unknown=Array.isArray(raw)?raw.filter(item=>!book.entries.includes(item)):[];
  return {...look,cardStyle:{...settings.cardStyle,...look.cardStyle},desktopThemes:{...book,active:id,entries:[...entries.values(),...unknown]}};
}

export function wallpaperSource(settings){
  const raw=settings.backgroundVideo||settings.backgroundImage;
  if(typeof raw!=='string'||!raw)return null;
  if(/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(raw))return {url:raw,video:false};
  const file=/^(?:hxz-media:\/\/local|http:\/\/hxz-media\.localhost)\/([a-f0-9-]{36}\.(?:png|jpe?g|webp|mp4|webm))$/.exec(raw);
  return file?{url:'http://hxz-media.localhost/'+file[1],video:/\.(mp4|webm)$/.test(file[1])}:null;
}
