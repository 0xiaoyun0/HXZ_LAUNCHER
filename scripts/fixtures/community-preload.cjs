const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('launcher',{invoke:(action,input)=>ipcRenderer.invoke('fixture:invoke',action,input),subscribe:callback=>{const listener=(_,event)=>callback(event);ipcRenderer.on('fixture:event',listener);return()=>ipcRenderer.removeListener('fixture:event',listener);}});
