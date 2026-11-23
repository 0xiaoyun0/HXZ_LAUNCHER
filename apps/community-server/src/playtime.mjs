import {weekOf,weekLabel} from './points.mjs';
import {fail} from './hub/common.mjs';

const DAY=86400000,SHIFT=8*3600000;
// Only two consecutive, authenticated server polls can confirm an interval.
// Gaps longer than this are discarded in full, rather than extrapolated.
export const PLAYTIME_MAX_GAP=90000;
const DEFAULTS={enabled:true,scheme:'cumulative-24h',intervalSeconds:86400,pointsPerInterval:'5',minWeeklyMinutes:0,dailyCapMinutes:1440,rewards:[]};
export const PLAYTIME_VERIFICATION='仅可信游戏服核验的在线时长参加统计；跨服重叠不重复计时，断连不补记。在线状态不等于活跃操作，无法识别全部挂机。';
const canonical=uid=>String(uid).replaceAll('-','').toLowerCase();
const dayOf=time=>Math.floor((time+SHIFT)/DAY)*DAY-SHIFT;
const dateOf=time=>new Date(time+SHIFT).toISOString().slice(0,10);

export function createPlaytime({db,auth,admin,body,send,limit=()=>{},points,inbox,now=()=>Date.now()}){
 db.exec(`
  CREATE TABLE IF NOT EXISTS playtime_meta(id INTEGER PRIMARY KEY CHECK(id=1),clock INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS playtime_rules(week INTEGER PRIMARY KEY,value TEXT NOT NULL,actor TEXT NOT NULL,updated INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS playtime_polls(server TEXT PRIMARY KEY,observed INTEGER NOT NULL,players TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS playtime_intervals(uid TEXT NOT NULL,day INTEGER NOT NULL,start INTEGER NOT NULL,end INTEGER NOT NULL,PRIMARY KEY(uid,day,start));
  CREATE TABLE IF NOT EXISTS playtime_days(uid TEXT NOT NULL,day INTEGER NOT NULL,week INTEGER NOT NULL,milliseconds INTEGER NOT NULL,PRIMARY KEY(uid,day));
  CREATE INDEX IF NOT EXISTS playtime_days_week ON playtime_days(week,uid);
  CREATE TABLE IF NOT EXISTS playtime_settlements(week INTEGER PRIMARY KEY,created INTEGER NOT NULL,rules TEXT NOT NULL,board TEXT NOT NULL,total INTEGER NOT NULL,points TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS playtime_reward_config(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL,updated INTEGER NOT NULL,actor TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS playtime_accounts(uid TEXT PRIMARY KEY,milliseconds INTEGER NOT NULL DEFAULT 0 CHECK(milliseconds>=0),awarded INTEGER NOT NULL DEFAULT 0 CHECK(awarded>=0));
  CREATE TABLE IF NOT EXISTS playtime_awards(id TEXT PRIMARY KEY,uid TEXT NOT NULL,name TEXT NOT NULL,first_interval INTEGER NOT NULL,last_interval INTEGER NOT NULL,points TEXT NOT NULL,created INTEGER NOT NULL);
 `);
 // A service restart cannot attest what happened during its downtime.
 db.prepare('DELETE FROM playtime_polls').run();
 db.prepare('INSERT OR IGNORE INTO playtime_meta VALUES(1,?)').run(now());
 if(!db.prepare('SELECT 1 FROM playtime_rules LIMIT 1').get())db.prepare('INSERT INTO playtime_rules VALUES(?,?,?,?)').run(weekOf(now()),JSON.stringify(DEFAULTS),'system',now());
 // Migration is atomic and runs once. Every old settled week is excluded, even
 // when its frozen rules awarded zero. Unsettled verified time retains its full
 // duration: the old ranking cap is not a cap on real verified play.
 if(!db.prepare('SELECT 1 FROM playtime_reward_config WHERE id=1').get())points.transaction(()=>{
  const legacy=JSON.parse(db.prepare('SELECT value FROM playtime_rules WHERE week<=? ORDER BY week DESC LIMIT 1').get(weekOf(now()))?.value||JSON.stringify(DEFAULTS));
  db.prepare('INSERT INTO playtime_reward_config VALUES(1,?,?,?)').run(legacy.enabled?1:0,now(),'migration');
  for(const row of db.prepare('SELECT uid,SUM(milliseconds) milliseconds FROM playtime_days WHERE week NOT IN (SELECT week FROM playtime_settlements) GROUP BY uid').all()){
   db.prepare('INSERT INTO playtime_accounts(uid,milliseconds) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET milliseconds=milliseconds+excluded.milliseconds').run(canonical(row.uid),row.milliseconds);
  }
 });
 const ruleFor=()=>({...DEFAULTS,enabled:!!db.prepare('SELECT enabled FROM playtime_reward_config WHERE id=1').get().enabled});
 const settled=week=>db.prepare('SELECT * FROM playtime_settlements WHERE week=?').get(week);
 function validate(input){
  if(typeof input?.enabled!=='boolean')fail('请选择是否开启游玩时长奖励');
  if((input.intervalSeconds!==undefined&&input.intervalSeconds!==86400)||(input.pointsPerInterval!==undefined&&String(input.pointsPerInterval)!=='5')||(input.scheme!==undefined&&input.scheme!==DEFAULTS.scheme))fail('奖励比例固定为每累计24小时5积分');
  return {...DEFAULTS,enabled:input.enabled};
 }
 function addInterval(uid,start,end){
  while(start<end){
   const day=dayOf(start),finish=Math.min(end,day+DAY),week=weekOf(day);
   // Late polls never mutate an already issued ranking.
   if(!settled(week)){
    const before=db.prepare('SELECT milliseconds FROM playtime_days WHERE uid=? AND day=?').get(uid,day)?.milliseconds||0;
    const overlap=db.prepare('SELECT start,end FROM playtime_intervals WHERE uid=? AND day=? AND start<=? AND end>=?').all(uid,day,finish,start);
    const first=Math.min(start,...overlap.map(v=>v.start)),last=Math.max(finish,...overlap.map(v=>v.end));
    db.prepare('DELETE FROM playtime_intervals WHERE uid=? AND day=? AND start<=? AND end>=?').run(uid,day,finish,start);
    db.prepare('INSERT INTO playtime_intervals VALUES(?,?,?,?)').run(uid,day,first,last);
    const milliseconds=db.prepare('SELECT SUM(end-start) AS n FROM playtime_intervals WHERE uid=? AND day=?').get(uid,day).n;
    db.prepare('INSERT INTO playtime_days VALUES(?,?,?,?) ON CONFLICT(uid,day) DO UPDATE SET milliseconds=excluded.milliseconds').run(uid,day,week,milliseconds);
    const delta=milliseconds-before;
    if(delta>0)db.prepare('INSERT INTO playtime_accounts(uid,milliseconds) VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET milliseconds=milliseconds+excluded.milliseconds').run(uid,delta);
   }
   start=finish;
  }
 }
 // This method is called only after gameTelemetry.authorize and poll validation.
 // Never accept timestamps, totals or duration claims from the request payload.
 function observe(server,players){
  const stamp=now(),clock=db.prepare('SELECT clock FROM playtime_meta WHERE id=1').get().clock;
  if(stamp<clock)return;
  const ids=[...new Set(players.map(p=>canonical(p.uid)))],current=new Set(ids),previous=db.prepare('SELECT * FROM playtime_polls WHERE server=?').get(server);
  points.transaction(()=>{
   if(previous&&stamp>previous.observed&&stamp-previous.observed<=PLAYTIME_MAX_GAP){
    for(const uid of JSON.parse(previous.players))if(current.has(uid))addInterval(uid,previous.observed,stamp);
   }
   db.prepare('INSERT INTO playtime_polls VALUES(?,?,?) ON CONFLICT(server) DO UPDATE SET observed=excluded.observed,players=excluded.players').run(server,stamp,JSON.stringify(ids));
   db.prepare('UPDATE playtime_meta SET clock=? WHERE id=1').run(stamp);
  });
  settle();
 }
 function board(week){
  // Community membership supplies the reward identity; a game's display name can
  // never redirect a wallet credit. UUID spellings are normalized for matching.
  const members=db.prepare('SELECT uid,name FROM members ORDER BY uid').all(),identities=new Map();
  for(const member of members)if(!identities.has(canonical(member.uid)))identities.set(canonical(member.uid),member);
  const totals=new Map();
  for(const row of db.prepare('SELECT uid,milliseconds FROM playtime_days WHERE week=?').all(week))totals.set(row.uid,(totals.get(row.uid)||0)+row.milliseconds);
  const items=[...totals].filter(([uid])=>identities.has(uid)).map(([uid,milliseconds])=>({...identities.get(uid),milliseconds})).sort((a,b)=>b.milliseconds-a.milliseconds||(a.uid<b.uid?-1:a.uid>b.uid?1:0));
  return items.map((p,i)=>({...p,seconds:Math.floor(p.milliseconds/1000),rank:i+1,eligible:true,reward:'0',rewardScheme:DEFAULTS.scheme}));
 }
 function settle(){
  if(!ruleFor().enabled)return;
  const stamp=now(),clock=db.prepare('SELECT clock FROM playtime_meta WHERE id=1').get().clock;
  if(stamp<clock)return;
  const identities=new Map();for(const member of db.prepare('SELECT uid,name FROM members ORDER BY uid').all())if(!identities.has(canonical(member.uid)))identities.set(canonical(member.uid),member);
  // Batch any pending complete intervals into one accounting entry and message.
  // The account cursor, credit, history and inbox share one SQLite transaction.
  points.transaction(()=>{
   for(const row of db.prepare('SELECT * FROM playtime_accounts WHERE milliseconds >= (awarded+1)*?').all(DAY)){
    const user=identities.get(row.uid);if(!user)continue;
    const completed=Math.floor(row.milliseconds/DAY),first=row.awarded+1,amount=BigInt(completed-row.awarded)*5n,id=`playtime:cumulative:${row.uid}:${completed}`;
    points.credit({id,user,amount,created:stamp,week:weekOf(stamp),reason:`累计核验游玩每24小时5积分 · 第${first}–${completed}次`});
    inbox.notify({actor:{uid:'playtime',name:'游玩时长奖励'},recipients:[user.uid],kind:'community',title:'累计游玩时长奖励已到账',body:`已累计完成 ${completed} 个24小时，本次获得 ${amount} 积分。未满24小时的时长继续保留，奖励计入到账当周积分榜。`,target:'/community/playtime',dedupe:id,includeSelf:true});
    db.prepare('INSERT INTO playtime_awards VALUES(?,?,?,?,?,?,?)').run(id,user.uid,user.name,first,completed,String(amount),stamp);
    db.prepare('UPDATE playtime_accounts SET awarded=? WHERE uid=?').run(completed,row.uid);
   }
  });
 }
 function rewardSummary(user){
  const row=db.prepare('SELECT * FROM playtime_accounts WHERE uid=?').get(canonical(user.uid)),milliseconds=row?.milliseconds||0,awarded=row?.awarded||0,progress=milliseconds%DAY;
  return {scheme:DEFAULTS.scheme,enabled:ruleFor().enabled,intervalSeconds:86400,pointsPerInterval:'5',verifiedSeconds:Math.floor(milliseconds/1000),accountedSeconds:awarded*86400,awardedIntervals:awarded,earnedPoints:String(BigInt(awarded)*5n),pendingIntervals:Math.floor(milliseconds/DAY)-awarded,progressSeconds:Math.floor(progress/1000),remainingSeconds:Math.ceil((DAY-progress)/1000),nextRewardPoints:'5'};
 }
 function calendar(user){
  const stamp=now(),today=dayOf(stamp),start=today-364*DAY,uid=canonical(user.uid),rows=new Map(db.prepare('SELECT day,milliseconds,week FROM playtime_days WHERE uid=? AND day>=? AND day<=?').all(uid,start,today).map(v=>[v.day,v]));
  const days=[];let total=0,eligible=0,activeDays=0,longestStreak=0,run=0;
  for(let day=start;day<=today;day+=DAY){const row=rows.get(day),milliseconds=row?.milliseconds||0;total+=milliseconds;eligible+=milliseconds;if(milliseconds){activeDays++;run++;longestStreak=Math.max(longestStreak,run);}else run=0;days.push({date:dateOf(day),seconds:Math.floor(milliseconds/1000),eligibleSeconds:Math.floor(milliseconds/1000)});}
  let streak=0,index=days.length-1;if(!days[index].seconds)index--;for(;index>=0&&days[index].seconds;index--)streak++;
  const reward=rewardSummary(user);
  return {timezone:'Asia/Shanghai',from:dateOf(start),to:dateOf(today),days,summary:{seconds:Math.floor(total/1000),eligibleSeconds:Math.floor(eligible/1000),activeDays,streak,longestStreak,earnedPoints:reward.earnedPoints,progressSeconds:reward.progressSeconds,remainingSeconds:reward.remainingSeconds},rewardSummary:reward,rules:ruleFor(),verification:PLAYTIME_VERIFICATION,updated:stamp};
 }
 function detail(user,date){
  const day=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?Date.parse(date+'T00:00:00+08:00'):NaN,today=dayOf(now());
  if(!Number.isFinite(day)||dateOf(day)!==date||day<today-364*DAY||day>today)fail('请选择过去365天内的有效日期');
  const rules=ruleFor(weekOf(day)),sessions=db.prepare('SELECT start,end FROM playtime_intervals WHERE uid=? AND day=? ORDER BY start').all(canonical(user.uid),day).map(v=>({...v,seconds:Math.floor((v.end-v.start)/1000)})),milliseconds=sessions.reduce((sum,v)=>sum+v.end-v.start,0);
  return {date,timezone:'Asia/Shanghai',seconds:Math.floor(milliseconds/1000),eligibleSeconds:Math.floor(milliseconds/1000),sessions,rules,dailyCapMinutes:1440,rewardSummary:rewardSummary(user),verification:PLAYTIME_VERIFICATION};
 }
 function leaderboard(user,week,offset=0,limit=500){
  const old=settled(week),rules=old?JSON.parse(old.rules):ruleFor(),items=old?JSON.parse(old.board):board(week);
  offset=Math.max(0,Math.floor(Number(offset)||0));limit=Math.max(1,Math.min(1000,Math.floor(Number(limit)||500)));
  const weeks=db.prepare('SELECT DISTINCT week FROM playtime_days UNION SELECT week FROM playtime_settlements ORDER BY week DESC LIMIT 104').all().map(v=>({...v,label:weekLabel(v.week),settled:!!settled(v.week)}));
  if(!weeks.some(v=>v.week===weekOf(now())))weeks.unshift({week:weekOf(now()),label:weekLabel(weekOf(now())),settled:false});
  const clean=item=>{if(!item)return null;const {milliseconds,...value}=item;return value;};
  return {week,label:weekLabel(week),timezone:'Asia/Shanghai',items:items.slice(offset,offset+limit).map(clean),self:clean(items.find(v=>canonical(v.uid)===canonical(user.uid))),total:items.length,offset,limit,hasMore:offset+limit<items.length,settled:!!old,settledAt:old?.created||null,rules,weeks,rewardScheme:old?'legacy-weekly':DEFAULTS.scheme,rewardSummary:rewardSummary(user),verification:PLAYTIME_VERIFICATION};
 }
 async function route(req,res,url){
  const p=url.pathname,management=p.startsWith('/api/admin/playtime');
  if(!management&&!p.startsWith('/api/playtime'))return false;
  const user=management?admin(req):auth(req);limit('playtime:'+user.uid,60);settle();
  if(p==='/api/playtime/calendar'&&req.method==='GET'){send(res,200,calendar(user));return true;}
  if(p==='/api/playtime/detail'&&req.method==='GET'){send(res,200,detail(user,url.searchParams.get('date')));return true;}
  if(p==='/api/playtime/leaderboard'&&req.method==='GET'){
   const week=Number(url.searchParams.get('week')||weekOf(now()));
   if(!Number.isSafeInteger(week)||weekOf(week)!==week||week>weekOf(now())||week<0)fail('请选择有效的历史周');
   const offset=Math.max(0,Number(url.searchParams.get('offset')||0));const limit=Math.max(1,Math.min(1000,Number(url.searchParams.get('limit')||500)));
   send(res,200,leaderboard(user,week,offset,limit));return true;
  }
  if(p==='/api/admin/playtime/rules'){
   const effectiveWeek=weekOf(now());
   if(req.method==='PUT'){const rules=validate(await body(req));db.prepare('UPDATE playtime_reward_config SET enabled=?,updated=?,actor=? WHERE id=1').run(rules.enabled?1:0,now(),user.uid);settle();send(res,200,{ok:true,effectiveWeek,effectiveAt:now(),rules});return true;}
   if(req.method==='GET'){send(res,200,{rules:ruleFor(),nextRules:ruleFor(),effectiveWeek,effectiveAt:now(),timezone:'Asia/Shanghai',verification:PLAYTIME_VERIFICATION,maxHeartbeatGapSeconds:PLAYTIME_MAX_GAP/1000,awards:db.prepare('SELECT * FROM playtime_awards ORDER BY created DESC,id DESC LIMIT 200').all(),settlements:db.prepare('SELECT week,created,total,points,rules FROM playtime_settlements ORDER BY week DESC LIMIT 104').all().map(v=>({...v,label:weekLabel(v.week),rules:JSON.parse(v.rules)}))});return true;}
  }
  fail('不支持的游玩统计操作',405);
 }
 settle();
 const timer=setInterval(()=>{try{settle();}catch(error){console.error('[游玩时长奖励]',error.message);}},60000);timer.unref();
 return {route,observe,settle,calendar,detail,leaderboard,ruleFor,close:()=>clearInterval(timer)};
}
