import {playerError} from '../../../packages/engine/core/player-errors.mjs';
import {newTaskProgress,updateTaskProgress} from '../../../packages/engine/core/task-progress.mjs';
import {proxy,subscribe} from 'valtio';
import {normalizeCardLayouts,normalizeCardStyle} from '../../../packages/engine/core/card-layout.mjs';
declare global {interface Window {launcher?:{invoke:(action:string,input?:any)=>Promise<any>;subscribe:(fn:(event:any)=>void)=>()=>void;filePath:(file:File)=>string}}}
export const desktop=!!window.launcher;
export const defaults={theme:'light',fontSize:16,accentColor:'#5668bc',cardLayouts:{},cardStyle:{color:'',opacity:1,gap:14,radius:10},animationSpeed:1,gameRoot:'',javaPath:'',selectedAccount:'',selectedInstance:'',communityUrl:'https://qqbot.hxzmc.top',memoryMode:'auto',defaultMemoryMB:8192,downloadConcurrency:32,downloadMode: "official",hxzupPopup:true,promptJavaDownload:true,chinesePaths:true,confirmUnsaved:true,chatHistoryDays:0,voiceMode:'open',voiceKey:'KeyT',voiceSounds:true,showCover:true,backgroundImage:'',backgroundVideo:'',backgroundMusic:'',musicVolume:.3,videoQuality:'balanced',backgroundOpacity:.4,defaultCover:'',instanceSettings:{},hiddenInstances:[],hiddenLinks:[],pinnedLinks:[],columns:{sidebar:{color:'',opacity:1,visible:true,label:'导航'},workspace:{color:'',opacity:1,visible:true,label:'工作区'},dock:{color:'',opacity:1,visible:true,label:'任务'}},showLinking:false,linkingDiscovered:false};
export const state=proxy<any>({settings:{...defaults},accounts:[],instances:[],system:{memoryMB:0,freeMemoryMB:0},running:false,ready:false,error:''});
export const ui=proxy<any>({dialog:'',instance:'',pack:null,toast:'',toastError:false,tasks:false,decision:null,crash:null,pending:false});
export const task=proxy<any>({...newTaskProgress(),logs:[]});
const listeners=new Set<()=>void>();
export function watchSettings(getter:()=>unknown,fn:()=>void){let previous=JSON.stringify(getter());return subscribe(state,()=>{const next=JSON.stringify(getter());if(next!==previous){previous=next;fn();}});}
export function errorMessage(e:any){return e?.message||String(e);}
let toastTimer:any;
export function notify(message:string,error=false){ui.toast=message;ui.toastError=error;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{ui.toast='';},error?8500:4000);}
export async function invoke<T=any>(action:string,input:any={}):Promise<T>{if(!window.launcher)throw Error('当前是界面预览。文件、账号与游戏操作请使用桌面程序。');const result=await window.launcher.invoke(action,input);if(!result.ok)throw Error(result.error||'操作未完成');return result.value;}
export async function perform<T>(fn:()=>Promise<T>|T){try{return await fn();}catch(e){notify(errorMessage(e),true);return undefined;}}
export async function reload(){if(!desktop){try{const stored=JSON.parse(localStorage.getItem('hxz-next-preview-appearance')||'{}');Object.assign(state.settings,stored,{cardLayouts:normalizeCardLayouts(stored.cardLayouts),cardStyle:normalizeCardStyle(stored.cardStyle)});}catch{}state.instances=[{id:'HXZ-survival',name:'原版生存群组',version:'26.2',loader:'Fabric',builtin:true,installed:false},{id:'HXZ-mod-1',name:'机械与天空',version:'1.21.1',loader:'NeoForge',builtin:true,installed:false},{id:'HXZ-mod-2',name:'新时代科技',version:'1.21.1',loader:'NeoForge',builtin:true,installed:false}];state.ready=true;return;}try{const data=await invoke('state');Object.assign(state,data,{ready:true,error:''});}catch(e){state.ready=true;state.error=errorMessage(e);throw e;}}
let settingsQueue:Promise<unknown>=Promise.resolve();
export function saveSettings(patch:any){
 const operation=settingsQueue.then(async()=>{const value=typeof patch==='function'?patch(state.settings):patch;if(!desktop){Object.assign(state.settings,value);try{localStorage.setItem('hxz-next-preview-appearance',JSON.stringify({theme:state.settings.theme,accentColor:state.settings.accentColor,animationSpeed:state.settings.animationSpeed,fontSize:state.settings.fontSize,cardLayouts:state.settings.cardLayouts,cardStyle:state.settings.cardStyle,pinnedLinks:state.settings.pinnedLinks,hiddenLinks:state.settings.hiddenLinks,showLinking:state.settings.showLinking,linkingDiscovered:state.settings.linkingDiscovered}));}catch{}return;}const previousRoot=state.settings.gameRoot;state.settings=await invoke('settings.save',value);if(state.settings.gameRoot!==previousRoot){ui.dialog='';ui.instance='';Object.assign(state,await invoke('state',{localOnly:true}));}});
 settingsQueue=operation.catch(()=>{});return operation;
}
export const selected=(source:any=state)=>source.instances.find((i:any)=>i.id===source.settings.selectedInstance)||source.instances[0];
export const account=(source:any=state)=>source.accounts.find((a:any)=>a.id===source.settings.selectedAccount);
export const cfg=(id:string,source:any=state)=>{const game=source.instances.find((i:any)=>i.id===id)||{};const value={javaMode:'inherit',javaPath:'',memoryMode:'inherit',memoryMB:4096,autoUpdate:false,updateUrls:[],autoJoin:false,isolated:true,width:1280,height:720,fullscreen:false,jvmArgs:[],favorite:false,coverPositionX:50,coverPositionY:50,coverZoom:1,...game,serverAddress:game.address||'',...source.settings.instanceSettings[id]};if(game.builtin){value.updateUrls=game.updateUrls||[];value.serverAddress=game.address||'';if(game.updateRequired)value.autoUpdate=true;}return value;};
export async function chooseRoot(){const gameRoot=await invoke('directory.choose');if(gameRoot)await saveSettings({gameRoot});return !!gameRoot;}
export async function selectInstance(id:string){if(task.busy||state.running)return;await saveSettings({selectedInstance:id});}
export async function launch(id=selected()?.id,updateOnly=false){if(!id)return;if(!account()){ui.dialog='account';return;}if(!state.settings.gameRoot&&!await chooseRoot())return;ui.launchTarget=id;ui.launchUpdateOnly=updateOnly;ui.tasks=true;await invoke(updateOnly?'game.update':'game.launch',{id});await reload();}
export async function importPack(file?:File){const pack=await invoke(file?'pack.inspect':'pack.choose',file?{file:window.launcher?.filePath(file)}:{});if(pack){ui.pack=pack;ui.dialog='import';}}
export async function loadNotices(){for(const fn of listeners)fn();}
export function onNotices(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function mediaFor(instance:any){const n=instance?.id||'';return n.includes('mod-1')||n.includes('modv1')?'./media/mechanical.webp':n.includes('mod-2')||n.includes('modv2')?'./media/adventure.webp':'./media/hero.webp';}
export const bytes=(n:number)=>n>1048576?(n/1048576).toFixed(1)+' MB':n>1024?(n/1024).toFixed(0)+' KB':(n||0)+' B';

window.launcher?.subscribe(e=>{
 if(e.type==='log'||e.type==='logs'){task.logs.push(...(e.lines||[e.line]).filter(Boolean));if(task.logs.length>5000)task.logs.splice(0,task.logs.length-5000);}
 if(e.type==='logs-reset'){Object.assign(task,newTaskProgress(),{logs:[]});}
 if(e.type==='hxzup-window'){ui.hxzup=e; if(e.open)ui.tasks=false;}
 if(e.type==='decision')ui.decision=e;
 if(e.type==='decision-close')ui.decision=null;
 if(e.type==='game-crash'){ui.crash=e.report;ui.dialog='crash';}
 if(e.type==='task'){updateTaskProgress(task,e);if(e.running!=null)state.running=e.running;if(e.error||e.failure)notify(playerError(e.error||e.failure).title,true);if(e.busy===false)void reload().catch(()=>{});}
});
