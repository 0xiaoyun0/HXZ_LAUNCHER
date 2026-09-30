import {BrowserWindow,session,net} from 'electron';
import {createHash} from 'node:crypto';
const origin='https://music.163.com';
const domainOK=url=>{try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='music.163.com'||u.hostname==='y.music.163.com'||u.hostname==='reg.163.com'||u.hostname==='dl.reg.163.com');}catch{return false;}};
/** Official website sessions are local and separated by community identity. No cookies cross IPC. */
export function createNeteasePanel(parent){
 const windows=new Map();
 const key=user=>createHash('sha256').update(user.base+'\0'+user.uid).digest('hex').slice(0,32);
 const store=user=>session.fromPartition('persist:netease-'+key(user));
 function json(user,route,params={}){
  return new Promise((resolve,reject)=>{
   const request=net.request({url:origin+'/api/'+route,session:store(user),method:'POST',credentials:'include',redirect:'error'}),chunks=[];let total=0;
   const timer=setTimeout(()=>{request.abort();reject(Error('网易云响应超时，请稍后重试'));},15000);
   request.setHeader('Content-Type','application/x-www-form-urlencoded');request.setHeader('Referer',origin+'/');
   request.on('response',response=>{response.on('data',chunk=>{total+=chunk.length;if(total>1024*1024){request.abort();reject(Error('网易云返回内容过大'));return;}chunks.push(chunk);});response.on('end',()=>{clearTimeout(timer);try{if(response.statusCode!==200)throw Error('网易云服务暂不可用（'+response.statusCode+'）');resolve(JSON.parse(Buffer.concat(chunks).toString()));}catch(e){reject(e);}});response.on('error',reject);});
   request.on('error',e=>{clearTimeout(timer);reject(e);});request.on('abort',()=>clearTimeout(timer));request.end(new URLSearchParams(params).toString());
  });
 }
 async function status(user){const cookies=await store(user).cookies.get({url:origin});return {loggedIn:cookies.some(c=>c.name==='MUSIC_U'&&!!c.value)};}
 async function login(user){const id=key(user);if(windows.has(id)){windows.get(id).focus();return {opened:true};}
  const ses=store(user);ses.setPermissionRequestHandler((_w,_p,done)=>done(false));
  const w=new BrowserWindow({parent:parent(),width:1060,height:760,minWidth:720,minHeight:560,title:'网易云音乐 · 个人账号',autoHideMenuBar:true,webPreferences:{session:ses,sandbox:true,nodeIntegration:false,contextIsolation:true}});windows.set(id,w);
  const guard=(e,url)=>{if(!domainOK(url))e.preventDefault();};w.webContents.on('will-navigate',guard);w.webContents.on('will-redirect',guard);w.webContents.setWindowOpenHandler(({url})=>{if(domainOK(url))void w.loadURL(url).catch(()=>{});return {action:'deny'};});
  w.on('closed',()=>windows.delete(id));await w.loadURL(origin+'/#/my');return {opened:true};
 }
 async function resolve(user,id){if(!(await status(user)).loggedIn)return null;
  const value=await json(user,'song/enhance/player/url',{ids:JSON.stringify([String(id)]),br:'320000'});const song=value?.data?.[0];
  if(!song?.url||song.freeTrialInfo)throw Error('该账号暂不能完整播放此曲目，请在网易云确认版权或会员权限');
  const u=new URL(song.url);if(u.protocol==='http:')u.protocol='https:';if(u.protocol!=='https:'||!u.hostname.endsWith('.music.126.net')||u.username||u.password)throw Error('网易云音频地址不受支持');return u.href;
 }
 async function logout(user){windows.get(key(user))?.close();await store(user).clearStorageData();await store(user).clearCache();return {loggedIn:false};}
 return {login,status,resolve,logout,dispose(){for(const w of windows.values())w.close();windows.clear();}};
}
