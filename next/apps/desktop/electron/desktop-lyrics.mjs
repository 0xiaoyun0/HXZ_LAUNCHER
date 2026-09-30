import {BrowserWindow,ipcMain,Tray,Menu,nativeImage,screen} from 'electron';
import fs from 'node:fs';
import path from 'node:path';

// A separate transparent window: it never occupies or recolors a launcher grid row.
export function createDesktopLyrics({app,mainWindow,emit,icon,preload}){
 const file=path.join(app.getPath('userData'),'desktop-lyrics.json');let saved={};try{saved=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 const options={keepPlayingOnClose:saved.keepPlayingOnClose===true,locked:saved.locked===true,alwaysOnTop:saved.alwaysOnTop!==false};
 let win,tray,visible=false,disposed=false,timer,last={},bounds=saved.bounds;
 function persist(){clearTimeout(timer);timer=setTimeout(()=>{try{fs.writeFileSync(file,JSON.stringify({...options,bounds}));}catch{}},250);}
 function showMain(){const main=mainWindow();if(main&&!main.isDestroyed()){main.show();if(main.isMinimized())main.restore();main.focus();}}
 function state(){return {...options,visible};}
 function notify(){emit({type:'desktop-lyrics-state',...state()});}
 function menu(){if(!tray)return;tray.setContextMenu(Menu.buildFromTemplate([
  {label:'打开幻想镇',click:showMain},{label:last.playing?'暂停音乐':'播放音乐',click:()=>emit({type:'lyrics-control',action:'toggle'})},
  {type:'separator'},{label:'显示桌面歌词',type:'checkbox',checked:visible,click:item=>{visible=item.checked;if(visible)ensureWindow();else win?.hide();paint();notify();menu();}},
  {label:'锁定歌词（鼠标穿透）',type:'checkbox',checked:options.locked,click:item=>configure({locked:item.checked})},
  {label:'歌词保持置顶',type:'checkbox',checked:options.alwaysOnTop,click:item=>configure({alwaysOnTop:item.checked})},
  {label:'关闭主窗口后继续播放',type:'checkbox',checked:options.keepPlayingOnClose,click:item=>configure({keepPlayingOnClose:item.checked})},
  {type:'separator'},{label:'退出幻想镇并停止音乐',click:()=>app.quit()}
 ]));tray.setToolTip(('幻想镇 · '+(last.title||'桌面歌词')).slice(0,100));}
 function ensureTray(){if(tray)return;tray=new Tray(nativeImage.createFromPath(icon).resize({width:20,height:20}));tray.on('double-click',showMain);menu();}
 function validBounds(){const fallback=screen.getPrimaryDisplay().workArea;const candidate=bounds&&Number.isFinite(bounds.x)&&Number.isFinite(bounds.y)?bounds:{x:fallback.x+(fallback.width-620)/2,y:fallback.y+fallback.height-170,width:620,height:126};const area=screen.getDisplayMatching({x:Math.round(candidate.x),y:Math.round(candidate.y),width:Math.max(320,Math.round(candidate.width||620)),height:Math.max(100,Math.round(candidate.height||126))}).workArea;const width=Math.min(area.width,Math.max(320,Math.min(1000,Math.round(candidate.width||620)))),height=Math.min(area.height,Math.max(100,Math.min(260,Math.round(candidate.height||126))));return {width,height,x:Math.round(Math.max(area.x,Math.min(area.x+area.width-width,candidate.x))),y:Math.round(Math.max(area.y,Math.min(area.y+area.height-height,candidate.y)))};}
 function ensureWindow(){if(disposed)return;if(win&&!win.isDestroyed()){if(!win.isVisible()&&!win.webContents.isLoadingMainFrame())win.showInactive();return;}ensureTray();win=new BrowserWindow({...validBounds(),minWidth:320,minHeight:100,maxWidth:1000,maxHeight:260,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,resizable:true,skipTaskbar:true,alwaysOnTop:options.alwaysOnTop,show:false,webPreferences:{preload,contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
  win.setAlwaysOnTop(options.alwaysOnTop,'floating');win.setIgnoreMouseEvents(options.locked,{forward:true});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  const moved=()=>{if(win&&!win.isDestroyed()){bounds=win.getBounds();persist();}};win.on('move',moved);win.on('resize',moved);
  win.on('close',e=>{if(!disposed){e.preventDefault();visible=false;win.hide();notify();menu();}});
  win.once('ready-to-show',()=>{if(visible){paint();win.showInactive();}});win.webContents.on('did-finish-load',paint);
  void win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
 }
 function paint(){if(win&&!win.isDestroyed())win.webContents.send('desktop-lyrics:state',{...last,...options});}
 function configure(input={}){for(const key of ['keepPlayingOnClose','locked','alwaysOnTop'])if(typeof input[key]==='boolean')options[key]=input[key];if(win&&!win.isDestroyed()){win.setAlwaysOnTop(options.alwaysOnTop,'floating');win.setIgnoreMouseEvents(options.locked,{forward:true});}persist();paint();notify();menu();return state();}
 function update(input={}){const wasVisible=visible,wasPlaying=last.playing,wasTitle=last.title;visible=!!input.visible;last={title:String(input.title||'').slice(0,500),text:String(input.text||'暂无同步歌词').slice(0,3000),translation:String(input.translation||'').slice(0,3000),playing:!!input.playing,motionOff:!!input.motionOff};if(visible)ensureWindow();else win?.hide();paint();if(wasVisible!==visible||wasPlaying!==last.playing||wasTitle!==last.title)menu();return state();}
 function action(event,name){if(disposed||event.sender!==win?.webContents)return;if(name==='hide'){visible=false;win.hide();notify();menu();}else if(name==='lock')configure({locked:true});else if(name==='open')showMain();else if(['toggle','previous','next'].includes(name))emit({type:'lyrics-control',action:name});}
 ipcMain.on('desktop-lyrics:action',action);
 return {state,update,configure,keepAlive:()=>options.keepPlayingOnClose&&visible,hideMain:()=>{ensureTray();mainWindow()?.hide();},dispose(){if(disposed)return;disposed=true;clearTimeout(timer);try{fs.writeFileSync(file,JSON.stringify({...options,bounds}));}catch{}ipcMain.removeListener('desktop-lyrics:action',action);win?.destroy();tray?.destroy();win=null;tray=null;}};
}

const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>幻想镇 · 桌面歌词</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:'Segoe UI','Microsoft YaHei',sans-serif}body{padding:4px}.lyrics-window{height:100%;border:1px solid transparent;border-radius:14px;padding:7px 12px;display:flex;flex-direction:column;justify-content:center;gap:4px;user-select:none;-webkit-app-region:drag;transition:background .15s,border-color .15s}body:not(.locked):hover .lyrics-window{background:rgba(29,36,54,.87);border-color:rgba(219,226,245,.25)}header{display:flex;gap:5px;align-items:center;min-height:28px;color:#e8ecf7;opacity:0;transition:opacity .15s}body:not(.locked):hover header{opacity:1}header span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}button{-webkit-app-region:no-drag;width:28px;height:26px;border:0;border-radius:7px;display:grid;place-items:center;color:#eef1fa;background:transparent;font-size:14px;cursor:pointer}button:hover{background:#ffffff20}button:focus-visible{outline:2px solid #aebaff}main{min-height:0;flex:1;display:flex;flex-direction:column;justify-content:center;gap:4px;text-align:center;color:#fff;text-shadow:0 1px 2px #000e}strong{font-size:22px;line-height:1.3;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}small{font-size:13px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#eef1fa}small:empty{display:none}.locked header{visibility:hidden}.locked .lyrics-window{background:transparent;border-color:transparent}body.motion-off *{transition:none!important}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style></head><body><section class="lyrics-window" aria-label="桌面歌词"><header><span id="title"></span><button data-action="previous" title="上一首" aria-label="上一首">‹</button><button data-action="toggle" id="play" title="播放或暂停" aria-label="播放或暂停">Ⅱ</button><button data-action="next" title="下一首" aria-label="下一首">›</button><button data-action="open" title="打开启动器" aria-label="打开启动器">↗</button><button data-action="lock" title="锁定并穿透鼠标；在托盘菜单解锁" aria-label="锁定桌面歌词">▣</button><button data-action="hide" title="收回歌词" aria-label="收回歌词">×</button></header><main><strong id="lyric">暂无同步歌词</strong><small id="translation"></small></main></section></body></html>`;
