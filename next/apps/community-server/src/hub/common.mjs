import {randomUUID} from 'node:crypto';

export const fail = (message, status = 400) => { throw Object.assign(Error(message), {status}); };
export function string(value, max, label, optional = false) {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) fail(label + '无效');
  return value.trim();
}
export function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(label + '无效');
  return value;
}
export function choice(value, values, label) {
  if (!values.includes(value)) fail(label + '无效');
  return value;
}
export function tags(value = []) {
  if (!Array.isArray(value) || value.length > 12) fail('最多设置 12 个标签');
  return [...new Set(value.map(v => string(v, 24, '标签')))];
}
export function identifier(value, label = '标识') {
  if (typeof value !== 'string' || !/^[\w.-]{1,100}$/.test(value)) fail(label + '无效');
  return value;
}
export function url(value, {local = true, empty = true} = {}) {
  if (empty && !value) return '';
  const text = string(value, 1500, '链接');
  if (local && /^\/(?!\/)[\w/?#%&=.+~-]*$/u.test(text)) return text;
  let parsed; try { parsed = new URL(text); } catch { fail('链接无效'); }
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) fail('只支持不含账号密码的 HTTP/HTTPS 链接');
  return parsed.href;
}
export function page(search) {
  return {offset: integer(Number(search.get('offset') || 0), 0, 1000000, '页码'), limit: 24, query: string(search.get('q') || '', 80, '查询', true)};
}
export function quietUntil(preferences,time) {
  if(!preferences.quiet||preferences.quietStart===preferences.quietEnd)return 0;
  const shifted=time+8*3600000,hour=new Date(shifted).getUTCHours(),start=preferences.quietStart,end=preferences.quietEnd;
  const inside=start<end?hour>=start&&hour<end:hour>=start||hour<end;
  if(!inside)return 0;
  const midnight=Math.floor(shifted/86400000)*86400000;
  return midnight+end*3600000+(hour>=end?86400000:0)-8*3600000;
}
export function createHubContext({db, adminIDs, inbox, limit, now = Date.now}) {
  const manager = user => !!(user.consoleAdmin || adminIDs.has(user.uid));
  const member = uid => db.prepare('SELECT uid,name FROM members WHERE uid=?').get(identifier(uid)) || fail('成员不存在', 404);
  const transaction = work => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = work(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const notify = (actor, recipients, title, target, id, body = '') => {
    const direct=[],payload={actor,title,body,target,kind:'community',dedupe:'hub:'+id,includeSelf:true};
    for(const uid of new Set(recipients)){
      const preferences=JSON.parse(db.prepare('SELECT value FROM hub_preferences WHERE uid=?').get(uid)?.value||'{}'),due=quietUntil(preferences,now());
      if(due)db.prepare('INSERT OR IGNORE INTO hub_notification_queue VALUES(?,?,?,?,?)').run(uid,payload.dedupe,JSON.stringify(payload),due,now());
      else direct.push(uid);
    }
    if(direct.length)inbox.notify({...payload,recipients:direct});
  };
  const audit = (actor, action, target, detail = '') => db.prepare('INSERT INTO hub_audit(uid,action,target,detail,created) VALUES(?,?,?,?,?)').run(actor.uid, action, target, detail.slice(0,1000), now());
  db.exec(`CREATE TABLE IF NOT EXISTS hub_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,uid TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,detail TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS hub_audit_target ON hub_audit(target,id DESC);
    CREATE TABLE IF NOT EXISTS hub_operations(uid TEXT NOT NULL,id TEXT NOT NULL,kind TEXT NOT NULL,result TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(uid,id));`);
  db.exec(`CREATE TABLE IF NOT EXISTS hub_notification_queue(uid TEXT NOT NULL,dedupe TEXT NOT NULL,payload TEXT NOT NULL,due INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(uid,dedupe));CREATE INDEX IF NOT EXISTS hub_notification_due ON hub_notification_queue(due);`);
  function deliverNotifications(){
    transaction(()=>{
      for(const row of db.prepare('SELECT * FROM hub_notification_queue WHERE due<=? ORDER BY due LIMIT 200').all(now())){
        const payload=JSON.parse(row.payload),blocked=db.prepare('SELECT 1 FROM hub_blocks WHERE (uid=? AND target=?) OR (uid=? AND target=?)').get(row.uid,payload.actor.uid,payload.actor.uid,row.uid);
        if(!blocked)inbox.notify({...payload,recipients:[row.uid]});
        db.prepare('DELETE FROM hub_notification_queue WHERE uid=? AND dedupe=?').run(row.uid,row.dedupe);
      }
    });
  }
  function once(user, id, kind, work) {
    identifier(id, '操作编号');
    return transaction(() => {
      const old = db.prepare('SELECT kind,result FROM hub_operations WHERE uid=? AND id=?').get(user.uid,id);
      if (old) { if(old.kind!==kind) fail('操作编号已用于其他请求',409); return JSON.parse(old.result); }
      const result = work();
      db.prepare('INSERT INTO hub_operations VALUES(?,?,?,?,?)').run(user.uid,id,kind,JSON.stringify(result),now());
      return result;
    });
  }
  return {db, manager, member, transaction, notify, deliverNotifications, audit, once, now, limit, id: randomUUID};
}
