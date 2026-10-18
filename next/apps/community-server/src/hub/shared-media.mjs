import {fail,string,integer,identifier} from './common.mjs';
import {bilibiliVideo} from '../../shared/bilibili.mjs';

// The service exchanges playback state only. Media stays at its published source.
export function createSharedMedia(ctx){
 const {db,now,id,transaction,manager}=ctx;
 db.exec(`CREATE TABLE IF NOT EXISTS hub_media_rooms(id TEXT PRIMARY KEY,host TEXT NOT NULL,title TEXT NOT NULL,record TEXT NOT NULL,position REAL NOT NULL,playing INTEGER NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS hub_media_members(room TEXT NOT NULL,uid TEXT NOT NULL,seen INTEGER NOT NULL,PRIMARY KEY(room,uid));
 CREATE INDEX IF NOT EXISTS hub_media_seen ON hub_media_members(room,seen);
 CREATE TABLE IF NOT EXISTS hub_media_queue(id TEXT PRIMARY KEY,room TEXT NOT NULL,record TEXT NOT NULL,uid TEXT NOT NULL,created INTEGER NOT NULL,UNIQUE(room,record));
 CREATE TABLE IF NOT EXISTS hub_media_votes(item TEXT NOT NULL,uid TEXT NOT NULL,PRIMARY KEY(item,uid));`);
 const room=key=>db.prepare('SELECT * FROM hub_media_rooms WHERE id=?').get(identifier(key))||fail('放映房间已结束',404);
 function program(key){const row=db.prepare("SELECT id,title,data FROM hub_records WHERE id=? AND kind='program' AND status='published' AND visibility='community'").get(identifier(key));if(!row)fail('节目尚未公开或已被撤回',409);const data=JSON.parse(row.data);if(!/^https?:\/\//.test(data.source))fail('节目没有可播放的媒体直链');return {id:row.id,title:row.title,format:data.format,source:data.source};}
 function remove(key){db.prepare('DELETE FROM hub_media_votes WHERE item IN (SELECT id FROM hub_media_queue WHERE room=?)').run(key);db.prepare('DELETE FROM hub_media_queue WHERE room=?').run(key);db.prepare('DELETE FROM hub_media_members WHERE room=?').run(key);db.prepare('DELETE FROM hub_media_rooms WHERE id=?').run(key);}
 function maintain(key){
  db.prepare('DELETE FROM hub_media_members WHERE room=? AND seen<?').run(key,now()-60000);
  const value=db.prepare('SELECT * FROM hub_media_rooms WHERE id=?').get(key);if(!value)return;
  const members=db.prepare('SELECT uid FROM hub_media_members WHERE room=? ORDER BY seen DESC,uid').all(key);
  if(!members.length){remove(key);return;}
  if(!members.some(m=>m.uid===value.host))db.prepare('UPDATE hub_media_rooms SET host=?,playing=0,position=?,updated=?,revision=revision+1 WHERE id=?').run(members[0].uid,position(value),now(),key);
 }
 const position=value=>Math.min(86400,Math.max(0,value.position+(value.playing?(now()-value.updated)/1000:0)));
 function participating(key,user){if(!db.prepare('SELECT 1 FROM hub_media_members WHERE room=? AND uid=?').get(key,user.uid))fail('请先加入放映房间',403);}
 function view(value,user){
  let current;try{current=program(value.record);}catch{current=null;}
  const members=db.prepare('SELECT p.uid,m.name FROM hub_media_members p JOIN members m ON m.uid=p.uid WHERE p.room=? ORDER BY p.seen DESC,p.uid').all(value.id);
  return {...value,playing:!!value.playing&&!!current,position:position(value),serverTime:now(),current,members,mine:value.host===user.uid,joined:members.some(m=>m.uid===user.uid),canClose:value.host===user.uid||manager(user),queue:db.prepare('SELECT q.*,r.title,COUNT(v.uid) votes,MAX(CASE WHEN v.uid=? THEN 1 ELSE 0 END) voted FROM hub_media_queue q JOIN hub_records r ON r.id=q.record LEFT JOIN hub_media_votes v ON v.item=q.id WHERE q.room=? GROUP BY q.id ORDER BY votes DESC,q.created,q.id').all(user.uid,value.id)};
 }
 async function route(user,p,method,input){
  if(p==='media/resolve'&&method==='POST'){
   const raw=string(input.source,1500,'视频链接'),short=raw.match(/https:\/\/b23\.tv\/[A-Za-z0-9_-]{1,32}(?=[\s?/#]|$)/);if(!short)return bilibiliVideo(raw);
   let target=short[0];for(let attempt=0;attempt<3;attempt++){
    const response=await fetch(target,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(7000)});await response.body?.cancel();const location=response.headers.get('location');if(!location)fail('B站短链接未返回视频地址，请打开链接后复制完整视频地址');
    const next=new URL(location,target);if(next.protocol!=='https:'||next.username||next.password||next.port)fail('B站跳转地址无效');
    if(next.hostname==='b23.tv'&&/^\/[A-Za-z0-9_-]{1,32}\/?$/.test(next.pathname)){target='https://b23.tv'+next.pathname;continue;}return bilibiliVideo(next.href);
   }fail('B站短链接跳转过多，请复制完整视频地址');
  }
  if(!p.startsWith('media/rooms'))return;
  // Clean up only a bounded number of idle rooms; no perpetual timer is needed.
  transaction(()=>{for(const r of db.prepare('SELECT id FROM hub_media_rooms LIMIT 100').all())maintain(r.id);});
  if(p==='media/rooms'){
   if(method==='GET')return {items:db.prepare('SELECT r.*,m.name hostName,(SELECT COUNT(*) FROM hub_media_members p WHERE p.room=r.id) members FROM hub_media_rooms r JOIN members m ON m.uid=r.host ORDER BY created DESC LIMIT 100').all()};
   if(method==='POST')return transaction(()=>{
    const current=program(input.record),title=string(input.title||current.title,80,'房间名称');
    if(db.prepare('SELECT COUNT(*) n FROM hub_media_rooms WHERE host=?').get(user.uid).n>=2)fail('最多同时主持两个放映房间');
    if(db.prepare('SELECT COUNT(*) n FROM hub_media_rooms').get().n>=100)fail('放映房间已满，请稍后再试');
    const key=id();db.prepare('INSERT INTO hub_media_rooms VALUES(?,?,?,?,0,0,1,?,?)').run(key,user.uid,title,current.id,now(),now());db.prepare('INSERT INTO hub_media_members VALUES(?,?,?)').run(key,user.uid,now());return view(room(key),user);
   });
  }
  const match=p.match(/^media\/rooms\/([\w-]+)(?:\/(join|leave|control|queue|vote|next|remove))?$/);if(!match)return;
  const key=match[1],action=match[2];let value=room(key);
  if(!action&&method==='GET'){
   db.prepare('UPDATE hub_media_members SET seen=? WHERE room=? AND uid=? AND seen<?').run(now(),key,user.uid,now()-10000);return view(value,user);
  }
  if(!action&&method==='DELETE'){if(value.host!==user.uid&&!manager(user))fail('只有主持人或管理员可以结束房间',403);remove(key);return {ok:true};}
  if(method!=='POST')return;
  return transaction(()=>{
   value=room(key);
   if(action==='join'){
    program(value.record);
    if(!db.prepare('SELECT 1 FROM hub_media_members WHERE room=? AND uid=?').get(key,user.uid)&&db.prepare('SELECT COUNT(*) n FROM hub_media_members WHERE room=?').get(key).n>=30)fail('放映房间已满',409);
    db.prepare('INSERT INTO hub_media_members VALUES(?,?,?) ON CONFLICT(room,uid) DO UPDATE SET seen=excluded.seen').run(key,user.uid,now());return view(value,user);
   }
   if(action==='leave'){db.prepare('DELETE FROM hub_media_members WHERE room=? AND uid=?').run(key,user.uid);maintain(key);return {ok:true};}
   participating(key,user);db.prepare('UPDATE hub_media_members SET seen=? WHERE room=? AND uid=?').run(now(),key,user.uid);
   if(action==='queue'){
    const current=program(input.record),old=db.prepare('SELECT 1 FROM hub_media_queue WHERE room=? AND record=?').get(key,current.id);
    if(!old){if(db.prepare('SELECT COUNT(*) n FROM hub_media_queue WHERE room=?').get(key).n>=50)fail('队列最多 50 个节目');db.prepare('INSERT INTO hub_media_queue VALUES(?,?,?,?,?)').run(id(),key,current.id,user.uid,now());}
   }else if(action==='vote'){
    if(!db.prepare('SELECT 1 FROM hub_media_queue WHERE room=? AND id=?').get(key,input.item))fail('队列节目已变化',409);
    if(input.voted===false)db.prepare('DELETE FROM hub_media_votes WHERE item=? AND uid=?').run(input.item,user.uid);else db.prepare('INSERT OR IGNORE INTO hub_media_votes VALUES(?,?)').run(input.item,user.uid);
   }else if(action==='remove'){
    const item=db.prepare('SELECT * FROM hub_media_queue WHERE room=? AND id=?').get(key,input.item);if(!item)fail('节目已移除',409);if(item.uid!==user.uid&&value.host!==user.uid&&!manager(user))fail('只能移除自己添加的节目',403);db.prepare('DELETE FROM hub_media_votes WHERE item=?').run(item.id);db.prepare('DELETE FROM hub_media_queue WHERE id=?').run(item.id);
   }else if(action==='control'||action==='next'){
    if(value.host!==user.uid)fail('只有主持人可以控制共同进度',403);
    if(value.revision!==input.revision)fail('播放状态已变化，请重试',409);
    let record=value.record,seconds=input.position,playing=input.playing===true;
    if(action==='next'){
     const next=db.prepare('SELECT q.*,COUNT(v.uid) votes FROM hub_media_queue q JOIN hub_records r ON r.id=q.record LEFT JOIN hub_media_votes v ON v.item=q.id WHERE q.room=? AND r.status=\'published\' AND r.visibility=\'community\' GROUP BY q.id ORDER BY votes DESC,q.created,q.id LIMIT 1').get(key);if(!next)fail('没有可播放的下一项');record=next.record;seconds=0;playing=true;db.prepare('DELETE FROM hub_media_votes WHERE item=?').run(next.id);db.prepare('DELETE FROM hub_media_queue WHERE id=?').run(next.id);
    }
    program(record);if(!Number.isFinite(seconds)||seconds<0||seconds>86400)fail('播放位置无效');
    db.prepare('UPDATE hub_media_rooms SET record=?,position=?,playing=?,revision=revision+1,updated=? WHERE id=?').run(record,seconds,playing?1:0,now(),key);
   }
   return view(room(key),user);
  });
 }
 return {route};
}
