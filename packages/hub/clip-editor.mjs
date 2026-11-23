import {el} from './dom.mjs';
// Record only a user-selected local file. No screen capture or remote URL is opened here.
export function clipEditor(ctx,blob,name,save){
 const {surface}=ctx,{dialog,button,field}=surface,d=dialog('截取视频片段'),url=URL.createObjectURL(blob),video=el('video','','hub-asset-video'),grid=el('div','','hub-form-grid'),status=el('p','选择起止时间，按正常播放速度保存片段。最多 120 秒 / 64 MB。','hub-muted');video.src=url;video.controls=true;video.playsInline=true;video.preload='metadata';d.content.append(video,grid,status);
 const from=field(grid,'开始秒数',0,'number'),to=field(grid,'结束秒数',10,'number');from.min=to.min='0';from.step=to.step='0.1';let recorder,stream,timer,closed=false,cancelled=false,chunks=[],bytes=0,abortSeek;
 const stop=()=>{clearInterval(timer);if(recorder?.state==='recording')recorder.stop();video.pause();};
 const release=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;};
 video.onloadedmetadata=()=>{if(Number.isFinite(video.duration)){to.value=String(Math.min(10,video.duration));to.max=from.max=String(video.duration);}};
 const start=button('保存所选片段',async()=>{
  const a=Number(from.value),b=Number(to.value);if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=a||b>video.duration+.05||b-a>120)throw Error('请填写有效起止时间，单段最多 120 秒');
  if(!video.captureStream||!globalThis.MediaRecorder)throw Error('此设备不支持片段编码；可以保留原视频，或使用系统编辑器截取后导入');
  const mime=['video/webm;codecs=vp8,opus','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));if(!mime)throw Error('此设备没有可用的视频编码器');
  cancelled=false;chunks=[];bytes=0;video.controls=false;from.disabled=to.disabled=true;cancel.disabled=false;
  try{
   video.pause();await new Promise((resolve,reject)=>{let timeout;const done=error=>{clearTimeout(timeout);video.removeEventListener('seeked',ready);video.removeEventListener('error',failed);abortSeek=null;error?reject(error):resolve();};const ready=()=>done(),failed=()=>done(Error('视频定位失败，原视频仍然保留'));abortSeek=()=>done(Error('已取消截取'));video.addEventListener('seeked',ready,{once:true});video.addEventListener('error',failed,{once:true});timeout=setTimeout(()=>done(Error('视频定位超时，请重新导入或使用系统编辑器')),10000);video.currentTime=a;if(!video.seeking&&Math.abs(video.currentTime-a)<.05)done();});
   if(closed||cancelled)return;await video.play();stream=video.captureStream();recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3000000});
   await new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{bytes+=e.data.size;if(bytes>64*1024*1024){cancelled=true;status.textContent='片段超过 64 MB，请缩短时间后重试';stop();}else chunks.push(e.data);};recorder.onerror=()=>{cancelled=true;reject(Error('设备编码失败，原视频仍然保留'));};recorder.onstop=resolve;recorder.start(250);timer=setInterval(()=>{status.textContent='正在保存 '+Math.max(0,video.currentTime-a).toFixed(1)+' / '+(b-a).toFixed(1)+' 秒';if(video.currentTime>=b||video.ended)stop();},100);});
   if(!cancelled&&!closed){if(!bytes)throw Error('没有取得视频数据');await save(new Blob(chunks,{type:'video/webm'}),{name:name.replace(/\.[^.]+$/,'')+' · 片段',duration:Math.min(b,video.currentTime)-a});status.textContent='片段已加入素材库';}
  }finally{clearInterval(timer);release();chunks=[];video.pause();video.controls=true;from.disabled=to.disabled=false;cancel.disabled=true;}
 },true);
 const cancel=button('停止并放弃本次片段',()=>{cancelled=true;abortSeek?.();stop();status.textContent='已停止，原视频没有改变';});cancel.disabled=true;d.footer.append(cancel,start);
 const cleanup=()=>{if(closed)return;closed=true;cancelled=true;abortSeek?.();stop();release();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);};cleanup.node=d.node;d.node.addEventListener('close',cleanup,{once:true});d.onClose(close=>!cancel.disabled?surface.confirm('停止截取？','未完成的片段不会保存。',close):close());return cleanup;
}
