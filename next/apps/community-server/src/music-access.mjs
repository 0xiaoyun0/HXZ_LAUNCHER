export function createMusicAccess({db,auth,admin,adminIDs,body,send,broadcast}) {
  db.exec('CREATE TABLE IF NOT EXISTS music_grants(uid TEXT PRIMARY KEY,actor TEXT NOT NULL,created INTEGER NOT NULL)');
  const allowed=user=>!!user&&(user.consoleAdmin||adminIDs.has(user.uid)||!!db.prepare('SELECT 1 FROM music_grants WHERE uid=?').get(user.uid));
  return async(req,res,url)=>{
    if(url.pathname==='/api/music/access'&&req.method==='GET'){const user=auth(req);send(res,200,{allowed:!!allowed(user),personalAccount:true});return true;}
    if(url.pathname!=='/api/admin/music')return false;
    const user=admin(req);
    if(req.method==='GET'){send(res,200,{members:db.prepare('SELECT m.*,EXISTS(SELECT 1 FROM music_grants g WHERE g.uid=m.uid) AS enabled FROM members m ORDER BY seen DESC LIMIT 500').all(),grants:db.prepare('SELECT g.uid,m.name,g.created FROM music_grants g LEFT JOIN members m ON m.uid=g.uid ORDER BY g.created DESC').all()});return true;}
    if(req.method!=='POST')throw Error('不支持的授权操作');const input=await body(req);
    if(typeof input.uid!=='string'||!db.prepare('SELECT 1 FROM members WHERE uid=?').get(input.uid)||typeof input.enabled!=='boolean')throw Error('请选择社区成员');
    if(input.enabled)db.prepare('INSERT OR IGNORE INTO music_grants VALUES(?,?,?)').run(input.uid,user.uid,Date.now());else db.prepare('DELETE FROM music_grants WHERE uid=?').run(input.uid);
    broadcast({type:'music-access-changed'},c=>c.user.uid===input.uid);send(res,200,{ok:true});return true;
  };
}
