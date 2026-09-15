const {app,BrowserWindow,ipcMain,session,nativeImage}=require('electron');const path=require('node:path'),fs=require('node:fs');
const configFile=process.argv.find(arg=>arg.endsWith('fixture.json'));const fixture=JSON.parse(fs.readFileSync(configFile,'utf8'));fs.mkdirSync(path.join(path.dirname(configFile),'profile'),{recursive:true});app.setPath('userData',path.join(path.dirname(configFile),'profile'));app.commandLine.appendSwitch('use-fake-device-for-media-stream');app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const clients=new Map();
app.whenReady().then(async()=>{
 const avatarFile=path.join(path.dirname(configFile),'portrait.png');fs.writeFileSync(avatarFile,nativeImage.createFromBitmap(Buffer.alloc(32*32*4,180),{width:32,height:32}).toPNG());
 const {createServices}=await import(require('node:url').pathToFileURL(path.resolve(__dirname,'../../client/src-electron/core/services.mjs')).href);
 const avatarHelper=await createServices({data:path.join(path.dirname(configFile),'avatar-helper'),resources:path.resolve(__dirname,'../../client/resources'),safeStorage:{isEncryptionAvailable:()=>false},nativeImage,dialog:{showOpenDialog:async()=>({canceled:false,filePaths:[avatarFile]})},shell:{},window:()=>null,openSkin:()=>{},emit:()=>{}});

 session.defaultSession.setPermissionRequestHandler((_,p,cb)=>cb(p==='media'));session.defaultSession.setPermissionCheckHandler((_,p)=>p==='media');
 ipcMain.handle('fixture:invoke',async(event,action,input)=>{try{const c=clients.get(event.sender.id);let value;if(action==='state')value=c.state;else if(action==='community.connect')value={...c.session,base:fixture.base};else if(action==='settings.save'){Object.assign(c.state.settings,input);value=c.state.settings;}
 else if(action==='avatar.choose')value=await avatarHelper.invoke('avatar.choose');
 else if(action==='avatar.save'){const r=await fetch(fixture.base+'/api/profile/avatar',{method:'POST',headers:{Authorization:'Bearer '+c.session.token,'Content-Type':'application/json'},body:JSON.stringify({avatar:input.avatar})});if(!r.ok)throw Error((await r.json()).error);c.state.accounts[0].avatar=input.avatar;value={synced:true};}
 else if(action==='update-logs.list')value=await fetch(fixture.base+'/api/update-logs').then(r=>r.json());
 else if(action==='notices.list')value=await fetch(fixture.base+'/api/notices').then(r=>r.json());else if(action==='notices.publish'){const r=await fetch(fixture.base+'/api/notices',{method:'POST',headers:{Authorization:'Bearer '+c.session.token,'Content-Type':'application/json'},body:JSON.stringify(input)});value=await r.json();if(!r.ok)throw Error(value.error);}else throw Error('Unsupported fixture action');return {ok:true,value};}catch(e){return {ok:false,error:e.message};}});
 for(const entry of fixture.clients){const w=new BrowserWindow({show:false,width:1280,height:840,webPreferences:{backgroundThrottling:false,preload:path.join(__dirname,'community-preload.cjs'),sandbox:true,contextIsolation:true}});clients.set(w.webContents.id,entry);await w.loadFile(fixture.page);}
});app.on('window-all-closed',()=>app.quit());
