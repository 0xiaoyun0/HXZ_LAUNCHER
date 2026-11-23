import {attachRtc} from './rtc.js';
type Packet = { payload: Record<string, unknown> };
type Native = {
  core: { invoke<T>(command:string, args:Record<string,unknown>):Promise<T> };
  event: { listen(name:string, fn:(event:Packet)=>void):Promise<()=>void> };
};
const shell = (window as Window & { __TAURI__?: Native }).__TAURI__;
if (shell && window.top === window) {
  const listeners = new Set<(event:any)=>void>();
  const listening = shell.event.listen('engine-event', event => { for (const fn of listeners) fn(event.payload); });
  attachRtc((event:unknown)=>{void shell.core.invoke('launcher_request',{action:'rtc.event',input:event}).catch(()=>{});},(receive:(v:unknown)=>void)=>listeners.add(e=>{if(e.type==='rtc-command')receive(e.command);}));
  window.launcher = {
    async invoke(action, input = {}) {
      try {
        await listening;
        const value = await shell.core.invoke('launcher_request',{action,input});
        return {ok:true, value};
      } catch (error) { return {ok:false,error:String(error)}; }
    },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    filePath() { return ''; } // Native file drops arrive as pack-drop events.
  };
}
export {};
