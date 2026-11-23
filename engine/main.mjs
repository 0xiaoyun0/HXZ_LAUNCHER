import path from 'node:path';
import {existsSync} from 'node:fs';
import {connectHost} from './wire.mjs';
import {createServices} from '../packages/engine/core/services.mjs';
import {createLatencyMonitor} from '../packages/engine/core/monitor-latency.mjs';
import {monitorStatus,monitorEndpoints} from './monitor.mjs';
import {installedLibrary,installedServerCache} from './installed-game-root.mjs';
import {legacyAppearance,legacyCardPackage} from './legacy-appearance.mjs';
import {importPreferences} from './profile-import.mjs';
import {checkAccess} from './access.mjs';
import {launcherReleases} from '../packages/engine/core/app-update.mjs';
import {supportRequest} from './support.mjs';
import {updates} from './updates.mjs';
import {musicAccount} from './music-account.mjs';
import {cardPlugins} from './plugins.mjs';
import {communityExtension} from './community-extension.mjs';
import {preflight} from './preflight.mjs';
import {createPeerTransport} from './rtc.mjs';
import pkg from '../package.json';

const home=process.env.HXZ3_PROFILE, resources=process.env.HXZ3_RESOURCES;
if(!home||!resources)throw Error('缺少启动器工作目录');
const wire=connectHost(dispatch),{host,emit}=wire;
const choose=options=>host('dialog.open',options);
const vault=async(action,bytes)=>Buffer.from(await host(action,{bytes:Buffer.from(bytes).toString('base64')}),'base64');
const rtc=createPeerTransport(emit);
const previousAppData=process.env.APPDATA;
const installed=existsSync(path.join(resources,'../../installed.flag'));
const engine=createServices({
  data:home,dependencyRoot:path.join(home,'cache'),resources,version:pkg.version,emit,defaultAutoCheckUpdates:installed,
  initialRoot:async()=>'',initialLibrary:()=>installedLibrary(previousAppData),initialServerCache:()=>installedServerCache(previousAppData),scanInstances:root=>host('library.scan',{root}),spawnGame:wire.spawnGame,
  window:()=>null,dialog:{showOpenDialog:(_,options)=>choose(options),showSaveDialog:(_,options)=>host('dialog.save',options)},
  shell:{openPath:path=>host('file.open',{path}),showItemInFolder:path=>host('file.reveal',{path}),trashItem:path=>host('file.trash',{path}),openExternal:url=>host('url.open',{url})},
  safeStorage:{isEncryptionAvailable:()=>true,decryptString:async bytes=>(await vault('vault.open',bytes)).toString('utf8'),encryptString:text=>vault('vault.seal',text)},
  nativeImage:{thumbnail:async(path,input)=>Buffer.from(await host('image.thumbnail',{path,...input}),'base64')},
  netease:musicAccount(host),openSkin:()=>host('url.open',{url:'https://skin.hxzmc.top/user'}),p2pRuntime:rtc
});
const identity=service=>emit({type:'identity-changed',authenticated:service.hasAuthenticatedAccount()});
engine.then(identity).catch(()=>{}); // The local UI receives initialization errors through the request that triggered it.
const latency=createLatencyMonitor({targets:async()=>monitorEndpoints(await (await engine).invoke('monitor.targets'))});
const updater=engine.then(service=>updates({home,version:pkg.version,architecture:process.arch,installed,channel:__HXZ_UPDATE_CHANNEL__,emit,isBusy:()=>service.isBusy(),launch:input=>host('update.install',input)}));
const officialExtensions=new Map(Object.entries(__HXZ_OFFICIAL_EXTENSIONS__).map(([id,definition])=>[id,communityExtension({home,choose,id,definition,emit})]));
const cards=cardPlugins({home,choose,emit,safeMode:process.env.HXZ3_SAFE_MODE==='1',request:async()=>{throw Error('请从本机导入卡片');}});
const local={
  'profile.cards':()=>legacyCardPackage(previousAppData),
  'profile.look':async input=>legacyAppearance(previousAppData,home,await engine,input?.apply===true,input?.scope),
  'launcher.releases':()=>launcherReleases(),
  'support.ticket':async input=>supportRequest(async()=>(await engine).invoke('community.connect'),input),
  'external.open':input=>host('url.open',input),
  'window.control':input=>host('window.control',input),
  'renderer.diagnostic':async input=>(await engine).invoke('errors.report',{category:'interface',message:String(input.message||'').slice(0,1000)}),
  'instance.preflight':async({id})=>preflight(await (await engine).invoke('state',{localOnly:true}),id,{roots:[path.join(home,'runtimes'),path.join(resources,'runtime')]}),
  'profile.import':async()=>importPreferences(home,choose,await engine),
  'monitor.status':()=>monitorStatus(),'monitor.latency':input=>latency.measure('main',input),'monitor.cancel':input=>latency.cancel('main',input.requestId),
  'rtc.event':input=>rtc.event(input),

};
async function dispatch(action,input){
  const service=await engine;checkAccess(action,service.hasAuthenticatedAccount());
  if(action.startsWith('plugins.')){
    if(input?.marketId||!['plugins.list','plugins.install','plugins.enable','plugins.disable','plugins.remove'].includes(action))throw Error('仅支持本地声明式卡片');
    return cards(action,input||{});
  }
  if(action.startsWith('extension.')){
    const extension=officialExtensions.get(input?.id??'community');
    if(!extension)throw Error('未识别的官方扩展');
    return extension(action);
  }
  if(action.startsWith('app-update.'))return (await updater).invoke(action);
  if(Object.hasOwn(local,action))return local[action](input);
  const value=await service.invoke(action,input);
  if(action==='state'||action==='settings.save')(await updater).autoCheck((action==='state'?value.settings:value).autoCheckUpdates!==false);
  if(['account.login','account.remove','account.profile','settings.save','state'].includes(action))identity(service);
  return value;
}
wire.onClose(async()=>{try{rtc.dispose();latency.dispose?.();await(await engine).dispose();}finally{process.exit(0);}});
