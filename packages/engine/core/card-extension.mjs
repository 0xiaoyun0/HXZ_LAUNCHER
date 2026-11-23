export const EXTENSION_LIMIT=64*1024;
export const EXTENSION_ROUTES={home:'/',chat:'/community',voice:'/community/voice',inbox:'/community/inbox',games:'/arcade',music:'/music',account:'/account',guild:'/guild',multiplayer:'/multiplayer',install:'/workshop/install',hub:'/community/hub'};
export function cardExtension(raw){
 const text=typeof raw==='string'?raw:JSON.stringify(raw);if(!text||new TextEncoder().encode(text).length>EXTENSION_LIMIT)throw Error('卡片扩展不得超过 64 KB');let v;try{v=JSON.parse(text);}catch{throw Error('卡片扩展不是有效 JSON');}
 if(!v||v.format!=='hxz-card-extension'||v.version!==1||!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(v.id||'')||typeof v.title!=='string'||!v.title.trim()||v.title.length>40||!Array.isArray(v.blocks)||!v.blocks.length||v.blocks.length>12)throw Error('卡片扩展结构无效');
 const str=(x,n)=>{if(typeof x!=='string'||x.length>n)throw Error('扩展文字过长或格式无效');return x.trim();},hosts=new Set(),keys=new Set();
 const blocks=v.blocks.map(b=>{if(!b||typeof b!=='object')throw Error('扩展内容无效');if(b.type==='text')return {type:'text',text:str(b.text,2000)};
  if(b.type==='metric'){if(!['instance','community','clock'].includes(b.metric))throw Error('不支持此只读信息');return {type:'metric',metric:b.metric,label:str(b.label||'',40)};}
  if(b.type==='link'){const label=str(b.label,60);if(!label)throw Error('快捷入口缺少名称');if(b.page){if(!Object.hasOwn(EXTENSION_ROUTES,b.page))throw Error('不支持此页面');return {type:'link',label,page:b.page};}let url;try{url=new URL(b.url);}catch{throw Error('链接无效');}if(url.protocol!=='https:'||url.username||url.password||url.href.length>1500)throw Error('扩展外部链接仅支持 HTTPS');hosts.add(url.hostname);return {type:'link',label,url:url.href};}
  if(b.type==='check'){if(!/^[\w-]{1,40}$/.test(b.id)||keys.has(b.id))throw Error('清单项编号无效或重复');keys.add(b.id);return {type:'check',id:b.id,label:str(b.label,120)};}
  throw Error('不支持的内容类型；卡片扩展不执行脚本、HTML、下载或系统命令');
 });
 return {format:'hxz-card-extension',version:1,id:v.id,title:v.title.trim(),author:str(v.author||'未署名',80),description:str(v.description||'',300),blocks,permissions:hosts.size?['openExternal']:[],hosts:[...hosts].sort()};
}
