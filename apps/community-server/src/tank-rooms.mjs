import {randomBytes} from 'node:crypto';
import {createGame,step} from '../shared/arcade-engine.mjs';

// Only authenticated inputs cross the wire. Simulation, damage and scores stay here.
export function createTankRooms({auth,body,send,limit,broadcast,points,now=()=>Date.now()}){
 const rooms=new Map();let stopped=false;
 const member=(r,user)=>r.members.find(m=>m.uid===user.uid);
 const view=(r)=>({id:r.id,title:r.title,host:r.host,phase:r.phase,reason:r.reason||'',created:r.created,members:r.members.map(({uid,name,ready,lastSeen})=>({uid,name,ready,online:now()-lastSeen<2500})),state:r.state});
 const emit=r=>broadcast({type:'coop-state',room:view(r)},c=>r.members.some(m=>m.uid===c.user.uid));
 const get=id=>{const r=rooms.get(id);if(!r)throw Error('房间已关闭，请返回大厅重新加入');return r;};
 const clear=r=>r.members.forEach(m=>m.keys=[]);
 function settle(r){if(r.settled||r.phase!=='finished'||r.aborted)return;r.settled=true;for(const m of r.members)points.recordScore('tanks',m,r.state.score);}
 async function route(req,res,url){
  if(!url.pathname.startsWith('/api/coop/tanks'))return false;
  const user=auth(req);if(user.consoleAdmin)throw Error('请使用玩家角色加入游戏');const id=url.pathname.split('/')[4];
  if(req.method==='GET'){send(res,200,id?(()=>{const r=get(id);if(!member(r,user))throw Error('请先加入房间');return {room:view(r),uid:user.uid};})():{items:[...rooms.values()].filter(r=>r.phase==='waiting'||member(r,user)).map(r=>({id:r.id,title:r.title,count:r.members.length,phase:r.phase,joined:!!member(r,user)}))});return true;}
  if(req.method!=='POST')throw Error('不支持的房间操作');limit('tank-room:'+user.uid,40);const input=await body(req,4096);
  if(!id){
   if([...rooms.values()].some(r=>r.phase!=='finished'&&member(r,user)))throw Error('请先离开当前合作房间');if(rooms.size>=100)throw Error('合作房间已满，请稍后再试');
   const id=randomBytes(4).toString('hex').toUpperCase(),r={id,title:String(input.title||user.name+'的防线').slice(0,40),host:user.uid,phase:'waiting',created:now(),updated:now(),members:[{uid:user.uid,name:user.name,ready:true,lastSeen:0,keys:[],seq:-1}],state:createGame('tanks',randomBytes(4).readUInt32LE())};rooms.set(id,r);send(res,201,{room:view(r),uid:user.uid});return true;
  }
  const r=get(id);let m=member(r,user);
  if(input.action==='join'){
   if(!m){if(r.phase!=='waiting'||r.members.length>=2)throw Error('房间已满或已经开始');if([...rooms.values()].some(other=>other.id!==id&&other.phase!=='finished'&&member(other,user)))throw Error('请先离开当前合作房间');m={uid:user.uid,name:user.name,ready:false,lastSeen:0,keys:[],seq:-1};r.members.push(m);}
  }else{
   if(!m)throw Error('你不在这个房间');
   if(input.action==='ready'){if(r.phase!=='waiting')throw Error('本局已经开始');m.ready=!m.ready;}
   else if(input.action==='start'){if(r.host!==user.uid)throw Error('请等待房主开始');if(r.phase!=='waiting'||r.members.length!==2||r.members.some(m=>!m.ready||now()-m.lastSeen>2500))throw Error('请等待两位玩家连接并准备');r.phase='playing';r.started=now();clear(r);}
   else if(input.action==='pause'){if(r.phase==='playing'){r.phase='paused';r.reason=user.name+'暂停了游戏';clear(r);}}
   else if(input.action==='resume'){if(r.phase!=='paused')throw Error('当前未暂停');if(r.members.length!==2||r.members.some(m=>now()-m.lastSeen>2500))throw Error('等待伙伴恢复连接后再继续');r.phase='playing';r.reason='';clear(r);}
   else if(input.action==='leave'){
    if(r.phase==='waiting'){r.members=r.members.filter(p=>p.uid!==user.uid);if(!r.members.length)rooms.delete(id);else r.host=r.members[0].uid;}
    else if(r.phase!=='finished'){r.phase='finished';r.reason=user.name+'离开了房间，本局已停止';r.aborted=true;clear(r);}
    if(r.members.length)emit(r);send(res,200,{left:true});return true;
   }else throw Error('未知房间操作');
  }
  r.updated=now();emit(r);send(res,200,{room:view(r),uid:user.uid});return true;
 }
 function input(user,message,connection){
  limit('tank-control:'+user.uid,60,1000);const r=rooms.get(message.id);if(!r)return;const m=member(r,user);if(!m)return;
  if(!Number.isSafeInteger(message.seq)||message.seq<0||!Array.isArray(message.keys)||message.keys.length>3||message.keys.some(k=>!['up','down','left','right','fire'].includes(k)))return;
  if(m.connection===connection&&message.seq<=m.seq)return;m.connection=connection;m.seq=message.seq;m.lastSeen=now();m.keys=r.phase==='playing'?[...new Set(message.keys)]:[];
 }
 let cycle=0;
 function tick(){if(stopped)return;cycle++;
  for(const [id,r] of rooms){
   if(now()-r.updated>(r.phase==='finished'?5:30)*60000&&(r.phase!=='playing'||now()-r.started>2*3600000)){rooms.delete(id);continue;}
   if(r.phase==='playing'){
    if(r.members.some(m=>now()-m.lastSeen>1800)){r.phase='paused';r.reason='伙伴连接中断，进度已暂停。重连后点击继续。';clear(r);emit(r);continue;}
    const actions=r.state.tick===0?['mode:coop']:[];r.members.forEach((m,i)=>{const direction=m.keys.find(k=>k!=='fire');if(direction)actions.push((i?'p2:':'')+direction);if(m.keys.includes('fire'))actions.push((i?'p2:':'')+'fire');});step(r.state,actions);r.updated=now();
    if(r.state.over){r.phase='finished';settle(r);emit(r);}
   }
   if(cycle%(r.phase==='playing'?2:30)===0)emit(r);
  }
 }
 const timer=setInterval(tick,1000/30);timer.unref();
 return {route,input,tick,close(){stopped=true;clearInterval(timer);rooms.clear();}};
}
