import {normalizeCardLayouts,normalizeCardStyle} from './card-layout.mjs';
import {normalizeCardPlacements,normalizeWidgets} from './card-extras.mjs';

export const LAYOUT_LIMIT=1024*1024;
const size=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value,null,2)).byteLength;
const copy=value=>JSON.parse(JSON.stringify(value));
const columns=value=>Object.fromEntries(['sidebar','workspace','dock'].map(key=>[key,{
 color:/^#[a-f0-9]{6}$/i.test(value?.[key]?.color)?value[key].color:'',
 opacity:Number.isFinite(value?.[key]?.opacity)?Math.max(.2,Math.min(1,value[key].opacity)):1
}]));
export function readLayoutPackage(raw){
 if(size(raw)>LAYOUT_LIMIT)throw Error('布局文件超过 1 MB，请减少通用卡片内容');
 let value;try{value=typeof raw==='string'?JSON.parse(raw):raw;}catch{throw Error('布局文件不是有效的 JSON');}
 if(!value||value.format!=='hxz-card-layout'||value.version!==1||!value.layout||typeof value.layout!=='object')throw Error('不是受支持的幻想镇卡片布局');
 const source=value.layout;
 const layout={cardLayouts:normalizeCardLayouts(source.cardLayouts),cardPlacements:normalizeCardPlacements(source.cardPlacements),widgets:normalizeWidgets(source.widgets)};
 if(value.appearance===true){layout.cardStyle=normalizeCardStyle(source.cardStyle);layout.columns=columns(source.columns);}
 const counts={pages:Object.keys(layout.cardLayouts).length,moved:Object.keys(layout.cardPlacements).length,widgets:layout.widgets.length,notes:layout.widgets.filter(v=>v.type==='note'&&v.text).length};
 return {format:'hxz-card-layout',version:1,name:typeof value.name==='string'?value.name.slice(0,80):'卡片布局',appearance:value.appearance===true,layout,counts};
}
export function exportLayoutPackage(settings,{name='我的卡片布局',includeNotes=false,appearance=true}={}){
 const widgets=normalizeWidgets(settings.widgets).map(v=>({...v,text:v.type==='note'&&!includeNotes?'':v.text,...v.type==='extension'?{checked:[]}:{}}));
 return readLayoutPackage({format:'hxz-card-layout',version:1,name,appearance,layout:{cardLayouts:settings.cardLayouts,cardPlacements:settings.cardPlacements,widgets,cardStyle:settings.cardStyle,columns:settings.columns}});
}
export function applyLayoutPackage(settings,raw,mode='replace'){
 if(!['replace','merge'].includes(mode))throw Error('请选择导入方式');
 const value=readLayoutPackage(raw),incoming=value.layout;
 const patch=copy(incoming);
 if(mode==='merge'){
  const widgets=new Map(normalizeWidgets(settings.widgets).map(v=>[v.id,v]));for(const widget of incoming.widgets)widgets.set(widget.id,widget);
  if(widgets.size>36)throw Error('合并后超过 36 张通用卡片，请先移除部分卡片或选择替换');
  patch.widgets=[...widgets.values()];patch.cardLayouts={...normalizeCardLayouts(settings.cardLayouts),...incoming.cardLayouts};
  patch.cardPlacements={...normalizeCardPlacements(settings.cardPlacements),...incoming.cardPlacements};
  if(Object.keys(patch.cardLayouts).length>80||Object.keys(patch.cardPlacements).length>96)throw Error('合并后的布局过大，请先整理或选择替换');
 }
 if(incoming.columns)patch.columns=Object.fromEntries(['sidebar','workspace','dock'].map(key=>[key,{...settings.columns?.[key],...incoming.columns[key]}]));
 return patch;
}
