import {normalizeWorkflow} from './card-workflow.mjs';
import {cardExtension} from './card-extension.mjs';
// Portable cards store only references and small user-owned preferences, never page state.
export const CARD_PAGES = [
 ['home','/','启动游戏'],['music','/music','音乐'],['chat','/community','文字大厅'],
 ['voice','/community/voice','语音房间'],['account','/account','账号与积分'],
 ['guild','/guild','冒险家协会'],['games','/arcade','小游戏'],
 ['ranking','/arcade/ranking','积分榜'],['inbox','/community/inbox','收件箱'],
 ['multiplayer','/multiplayer','联机大厅'],['install','/workshop/install','下载与安装']
];
export const WIDGET_TYPES = ['note','clock','calendar','search','assistant','workflow','extension'];
// Move preferences as a unit; the destination grid still enforces measured content minima.
export function placeTransferredCard(layouts,card,target,current,drop){
 const result={...layouts},sourceId=card.widget?'widget.'+card.card:current===card.source?card.card:'moved.'+card.source+'.'+card.card;
 const targetId=card.widget?'widget.'+card.card:target===card.source?card.card:'moved.'+card.source+'.'+card.card;
 for(const mode of ['wide','compact']){
  const from=layouts?.[current+'.'+mode],key=target+'.'+mode,original=layouts?.[key],existing=original?.items?.find(v=>v.i===targetId);
  const before=from?.items?.find(v=>v.i===sourceId),w=Math.max(card.minW||3,Math.min(12,before?.w||card.w||6));
  // Returning a card restores the original slot. A pointer drop explicitly chooses a new one.
  const point=drop?.mode===mode?drop:null;
  const item=existing&&!point?existing:{i:targetId,w,h:before?.h||14,x:Math.max(0,Math.min(12-w,point?.x||0)),y:Math.min(500,point?.y??Math.max(0,...(original?.items||[]).filter(v=>v.i!==targetId).map(v=>v.y+v.h)))};
  const state={items:[],hidden:[],locked:[],fixed:[],...original};
  result[key]={...state,items:[...state.items.filter(v=>v.i!==targetId),item],hidden:state.hidden.filter(v=>v!==targetId)};
  if(!existing)for(const option of ['locked','fixed'])result[key][option]=[...state[option].filter(v=>v!==targetId),...(from?.[option]?.includes(sourceId)?[targetId]:[])];
 }
 return result;
}
const boards=new Set(CARD_PAGES.map(p=>p[0]));
const identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,48}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
const text=(v,n)=>typeof v==='string'?v.slice(0,n):'';
export function normalizeCardPlacements(value){
 const out={};if(!value||typeof value!=='object'||Array.isArray(value))return out;
 for(const v of Object.values(value).slice(0,96)){
  if(v?.source==='home'&&['instance','account','statistics','welcome','notices'].includes(v.card))continue;
  if(!v||!boards.has(v.source)||!boards.has(v.target)||v.source===v.target||!identifier(v.card))continue;
  out[v.source+'.'+v.card]={source:v.source,target:v.target,card:v.card,title:text(v.title,80),w:Math.min(12,Math.max(3,Number(v.w)||6)),minW:Math.min(12,Math.max(3,Number(v.minW)||3))};
 }return out;
}
export function normalizeWidgets(value){
 const out=[];if(!Array.isArray(value))return out;
 const ids=new Set();for(const v of value.slice(0,36)){
  if(!v||!identifier(v.id)||ids.has(v.id)||!WIDGET_TYPES.includes(v.type)||!boards.has(v.page))continue;
  let extension;if(v.type==='extension'){try{extension=cardExtension(v.extension);}catch{continue;}}
  ids.add(v.id);out.push({id:v.id,type:v.type,page:v.page,title:text(v.title,40),text:text(v.text,8000),engine:v.engine==='google'?'google':'bing',hour24:v.hour24!==false,...v.type==='workflow'?{steps:normalizeWorkflow(v.steps)}:{},...extension?{extension,checked:Array.isArray(v.checked)?v.checked.filter(id=>extension.blocks.some(b=>b.type==='check'&&b.id===id)).slice(0,12):[]}:{}});
 }return out;
}
