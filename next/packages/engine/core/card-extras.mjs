// Portable cards store only references and small user-owned preferences, never page state.
export const CARD_PAGES = [
 ['home','/','启动游戏'],['music','/music','音乐'],['chat','/community','文字大厅'],
 ['voice','/community/voice','语音房间'],['account','/account','账号与积分'],
 ['guild','/guild','冒险者公会'],['games','/arcade','小游戏'],
 ['ranking','/arcade/ranking','积分榜'],['inbox','/community/inbox','收件箱'],
 ['multiplayer','/multiplayer','联机大厅'],['install','/workshop/install','下载与安装']
];
export const WIDGET_TYPES = ['note','clock','calendar','search','assistant'];
const boards=new Set(CARD_PAGES.map(p=>p[0]));
const identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,48}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
const text=(v,n)=>typeof v==='string'?v.slice(0,n):'';
export function normalizeCardPlacements(value){
 const out={};if(!value||typeof value!=='object'||Array.isArray(value))return out;
 for(const v of Object.values(value).slice(0,96)){
  if(!v||!boards.has(v.source)||!boards.has(v.target)||v.source===v.target||!identifier(v.card))continue;
  out[v.source+'.'+v.card]={source:v.source,target:v.target,card:v.card,title:text(v.title,80),w:Math.min(12,Math.max(3,Number(v.w)||6)),minW:Math.min(12,Math.max(3,Number(v.minW)||3))};
 }return out;
}
export function normalizeWidgets(value){
 const out=[];if(!Array.isArray(value))return out;
 const ids=new Set();for(const v of value.slice(0,36)){
  if(!v||!identifier(v.id)||ids.has(v.id)||!WIDGET_TYPES.includes(v.type)||!boards.has(v.page))continue;
  ids.add(v.id);out.push({id:v.id,type:v.type,page:v.page,title:text(v.title,40),text:text(v.text,8000),engine:v.engine==='google'?'google':'bing',hour24:v.hour24!==false});
 }return out;
}
