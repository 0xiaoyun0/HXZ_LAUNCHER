import {randomUUID} from 'node:crypto';

// Short-lived collaboration state. Screen media is never carried by this service.
export function createVoiceTools({clients,auth,body,send,limit,now=Date.now}){
 const rooms=new Map();
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 function members(room){return [...clients.values()].filter(c=>c.room===room&&c.user.exp>now());}
 function update(room){
  const list=members(room),ids=new Set(list.map(c=>c.id));if(!list.length){rooms.delete(room);return null;}
  let s=rooms.get(room);if(!s){s={host:list[0].id,mode:'chat',ends:0,hands:[],speakers:[],captions:[],sequence:0,screen:null};rooms.set(room,s);}
  if(!ids.has(s.host))s.host=list[0].id;s.hands=s.hands.filter(id=>ids.has(id));s.speakers=s.speakers.filter(id=>ids.has(id));s.captions=s.captions.filter(v=>v.created>now()-300000).slice(-40);
  if(s.screen){if(!ids.has(s.screen.host)||s.screen.seen<now()-30000)s.screen=null;else {s.screen.viewers=s.screen.viewers.filter(v=>ids.has(v.id)&&v.seen>now()-30000);const allowed=new Set([s.screen.host,...s.screen.viewers.map(v=>v.id)]);s.screen.signals=s.screen.signals.filter(v=>allowed.has(v.from)&&allowed.has(v.to)&&v.created>now()-30000).slice(-256);}}
  return s;
 }
 const timer=setInterval(()=>{for(const room of rooms.keys())update(room);},15000);timer.unref();
 function view(s,c){const screen=s.screen;if(screen?.host===c.id)screen.seen=now();const viewer=screen?.viewers.find(v=>v.id===c.id);if(viewer)viewer.seen=now();return {room:c.room,id:c.id,host:s.host,mode:s.mode,ends:s.ends,hands:s.hands,speakers:s.speakers,members:members(c.room).map(v=>({id:v.id,uid:v.user.uid,name:v.user.name,platform:v.platform,muted:!!v.muted})),captions:s.captions,screen:screen?{id:screen.id,host:screen.host,title:screen.title,viewers:screen.viewers.map(v=>v.id),watchers:screen.viewers.map(v=>({id:v.id,version:v.version})),limit:4}:null};}
 async function route(req,res,url){
  if(!url.pathname.startsWith('/api/voice-tools/'))return false;const user=auth(req),read=req.method==='GET';limit('voice-tools:'+user.uid+':'+(read?'read':'write'),read?240:120,60000);const input=read?{}:await body(req,40000),id=read?url.searchParams.get('client'):input.client;
  const c=[...clients.values()].find(v=>v.id===id&&v.user.uid===user.uid);if(!c?.room)fail(409,'请先在这台设备加入语音房间');const s=update(c.room);if(!s)fail(409,'语音房间已结束');const op=url.pathname.slice('/api/voice-tools/'.length);
  if(op==='state'&&read){const value=view(s,c),after=Number(url.searchParams.get('after'))||0;send(res,200,{...value,signals:s.screen?.signals.filter(v=>v.to===id&&v.seq>after)||[]});return true;}
  if(req.method!=='POST')fail(405,'不支持的房间操作');
  const control=()=>{if(s.host!==id)fail(403,'只有本房间的主持人可以调整');};
  if(op==='mode'){control();if(!['chat','classroom','study','help'].includes(input.mode))fail(400,'请选择有效模式');s.mode=input.mode;s.speakers=[];s.hands=[];s.ends=0;if(s.mode==='classroom'&&s.screen?.host!==s.host)s.screen=null;}
  else if(op==='host'){control();if(!members(c.room).some(v=>v.id===input.target))fail(400,'对方已离开房间');s.host=input.target;}
  else if(op==='hand'){if(input.raised&&!s.hands.includes(id))s.hands.push(id);if(!input.raised)s.hands=s.hands.filter(v=>v!==id);}
  else if(op==='speaker'){control();if(!members(c.room).some(v=>v.id===input.target))fail(400,'对方已离开房间');s.speakers=s.speakers.filter(v=>v!==input.target);if(input.allowed)s.speakers.push(input.target);s.hands=s.hands.filter(v=>v!==input.target);}
  else if(op==='timer'){control();const minutes=Number(input.minutes);if(![0,15,25,45,60].includes(minutes))fail(400,'请选择 15、25、45 或 60 分钟');s.ends=minutes?now()+minutes*60000:0;}
  else if(op==='caption'){if(input.source==='speech'&&c.muted)fail(403,'麦克风已静音，语音字幕已暂停');limit('voice-caption:'+id,30,60000);if(s.mode==='classroom'&&s.host!==id&&!s.speakers.includes(id))fail(403,'请先举手，由主持人允许发言');const text=typeof input.text==='string'?input.text.trim():'';if(!text||text.length>500)fail(400,'字幕需要 1–500 个字符');s.captions.push({id:randomUUID(),from:id,name:c.user.name,text,created:now(),source:input.source==='speech'?'speech':'typed'});s.captions=s.captions.slice(-40);}
  else if(op==='screen/start'){
   if(s.mode==='classroom'&&s.host!==id&&!s.speakers.includes(id))fail(403,'请先获得主持人的发言许可');if(s.screen&&s.screen.host!==id)fail(409,'已有成员在分享，请等待结束');
   s.screen={id:randomUUID(),host:id,title:String(input.title||'屏幕分享').slice(0,100),seen:now(),viewers:[],signals:[]};
  }else if(op==='screen/stop'){if(s.screen&&s.screen.host!==id&&s.host!==id)fail(403,'只能停止自己或所主持房间的分享');s.screen=null;}
  else if(op==='screen/watch'){
   const screen=s.screen;if(!screen||screen.id!==input.screen)fail(409,'屏幕分享已结束或已重新开始');if(screen.host===id)fail(400,'无需观看自己的分享');screen.viewers=screen.viewers.filter(v=>v.id!==id);
   screen.signals=screen.signals.filter(v=>v.to!==id&&v.from!==id);if(input.watching){if(screen.viewers.length>=4)fail(409,'本次分享已达到 4 位观众');screen.viewers.push({id,version:randomUUID(),seen:now()});}
  }else if(op==='screen/signal'){
   const screen=s.screen;if(!screen||screen.id!==input.screen)fail(409,'屏幕分享已结束');const watcher=screen.viewers.find(v=>v.id===(id===screen.host?input.to:id)),paired=watcher&&(screen.host===id||input.to===screen.host);if(!paired)fail(403,'需要先在同一房间选择观看');if(watcher.version!==input.connection)fail(409,'观看连接已更新，请重新连接');
   const data=input.data;if(!data||!['offer','answer','candidate'].includes(data.type))fail(400,'连接消息无效');if(data.type!=='candidate'&&(typeof data.sdp!=='string'||data.sdp.length>32000||data.sdp.includes('m=application')))fail(400,'只允许屏幕媒体协商');
   if(data.type==='offer'&&id!==screen.host||data.type==='answer'&&id===screen.host)fail(403,'连接方向不正确');if(data.type==='candidate'&&(typeof data.candidate?.candidate!=='string'||data.candidate.candidate.length>2000))fail(400,'连接地址无效');
   screen.signals.push({seq:++s.sequence,from:id,to:input.to,connection:watcher.version,data,created:now()});screen.signals=screen.signals.slice(-256);while(Buffer.byteLength(JSON.stringify(screen.signals))>196608)screen.signals.shift();
  }else fail(404,'房间操作不存在');
  send(res,200,view(s,c));return true;
 }
 return {route,joined:c=>update(c.room),canSpeak:c=>{const s=rooms.get(c.room);return !s||s.mode!=='classroom'||s.host===c.id||s.speakers.includes(c.id);},close:()=>{clearInterval(timer);rooms.clear();}};
}
