import { contextBridge, ipcRenderer, webUtils } from "electron";
contextBridge.exposeInMainWorld("launcher", {
  filePath: (file: File) => {
    // Electron 22 exposes File.path; newer runtimes use webUtils instead.
    if (!file) return "";
    const value = typeof webUtils?.getPathForFile === "function"
      ? webUtils.getPathForFile(file)
      : (file as File & { path?: string }).path;
    return typeof value === "string" ? value : "";
  },
  invoke: (action: string, input: unknown = {}) =>
    ipcRenderer.invoke("hxz:invoke", action, input),
  subscribe: (callback: (value: unknown) => void) => {
    const listener = (_: unknown, value: unknown) => callback(value);
    ipcRenderer.on("hxz:event", listener);
    return () => ipcRenderer.removeListener("hxz:event", listener);
  }
});
