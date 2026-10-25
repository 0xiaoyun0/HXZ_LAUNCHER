import {fail,string,integer,choice,tags,identifier,page,url} from './common.mjs';

export function createSocial(ctx) {
  const {db,manager,member,transaction,notify,deliverNotifications,audit,once,now,id,limit}=ctx;
  db.exec(`
    CREATE TABLE IF NOT EXISTS hub_visits(uid TEXT PRIMARY KEY,seen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS hub_profiles(uid TEXT PRIMARY KEY,bio TEXT NOT NULL,tags TEXT NOT NULL,availability TEXT NOT NULL,mentor INTEGER NOT NULL,discoverable INTEGER NOT NULL,visibility TEXT NOT NULL,home TEXT NOT NULL,revision INTEGER NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS hub_friends(lo TEXT NOT NULL,hi TEXT NOT NULL,requester TEXT NOT NULL,state TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(lo,hi));
    CREATE TABLE IF NOT EXISTS hub_blocks(uid TEXT NOT NULL,target TEXT NOT NULL,PRIMARY KEY(uid,target));
    CREATE TABLE IF NOT EXISTS hub_teams(id TEXT PRIMARY KEY,owner TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,visibility TEXT NOT NULL,revision INTEGER NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS hub_team_members(team TEXT NOT NULL,uid TEXT NOT NULL,role TEXT NOT NULL,state TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(team,uid));
    CREATE INDEX IF NOT EXISTS hub_team_user ON hub_team_members(uid,state);
    CREATE TABLE IF NOT EXISTS hub_bookmarks(uid TEXT NOT NULL,id TEXT NOT NULL,title TEXT NOT NULL,url TEXT NOT NULL,kind TEXT NOT NULL,tags TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(uid,id));
    CREATE TABLE IF NOT EXISTS hub_follows(uid TEXT NOT NULL,target TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(uid,target));
    CREATE TABLE IF NOT EXISTS hub_preferences(uid TEXT PRIMARY KEY,value TEXT NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS hub_letters(id TEXT PRIMARY KEY,sender TEXT NOT NULL,recipient TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,due INTEGER NOT NULL,sent INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS hub_letters_due ON hub_letters(sent,due);
    CREATE TABLE IF NOT EXISTS hub_devices(uid TEXT NOT NULL,id TEXT NOT NULL,name TEXT NOT NULL,platform TEXT NOT NULL,seen INTEGER NOT NULL,PRIMARY KEY(uid,id));
    CREATE TABLE IF NOT EXISTS hub_handoffs(id TEXT PRIMARY KEY,uid TEXT NOT NULL,device TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS hub_handoffs_owner ON hub_handoffs(uid,device,status,created);
  `);
  const pair=(a,b)=>[a,b].sort();
  const blocked=(a,b)=>!!db.prepare('SELECT 1 FROM hub_blocks WHERE (uid=? AND target=?) OR (uid=? AND target=?)').get(a,b,b,a);
  const friends=(a,b)=>a===b||!!db.prepare("SELECT 1 FROM hub_friends WHERE lo=? AND hi=? AND state='accepted'").get(...pair(a,b));
  const mineTeam=(team,uid)=>db.prepare("SELECT role FROM hub_team_members WHERE team=? AND uid=? AND state='active'").get(team,uid);
  function profile(uid,viewer) {
    const user=member(uid), row=db.prepare('SELECT * FROM hub_profiles WHERE uid=?').get(uid);
    if(blocked(uid,viewer.uid)) fail('该成员资料不可见',404);
    if(row && uid!==viewer.uid && !manager(viewer) && (row.visibility==='private'||row.visibility==='friends'&&!friends(uid,viewer.uid))) return {...user,restricted:true};
    const showcase=db.prepare("SELECT id,kind,title,summary FROM hub_records WHERE owner=? AND kind IN ('work','journal') AND status='published' AND visibility='community' ORDER BY updated DESC LIMIT 6").all(uid);
    return {...user,showcase,bio:row?.bio||'',tags:JSON.parse(row?.tags||'[]'),availability:row?.availability||'',mentor:!!row?.mentor,discoverable:!!row?.discoverable,visibility:row?.visibility||'community',home:JSON.parse(row?.home||'{}'),revision:row?.revision||0,friend:friends(uid,viewer.uid)};
  }
  function deliverLetters() {
    transaction(()=>{
      for(const letter of db.prepare('SELECT * FROM hub_letters WHERE sent=0 AND due<=? ORDER BY due LIMIT 100').all(now())) {
        const actor=db.prepare('SELECT uid,name FROM members WHERE uid=?').get(letter.sender);
        if(actor&&!blocked(letter.sender,letter.recipient)) notify(actor,[letter.recipient],letter.title,'/community/hub?section=space','letter:'+letter.id,letter.body);
        db.prepare('UPDATE hub_letters SET sent=? WHERE id=?').run(now(),letter.id);
      }
    });
  }
  function visit(user){
    const previous=db.prepare('SELECT seen FROM hub_visits WHERE uid=?').get(user.uid)?.seen;
    db.prepare('INSERT INTO hub_visits VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET seen=excluded.seen').run(user.uid,now());
    const preferences=JSON.parse(db.prepare('SELECT value FROM hub_preferences WHERE uid=?').get(user.uid)?.value||'{}');
    if(!previous||now()-previous<86400000||preferences.digest===false)return;
    const updates=db.prepare("SELECT title,kind,id FROM hub_records WHERE visibility='community' AND status='published' AND kind NOT IN ('whitelist','appeal') AND owner<>? AND updated>? AND NOT EXISTS(SELECT 1 FROM hub_blocks b WHERE (b.uid=? AND b.target=hub_records.owner) OR (b.uid=hub_records.owner AND b.target=?)) ORDER BY updated DESC LIMIT 6").all(user.uid,previous,user.uid,user.uid);
    if(updates.length)notify({uid:user.uid,name:'社区摘要'},[user.uid],'欢迎回来，看看社区的新内容','/community/hub','digest:'+user.uid+':'+Math.floor((now()+8*3600000)/86400000),updates.map(v=>'· '+v.title).join('\n'));
  }
  async function route(user,p,method,input,search) {
    if(p==='members'&&method==='GET') {
      const query=string(search.get('q')||'',40,'昵称',true),onlyFriends=search.get('friends')==='1',includeSelf=search.get('self')==='1';
      const items=db.prepare(`SELECT m.uid,m.name FROM members m WHERE (?=1 OR m.uid<>?) AND (instr(lower(m.name),lower(?))>0 OR m.uid=?) AND NOT EXISTS(SELECT 1 FROM hub_blocks b WHERE (b.uid=? AND b.target=m.uid) OR (b.uid=m.uid AND b.target=?)) AND (?=0 OR m.uid=? OR EXISTS(SELECT 1 FROM hub_friends f WHERE f.state='accepted' AND ((f.lo=? AND f.hi=m.uid) OR (f.hi=? AND f.lo=m.uid)))) ORDER BY m.seen DESC LIMIT 24`).all(+includeSelf,user.uid,query,query,user.uid,user.uid,+onlyFriends,user.uid,user.uid,user.uid);
      return {items};
    }
    if(p==='social'&&method==='GET') {
      const {offset,query}=page(search);
      const suggestions=db.prepare(`SELECT p.uid,m.name,p.bio,p.tags,p.availability,p.mentor FROM hub_profiles p JOIN members m ON m.uid=p.uid WHERE p.discoverable=1 AND p.visibility='community' AND p.uid<>? AND (instr(lower(m.name),lower(?))>0 OR instr(lower(p.tags),lower(?))>0) AND NOT EXISTS(SELECT 1 FROM hub_blocks b WHERE (b.uid=? AND b.target=p.uid) OR (b.uid=p.uid AND b.target=?)) ORDER BY p.updated DESC LIMIT 24 OFFSET ?`).all(user.uid,query,query,user.uid,user.uid,offset).map(row=>({...row,tags:JSON.parse(row.tags)}));
      const relationships=db.prepare(`SELECT f.*,m.uid,m.name FROM hub_friends f JOIN members m ON m.uid=CASE WHEN f.lo=? THEN f.hi ELSE f.lo END WHERE f.lo=? OR f.hi=? ORDER BY f.created DESC LIMIT 500`).all(user.uid,user.uid,user.uid);
      const teams=db.prepare(`SELECT t.*,m.role,m.state,(SELECT COUNT(*) FROM hub_team_members WHERE team=t.id AND state='active') AS size FROM hub_teams t JOIN hub_team_members m ON m.team=t.id WHERE m.uid=? ORDER BY t.created DESC LIMIT 100`).all(user.uid);
      return {profile:profile(user.uid,user),relationships,suggestions,teams,blocks:db.prepare('SELECT b.target,m.name FROM hub_blocks b JOIN members m ON m.uid=b.target WHERE b.uid=? LIMIT 500').all(user.uid)};
    }
    if(p.startsWith('profiles/')&&method==='GET') return profile(p.slice(9),user);
    if(p==='profile'&&method==='PUT') {
      const bio=string(input.bio||'',1200,'个人介绍',true), keywords=tags(input.tags),availability=string(input.availability||'',120,'空闲时间',true),visibility=choice(input.visibility,['community','friends','private'],'可见范围');
      const home=input.home||{};if(typeof home!=='object'||Array.isArray(home))fail('个人空间配置无效');
      const normalized={theme:choice(home.theme||'sky',['sky','forest','night','rose'],'空间主题'),companion:choice(home.companion||'none',['none','cat','fox','rabbit'],'伙伴'),companionName:string(home.companionName||'',20,'伙伴名称',true),motto:string(home.motto||'',80,'签名',true)};
      transaction(()=>{
        const old=db.prepare('SELECT revision FROM hub_profiles WHERE uid=?').get(user.uid);
        if((old?.revision||0)!==input.revision)fail('个人资料已更新，请刷新后再保存',409);
        db.prepare('INSERT INTO hub_profiles VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET bio=excluded.bio,tags=excluded.tags,availability=excluded.availability,mentor=excluded.mentor,discoverable=excluded.discoverable,visibility=excluded.visibility,home=excluded.home,revision=excluded.revision,updated=excluded.updated').run(user.uid,bio,JSON.stringify(keywords),availability,+(input.mentor===true),+(input.discoverable===true&&visibility==='community'),visibility,JSON.stringify(normalized),(old?.revision||0)+1,now());
      });return profile(user.uid,user);
    }
    if(p==='friends'&&method==='POST') {
      const target=member(input.uid);if(target.uid===user.uid)fail('不能添加自己');
      const [lo,hi]=pair(user.uid,target.uid),action=choice(input.action,['request','accept','reject','remove','block','unblock'],'好友操作');
      return transaction(()=>{
        if(action==='block'){db.prepare('INSERT OR IGNORE INTO hub_blocks VALUES(?,?)').run(user.uid,target.uid);db.prepare('DELETE FROM hub_friends WHERE lo=? AND hi=?').run(lo,hi);db.prepare('DELETE FROM hub_follows WHERE (uid=? AND target=?) OR (uid=? AND target=?)').run(user.uid,target.uid,target.uid,user.uid);return {ok:true};}
        if(action==='unblock'){db.prepare('DELETE FROM hub_blocks WHERE uid=? AND target=?').run(user.uid,target.uid);return {ok:true};}
        if(blocked(user.uid,target.uid))fail('当前无法建立好友关系',403);
        const old=db.prepare('SELECT * FROM hub_friends WHERE lo=? AND hi=?').get(lo,hi);
        if(action==='request') {
          if(old)return {ok:true,state:old.state};
          if(db.prepare('SELECT COUNT(*) AS n FROM hub_friends WHERE lo=? OR hi=?').get(user.uid,user.uid).n>=500)fail('好友关系已达上限');
          db.prepare('INSERT INTO hub_friends VALUES(?,?,?,?,?)').run(lo,hi,user.uid,'pending',now());notify(user,[target.uid],user.name+' 想添加你为好友','/community/hub?section=social','friend:'+lo+':'+hi+':'+now());
        } else if(action==='accept') {
          if(!old||old.requester===user.uid)fail('没有可以接受的好友申请',409);
          if(old.state!=='accepted'){db.prepare("UPDATE hub_friends SET state='accepted' WHERE lo=? AND hi=?").run(lo,hi);notify(user,[target.uid],user.name+' 接受了好友申请','/community/hub?section=social','accepted:'+lo+':'+hi+':'+old.created);}
        } else db.prepare('DELETE FROM hub_friends WHERE lo=? AND hi=?').run(lo,hi);
        return {ok:true};
      });
    }
    if(p==='teams'&&method==='POST') return once(user,input.requestId,'team',()=>{
      if(db.prepare('SELECT COUNT(*) AS n FROM hub_teams WHERE owner=?').get(user.uid).n>=20)fail('最多创建 20 个小队');
      const team=id();db.prepare('INSERT INTO hub_teams VALUES(?,?,?,?,?,?,?)').run(team,user.uid,string(input.title,50,'小队名称'),string(input.description||'',2000,'小队介绍',true),choice(input.visibility||'private',['private','community'],'可见范围'),1,now());
      db.prepare('INSERT INTO hub_team_members VALUES(?,?,?,?,?)').run(team,user.uid,'owner','active',now());return {id:team};
    });
    const teamMatch=p.match(/^teams\/([\w-]+)$/);
    if(teamMatch) {
      const team=db.prepare('SELECT * FROM hub_teams WHERE id=?').get(teamMatch[1]);if(!team)fail('小队不存在',404);
      const membership=mineTeam(team.id,user.uid);
      if(method==='GET'){if(!membership&&team.visibility!=='community')fail('该小队未公开',403);return {...team,members:db.prepare('SELECT t.uid,m.name,t.role,t.state FROM hub_team_members t JOIN members m ON m.uid=t.uid WHERE t.team=? ORDER BY t.created').all(team.id)};}
      if(method==='POST')return transaction(()=>{
        const action=choice(input.action,['invite','accept','leave','remove'],'小队操作');
        if(action==='invite'||action==='remove') {
          if(team.owner!==user.uid)fail('仅队长可以管理成员',403);const target=member(input.uid);if(target.uid===team.owner)fail('不能移除队长');
          if(action==='remove')db.prepare('DELETE FROM hub_team_members WHERE team=? AND uid=?').run(team.id,target.uid);
          else {if(blocked(user.uid,target.uid))fail('当前不能邀请该成员',403);if(db.prepare('SELECT COUNT(*) AS n FROM hub_team_members WHERE team=?').get(team.id).n>=50)fail('小队最多 50 人');db.prepare("INSERT OR IGNORE INTO hub_team_members VALUES(?,?,'member','invited',?)").run(team.id,target.uid,now());notify(user,[target.uid],'邀请加入小队：'+team.title,'/community/hub?section=social','team:'+team.id+':'+target.uid+':'+now());}
        } else if(action==='accept') {if(blocked(user.uid,team.owner))fail('当前无法接受这个小队邀请',403);const changed=db.prepare("UPDATE hub_team_members SET state='active' WHERE team=? AND uid=? AND state='invited'").run(team.id,user.uid);if(!changed.changes&&!membership)fail('没有小队邀请',403);}
        else {if(team.owner===user.uid)fail('队长需先解散小队');db.prepare('DELETE FROM hub_team_members WHERE team=? AND uid=?').run(team.id,user.uid);}
        return {ok:true};
      });
      if(method==='DELETE'){if(team.owner!==user.uid)fail('仅队长可以解散小队',403);return transaction(()=>{db.prepare('DELETE FROM hub_team_members WHERE team=?').run(team.id);db.prepare('DELETE FROM hub_teams WHERE id=?').run(team.id);return {ok:true};});}
    }
    if(p==='saved'&&method==='GET') {const {offset,query}=page(search);return {items:db.prepare('SELECT * FROM hub_bookmarks WHERE uid=? AND (instr(lower(title),lower(?))>0 OR instr(lower(tags),lower(?))>0) ORDER BY updated DESC LIMIT 24 OFFSET ?').all(user.uid,query,query,offset).map(v=>({...v,tags:JSON.parse(v.tags)})),follows:db.prepare('SELECT f.target,m.name FROM hub_follows f JOIN members m ON m.uid=f.target WHERE f.uid=? LIMIT 500').all(user.uid),preferences:JSON.parse(db.prepare('SELECT value FROM hub_preferences WHERE uid=?').get(user.uid)?.value||'{}')};}
    if(p==='saved'&&method==='POST') {
      const key=identifier(input.id||id());if(db.prepare('SELECT COUNT(*) AS n FROM hub_bookmarks WHERE uid=?').get(user.uid).n>=2000&&!db.prepare('SELECT 1 FROM hub_bookmarks WHERE uid=? AND id=?').get(user.uid,key))fail('收藏已达 2000 项');
      db.prepare('INSERT INTO hub_bookmarks VALUES(?,?,?,?,?,?,?) ON CONFLICT(uid,id) DO UPDATE SET title=excluded.title,url=excluded.url,kind=excluded.kind,tags=excluded.tags,updated=excluded.updated').run(user.uid,key,string(input.title,120,'收藏名称'),url(input.url,{empty:false}),string(input.kind||'link',32,'收藏类型'),JSON.stringify(tags(input.tags)),now());return {id:key};
    }
    if(p.startsWith('saved/')&&method==='DELETE'){db.prepare('DELETE FROM hub_bookmarks WHERE uid=? AND id=?').run(user.uid,p.slice(6));return {ok:true};}
    if(p==='follow'&&method==='POST'){const target=member(input.uid);if(target.uid===user.uid||blocked(user.uid,target.uid))fail('无法关注该成员');if(input.followed===true){if(db.prepare('SELECT COUNT(*) AS n FROM hub_follows WHERE uid=?').get(user.uid).n>=500)fail('关注数量已达上限');db.prepare('INSERT OR IGNORE INTO hub_follows VALUES(?,?,?)').run(user.uid,target.uid,now());}else if(input.followed===false)db.prepare('DELETE FROM hub_follows WHERE uid=? AND target=?').run(user.uid,target.uid);else fail('关注状态无效');return {ok:true};}
    if(p==='preferences'&&method==='PUT') {
      const value={digest:input.digest!==false,quietStart:integer(input.quietStart??23,0,23,'安静开始时间'),quietEnd:integer(input.quietEnd??8,0,23,'安静结束时间'),quiet:input.quiet===true,subscriptions:input.subscriptions!==false};
      db.prepare('INSERT INTO hub_preferences VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET value=excluded.value,updated=excluded.updated').run(user.uid,JSON.stringify(value),now());if(!value.quiet)db.prepare('UPDATE hub_notification_queue SET due=? WHERE uid=?').run(now(),user.uid);deliverNotifications();return value;
    }
    if(p==='letters'&&method==='GET')return {items:db.prepare("SELECT id,recipient,title,body,due,sent,created FROM hub_letters WHERE sender=? ORDER BY created DESC LIMIT 100").all(user.uid)};
    if(p==='letters'&&method==='POST')return once(user,input.requestId,'letter',()=>{
      const to=member(input.uid);if(!friends(user.uid,to.uid)||blocked(user.uid,to.uid))fail('只能向自己或好友寄送时光信',403);
      if(db.prepare('SELECT COUNT(*) AS n FROM hub_letters WHERE sender=? AND sent=0').get(user.uid).n>=100)fail('最多保留 100 封待寄信件');
      const key=id();db.prepare('INSERT INTO hub_letters VALUES(?,?,?,?,?,?,0,?)').run(key,user.uid,to.uid,string(input.title,100,'信件标题'),string(input.body,8000,'信件内容'),integer(input.due,now()+60000,now()+3660*86400000,'寄送时间'),now());return {id:key};
    });
    if(p.startsWith('letters/')&&method==='DELETE'){db.prepare('DELETE FROM hub_letters WHERE id=? AND sender=? AND sent=0').run(p.slice(8),user.uid);return {ok:true};}
    if(p==='devices'&&method==='GET')return {items:db.prepare('SELECT id,name,platform,seen FROM hub_devices WHERE uid=? ORDER BY seen DESC LIMIT 12').all(user.uid)};
    if(p==='devices'&&method==='POST') {
      const device=identifier(input.id);if(db.prepare('SELECT COUNT(*) AS n FROM hub_devices WHERE uid=?').get(user.uid).n>=12&&!db.prepare('SELECT 1 FROM hub_devices WHERE uid=? AND id=?').get(user.uid,device))fail('最多配对 12 台设备');
      db.prepare('INSERT INTO hub_devices VALUES(?,?,?,?,?) ON CONFLICT(uid,id) DO UPDATE SET name=excluded.name,platform=excluded.platform,seen=excluded.seen').run(user.uid,device,string(input.name,40,'设备名称'),choice(input.platform,['desktop','android'],'设备类型'),now());return {ok:true};
    }
    if(p.startsWith('devices/')&&method==='DELETE')return transaction(()=>{const device=p.slice(8);db.prepare('DELETE FROM hub_devices WHERE uid=? AND id=?').run(user.uid,device);db.prepare("UPDATE hub_handoffs SET status='cancelled',updated=? WHERE uid=? AND device=? AND status='pending'").run(now(),user.uid,device);return {ok:true};});
    if(p==='handoffs'&&method==='GET')return {items:db.prepare('SELECT * FROM hub_handoffs WHERE uid=? ORDER BY created DESC LIMIT 100').all(user.uid).map(row=>({...row,payload:JSON.parse(row.payload)}))};
    if(p==='handoffs'&&method==='POST')return once(user,input.requestId,'handoff',()=>{
      const device=identifier(input.device),registered=db.prepare('SELECT * FROM hub_devices WHERE uid=? AND id=?').get(user.uid,device);if(!registered)fail('目标设备未配对',404);if(input.kind==='server-download'&&registered.platform!=='desktop')fail('游戏安装待办只能发送到电脑');
      if(db.prepare("SELECT COUNT(*) AS n FROM hub_handoffs WHERE uid=? AND status='pending'").get(user.uid).n>=100)fail('待办任务已达上限');
      const kind=choice(input.kind,['link','server-download','note'],'接续类型'),payload={title:string(input.title,120,'任务标题'),url:kind==='link'?url(input.url,{empty:false}):'',server:kind==='server-download'?choice(input.server,['HXZ-survival','HXZ-mod-1','HXZ-mod-2'],'服务器'):'',note:string(input.note||'',2000,'备注',true)},key=id();
      db.prepare('INSERT INTO hub_handoffs VALUES(?,?,?,?,?,?,?,?)').run(key,user.uid,device,kind,JSON.stringify(payload),'pending',now(),now());return {id:key};
    });
    if(p.startsWith('handoffs/')&&method==='POST') {
      const status=choice(input.status,['done','cancelled'],'待办状态'),task=db.prepare('SELECT * FROM hub_handoffs WHERE id=? AND uid=?').get(p.slice(9),user.uid);if(!task)fail('待办不存在',404);if(status==='done'&&(!input.device||task.device!==input.device))fail('请在目标设备上完成待办',403);if(status==='done'&&!db.prepare('SELECT 1 FROM hub_devices WHERE uid=? AND id=?').get(user.uid,input.device))fail('目标设备已移除',403);db.prepare("UPDATE hub_handoffs SET status=?,updated=? WHERE id=? AND uid=? AND status='pending'").run(status,now(),p.slice(9),user.uid);return {ok:true};
    }
    return undefined;
  }
  const timer=setInterval(()=>{try{deliverLetters();deliverNotifications();}catch{/* keep unsent letters for the next attempt */}},30000);timer.unref();
  return {route,profile,friends,blocked,mineTeam,deliverLetters,visit,close:()=>clearInterval(timer)};
}
