import path from 'node:path';
import fs from 'node:fs/promises';
import {connectHost} from './wire.mjs';
import {createServices} from '../packages/engine/core/services.mjs';
import {createLatencyMonitor} from '../packages/engine/core/monitor-latency.mjs';
import {monitorStatus,monitorEndpoints} from './monitor.mjs';
import {importPreferences} from './profile-import.mjs';
import {checkAccess} from './access.mjs';
import {updates} from './updates.mjs';
import {musicAccount} from './music-account.mjs';
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
const engine=createServices({
  data:home,dependencyRoot:path.join(home,'cache'),resources,version:pkg.version,emit,
  initialRoot:async()=>'',scanInstances:root=>host('library.scan',{root}),spawnGame:wire.spawnGame,
  window:()=>null,dialog:{showOpenDialog:(_,options)=>choose(options),showSaveDialog:(_,options)=>host('dialog.save',options)},
  shell:{openPath:path=>host('file.open',{path}),showItemInFolder:path=>host('file.reveal',{path}),trashItem:path=>host('file.trash',{path}),openExternal:url=>host('url.open',{url})},
  safeStorage:{isEncryptionAvailable:()=>true,decryptString:async bytes=>(await vault('vault.open',bytes)).toString('utf8'),encryptString:text=>vault('vault.seal',text)},
  nativeImage:{thumbnail:async(path,input)=>Buffer.from(await host('image.thumbnail',{path,...input}),'base64')},
  netease:musicAccount(host),openSkin:()=>host('url.open',{url:'https://skin.hxzmc.top/user'}),p2pRuntime:rtc
});
const identity=service=>emit({type:'identity-changed',authenticated:service.hasAuthenticatedAccount()});
engine.then(identity).catch(()=>{}); // The local UI receives initialization errors through the request that triggered it.
const latency=createLatencyMonitor({targets:async()=>monitorEndpoints(await (await engine).invoke('monitor.targets'))});
const updater=Promise.all([engine,fs.access(path.join(resources,'../../installed.flag')).then(()=>true,()=>false)]).then(([service,installed])=>updates({home,version:pkg.version,architecture:process.arch,installed,channel:__HXZ_UPDATE_CHANNEL__,emit,isBusy:()=>service.isBusy(),launch:input=>host('update.install',input)}));
const extension=communityExtension({home,choose,resources,definition:__HXZ_COMMUNITY_EXTENSION__,emit});
const local={
  'external.open':input=>host('url.open',input),
  'window.control':input=>host('window.control',input),
  'renderer.diagnostic':async input=>(await engine).invoke('errors.report',{category:'interface',message:String(input.message||'').slice(0,1000)}),
  'instance.preflight':async({id})=>preflight(await (await engine).invoke('state',{localOnly:true}),id,{roots:[path.join(home,'runtimes'),path.join(resources,'runtime')]}),
  'profile.import':async()=>importPreferences(home,choose,await engine),
  'server.refresh':async()=>(await engine).invoke('state',{localOnly:false}),
  'monitor.status':()=>monitorStatus(),'monitor.latency':input=>latency.measure('main',input),'monitor.cancel':input=>latency.cancel('main',input.requestId),
  'rtc.event':input=>rtc.event(input),

};
async function dispatch(action,input){
  const service=await engine;checkAccess(action,service.hasAuthenticatedAccount());
  if(action.startsWith('extension.'))return extension(action);
  if(action.startsWith('app-update.'))return (await updater).invoke(action);
  if(Object.hasOwn(local,action))return local[action](input);
  const value=await service.invoke(action,input);
  if(action==='state'||action==='settings.save')(await updater).autoCheck((action==='state'?value.settings:value).autoCheckUpdates!==false);
  if(['account.login','account.remove','account.profile','settings.save','state'].includes(action))identity(service);
  return value;
}
wire.onClose(async()=>{try{rtc.dispose();latency.dispose?.();await(await engine).dispose();}finally{process.exit(0);}});
