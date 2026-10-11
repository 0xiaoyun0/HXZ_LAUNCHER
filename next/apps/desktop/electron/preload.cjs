const {contextBridge,ipcRenderer,webUtils,webFrame}=require('electron');
contextBridge.exposeInMainWorld('launcher',{invoke:(action,input={})=>ipcRenderer.invoke('next:invoke',action,input),filePath:file=>typeof webUtils?.getPathForFile==='function'?webUtils.getPathForFile(file):file?.path||'',subscribe:callback=>{const listener=(_,value)=>callback(value);ipcRenderer.on('next:event',listener);return()=>ipcRenderer.removeListener('next:event',listener);}});

ipcRenderer.on('next:memory-compact',()=>{webFrame.clearCache();});
