import {BrowserWindow,ipcMain} from 'electron';
import {Duplex} from 'node:stream';import {randomUUID} from 'node:crypto';import path from 'node:path';
// No remote HTML and no TURN: the renderer supplies Chromium's native ICE/SCTP implementation.
export function createP2PRuntime(){
 let win,ready;const peers=new Map();
 const send=m=>{if(win&&!win.isDestroyed())win.webContents.send('next:p2p-command',m);};
 function ensure(){if(ready)return ready;win=new BrowserWindow({show:false,width:1,height:1,webPreferences:{preload:path.join(import.meta.dirname,'p2p-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.on('render-process-gone',()=>{for(const p of [...peers.values()])p.stream.destroy(Error('P2P 网络组件已退出，请重新连接房间'));const failed=win;win=null;ready=null;failed?.destroy();});const owned=win;win.on('closed',()=>{if(win===owned){win=null;ready=null;}});ready=win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; connect-src \'none\'"><title>HXZ P2P Network</title>'));return ready;}
 const event=(e,m)=>{if(e.sender!==win?.webContents||e.senderFrame!==win.webContents.mainFrame)return;const p=peers.get(m.id);if(!p)return;
  if(m.type==='signal')p.signal(m.signal);
  else if(m.type==='open')p.resolve(p.stream);
  else if(m.type==='written'){const cb=p.writes.get(m.sequence);p.writes.delete(m.sequence);cb?.();}
  else if(m.type==='data'){const bytes=Buffer.from(m.bytes);if(bytes.length>16384){p.stream.destroy(Error('P2P 数据包超限'));return;}if(p.stream.push(bytes))send({type:'credit',id:m.id,bytes:bytes.length});else p.pendingCredit+=bytes.length;}
  else if(m.type==='end')p.stream.push(null);
  else if(m.type==='closed'||m.type==='error')p.stream.destroy(m.error?Error(m.error):undefined);
 };
 ipcMain.on('next:p2p-event',event);
 return {async peer({initiator,signal,iceServers}){
  await ensure();const id=randomUUID();let resolve,reject,sequence=0;const opened=new Promise((a,b)=>{resolve=a;reject=b;}),p={id,signal,resolve,reject,writes:new Map(),pendingCredit:0};
  const stream=new Duplex({highWaterMark:65536,read(){if(p.pendingCredit){send({type:'credit',id,bytes:p.pendingCredit});p.pendingCredit=0;}},write(chunk,_encoding,done){let offset=0;const next=error=>{if(error)return done(error);if(offset>=chunk.length)return done();const bytes=chunk.subarray(offset,offset+16384);offset+=bytes.length;const seq=++sequence;p.writes.set(seq,next);send({type:'write',id,bytes,sequence:seq});};next();},final(done){send({type:'end',id});done();},destroy(error,done){peers.delete(id);send({type:'close',id});reject(error||Error('P2P 通道已关闭'));for(const cb of p.writes.values())cb(error||Error('P2P 通道已关闭'));p.writes.clear();done(error);}});
  p.stream=stream;stream.on('error',()=>{});peers.set(id,p);send({type:'create',id,initiator,iceServers});
  // Callers attach a handler immediately, including responders which never await open directly.
  opened.catch(()=>{});return {stream,opened,signal:value=>send({type:'signal',id,signal:value}),close:()=>stream.destroy()};
 },dispose(){for(const p of [...peers.values()])p.stream.destroy();ipcMain.off('next:p2p-event',event);win?.destroy();ready=null;}};
}
