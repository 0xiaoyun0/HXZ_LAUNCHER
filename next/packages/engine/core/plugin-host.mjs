import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {validatePluginPackage,PLUGIN_LIMIT} from '../../../server/shared/plugin-package.mjs';
import {writeJSON,noLinks} from './io.mjs';

export async function createPluginHost({data,app,window,services,dialog,request,report=()=>{},safeMode=false}){
 const root=path.join(data,'plugins'),registry=path.join(root,'installed.json'),marker=path.join(root,'starting.json');
 await fs.mkdir(root,{recursive:true});let installed={},active=new Map(),queue=Promise.resolve(),recovery='';
 try{installed=JSON.parse(await fs.readFile(registry,'utf8'));if(!installed||typeof installed!=='object'||Array.isArray(installed))installed={};}catch{}
 try{const previous=JSON.parse(await fs.readFile(marker,'utf8'));if(installed[previous.id]){installed[previous.id].enabled=false;recovery=previous.id+' 在上次启动中中断，已停用';await writeJSON(registry,installed);}}catch{}
 const save=()=>writeJSON(registry,installed);
 const serial=fn=>{const job=queue.catch(()=>{}).then(fn);queue=job.catch(()=>{});return job;};
 const pluginDir=id=>{if(!/^[a-z][a-z0-9-]{2,63}$/.test(id))throw Error('插件标识无效');return path.join(root,id);};
 async function packageFor(id){const dir=pluginDir(id);await noLinks(dir);const p=validatePluginPackage(await fs.readFile(path.join(dir,'package.hxzplugin'),'utf8'));if(p.sha256!==installed[id]?.sha256)throw Error('插件文件已变化，请重新安装并确认权限');return p;}
 async function renderer(id){const runtime=active.get(id);if(!runtime||window().isDestroyed())return;
  const p=runtime.package,m=p.manifest,code=p.bundle.files[m.renderer]||'',style=p.bundle.files[m.style]||'';
  await window().webContents.executeJavaScript(`(async()=>{window.__hxzPlugins ||= new Map();await window.__hxzPlugins.get(${JSON.stringify(id)})?.();const disposers=[];const api={id:${JSON.stringify(id)},apiVersion:1,invoke:(action,input)=>window.launcher.invoke(action,input).then(v=>{if(!v.ok)throw Error(v.error);return v.value;}),onDispose:fn=>disposers.push(fn),navigate:route=>{location.hash=route;},document,window};const css=document.createElement('style');css.textContent=${JSON.stringify(style)};document.head.append(css);disposers.push(()=>css.remove());window.__hxzPlugins.set(${JSON.stringify(id)},async()=>{for(const dispose of disposers.reverse())try{await dispose();}catch{}window.__hxzPlugins.delete(${JSON.stringify(id)});});await(async(api)=>{${code}\n})(api);})()`);
 }
 async function disable(id){
  const runtime=active.get(id);active.delete(id);
  if(installed[id]){installed[id].enabled=false;await save();}
  try{await window().webContents.executeJavaScript(`window.__hxzPlugins?.get(${JSON.stringify(id)})?.()`);}catch{}
  for(const fn of runtime?.disposers?.reverse()||[])try{await fn();}catch(error){report({category:'plugin',message:error.message,context:{plugin:id}});}
 }
 async function enable(id,accepted=false){
  if(!installed[id])throw Error('插件尚未安装');
  if(!accepted)throw Error('启用插件前必须确认完整启动器与本机文件权限');
  if(active.has(id))return;
  const p=await packageFor(id),m=p.manifest;if(!m.platforms.includes(process.platform+'-'+process.arch))throw Error('插件不支持当前平台');
  const disposers=[],runtime={package:p,disposers};active.set(id,runtime);await writeJSON(marker,{id,started:Date.now()});
  try{
   // Code is loaded only from the verified, explicitly trusted local package.
   const dir=pluginDir(id),moduleRoot=path.join(dir,'code');await fs.mkdir(moduleRoot,{recursive:true});
   for(const [name,code] of Object.entries(p.bundle.files)){const file=path.join(moduleRoot,...name.split('/'));await noLinks(file);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,code,'utf8');}
   if(m.main){const require=createRequire(path.join(moduleRoot,m.main));for(const file of Object.keys(require.cache))if(file.startsWith(moduleRoot+path.sep))delete require.cache[file];
    const module=require(path.join(moduleRoot,m.main));if(typeof module.activate!=='function')throw Error('主进程插件必须导出 activate(api)');
    const cleanup=await module.activate({apiVersion:1,id,app,window:window(),services,require,storage:path.join(dir,'data'),onDispose:fn=>{if(typeof fn==='function')disposers.push(fn);},report:details=>report({...details,category:'plugin',context:{...details.context,plugin:id}})});
    if(typeof cleanup==='function')disposers.push(cleanup);
   }
   installed[id].enabled=true;installed[id].error='';await save();
   if(window().webContents.getURL()&&!window().webContents.isLoading())await renderer(id);
  }catch(error){await disable(id);installed[id].error=error.message;await save();throw error;}
  finally{await fs.rm(marker,{force:true});}
 }
 const onLoad=()=>{for(const id of active.keys())void renderer(id).catch(async error=>{report({category:'plugin',message:error.message,context:{plugin:id}});await disable(id);});};
 window().webContents.on('did-finish-load',onLoad);
 async function choose(){const selected=await dialog.showOpenDialog(window(),{title:'选择启动器插件',properties:['openFile'],filters:[{name:'HXZ 启动器插件',extensions:['hxzplugin']}]});if(selected.canceled)return null;const file=selected.filePaths[0];if((await fs.stat(file)).size>PLUGIN_LIMIT)throw Error('插件超过大小限制');return validatePluginPackage(await fs.readFile(file,'utf8'));}
 async function install(input){const p=input.marketId?await request('/api/plugins/'+encodeURIComponent(input.marketId)+'/package').then(v=>{const p=validatePluginPackage(v.package);if(p.sha256!==v.sha256||input.sha256&&input.sha256!==p.sha256)throw Error('插件下载校验失败或版本已变更');return p;}):await choose();if(!p)return {cancelled:true};
  const id=p.manifest.id;await disable(id);const dir=pluginDir(id);await noLinks(dir);await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'package.hxzplugin'),p.serialized,'utf8');installed[id]={manifest:p.manifest,sha256:p.sha256,enabled:false,installedAt:Date.now(),error:''};await save();return installed[id];
 }
 const api={
  async invoke(action,input={}){return serial(async()=>{
   if(action==='plugins.list')return {items:Object.values(installed),safeMode,recovery,apiVersion:1};
   if(action==='plugins.install')return install(input);
   if(action==='plugins.enable'){await enable(input.id,input.accepted===true);return {ok:true};}
   if(action==='plugins.disable'){await disable(input.id);return {ok:true,restartRecommended:true};}
   if(action==='plugins.remove'){await disable(input.id);delete installed[input.id];await save();return {ok:true};}
   if(action==='plugins.submit'){const p=await choose();return p?request('/api/plugins','POST',{package:p.bundle}):{cancelled:true};}
   if(action==='plugins.disableAll'){for(const id of Object.keys(installed))await disable(id);return {ok:true};}
   throw Error('插件操作不存在');
  });},
  async close(){window().webContents.off('did-finish-load',onLoad);for(const runtime of active.values())for(const fn of runtime.disposers.reverse())try{await fn();}catch{}active.clear();}
 };
 if(!safeMode)for(const [id,item] of Object.entries(installed))if(item.enabled)try{await enable(id,true);}catch(error){report({category:'plugin',message:error.message,context:{plugin:id}});}
 return api;
}
