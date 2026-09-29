import {monitorStatus} from './monitor.mjs';
import {app,BrowserWindow,ipcMain,safeStorage,nativeImage,dialog,shell,protocol,session} from 'electron';
import {appendFile,stat,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';import {mkdirSync} from 'node:fs';
import {createServices} from '../../../packages/engine/core/services.mjs';
import {createAppUpdate,launcherReleases} from '../../../packages/engine/core/app-update.mjs';
import {mediaPath} from '../../../packages/engine/core/media.mjs';
import {createSkinPanel} from '../../../packages/engine/skin-panel.ts';
const project=path.resolve(import.meta.dirname,'../../..');
app.setName('幻想镇 NEXT');app.setPath('userData',process.env.HXZ_NEXT_HOME||(app.isPackaged?path.join(path.dirname(app.getPath('exe')),'profile'):path.join(app.getPath('appData'),'HXZ-Next')));
mkdirSync(app.getPath('userData'),{recursive:true});
protocol.registerSchemesAsPrivileged([{scheme:'hxz-media',privileges:{standard:true,secure:true,stream:true,supportFetchAPI:true,corsEnabled:true}}]);
let diagnosticQueue=Promise.resolve();
function recordDiagnostic(details){diagnosticQueue=diagnosticQueue.catch(()=>{}).then(async()=>{const dir=path.join(app.getPath('userData'),'logs'),file=path.join(dir,'renderer.log');await mkdir(dir,{recursive:true});if((await stat(file).catch(()=>({size:0}))).size>512*1024)await rename(file,path.join(dir,'renderer.previous.log'));await appendFile(file,String(details).replace(/(Bearer\s+)[\w.\-]+/gi,'$1[已隐藏]').slice(0,12000)+'\n\n','utf8');});return diagnosticQueue;}
let win,services,updater;const skin=createSkinPanel(()=>win);
const safeConsole=stream=>stream.on('error',error=>{if(error.code!=='EPIPE')dialog.showErrorBox('日志输出异常',error.message);});safeConsole(process.stdout);safeConsole(process.stderr);
if(!app.requestSingleInstanceLock())app.quit();else {
 app.on('second-instance',()=>{win?.restore();win?.focus();});
 app.whenReady().then(async()=>{
  protocol.registerFileProtocol('hxz-media',(req,cb)=>{try{cb({path:mediaPath(app.getPath('userData'),req.url),headers:{'Access-Control-Allow-Origin':'*'}});}catch{cb({error:-6});}});
  win=new BrowserWindow({width:1360,height:880,minWidth:960,minHeight:680,frame:false,backgroundColor:'#f3f5f8',icon:path.join(app.isPackaged?process.resourcesPath:path.join(project,'resources'),'icon.ico'),show:false,webPreferences:{preload:path.join(import.meta.dirname,'preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false}});
  const trusted=frame=>frame===win?.webContents.mainFrame;
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  const emit=value=>{if(win&&!win.isDestroyed())win.webContents.send('next:event',value);};
  services=await createServices({data:app.getPath('userData'),dependencyRoot:app.isPackaged?path.join(path.dirname(app.getPath('exe')),'launcher-cache'):path.join(project,'.runtime/cache'),resources:app.isPackaged?process.resourcesPath:path.join(project,'resources'),safeStorage,nativeImage,dialog,shell,window:()=>win,skinPanel:skin,openSkin:()=>({ok:true}),emit});
  updater=createAppUpdate({app,isBusy:()=>services.isBusy(),emit,localOnly:true});
  session.defaultSession.setPermissionRequestHandler((contents,permission,cb,details)=>cb(contents===win.webContents&&permission==='media'&&details.mediaTypes?.length&&details.mediaTypes.every(t=>t==='audio')));
  session.defaultSession.setPermissionCheckHandler((contents,permission,origin,details)=>contents===win.webContents&&permission==='media'&&details.mediaType==='audio');
  ipcMain.handle('next:invoke',async(event,action,input={})=>{try{if(!trusted(event.senderFrame)||typeof action!=='string'||JSON.stringify(input).length>13*1024*1024)throw Error('请求无效');let value;if(action==='renderer.diagnostic'){value=await recordDiagnostic(input.details);}else if(action==='external.open'){const url=new URL(input.url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('无效网页地址');value=await shell.openExternal(url.href);}else if(action==='app-update.status')value=updater.status();else if(action==='app-update.check')value=await updater.check();else if(action==='monitor.status')value=await monitorStatus();else if(action==='launcher.releases')value=await launcherReleases();else value=await services.invoke(action,input);return {ok:true,value};}catch(e){return {ok:false,error:e.message};}});
  win.on('close',e=>{if(services.isBusy()){e.preventDefault();win.minimize();}});win.on('closed',()=>{services.dispose();updater.dispose();skin.dispose();win=null;});win.once('ready-to-show',()=>{if(!process.env.HXZ_NEXT_VERIFY&&!process.env.HXZ_NEXT_CHECK)win.show();});
  if(process.env.HXZ_NEXT_CHECK){win.webContents.on('did-finish-load',()=>setTimeout(()=>{console.info('NEXT_CHECK_RENDERER_READY');app.quit();},1500));}
  if(process.env.HXZ_NEXT_DEV)await win.loadURL('http://127.0.0.1:5178');else await win.loadFile(path.join(import.meta.dirname,'../dist/index.html'));
 }).catch(e=>{console.error('[NEXT startup]',e.stack||e.message);if(!process.env.HXZ_NEXT_CHECK)dialog.showErrorBox('幻想镇 NEXT 启动失败',e.message);app.quit();});
 app.on('window-all-closed',()=>app.quit());
}
