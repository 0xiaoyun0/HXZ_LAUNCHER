import {BrowserView,session} from 'electron';
const origin='https://skin.hxzmc.top';
export function createSkinPanel(window:()=>Electron.BrowserWindow|null){
 const views=new Map<string,BrowserView>();let current:BrowserView|null=null;
 const partitionFor=(id:string)=>'persist:skin-'+id.replace(/[^a-zA-Z0-9-]/g,'');
 function get(id:string){let view=views.get(id);if(view)return view;for(const [key,old] of views){if(views.size<3)break;if(old!==current){old.webContents.close();views.delete(key);}}const partition=partitionFor(id);const storage=session.fromPartition(partition);storage.setPermissionRequestHandler((_w,_p,done)=>done(false));
 view=new BrowserView({webPreferences:{session:storage,sandbox:true,contextIsolation:true,nodeIntegration:false}});view.setBackgroundColor('#f5f6f1');view.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 const navigate=(e:Electron.Event,url:string)=>{try{if(new URL(url).origin!==origin)e.preventDefault();}catch{e.preventDefault();}};
 view.webContents.on('will-navigate',navigate);view.webContents.on('will-redirect',navigate);
 views.set(id,view);void view.webContents.loadURL(origin+'/user').catch(()=>{});return view;}
 function hide(){if(current){window()?.removeBrowserView(current);current=null;}}
 function bounds(id:string,input:{x:number;y:number;width:number;height:number;visible?:boolean}){if(input.visible===false){hide();return;}const w=window();if(!w)return;const view=get(id);if(current!==view){hide();current=view;w.addBrowserView(view);}const [width=0,height=0]=w.getContentSize();const x=Math.max(0,Math.min(width,Math.round(Number(input.x)||0))),y=Math.max(42,Math.min(height,Math.round(Number(input.y)||0)));view.setBounds({x,y,width:Math.max(0,Math.min(width-x,Math.round(Number(input.width)||0))),height:Math.max(0,Math.min(height-y-25,Math.round(Number(input.height)||0)))});}
 async function authenticate(id:string,username:string,password:string){const view=get(id);await view.webContents.loadURL(origin+'/auth/login');if(new URL(view.webContents.getURL()).origin!==origin)throw Error('皮肤站地址不匹配');const value=JSON.stringify({identification:username,password,keep:true});const result=await view.webContents.executeJavaScript(`(async()=>{if(location.origin!==${JSON.stringify(origin)})throw Error('无效页面');const token=document.querySelector('meta[name="csrf-token"]')?.content;if(!token)throw Error('缺少页面令牌');const r=await fetch('/auth/login',{method:'POST',credentials:'same-origin',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-TOKEN':token},body:${JSON.stringify(value)}});return await r.json()})()`);if(result.code!==0)throw Error('请在内嵌皮肤站完成验证');await view.webContents.loadURL(origin+'/user');}
 async function login(id:string,username:string,password:string){let timer:ReturnType<typeof setTimeout>|undefined;try{await Promise.race([authenticate(id,username,password),new Promise((_,reject)=>{timer=setTimeout(()=>{views.get(id)?.webContents.stop();reject(Error('网站登录超时，请在内嵌页面重试'));},18000);})]);}finally{clearTimeout(timer);}}
 async function remove(id:string){const view=views.get(id);if(view===current)hide();await session.fromPartition(partitionFor(id)).clearStorageData();view?.webContents.close();views.delete(id);}
 return {bounds,hide,login,remove,dispose(){hide();for(const v of views.values())v.webContents.close();views.clear();}};
}
