import './native-bridge';
import {DEFAULT_SERVERS} from '../../../server/shared/server-presets.mjs';
import {playerError} from '../../../packages/engine/core/player-errors.mjs';
import {requestFailureMessage} from '../../../packages/community/request-errors.mjs';
import {newTaskProgress,updateTaskProgress} from '../../../packages/engine/core/task-progress.mjs';
import {proxy,subscribe} from 'valtio';
import {normalizeCardLayouts,normalizeCardStyle} from '../../../packages/engine/core/card-layout.mjs';
declare global {interface Window {launcher?:{invoke:(action:string,input?:any)=>Promise<any>;subscribe:(fn:(event:any)=>void)=>()=>void;filePath:(file:File)=>string}}}
export const desktop=!!window.launcher;
import {DEFAULT_DESKTOP_THEME,changeDesktopTheme,presetAppearance} from '../../../packages/engine/core/desktop-themes.mjs';
import {WALLPAPER_DEFAULTS,wallpaperPatch,wallpaperPreferences} from '../../../packages/engine/core/desktop-wallpaper.mjs';
import {workspacePatch} from '../../../packages/engine/core/desktop-workspace.mjs';
export const defaults={...presetAppearance(),...WALLPAPER_DEFAULTS,workspaceLayout:'classic',workspaceModules:{},workspaceShelf:null,libraryView:'auto',desktopThemes:{active:DEFAULT_DESKTOP_THEME.id,entries:[]},fontSize:16,cardLayouts:{},cardPlacements:{},widgets:[],shortcuts:{},shortcutEnabled:true,voiceOverlay:false,gameWindowAction:'minimize',gameSleep:true,keepLauncherAvailable:true,autoReportErrors:false,memoryOptimization:true,onboardingDone:false,onboardingVersion:0,cardStyle:{...presetAppearance().cardStyle,gap:20},animationSpeed:1,gameRoot:'',javaPath:'',selectedAccount:'',selectedInstance:'',communityUrl:'https://qqbot.hxzmc.top',memoryMode:'auto',defaultMemoryMB:8192,downloadConcurrency:32,downloadSpeedMBps:0,downloadMode: "official",hxzupPopup:true,promptJavaDownload:true,chinesePaths:true,confirmUnsaved:true,chatHistoryDays:0,voiceMode:'open',voiceKey:'KeyT',voiceSounds:true,showCover:true,backgroundMusic:'',musicVolume:.3,videoQuality:'balanced',defaultCover:'',instanceSettings:{},hiddenInstances:[],hiddenLinks:[],pinnedLinks:[],columns:{sidebar:{color:'',opacity:1,visible:true,label:'导航'},workspace:{color:'',opacity:1,visible:true,label:'工作区'},dock:{color:'',opacity:1,visible:true,label:'任务'}},showLinking:true,linkingDiscovered:false,fecEnabled:true,communityRelayEnabled:true};
export const state=proxy<any>({settings:{...defaults},accounts:[],instances:[],system:{memoryMB:0,freeMemoryMB:0},running:false,sessions:[],ready:false,error:''});
export const ui=proxy<any>({dialog:'',instance:'',pack:null,toast:'',toastError:false,issue:null,issueOpen:false,tasks:false,decision:null,crash:null,pending:false});
export const task=proxy<any>({...newTaskProgress(),logs:[]});
const listeners=new Set<()=>void>();
export function watchSettings(getter:()=>unknown,fn:()=>void){let previous=JSON.stringify(getter());return subscribe(state,()=>{const next=JSON.stringify(getter());if(next!==previous){previous=next;fn();}});}
export function errorMessage(e:any){return requestFailureMessage(e);}
let toastTimer:any;
function toast(message:string,error=false){
  ui.toast=message;ui.toastError=error;clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{ui.toast='';},error?12000:4000);
}
export function reportFailure(error:unknown,operation=''){
  const issue=playerError(error,operation||(error as any)?.operation||'interface');
  ui.issue=issue;toast(issue.title,issue.code!=='stopped');
  if(issue.code!=='stopped'&&desktop&&state.settings.autoReportErrors)
    void invoke('errors.report',{category:'interface',message:issue.area+'/'+issue.code+' '+issue.title}).catch(()=>{});
  return issue;
}
export function notify(message:string,error=false){if(error)reportFailure(message);else toast(message);}
export async function invoke<T=any>(action:string,input:any={}):Promise<T>{
  try{
    if(!window.launcher)throw Error('当前是界面预览');
    const result=await window.launcher.invoke(action,input);
    if(!result.ok)throw Error(result.error||'请求失败');
    return result.value;
  }catch(error){throw Object.assign(new Error(String((error as any)?.message||error)),{operation:action});}
}
export async function perform<T>(fn:()=>Promise<T>|T){try{return await fn();}catch(e){reportFailure(e);return undefined;}}
export async function reload(){if(!desktop){try{const stored=JSON.parse(localStorage.getItem('hxz-third-appearance')||'{}');Object.assign(state.settings,stored,wallpaperPreferences(stored),{cardLayouts:normalizeCardLayouts(stored.cardLayouts),cardStyle:normalizeCardStyle(stored.cardStyle||defaults.cardStyle)});}catch{}state.instances=DEFAULT_SERVERS.map(p=>({...p,builtin:true,installed:false,placeholder:!p.enabled}));
    state.ready=true;return;}try{const data=await invoke('state',{localOnly:true});Object.assign(state,data,{ready:true,error:''});}catch(e){state.ready=true;state.error=errorMessage(e);throw e;}}
let settingsQueue:Promise<unknown>=Promise.resolve();
export function saveSettings(patch:any){
 const operation=settingsQueue.then(async()=>{const value=typeof patch==='function'?patch(state.settings):patch;if(!desktop){const preferences={...value,...workspacePatch(state.settings,value),...wallpaperPatch(state.settings,value),...(value.themeChange?changeDesktopTheme(state.settings,value.themeChange):{})};delete preferences.themeChange;Object.assign(state.settings,preferences);try{localStorage.setItem('hxz-third-appearance',JSON.stringify({...Object.fromEntries(Object.keys({...presetAppearance(),...WALLPAPER_DEFAULTS,workspaceLayout:'',workspaceModules:{},workspaceShelf:null,libraryView:'auto'}).map(key=>[key,state.settings[key]])),desktopThemes:state.settings.desktopThemes,animationSpeed:state.settings.animationSpeed,fontSize:state.settings.fontSize,cardLayouts:state.settings.cardLayouts,cardPlacements:state.settings.cardPlacements,widgets:state.settings.widgets,cardStyle:state.settings.cardStyle,pinnedLinks:state.settings.pinnedLinks,hiddenLinks:state.settings.hiddenLinks,showLinking:state.settings.showLinking,onboardingDone:state.settings.onboardingDone,gameSleep:state.settings.gameSleep,memoryOptimization:state.settings.memoryOptimization,linkingDiscovered:state.settings.linkingDiscovered}));}catch{}return;}const previousRoot=state.settings.gameRoot;state.settings=await invoke('settings.save',value);if(state.settings.gameRoot!==previousRoot){ui.dialog='';ui.instance='';Object.assign(state,await invoke('state',{localOnly:true}));}});
 settingsQueue=operation.catch(()=>{});return operation;
}
export const selected=(source:any=state)=>source.instances.find((i:any)=>i.id===source.settings.selectedInstance)||source.instances[0];
export const account=(source:any=state)=>source.accounts.find((a:any)=>a.id===source.settings.selectedAccount);
export const cfg=(id:string,source:any=state)=>{const game=source.instances.find((i:any)=>i.id===id)||{};const value={javaMode:'inherit',javaPath:'',memoryMode:'inherit',memoryMB:4096,autoUpdate:false,updateUrls:[],autoJoin:false,isolated:true,width:1280,height:720,fullscreen:false,jvmArgs:[],favorite:false,coverPositionX:50,coverPositionY:50,coverZoom:1,...game,serverAddress:game.address||'',...source.settings.instanceSettings[id]};if(game.builtin){value.updateUrls=game.updateUrls||[];value.serverAddress=game.address||'';if(game.updateRequired)value.autoUpdate=true;}return value;};
export async function chooseRoot(){const gameRoot=await invoke('directory.choose');if(gameRoot)await saveSettings({gameRoot});return !!gameRoot;}
export async function selectInstance(id:string){if(task.busy||(state.running&&state.settings.keepLauncherAvailable===false))return;await saveSettings({selectedInstance:id});}
export async function launch(id=selected()?.id,updateOnly=false,joinServer=false){if(!id)return;if(!account()?.authenticated){ui.dialog='account';return;}if(!state.settings.gameRoot&&!await chooseRoot())return;ui.launchTarget=id;ui.launchUpdateOnly=updateOnly;ui.tasks=true;await invoke(updateOnly?'game.update':'game.launch',{id,joinServer});await reload();}
export async function importPack(file?:File){const pack=await invoke(file?'pack.inspect':'pack.choose',file?{file:window.launcher?.filePath(file)}:{});if(pack){ui.pack=pack;ui.dialog='import';}}
export async function loadNotices(){for(const fn of listeners)fn();}
export function onNotices(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export const bytes=(n:number)=>n>1048576?(n/1048576).toFixed(1)+' MB':n>1024?(n/1024).toFixed(0)+' KB':(n||0)+' B';

window.launcher?.subscribe(e=>{
 if(e.type==='last-played')state.settings.lastPlayed=e.value;
 if(e.type==='game-sessions'){state.running=e.running;state.sessions=e.sessions;}
 if(e.type==='log'||e.type==='logs'){task.logs.push(...(e.lines||[e.line]).filter(Boolean));if(task.logs.length>5000)task.logs.splice(0,task.logs.length-5000);}
 if(e.type==='logs-reset'){Object.assign(task,newTaskProgress(),{logs:[]});}
 if(e.type==='hxzup-window'){ui.hxzup=e; if(e.open)ui.tasks=false;}
 if(e.type==='decision')ui.decision=e;
 if(e.type==='decision-close')ui.decision=null;
 if(e.type==='shortcut-conflict')notify(e.errors.join('；'),true);
 if(e.type==='game-crash'){ui.crash=e.report;ui.dialog='crash';}
 if(e.type==='task'){updateTaskProgress(task,e);if(e.hxzre?.state==='enabled')notify('HXZRE 已启用，上传前向纠错补偿已接管连接');else if(e.hxzre?.state==='fallback')notify('HXZRE 未启用，已回退原始连接');if(e.running!=null)state.running=e.running;if(e.error||e.failure)reportFailure(e.error||e.failure,ui.launchUpdateOnly?'install.update':'game.launch');if(e.busy===false)void reload().catch(()=>{});}
});
