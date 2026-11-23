import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';

const DAY=86400000,MAX=8*1024*1024;
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export function chatImage(value){
  if(typeof value!=='string'||value.length>MAX*1.34+100)fail('图片或 GIF 不能超过 8 MB');
  const match=/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);if(!match)fail('支持 PNG、JPEG、WebP 和 GIF');
  const bytes=Buffer.from(match[2],'base64');if(bytes.length>MAX||bytes.length<20)fail('图片文件大小无效');
  let width=0,height=0,frames=1,mime='';
  if(bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&bytes.subarray(12,16).toString()==='IHDR'){
    mime='image/png';width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);
    for(let offset=8;offset+12<=bytes.length;){const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);if(offset+length+12>bytes.length)fail('PNG 文件不完整');if(type==='acTL'&&length>=8)frames=bytes.readUInt32BE(offset+8);offset+=length+12;}
  }else if(/^GIF8[79]a$/.test(bytes.toString('ascii',0,6))){
    mime='image/gif';width=bytes.readUInt16LE(6);height=bytes.readUInt16LE(8);frames=0;
    let offset=13+((bytes[10]&128)?3*(2**((bytes[10]&7)+1)):0),steps=0;
    const skip=()=>{while(offset<bytes.length){const length=bytes[offset++];if(!length)return;offset+=length;if(offset>bytes.length)fail('GIF 文件不完整');}fail('GIF 文件不完整');};
    while(offset<bytes.length&&steps++<100000){const kind=bytes[offset++];if(kind===0x3b)break;if(kind===0x21){offset++;skip();}else if(kind===0x2c){if(offset+9>bytes.length)fail('GIF 文件不完整');const flags=bytes[offset+8];offset+=9;if(flags&128)offset+=3*(2**((flags&7)+1));offset++;skip();frames++;}else fail('GIF 数据无效');}
    if(!frames||steps>=100000)fail('GIF 帧数据无效');
  }else if(bytes[0]===0xff&&bytes[1]===0xd8){
    mime='image/jpeg';let offset=2;
    while(offset+4<bytes.length){if(bytes[offset++]!==0xff)break;while(bytes[offset]===0xff)offset++;const marker=bytes[offset++];if(marker===0xda||marker===0xd9)break;if(marker>=0xd0&&marker<=0xd7||marker===0x01)continue;const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&length>=7){height=bytes.readUInt16BE(offset+3);width=bytes.readUInt16BE(offset+5);break;}offset+=length;}
  }else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
    mime='image/webp';const kind=bytes.toString('ascii',12,16);
    if(kind==='VP8X'&&bytes.length>=30){width=1+bytes.readUIntLE(24,3);height=1+bytes.readUIntLE(27,3);frames=0;for(let offset=12;offset+8<=bytes.length;){const length=bytes.readUInt32LE(offset+4);if(offset+8+length>bytes.length)fail('WebP 文件不完整');if(bytes.toString('ascii',offset,offset+4)==='ANMF')frames++;offset+=8+length+(length%2);}frames=Math.max(1,frames);}
    else if(kind==='VP8 '&&bytes.length>=30&&bytes.subarray(23,26).toString('hex')==='9d012a'){width=bytes.readUInt16LE(26)&0x3fff;height=bytes.readUInt16LE(28)&0x3fff;}
    else if(kind==='VP8L'&&bytes.length>=25&&bytes[20]===0x2f){width=1+((bytes[22]&0x3f)<<8|bytes[21]);height=1+((bytes[24]&15)<<10|bytes[23]<<2|bytes[22]>>6);}
  }
  if(mime!=='image/'+match[1]||!width||!height||width>4096||height>4096||frames>500||width*height*frames>64*1024*1024)fail('图片尺寸或动画帧数过大，请缩小图片后重试');
  return {bytes,mime,width,height,animated:frames>1};
}

export function createChatMedia({data,db,auth,body,send,limit,broadcast,inbox,now=Date.now}){
  const directory=path.join(data,'chat-media');let uploading=0,sweeping=null,closed=false;const locks=new Map(),deleting=new Set();
  async function locked(key,task){const old=locks.get(key)||Promise.resolve(),job=old.catch(()=>{}).then(task);locks.set(key,job);try{return await job;}finally{if(locks.get(key)===job)locks.delete(key);}}
  db.exec(`CREATE TABLE IF NOT EXISTS chat_media(id TEXT PRIMARY KEY,owner TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS chat_attachments(message INTEGER NOT NULL,media TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(message,media));
    CREATE INDEX IF NOT EXISTS chat_media_age ON chat_attachments(media,created);
    CREATE TABLE IF NOT EXISTS chat_stickers(uid TEXT NOT NULL,media TEXT NOT NULL,label TEXT NOT NULL,access TEXT NOT NULL UNIQUE,created INTEGER NOT NULL,PRIMARY KEY(uid,media));
    CREATE TABLE IF NOT EXISTS chat_requests(uid TEXT NOT NULL,request_key TEXT NOT NULL,message INTEGER NOT NULL,PRIMARY KEY(uid,request_key));`);
  const file=id=>path.join(directory,id+'.blob');
  const recent=(uid,id)=>!deleting.has(id)&&!!db.prepare('SELECT 1 FROM chat_media m WHERE m.id=? AND ((m.owner=? AND m.created>?) OR EXISTS(SELECT 1 FROM chat_stickers WHERE uid=? AND media=m.id) OR EXISTS(SELECT 1 FROM chat_attachments a JOIN messages x ON x.id=a.message WHERE a.media=m.id AND a.created>?))').get(id,uid,now()-DAY,uid,now()-30*DAY);
  const info=(row,url)=>({id:row.id,mime:row.mime,width:row.width,height:row.height,size:row.size,url});
  function hydrate(message){
    const links=db.prepare('SELECT a.created AS attached_at,m.* FROM chat_attachments a LEFT JOIN chat_media m ON m.id=a.media WHERE a.message=?').all(message.id);
    return {...message,attachments:links.map(row=>row.id&&row.attached_at>now()-30*DAY?info(row,`/api/chat-media/${row.id}/message/${message.id}`):{expired:true})};
  }
  function publish(user,input){
    const text=typeof input.body==='string'?input.body.trim():'',ids=[...new Set(Array.isArray(input.attachments)?input.attachments:[])];
    if(text.length>1000||ids.length>4||(!text&&ids.length===0))fail('消息需要文字或图片，最多 1000 字、4 张图片');
    if(typeof input.requestId!=='string'||!/^[-\w]{16,80}$/.test(input.requestId))fail('发送请求无效');
    const old=db.prepare('SELECT message FROM chat_requests WHERE uid=? AND request_key=?').get(user.uid,input.requestId);
    if(old){const message=db.prepare('SELECT * FROM messages WHERE id=?').get(old.message);if(!message)fail('这条消息已被管理删除');return hydrate(message);}
    limit('chat:'+user.uid,8,10000);inbox.validateMentions(user,text);
    for(const id of ids)if(typeof id!=='string'||!recent(user.uid,id))fail('图片已过期或没有访问权限，请重新上传');
    const created=now();let message;
    db.exec('BEGIN IMMEDIATE');try{
      const row=db.prepare('INSERT INTO messages(channel,uid,name,body,created) VALUES(?,?,?,?,?)').run('lobby',user.uid,user.name,text,created),id=Number(row.lastInsertRowid);
      for(const media of ids)db.prepare('INSERT INTO chat_attachments VALUES(?,?,?)').run(id,media,created);
      db.prepare('INSERT INTO chat_requests VALUES(?,?,?)').run(user.uid,input.requestId,id);
      inbox.mentions(user,text,{target:'/community?message='+id,dedupe:'chat:'+id});
      message={id,uid:user.uid,name:user.name,channel:'lobby',body:text,created,avatarVersion:db.prepare('SELECT version FROM profiles WHERE uid=?').get(user.uid)?.version||''};db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    const result=hydrate(message);broadcast({type:'chat',message:result});return result;
  }
  async function route(req,res,url){
    const p=url.pathname;if(!p.startsWith('/api/chat-media')&&!p.startsWith('/api/chat/stickers')&&p!=='/api/chat/send')return false;
    const asset=/^\/api\/chat-media\/([a-f0-9]{64})\/(message\/([0-9]+)|saved\/([-\w]{16,80}))$/.exec(p);
    if(asset&&req.method==='GET'){
      const permitted=asset[3]?db.prepare('SELECT 1 FROM chat_attachments a JOIN messages m ON m.id=a.message WHERE a.message=? AND a.media=? AND a.created>?').get(Number(asset[3]),asset[1],now()-30*DAY):db.prepare('SELECT 1 FROM chat_stickers WHERE media=? AND access=?').get(asset[1],asset[4]);
      const row=permitted&&db.prepare('SELECT * FROM chat_media WHERE id=?').get(asset[1]);if(!row){send(res,404,{error:'图片已过期或已删除'});return true;}
      try{await fs.access(file(row.id));res.writeHead(200,{'Content-Type':row.mime,'Content-Length':row.size,'Cache-Control':'private,max-age=300','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});await pipeline(createReadStream(file(row.id)),res);}catch(e){if(!res.headersSent)send(res,404,{error:'图片文件不存在'});else res.destroy();}return true;
    }
    const user=auth(req);if(user.consoleAdmin)fail('请使用玩家角色发送消息或收藏表情');
    if(p==='/api/chat-media/upload'&&req.method==='POST'){
      limit('chat-upload:'+user.uid,12);if(uploading>=4)throw Object.assign(Error('图片上传繁忙，请稍后重试'),{status:429});uploading++;
      try{const input=await body(req,MAX*1.34+1024),image=chatImage(input.image),id=createHash('sha256').update(user.uid+'\0').update(image.bytes).digest('hex');
        await locked('owner:'+user.uid,()=>locked(id,async()=>{
          const old=db.prepare('SELECT * FROM chat_media WHERE id=?').get(id);
          if(!old&&db.prepare('SELECT COALESCE(SUM(size),0) n FROM chat_media WHERE owner=?').get(user.uid).n+image.bytes.length>256*1024*1024)fail('聊天图片空间已达到 256 MB，请清理收藏或等待历史图片到期');
          await fs.mkdir(directory,{recursive:true});await fs.writeFile(file(id),image.bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
          db.prepare('INSERT INTO chat_media VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET created=excluded.created').run(id,user.uid,image.mime,image.bytes.length,image.width,image.height,now());
        }));send(res,201,{id,mime:image.mime,width:image.width,height:image.height,size:image.bytes.length});
      }finally{uploading--;}return true;
    }
    if(p==='/api/chat/send'&&req.method==='POST'){send(res,200,{message:publish(user,await body(req))});return true;}
    if(p==='/api/chat/stickers'){
      if(req.method==='GET'){send(res,200,{limit:100,items:db.prepare('SELECT m.*,s.label,s.access FROM chat_stickers s JOIN chat_media m ON m.id=s.media WHERE s.uid=? ORDER BY s.created DESC').all(user.uid).map(row=>({...info(row,`/api/chat-media/${row.id}/saved/${row.access}`),label:row.label}))});return true;}
      limit('chat-sticker:'+user.uid,60);const input=await body(req);
      if(typeof input.id!=='string'||! /^[a-f0-9]{64}$/.test(input.id))fail('图片编号无效');
      if(req.method==='DELETE'){db.prepare('DELETE FROM chat_stickers WHERE uid=? AND media=?').run(user.uid,input.id);send(res,200,{ok:true});return true;}
      if(req.method!=='POST')fail('不支持的表情操作');
      if(!recent(user.uid,input.id))fail('图片已过期，无法收藏');
      const existing=db.prepare('SELECT 1 FROM chat_stickers WHERE uid=? AND media=?').get(user.uid,input.id);
      if(!existing&&db.prepare('SELECT COUNT(*) n FROM chat_stickers WHERE uid=?').get(user.uid).n>=100)fail('最多收藏 100 张表情，请先移除一些');
      const label=typeof input.label==='string'?input.label.trim().slice(0,60):'我的表情';
      db.prepare('INSERT INTO chat_stickers VALUES(?,?,?,?,?) ON CONFLICT(uid,media) DO UPDATE SET label=excluded.label').run(user.uid,input.id,label||'我的表情',randomUUID(),now());send(res,200,{ok:true});return true;
    }
    send(res,404,{error:'聊天图片接口不存在'});return true;
  }
  function sweep(){
    if(closed)return Promise.resolve();if(sweeping)return sweeping;
    const expired="SELECT id FROM chat_media m WHERE created<? AND NOT EXISTS(SELECT 1 FROM chat_stickers WHERE media=m.id) AND NOT EXISTS(SELECT 1 FROM chat_attachments a JOIN messages x ON x.id=a.message WHERE a.media=m.id AND a.created>?)";
    sweeping=(async()=>{const rows=db.prepare(expired+' LIMIT 500').all(now()-DAY,now()-30*DAY);
      for(const row of rows){if(closed)break;await locked(row.id,async()=>{
        if(!db.prepare(expired+' AND id=?').get(now()-DAY,now()-30*DAY,row.id))return;
        deleting.add(row.id);try{await fs.unlink(file(row.id)).catch(e=>{if(e.code!=='ENOENT')throw e;});db.prepare('DELETE FROM chat_media WHERE id=?').run(row.id);}finally{deleting.delete(row.id);}
      }).catch(()=>{});}
      db.prepare('DELETE FROM chat_requests WHERE message NOT IN (SELECT id FROM messages)').run();
    })().finally(()=>sweeping=null);return sweeping;
  }
  const timer=setInterval(()=>void sweep().catch(()=>{}),3600000),initial=setTimeout(()=>void sweep().catch(()=>{}),3000);timer.unref();initial.unref();
  return {route,hydrate,publish,sweep,async close(){closed=true;clearTimeout(initial);clearInterval(timer);await sweeping;await Promise.allSettled([...locks.values()]);}};
}
