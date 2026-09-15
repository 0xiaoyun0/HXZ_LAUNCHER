import { contextBridge, ipcRenderer, webUtils } from "electron";
contextBridge.exposeInMainWorld("launcher", {
  filePath: (file: File) => webUtils.getPathForFile(file),
  invoke: (action: string, input: unknown = {}) =>
    ipcRenderer.invoke("hxz:invoke", action, input),
  subscribe: (callback: (value: unknown) => void) => {
    const listener = (_: unknown, value: unknown) => callback(value);
    ipcRenderer.on("hxz:event", listener);
    return () => ipcRenderer.removeListener("hxz:event", listener);
  }
});
