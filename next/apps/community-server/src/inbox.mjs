import {randomUUID} from 'node:crypto';

export function createInbox({db,auth,admin,body,send,limit,broadcast,adminIDs}) {
  db.exec(`CREATE TABLE IF NOT EXISTS inbox(
    id INTEGER PRIMARY KEY AUTOINCREMENT,recipient TEXT NOT NULL,kind TEXT NOT NULL,
    actor TEXT NOT NULL,actor_name TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,
    target TEXT NOT NULL,created INTEGER NOT NULL,read_at INTEGER,dedupe TEXT NOT NULL,
    UNIQUE(recipient,dedupe));
    CREATE INDEX IF NOT EXISTS inbox_recipient ON inbox(recipient,id DESC);
    CREATE INDEX IF NOT EXISTS inbox_unread ON inbox(recipient,read_at);
    CREATE TABLE IF NOT EXISTS inbox_admin_audit(id TEXT PRIMARY KEY,actor TEXT NOT NULL,recipients INTEGER NOT NULL,title TEXT NOT NULL,created INTEGER NOT NULL);`);
  const insert=db.prepare('INSERT OR IGNORE INTO inbox(recipient,kind,actor,actor_name,title,body,target,created,dedupe) VALUES(?,?,?,?,?,?,?,?,?)');
  const manager=user=>!!user&&(user.consoleAdmin||adminIDs.has(user.uid));
  const unread=uid=>db.prepare('SELECT COUNT(*) AS n FROM inbox WHERE recipient=? AND read_at IS NULL').get(uid).n;
  function redact(target,descendants=false){db.prepare("UPDATE inbox SET title='内容已删除或被管理',body='',target='' WHERE target=? OR (?=1 AND substr(target,1,length(?)+1)=?||'?')").run(target,Number(descendants),target,target);}
  function notify({recipients,actor,kind,title,body='',target='',dedupe,includeSelf=false}) {
    const users=new Set(recipients),changed=new Set();
    for(const uid of users) {
      if(!uid||!includeSelf&&uid===actor.uid)continue;
      if(insert.run(uid,kind,actor.uid,actor.name,String(title).slice(0,160),String(body).slice(0,2000),target,Date.now(),dedupe).changes)changed.add(uid);
    }
    if(changed.size)broadcast({type:'inbox-changed'},c=>changed.has(c.user.uid));
    return changed.size;
  }
  function mentions(actor,value,{target,dedupe,exclude=[]}) {
    const names=[...String(value).matchAll(/(?:^|[\s（(，,。!！?？:：])@([^\s@，。！？、:：()（）]{1,40})/gu)].map(m=>m[1]);
    if(!names.length)return;
    let recipients=[];
    if(names.some(n=>['全体','所有人'].includes(n))) {
      if(!manager(actor))throw Object.assign(Error('只有社区管理员可以 @全体'),{status:403});
      recipients=db.prepare('SELECT uid FROM members').all().map(v=>v.uid);
    } else {
      for(const name of [...new Set(names)].slice(0,20))recipients.push(...db.prepare('SELECT uid FROM members WHERE name=? LIMIT 10').all(name).map(v=>v.uid));
    }
    notify({recipients:recipients.filter(uid=>!exclude.includes(uid)),actor,kind:'mention',title:actor.name+' 提到了你',body:value,target,dedupe});
  }
  // Call before persisting content so an unauthorized @all cannot partially succeed.
  function validateMentions(actor,value){if(/(?:^|[\s（(，,。!！?？:：])@(?:全体|所有人)(?=$|[\s，。！？、:：()（）])/u.test(value)&&!manager(actor))throw Object.assign(Error('只有社区管理员可以 @全体'),{status:403});}
  async function route(req,res,url) {
    const p=url.pathname;
    if(!p.startsWith('/api/inbox')&&!p.startsWith('/api/admin/inbox')&&p!=='/api/members/search')return false;
    const user=p.startsWith('/api/admin/')?admin(req):auth(req);
    if(p==='/api/members/search'&&req.method==='GET'){
      const q=String(url.searchParams.get('q')||'').slice(0,40);
      send(res,200,{items:db.prepare('SELECT m.uid,m.name,p.version AS avatarVersion FROM members m LEFT JOIN profiles p ON p.uid=m.uid WHERE instr(lower(m.name),lower(?))>0 ORDER BY m.seen DESC LIMIT 30').all(q)});return true;
    }
    if(p==='/api/inbox'&&req.method==='GET'){
      const before=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER);if(!Number.isSafeInteger(before)||before<1)throw Error('无效消息页');
      const onlyUnread=url.searchParams.get('unread')==='1';
      const items=db.prepare('SELECT id,kind,actor,actor_name AS actorName,title,body,target,created,read_at AS readAt FROM inbox WHERE recipient=? AND id<?'+(onlyUnread?' AND read_at IS NULL':'')+' ORDER BY id DESC LIMIT 41').all(user.uid,before);
      send(res,200,{items:items.slice(0,40),more:items.length>40,unread:unread(user.uid)});return true;
    }
    if(p==='/api/inbox/unread'&&req.method==='GET'){send(res,200,{unread:unread(user.uid)});return true;}
    if(p==='/api/inbox/read'&&req.method==='POST'){
      const input=await body(req);if(input.all===true)db.prepare('UPDATE inbox SET read_at=? WHERE recipient=? AND read_at IS NULL').run(Date.now(),user.uid);
      else {if(!Number.isSafeInteger(input.id))throw Error('请选择消息');db.prepare('UPDATE inbox SET read_at=COALESCE(read_at,?) WHERE recipient=? AND id=?').run(Date.now(),user.uid,input.id);}
      broadcast({type:'inbox-changed'},c=>c.user.uid===user.uid);send(res,200,{unread:unread(user.uid)});return true;
    }
    if(p==='/api/admin/inbox'&&req.method==='GET'){send(res,200,{items:db.prepare('SELECT * FROM inbox_admin_audit ORDER BY created DESC LIMIT 100').all()});return true;}
    if(p==='/api/admin/inbox/send'&&req.method==='POST'){
      limit('admin-mail:'+user.uid,10);const input=await body(req);
      if(typeof input.title!=='string'||!input.title.trim()||input.title.length>100||typeof input.body!=='string'||!input.body.trim()||input.body.length>2000)throw Error('请填写标题（100字以内）和正文（2000字以内）');
      const id=input.id||randomUUID();if(!/^[-\w]{16,80}$/.test(id))throw Error('消息操作编号无效');
      const old=db.prepare('SELECT * FROM inbox_admin_audit WHERE id=?').get(id);if(old){if(old.actor!==user.uid)throw Error('操作编号冲突');send(res,200,{id,count:old.recipients});return true;}
      let recipients;if(input.all===true)recipients=db.prepare('SELECT uid FROM members').all().map(v=>v.uid);
      else {if(!Array.isArray(input.recipients)||input.recipients.length<1||input.recipients.length>500)throw Error('请选择 1–500 位收件人或全体成员');recipients=[...new Set(input.recipients)];if(recipients.some(uid=>typeof uid!=='string'||!db.prepare('SELECT 1 FROM members WHERE uid=?').get(uid)))throw Error('收件人不存在');}
      db.exec('BEGIN IMMEDIATE');try{const count=notify({recipients,actor:user,kind:'admin',title:input.title.trim(),body:input.body.trim(),target:'',dedupe:'admin:'+id,includeSelf:true});db.prepare('INSERT INTO inbox_admin_audit VALUES(?,?,?,?,?)').run(id,user.uid,count,input.title.trim(),Date.now());db.exec('COMMIT');send(res,201,{id,count});}catch(e){db.exec('ROLLBACK');throw e;}return true;
    }
    send(res,405,{error:'不支持的收件箱操作'});return true;
  }
  return {route,notify,mentions,validateMentions,unread,redact};
}
