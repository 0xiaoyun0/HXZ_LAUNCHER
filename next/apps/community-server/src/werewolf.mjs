import {randomInt,randomUUID} from 'node:crypto';
const ROLES={wolf:'狼人',seer:'预言家',witch:'女巫',villager:'村民'};
const DURATIONS={wolves:45000,seer:30000,witch:30000,discussion:90000,vote:45000};
export function createWerewolf({auth,body,send,limit,points,broadcast=()=>{},now=Date.now}){
 const rooms=new Map();
 const alive=r=>r.players.filter(p=>p.alive),member=(r,uid)=>r.players.find(p=>p.uid===uid);
 function note(r,text){r.log.push({id:randomUUID(),text,at:now()});r.log=r.log.slice(-80);}
 function change(r,phase){r.phase=phase;r.turn=randomUUID();r.actions={};r.deadline=now()+(DURATIONS[phase]||1800000);r.updated=now();broadcast({type:'werewolf',id:r.id});}
 function check(r){const n=alive(r),wolves=n.filter(p=>p.role==='wolf').length;const result=!wolves?'village':wolves>=n.length-wolves?'wolves':r.day>12?'draw':null;if(!result)return false;
  r.result=result;change(r,'finished');note(r,result==='draw'?'十二轮后仍未分胜负，本局和局。':result==='wolves'?'狼人阵营获胜。':'好人阵营获胜。');
  if(r.ranked&&!r.settled){r.settled=true;for(const p of r.players)if(!p.bot&&result!=='draw'&&((p.role==='wolf')===(result==='wolves')))points?.win({uid:p.uid,name:p.name},r.id);}
  return true;
 }
 function eligible(r){const list=alive(r);return r.phase==='wolves'?list.filter(p=>p.role==='wolf'):r.phase==='seer'?list.filter(p=>p.role==='seer'):r.phase==='witch'?list.filter(p=>p.role==='witch'):r.phase==='vote'?list:[];}
 function targets(r,p){return alive(r).filter(t=>t.uid!==p.uid&&(r.phase!=='wolves'||t.role!=='wolf'));}
 function tally(r){const counts=new Map();for(const [uid,a] of Object.entries(r.actions))if(member(r,uid)?.alive&&alive(r).some(p=>p.uid===a.target))counts.set(a.target,(counts.get(a.target)||0)+1);const sorted=[...counts].sort((a,b)=>b[1]-a[1]);return sorted.length&&(sorted.length===1||sorted[0][1]>sorted[1][1])?sorted[0][0]:null;}
 function choose(r,p){const list=targets(r,p);if(!list.length)return {target:null};
  if(r.phase==='witch'){if(r.victim&&p.heal)return {choice:'heal',target:null};return {choice:'skip',target:null};}
  let candidate=list;if(r.phase==='vote'){const seen=p.checks?.find(v=>v.wolf&&list.some(t=>t.uid===v.uid));if(seen)return {target:seen.uid};if(p.role==='wolf')candidate=list.filter(t=>t.role!=='wolf');}
  return {target:candidate.length?candidate[randomInt(candidate.length)].uid:null};
 }
 function advance(r){
  if(r.phase==='wolves'){r.victim=tally(r);change(r,'seer');}
  else if(r.phase==='seer'){for(const p of eligible(r)){const t=member(r,r.actions[p.uid]?.target);if(t){p.checks||=[];p.checks.push({uid:t.uid,name:t.name,wolf:t.role==='wolf',day:r.day});}}change(r,'witch');}
  else if(r.phase==='witch'){
   const dead=new Set(r.victim?[r.victim]:[]);for(const p of eligible(r)){const a=r.actions[p.uid];if(a?.choice==='heal'&&p.heal&&r.victim){dead.delete(r.victim);p.heal=false;}else if(a?.choice==='poison'&&p.poison&&a.target&&member(r,a.target)?.alive){dead.add(a.target);p.poison=false;}}
   for(const uid of dead){const p=member(r,uid);if(p)p.alive=false;}
   note(r,dead.size?'天亮了，'+[...dead].map(uid=>member(r,uid)?.name).join('、')+' 出局。':'天亮了，昨夜平安。');if(!check(r))change(r,'discussion');
  }else if(r.phase==='discussion')change(r,'vote');
  else if(r.phase==='vote'){
   const target=tally(r);note(r,'投票：'+alive(r).map(p=>p.name+' → '+(member(r,r.actions[p.uid]?.target)?.name||'弃票')).join('；'));
   if(target){member(r,target).alive=false;note(r,member(r,target).name+' 被投票放逐。');}else note(r,'平票或全部弃票，无人出局。');
   if(!check(r)){r.day++;r.victim=null;change(r,'wolves');note(r,'第 '+r.day+' 夜开始。');}
  }
 }
 function tick(r){if(['waiting','finished'].includes(r.phase))return;
  const players=eligible(r);for(const p of players)if(p.bot&&!r.actions[p.uid])r.actions[p.uid]=choose(r,p);
  const ready=r.phase!=='discussion'&&players.every(p=>r.actions[p.uid]);if(ready||now()>=r.deadline)advance(r);
 }
 function view(r,user){const me=member(r,user.uid),eligibleMe=me?.alive&&eligible(r).some(p=>p.uid===me.uid),night=['wolves','seer','witch'].includes(r.phase);
  return {id:r.id,title:r.title,host:r.host,day:r.day,phase:night?'night':r.phase,turn:r.turn,deadline:r.deadline,result:r.result||null,ranked:!!r.ranked,
   players:r.players.map((p,i)=>({uid:p.uid,name:p.name,seat:i+1,bot:!!p.bot,alive:p.alive,ready:!!p.ready,...(r.phase==='finished'?{role:ROLES[p.role]}:{})})),
   me:me?{uid:me.uid,role:me.role?ROLES[me.role]:'等待发牌',alive:me.alive,canAct:eligibleMe&&!r.actions[me.uid],submitted:!!r.actions[me.uid],action:eligibleMe?r.phase:null,
    teammates:me.role==='wolf'?r.players.filter(p=>p.role==='wolf').map(p=>p.uid):[],checks:me.checks||[],heal:me.role==='witch'&&!!me.heal,poison:me.role==='witch'&&!!me.poison,
    victim:me.role==='witch'&&r.phase==='witch'?r.victim:null,targets:eligibleMe?targets(r,me).map(p=>p.uid):[]}:null,
   log:r.log,chat:r.chat,canChat:!!me?.alive&&['discussion','vote'].includes(r.phase)||r.phase==='waiting'&&!!me||r.phase==='finished'&&!!me};
 }
 const timer=setInterval(()=>{for(const [id,r] of rooms){try{tick(r);if(now()-r.updated>60*60000)rooms.delete(id);}catch{change(r,'finished');note(r,'本局发生异常，已安全结束。');}}},1000);timer.unref?.();
 async function route(req,res,url){if(!url.pathname.startsWith('/api/werewolf'))return false;
  const user=auth(req);if(user.consoleAdmin)throw Error('请使用玩家角色参与游戏');const id=url.pathname.split('/')[3];let r=id?rooms.get(id):null;
  if(req.method==='GET'){
   if(!id)send(res,200,{items:[...rooms.values()].filter(r=>r.phase!=='finished'||member(r,user.uid)).map(r=>({id:r.id,title:r.title,count:r.players.length,phase:r.phase==='waiting'?'waiting':r.phase==='finished'?'finished':'playing',joined:!!member(r,user.uid)}))});
   else{if(!r)throw Error('房间已结束或服务重启，请重新进入');if(!member(r,user.uid))throw Error('请先加入房间');tick(r);send(res,200,view(r,user));}return true;
  }
  if(req.method!=='POST')throw Error('不支持的操作');limit('werewolf:'+user.uid,45);const data=await body(req,4096);
  if(!id){
   if([...rooms.values()].some(r=>r.phase!=='finished'&&member(r,user.uid)))throw Error('请先离开当前狼人杀房间');if(rooms.size>=200)throw Error('房间已满，请稍后再试');
   const title=String(data.title||user.name+'的圆桌').trim().slice(0,40);r={id:randomUUID(),title,host:user.uid,players:[{...user,alive:true,ready:true}],phase:'waiting',turn:randomUUID(),day:1,chat:[],log:[],actions:{},updated:now(),deadline:now()+1800000};rooms.set(r.id,r);
  }else{
   if(!r)throw Error('房间已结束');tick(r);let p=member(r,user.uid);
   if(data.action==='join'){
    if(!p){if(r.phase!=='waiting'||r.players.length>=6)throw Error('房间已开始或座位已满');if([...rooms.values()].some(v=>v!==r&&v.phase!=='finished'&&member(v,user.uid)))throw Error('请先离开当前房间');r.players.push({...user,alive:true,ready:false});}
   }else{
    if(!p)throw Error('请先加入房间');
    if(data.action==='leave'){
     if(r.phase==='waiting'){r.players=r.players.filter(v=>v!==p);if(r.host===p.uid)r.host=r.players[0]?.uid;if(!r.players.length)rooms.delete(r.id);}
     else if(r.phase!=='finished'){p.alive=false;p.left=true;note(r,p.name+' 离开了本局。');check(r);}
     else p.left=true;send(res,200,{left:true});return true;
    }else if(data.action==='ready'){if(r.phase!=='waiting')throw Error('对局已经开始');p.ready=!p.ready;}
    else if(data.action==='start'){
     if(user.uid!==r.host||r.phase!=='waiting')throw Error('由房主在等待阶段开始');if(r.players.some(v=>!v.ready))throw Error('请等待其他玩家准备');if(r.players.length<6&&!data.fillBots)throw Error('需要六个座位，可用练习机器人补齐');
     const human=r.players.length;while(r.players.length<6)r.players.push({uid:'bot-'+randomUUID(),name:'练习旅人 '+(r.players.length+1),bot:true,alive:true,ready:true});
     const roles=['wolf','wolf','seer','witch','villager','villager'];for(let i=roles.length-1;i>0;i--){const j=randomInt(i+1);[roles[i],roles[j]]=[roles[j],roles[i]];}
     r.players.forEach((p,i)=>Object.assign(p,{role:roles[i],alive:true,checks:[],heal:true,poison:true}));r.ranked=human===6;r.started=now();change(r,'wolves');note(r,'第 1 夜开始。'+(r.ranked?'真人对局，胜方计入每周联机积分。':'含机器人，仅供练习，不发放联机积分。'));
    }else if(data.action==='chat'){
     if(!view(r,user).canChat)throw Error('夜间或出局后暂不能发言');limit('werewolf-chat:'+user.uid,8,10000);const text=typeof data.text==='string'?data.text.trim():'';if(!text||text.length>300)throw Error('请输入 1–300 字');r.chat.push({id:randomUUID(),uid:p.uid,name:p.name,text,at:now()});r.chat=r.chat.slice(-100);
    }else if(data.action==='act'){
     if(data.turn!==r.turn)throw Error('当前回合已切换，请重新选择');if(!p.alive||!eligible(r).includes(p)||r.actions[p.uid])throw Error('当前无需行动，或已提交');
     const target=data.target||null;if(target&&!targets(r,p).some(t=>t.uid===target))throw Error('请选择有效玩家');
     if(r.phase==='witch'){if(!['heal','poison','skip'].includes(data.choice))throw Error('请选择药剂或跳过');if(data.choice==='heal'&&(!p.heal||!r.victim)||data.choice==='poison'&&(!p.poison||!target))throw Error('药剂不可用');r.actions[p.uid]={choice:data.choice,target};}
     else r.actions[p.uid]={target};tick(r);
    }else throw Error('未知房间操作');
   }
   r.updated=now();
  }
  broadcast({type:'werewolf',id:r.id});send(res,200,view(r,user));return true;
 }
 return {route,close:()=>clearInterval(timer)};
}
