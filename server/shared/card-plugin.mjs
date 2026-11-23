import {createHash} from 'node:crypto';
export const CARD_LIMIT=64*1024;
const destinations=new Set(['/','/library','/workshop/install','/community','/community/forum','/community/blueprints','/multiplayer','/guild','/arcade','/music','/linking','/account/backpack','/settings']);
const field=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('卡片缺少有效的显示文字');return value.trim();};
export function validateCard(input){
  const raw=typeof input==='string'?input:JSON.stringify(input);
  if(!raw||Buffer.byteLength(raw)>CARD_LIMIT)throw Error('卡片插件上限为 64 KiB');
  const pkg=JSON.parse(raw),m=pkg?.manifest,c=pkg?.card;
  if(pkg?.format!=='hxz-card-v2'||!m||m.apiVersion!==2||!c)throw Error('请选择 API 2 展示卡片，旧版脚本插件需由作者转换');
  if(!/^[a-z][a-z0-9-]{2,63}$/.test(m.id)||!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(m.version))throw Error('卡片标识或版本无效');
  if(Object.keys(pkg).some(k=>!['format','manifest','card'].includes(k))||Object.keys(m).some(k=>!['id','version','apiVersion','name','author','description','permissions'].includes(k))||Object.keys(c).some(k=>!['title','body','route'].includes(k)))throw Error('卡片包含不支持的字段');
  if(!Array.isArray(m.permissions)||m.permissions.length!==1||m.permissions[0]!=='home.card')throw Error('卡片需要声明 home.card');
  if(c.route!==undefined&&!destinations.has(c.route))throw Error('卡片只能打开启动器中的现有页面');
  const manifest={id:m.id,version:m.version,apiVersion:2,name:field(m.name,80),author:field(m.author,80),description:field(m.description,300),permissions:['home.card']};
  const card={title:field(c.title,80),body:field(c.body,500),...(c.route?{route:c.route}:{})};
  const bundle={format:'hxz-card-v2',manifest,card},serialized=JSON.stringify(bundle);
  return {manifest,bundle,serialized,sha256:createHash('sha256').update(serialized).digest('hex'),size:Buffer.byteLength(serialized)};
}
