import {createHash, randomUUID} from 'node:crypto';

export const PERMISSIONS = Object.freeze({
  'lobby.host': '联机大厅创建房间',
  'music.netease': '网易云账号登录',
});
const fail = message => { throw Object.assign(Error(message), {status: 400}); };
const integer = (value, min, max, label) => Number.isSafeInteger(value) && value >= min && value <= max ? value : fail(label + '无效');
const name = (value, max, label) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : fail(label + '无效');
const codeHash = code => createHash('sha256').update(String(code || '').trim().normalize('NFKC').toLowerCase()).digest('hex');
export const monthOf = time => new Date(time + 28800000).toISOString().slice(0, 7);
export function entitlementEnd(start, unit, count) {
  if (unit === 'days') return start + count * 86400000;
  const date = new Date(start + 28800000), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + count);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.getTime() - 28800000;
}

/** All mutating helpers participate in the caller's synchronous points.transaction. */
export function createInventory({db, auth, admin, body, send, limit, points, media, inbox, broadcast = () => {}, now = Date.now}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,image TEXT NOT NULL,kind TEXT NOT NULL,permission TEXT NOT NULL,unit TEXT NOT NULL,duration INTEGER NOT NULL,commission INTEGER NOT NULL,enabled INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS inventory_batches(id TEXT PRIMARY KEY,uid TEXT NOT NULL,item TEXT NOT NULL,snapshot TEXT NOT NULL,quantity INTEGER NOT NULL,remaining INTEGER NOT NULL,origin TEXT NOT NULL UNIQUE,created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS inventory_owner ON inventory_batches(uid,item,remaining);
    CREATE TABLE IF NOT EXISTS inventory_operations(id TEXT PRIMARY KEY,uid TEXT NOT NULL,action TEXT NOT NULL,result TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS permission_leases(uid TEXT NOT NULL,permission TEXT NOT NULL,expires INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(uid,permission));
    CREATE TABLE IF NOT EXISTS inventory_mail(id TEXT PRIMARY KEY,uid TEXT NOT NULL,item TEXT NOT NULL,snapshot TEXT NOT NULL,quantity INTEGER NOT NULL,title TEXT NOT NULL,actor TEXT NOT NULL,claimed INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,UNIQUE(uid,id));
    CREATE INDEX IF NOT EXISTS inventory_mail_owner ON inventory_mail(uid,claimed,created);
    CREATE TABLE IF NOT EXISTS inventory_codes(id TEXT PRIMARY KEY,hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL,item TEXT NOT NULL,snapshot TEXT NOT NULL,quantity INTEGER NOT NULL,starts INTEGER NOT NULL,expires INTEGER NOT NULL,max_uses INTEGER NOT NULL,enabled INTEGER NOT NULL,actor TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS inventory_code_claims(code TEXT NOT NULL,uid TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(code,uid));
    CREATE TABLE IF NOT EXISTS inventory_escrow(id TEXT PRIMARY KEY,uid TEXT NOT NULL,item TEXT NOT NULL,snapshot TEXT NOT NULL,quantity INTEGER NOT NULL,status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS inventory_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,uid TEXT NOT NULL,actor TEXT NOT NULL,action TEXT NOT NULL,item TEXT NOT NULL,quantity INTEGER NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS inventory_seed(id TEXT PRIMARY KEY);
    CREATE INDEX IF NOT EXISTS inventory_batches_image ON inventory_batches(json_extract(snapshot,'$.image'));
    CREATE INDEX IF NOT EXISTS inventory_mail_image ON inventory_mail(json_extract(snapshot,'$.image'));
    CREATE INDEX IF NOT EXISTS inventory_codes_image ON inventory_codes(json_extract(snapshot,'$.image'));
    CREATE INDEX IF NOT EXISTS inventory_escrow_image ON inventory_escrow(json_extract(snapshot,'$.image'));
  `);
  const definition = id => db.prepare('SELECT * FROM inventory_items WHERE id=?').get(id);
  const getLease = (uid, permission) => db.prepare('SELECT expires FROM permission_leases WHERE uid=? AND permission=?').get(uid, permission)?.expires || 0;
  const has = (uid, permission) => getLease(uid, permission) > now();
  const audit = (uid, actor, action, item, quantity) => db.prepare('INSERT INTO inventory_audit(uid,actor,action,item,quantity,created) VALUES(?,?,?,?,?,?)').run(uid, actor, action, item, quantity, now());
  const member = uid => db.prepare('SELECT uid,name FROM members WHERE uid=?').get(uid) || fail('成员不存在');
  const snapshot = item => JSON.stringify(item);
  function capacity(uid, item, quantity) {
    const rows = db.prepare('SELECT snapshot,remaining FROM inventory_batches WHERE uid=? AND remaining>0').all(uid);
    const held = rows.reduce((sum, row) => {const data = JSON.parse(row.snapshot); return sum + ((item.kind === 'voucher' ? data.permission === item.permission : data.id === item.id) ? row.remaining : 0);}, 0);
    if (held + quantity > (item.kind === 'voucher' ? 3 : 99999)) fail(item.kind === 'voucher' ? '同类凭证最多保存三张，请先使用背包中的凭证' : '该道具数量已达上限');
  }
  function grant(uid, item, quantity, origin, actor = 'system') {
    const existing = db.prepare('SELECT * FROM inventory_batches WHERE origin=?').get(origin);
    if (existing) {if (existing.uid !== uid || existing.item !== item.id || existing.quantity !== quantity) fail('发放请求与原记录不一致'); return existing;}
    integer(quantity, 1, 99999, '物品数量'); capacity(uid, item, quantity);
    const id = randomUUID(); db.prepare('INSERT INTO inventory_batches VALUES(?,?,?,?,?,?,?,?)').run(id, uid, item.id, snapshot(item), quantity, quantity, origin, now());
    audit(uid, actor, 'receive', item.id, quantity);
    return db.prepare('SELECT * FROM inventory_batches WHERE id=?').get(id);
  }
  function refund(origin) {
    const batch = db.prepare('SELECT * FROM inventory_batches WHERE origin=?').get(origin);
    if (!batch || batch.remaining !== batch.quantity) fail('道具已使用或交付，不能直接退款；请先处理对应权益');
    db.prepare('UPDATE inventory_batches SET remaining=0 WHERE id=?').run(batch.id);
    audit(batch.uid, 'shop', 'refund', batch.item, batch.quantity);
  }
  function escrow(uid, itemId, quantity, id) {
    const item = definition(itemId); integer(quantity, 1, 99999, '委托道具数量');
    if (!item || !item.enabled || item.kind === 'voucher' || !item.commission) fail('该物品不可作为委托奖励');
    if (db.prepare('SELECT 1 FROM inventory_escrow WHERE id=?').get(id)) fail('奖励已托管');
    const batches = db.prepare('SELECT * FROM inventory_batches WHERE uid=? AND item=? AND remaining>0 ORDER BY created,id').all(uid, itemId);
    if (batches.reduce((sum, row) => sum + row.remaining, 0) < quantity) fail('背包中可用道具不足');
    let left = quantity;
    for (const batch of batches) {const used = Math.min(left, batch.remaining); db.prepare('UPDATE inventory_batches SET remaining=remaining-? WHERE id=?').run(used, batch.id); left -= used; if (!left) break;}
    db.prepare('INSERT INTO inventory_escrow VALUES(?,?,?,?,?,?)').run(id, uid, itemId, snapshot(item), quantity, 'held'); audit(uid, uid, 'escrow', itemId, quantity);
  }
  function releaseEscrow(id, recipient) {
    const record = db.prepare('SELECT * FROM inventory_escrow WHERE id=?').get(id);
    if (!record || record.status !== 'held') return;
    const uid = recipient || record.uid;
    // A pending mail keeps settlement possible even if the recipient's stack is full.
    mail(uid, JSON.parse(record.snapshot), record.quantity, recipient ? '委托奖励已交付' : '委托奖励已退还', 'system', 'escrow:' + id);
    db.prepare('UPDATE inventory_escrow SET status=? WHERE id=?').run(recipient ? 'delivered' : 'returned', id);
  }
  function mail(uid, item, quantity, title, actor, id = randomUUID()) {
    const existed = db.prepare('SELECT 1 FROM inventory_mail WHERE id=?').get(id); if (existed) return;
    db.prepare('INSERT INTO inventory_mail(id,uid,item,snapshot,quantity,title,actor,created) VALUES(?,?,?,?,?,?,?,?)').run(id, uid, item.id, snapshot(item), quantity, title, actor, now());
    inbox?.notify({recipients: [uid], actor: {uid: actor, name: '物品邮寄'}, kind: 'inventory', title, body: item.title + ' × ' + quantity + '，请在背包领取。', target: '/account?backpack=1', dedupe: 'inventory:' + id, includeSelf: true});
    audit(uid, actor, 'mail', item.id, quantity);
  }
  function view(uid) {
    const batches = db.prepare('SELECT * FROM inventory_batches WHERE uid=? AND remaining>0 ORDER BY created DESC,id').all(uid);
    const items = new Map();
    for (const batch of batches) {const item = JSON.parse(batch.snapshot), key = item.id + ':' + item.updated; if (!items.has(key)) items.set(key, {...item, quantity: 0, batches: []}); const row = items.get(key); row.quantity += batch.remaining; row.batches.push({id: batch.id, quantity: batch.remaining});}
    return {items: [...items.values()], mail: db.prepare('SELECT * FROM inventory_mail WHERE uid=? AND claimed=0 ORDER BY created DESC LIMIT 100').all(uid).map(row => ({...row, snapshot: JSON.parse(row.snapshot)})), grants: db.prepare('SELECT permission,expires FROM permission_leases WHERE uid=? AND expires>?').all(uid, now()), permissions: PERMISSIONS, serverTime: now()};
  }
  function use(user, input) {
    const key = name(input.requestId, 80, '操作编号'), operation = 'use:' + user.uid + ':' + key;
    const old = db.prepare('SELECT result FROM inventory_operations WHERE id=?').get(operation);
    if (old) {const result = JSON.parse(old.result); if (result.batch !== input.batch) fail('操作编号已用于其他凭证'); return result;}
    const batch = db.prepare('SELECT * FROM inventory_batches WHERE id=? AND uid=?').get(input.batch, user.uid);
    if (!batch || batch.remaining <= 0) fail('凭证不存在或已使用');
    const item = JSON.parse(batch.snapshot);
    if (item.kind !== 'voucher' || !PERMISSIONS[item.permission]) fail('该物品不能直接使用');
    const start = Math.max(now(), getLease(user.uid, item.permission)), expires = entitlementEnd(start, item.unit, item.duration);
    if (expires > now() + 10 * 366 * 86400000) fail('权限有效期已足够长，请以后再使用');
    db.prepare('UPDATE inventory_batches SET remaining=remaining-1 WHERE id=?').run(batch.id);
    db.prepare('INSERT INTO permission_leases VALUES(?,?,?,?) ON CONFLICT(uid,permission) DO UPDATE SET expires=excluded.expires,updated=excluded.updated').run(user.uid, item.permission, expires, now());
    const result = {batch: batch.id, permission: item.permission, expires};
    db.prepare('INSERT INTO inventory_operations VALUES(?,?,?,?,?)').run(operation, user.uid, 'use', JSON.stringify(result), now()); audit(user.uid, user.uid, 'use', item.id, 1);
    return result;
  }
  async function route(req, res, url) {
    const path = url.pathname, management = path.startsWith('/api/admin/inventory');
    if (!management && !path.startsWith('/api/inventory')) return false;
    const user = management ? admin(req) : auth(req); limit('inventory:' + user.uid, 90);
    if (req.method === 'GET') {
      if (management) send(res, 200, {items: db.prepare('SELECT * FROM inventory_items ORDER BY created DESC LIMIT 500').all(), permissions: PERMISSIONS, codes: db.prepare('SELECT id,label,item,quantity,starts,expires,max_uses,enabled,(SELECT COUNT(*) FROM inventory_code_claims c WHERE c.code=inventory_codes.id) AS claimed FROM inventory_codes ORDER BY created DESC LIMIT 100').all(), members: db.prepare('SELECT uid,name FROM members ORDER BY seen DESC LIMIT 500').all()});
      else send(res, 200, view(user.uid)); return true;
    }
    const input = await body(req);
    if (!management && user.consoleAdmin) fail('请使用玩家角色操作背包');
    if (path === '/api/inventory/use' && req.method === 'POST') {
      const result = points.transaction(() => use(user, input));
      broadcast({type: 'music-access-changed'}, client => client.user.uid === user.uid);
      broadcast({type: 'permissions-changed'}, client => client.user.uid === user.uid);
      send(res, 200, {...result, inventory: view(user.uid)}); return true;
    }
    if (path === '/api/inventory/claim' && req.method === 'POST') {
      points.transaction(() => {const record = db.prepare('SELECT * FROM inventory_mail WHERE id=? AND uid=?').get(input.id, user.uid); if (!record) fail('邮件不存在'); if (record.claimed) return; grant(user.uid, JSON.parse(record.snapshot), record.quantity, 'mail:' + record.id, record.actor); db.prepare('UPDATE inventory_mail SET claimed=? WHERE id=?').run(now(), record.id);}); send(res, 200, view(user.uid)); return true;
    }
    if (path === '/api/inventory/redeem' && req.method === 'POST') {
      limit('inventory-code:' + user.uid, 8);
      points.transaction(() => {
        const record = db.prepare('SELECT * FROM inventory_codes WHERE hash=?').get(codeHash(input.code));
        if (!record) fail('道具兑换码不存在');
        if (db.prepare('SELECT 1 FROM inventory_code_claims WHERE code=? AND uid=?').get(record.id, user.uid)) fail('你已经领取过该兑换码');
        if (!record.enabled || now() < record.starts || (record.expires && now() >= record.expires)) fail('兑换码未开始、已关闭或已过期');
        if (record.max_uses && db.prepare('SELECT COUNT(*) n FROM inventory_code_claims WHERE code=?').get(record.id).n >= record.max_uses) fail('兑换码已领完');
        grant(user.uid, JSON.parse(record.snapshot), record.quantity, 'code:' + record.id + ':' + user.uid, record.actor);
        db.prepare('INSERT INTO inventory_code_claims VALUES(?,?,?)').run(record.id, user.uid, now());
      }); send(res, 200, view(user.uid)); return true;
    }
    if (path === '/api/admin/inventory/items' && req.method === 'POST') {
      const id = input.id || randomUUID(), kind = input.kind || 'material';
      if (!/^[-\w]{1,80}$/.test(id) || !['material', 'collectible', 'voucher'].includes(kind)) fail('道具类型或标识无效');
      const title = name(input.title, 100, '名称'), description = name(input.description, 4000, '说明');
      const permission = kind === 'voucher' ? input.permission : '', unit = kind === 'voucher' ? input.unit : 'days', duration = kind === 'voucher' ? integer(input.duration, 1, 366, '时长') : 0;
      if (kind === 'voucher' && (!PERMISSIONS[permission] || !['days', 'months'].includes(unit))) fail('请选择支持的权限和计时方式');
      const commission = kind === 'material' && !!input.commission ? 1 : 0;
      points.transaction(() => {
        const old = definition(id); if (input.id && !old) fail('道具不存在');
        if (old && old.updated !== input.updated) fail('道具已变化，请刷新后重试');
        if (!old && db.prepare('SELECT COUNT(*) n FROM inventory_items').get().n >= 500) fail('最多创建 500 种道具');
        const image = media.validate(input.image || '', user, 'inventory');
        // Acquired items carry an immutable snapshot; edits apply to future rewards only.
        db.prepare(`INSERT INTO inventory_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,image=excluded.image,kind=excluded.kind,permission=excluded.permission,unit=excluded.unit,duration=excluded.duration,commission=excluded.commission,enabled=excluded.enabled,updated=excluded.updated`).run(id, title, description, image, kind, permission, unit, duration, commission, input.enabled === false ? 0 : 1, old?.created || now(), Math.max(now(), (old?.updated || 0) + 1));
        audit('', user.uid, 'definition', id, 0);
      }); send(res, 200, {id}); return true;
    }
    if (path === '/api/admin/inventory/mail' && req.method === 'POST') {
      const item = definition(input.item); if (!item || !item.enabled) fail('请选择可用道具');
      const quantity = integer(input.quantity, 1, item.kind === 'voucher' ? 3 : 99999, '邮寄数量'), title = name(input.title, 120, '邮件标题');
      const key = name(input.requestId, 80, '操作编号');
      const ids = [...new Set(Array.isArray(input.recipients) ? input.recipients : [])]; if (!ids.length || ids.length > 500) fail('每次请选择 1–500 位成员');
      ids.forEach(member);
      points.transaction(() => {const operation = 'mail:' + user.uid + ':' + key, fingerprint = JSON.stringify({item: item.id, quantity, ids: [...ids].sort(), title}), old = db.prepare('SELECT result FROM inventory_operations WHERE id=?').get(operation); if (old) {if (old.result !== fingerprint) fail('操作编号已用于其他邮寄'); return;} for (const uid of ids) mail(uid, item, quantity, title, user.uid, randomUUID()); db.prepare('INSERT INTO inventory_operations VALUES(?,?,?,?,?)').run(operation, user.uid, 'mail', fingerprint, now());});
      send(res, 200, {ok: true, recipients: ids.length}); return true;
    }
    if (path === '/api/admin/inventory/codes' && req.method === 'POST') {
      if (input.id) {if (typeof input.enabled !== 'boolean') fail('兑换码开关无效'); db.prepare('UPDATE inventory_codes SET enabled=? WHERE id=?').run(+input.enabled, input.id); send(res, 200, {ok: true}); return true;}
      const item = definition(input.item); if (!item || !item.enabled) fail('请选择可用道具');
      const code = name(input.code, 64, '兑换码').normalize('NFKC'); if (!/^[\p{L}\p{N}_-]{4,64}$/u.test(code)) fail('兑换码需为 4–64 个汉字、字母、数字、下划线或短横线');
      const hash = codeHash(code), starts = integer(input.starts || now(), 0, 8640000000000000, '开始时间'), expires = integer(input.expires || 0, 0, 8640000000000000, '结束时间');
      if (expires && (expires <= starts || expires <= now())) fail('结束时间必须在开始时间和当前时间之后');
      const quantity = integer(input.quantity, 1, item.kind === 'voucher' ? 3 : 99999, '数量'), maxUses = integer(input.maxUses || 0, 0, 1000000000, '总领取次数');
      points.transaction(() => {for (const table of ['inventory_codes', 'activity_rewards', 'points_codes']) if (db.prepare(`SELECT 1 FROM ${table} WHERE hash=?`).get(hash)) fail('兑换码已存在'); db.prepare('INSERT INTO inventory_codes VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(), hash, code, item.id, snapshot(item), quantity, starts, expires, maxUses, 1, user.uid, now());});
      send(res, 201, {ok: true}); return true;
    }
    fail('背包操作不存在');
  }
  function seed() {
    for (const [id, title, permission, unit, duration] of [
      ['hosting-3days', '联机开房凭证 · 3 天', 'lobby.host', 'days', 3],
      ['netease-1month', '网易云登录凭证 · 1 个月', 'music.netease', 'months', 1],
    ]) db.prepare('INSERT OR IGNORE INTO inventory_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id, title, '购买后存入背包，主动使用后开始计时。同类凭证最多保存三张。', '', 'voucher', permission, unit, duration, 0, 1, now(), now());
  }
  seed();
  let expiredAfter = now();
  const timer = setInterval(() => {
    const time = now(), rows = db.prepare('SELECT uid,permission FROM permission_leases WHERE expires>? AND expires<=?').all(expiredAfter, time); expiredAfter = time;
    for (const row of rows) {broadcast({type: 'permissions-changed'}, client => client.user.uid === row.uid); if (row.permission === 'music.netease') broadcast({type: 'music-access-changed'}, client => client.user.uid === row.uid);}
  }, 15000); timer.unref();
  return {route, definition, grant, refund, view, has, expires: getLease, capacity, escrow, releaseEscrow, mail, close: () => clearInterval(timer)};
}
