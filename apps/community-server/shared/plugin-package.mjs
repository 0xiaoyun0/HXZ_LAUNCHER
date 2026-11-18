import {createHash} from 'node:crypto';
export const PLUGIN_API=1,PLUGIN_LIMIT=4*1024*1024;
const identifier=/^[a-z][a-z0-9-]{2,63}$/;
const version=/^\d{1,4}\.\d{1,4}\.\d{1,4}$/;
function safePath(name){return typeof name==='string'&&name.length<=200&&/^[a-zA-Z0-9_.\/-]+$/.test(name)&&!name.startsWith('/')&&!name.split('/').some(v=>!v||v==='.'||v==='..'||/[. ]$/.test(v)||/^(?:con|prn|aux|nul|com\d|lpt\d)(?:\.|$)/i.test(v));}
export function validatePluginPackage(input){
 const bytes=typeof input==='string'?input:JSON.stringify(input);
 if(Buffer.byteLength(bytes)>PLUGIN_LIMIT)throw Error('插件包不能超过 4 MiB');
 const value=typeof input==='string'?JSON.parse(input):input,m=value?.manifest,files=value?.files;
 if(value?.format!=='hxz-plugin-v1'||!m||!identifier.test(m.id)||!version.test(m.version)||m.apiVersion!==PLUGIN_API)throw Error('插件标识、版本或 API 版本无效');
 for(const key of ['name','author','description'])if(typeof m[key]!=='string'||!m[key].trim()||m[key].length>(key==='description'?2000:100))throw Error('插件缺少有效的 '+key);
 if(!Array.isArray(m.permissions)||m.permissions.length!==1||m.permissions[0]!=='launcher.full')throw Error('完整启动器插件必须声明 launcher.full 权限');
 if(!Array.isArray(m.platforms)||!m.platforms.length||m.platforms.some(p=>!['win32-x64','win32-ia32'].includes(p)))throw Error('插件平台无效');
 if(!files||typeof files!=='object'||Array.isArray(files)||Object.keys(files).length>256)throw Error('插件文件列表无效');
 const normalized=Object.create(null),paths=new Set();
 for(const [name,source] of Object.entries(files)){
  if(!safePath(name)||paths.has(name.toLowerCase())||typeof source!=='string'||Buffer.byteLength(source)>1024*1024)throw Error('插件文件路径、大小或内容无效');
  paths.add(name.toLowerCase());normalized[name]=source;
 }
 if(!m.main&&!m.renderer)throw Error('插件需要主进程或界面入口');
 for(const key of ['main','renderer','style'])if(m[key]&&(!safePath(m[key])||!Object.hasOwn(normalized,m[key])||!(key==='main'?/\.cjs$/:key==='renderer'?/\.js$/:/\.css$/).test(m[key])))throw Error('插件入口无效：'+key);
 const manifest={id:m.id,version:m.version,apiVersion:PLUGIN_API,name:m.name.trim(),author:m.author.trim(),description:m.description.trim(),permissions:['launcher.full'],platforms:[...new Set(m.platforms)],...(m.main?{main:m.main}:{}),...(m.renderer?{renderer:m.renderer}:{}),...(m.style?{style:m.style}:{})};
 const bundle={format:'hxz-plugin-v1',manifest,files:normalized},serialized=JSON.stringify(bundle);
 return {bundle,manifest,serialized,sha256:createHash('sha256').update(serialized).digest('hex'),size:Buffer.byteLength(serialized)};
}
