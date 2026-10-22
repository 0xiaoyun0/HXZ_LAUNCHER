import {weekOf,weekLabel} from './points.mjs';
import {fail,integer} from './hub/common.mjs';

const DAY=86400000,WEEK=7*DAY,SHIFT=8*3600000;
// Only two consecutive, authenticated server polls can confirm an interval.
// Gaps longer than this are discarded in full, rather than extrapolated.
export const PLAYTIME_MAX_GAP=90000;
const DEFAULTS={enabled:true,minWeeklyMinutes:30,dailyCapMinutes:480,rewards:[100,80,60,40,30,20,20,10,10,10]};
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
 `);
 // A service restart cannot attest what happened during its downtime.
 db.prepare('DELETE FROM playtime_polls').run();
 db.prepare('INSERT OR IGNORE INTO playtime_meta VALUES(1,?)').run(now());
 if(!db.prepare('SELECT 1 FROM playtime_rules LIMIT 1').get())db.prepare('INSERT INTO playtime_rules VALUES(?,?,?,?)').run(weekOf(now()),JSON.stringify(DEFAULTS),'system',now());
 const ruleFor=week=>JSON.parse(db.prepare('SELECT value FROM playtime_rules WHERE week<=? ORDER BY week DESC LIMIT 1').get(week)?.value||JSON.stringify(DEFAULTS));
 const settled=week=>db.prepare('SELECT * FROM playtime_settlements WHERE week=?').get(week);
 function validate(input){
  if(typeof input.enabled!=='boolean')fail('请选择是否开启周榜奖励');
  const minWeeklyMinutes=integer(input.minWeeklyMinutes,1,7*24*60,'每周最低有效分钟'),dailyCapMinutes=integer(input.dailyCapMinutes,1,24*60,'每日计时上限');
  if(!Array.isArray(input.rewards)||input.rewards.length>100)fail('排名奖励最多设置100名');
  const rewards=input.rewards.map(v=>integer(v,0,1000000000,'排名积分'));
  if(minWeeklyMinutes>dailyCapMinutes*7)fail('最低有效时长不能超过每周计时上限');
  return {enabled:input.enabled,minWeeklyMinutes,dailyCapMinutes,rewards};
 }
 function addInterval(uid,start,end){
  while(start<end){
   const day=dayOf(start),finish=Math.min(end,day+DAY),week=weekOf(day);
   // Late polls never mutate an already issued ranking.
   if(!settled(week)){
    const overlap=db.prepare('SELECT start,end FROM playtime_intervals WHERE uid=? AND day=? AND start<=? AND end>=?').all(uid,day,finish,start);
    const first=Math.min(start,...overlap.map(v=>v.start)),last=Math.max(finish,...overlap.map(v=>v.end));
    db.prepare('DELETE FROM playtime_intervals WHERE uid=? AND day=? AND start<=? AND end>=?').run(uid,day,finish,start);
    db.prepare('INSERT INTO playtime_intervals VALUES(?,?,?,?)').run(uid,day,first,last);
    const milliseconds=db.prepare('SELECT SUM(end-start) AS n FROM playtime_intervals WHERE uid=? AND day=?').get(uid,day).n;
    db.prepare('INSERT INTO playtime_days VALUES(?,?,?,?) ON CONFLICT(uid,day) DO UPDATE SET milliseconds=excluded.milliseconds').run(uid,day,week,milliseconds);
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
 function board(week,rules=ruleFor(week)){
  // Community membership supplies the reward identity; a game's display name can
  // never redirect a wallet credit. UUID spellings are normalized for matching.
  const members=db.prepare('SELECT uid,name FROM members ORDER BY uid').all(),identities=new Map();
  for(const member of members)if(!identities.has(canonical(member.uid)))identities.set(canonical(member.uid),member);
  const totals=new Map();
  for(const row of db.prepare('SELECT uid,milliseconds FROM playtime_days WHERE week=?').all(week))totals.set(row.uid,(totals.get(row.uid)||0)+Math.min(row.milliseconds,rules.dailyCapMinutes*60000));
  const items=[...totals].filter(([uid])=>identities.has(uid)).map(([uid,milliseconds])=>({...identities.get(uid),milliseconds})).sort((a,b)=>b.milliseconds-a.milliseconds||(a.uid<b.uid?-1:a.uid>b.uid?1:0));
  return items.map((p,i)=>({...p,seconds:Math.floor(p.milliseconds/1000),rank:i+1,eligible:p.milliseconds>=rules.minWeeklyMinutes*60000,reward:String(rules.enabled&&p.milliseconds>=rules.minWeeklyMinutes*60000?(rules.rewards[i]||0):0)}));
 }
 function settle(){
  const stamp=now(),current=weekOf(stamp);
  // Keep the previous week open for one heartbeat so a confirmed interval that
  // crosses Monday midnight is split before the ranking becomes immutable.
  const weeks=db.prepare('SELECT DISTINCT week FROM playtime_days WHERE week<? AND week+?<=? ORDER BY week').all(current,WEEK+PLAYTIME_MAX_GAP,stamp);
  for(const {week} of weeks){
   if(settled(week))continue;
   points.transaction(()=>{
    if(settled(week))return;
    const rules=ruleFor(week),items=board(week,rules);let total=0n;
    for(const item of items){
     const amount=BigInt(item.reward);if(!amount)continue;
     // Award into the settlement-time points week. Crediting a closed points
     // week would bypass its already completed annual roll-up.
     points.credit({id:`playtime:${week}:${item.uid}`,user:item,amount,created:stamp,week:weekOf(stamp),reason:`在线时长周榜第 ${item.rank} 名 · ${weekLabel(week)}`});
     inbox.notify({actor:{uid:'playtime',name:'游玩周榜'},recipients:[item.uid],kind:'community',title:'在线时长周榜奖励已到账',body:`${weekLabel(week)}，第 ${item.rank} 名，获得 ${item.reward} 积分。奖励计入到账当周积分榜。`,target:'/community/playtime?week='+week,dedupe:`playtime:${week}:${item.uid}`,includeSelf:true});
     total+=amount;
    }
    db.prepare('INSERT INTO playtime_settlements VALUES(?,?,?,?,?,?)').run(week,stamp,JSON.stringify(rules),JSON.stringify(items),items.length,String(total));
   });
  }
 }
 function calendar(user){
  const stamp=now(),today=dayOf(stamp),start=today-364*DAY,uid=canonical(user.uid),rows=new Map(db.prepare('SELECT day,milliseconds,week FROM playtime_days WHERE uid=? AND day>=? AND day<=?').all(uid,start,today).map(v=>[v.day,v]));
  const days=[];let total=0,eligible=0,activeDays=0,longestStreak=0,run=0;
  for(let day=start;day<=today;day+=DAY){const row=rows.get(day),milliseconds=row?.milliseconds||0,credited=Math.min(milliseconds,ruleFor(weekOf(day)).dailyCapMinutes*60000);total+=milliseconds;eligible+=credited;if(milliseconds){activeDays++;run++;longestStreak=Math.max(longestStreak,run);}else run=0;days.push({date:dateOf(day),seconds:Math.floor(milliseconds/1000),eligibleSeconds:Math.floor(credited/1000)});}
  let streak=0,index=days.length-1;if(!days[index].seconds)index--;for(;index>=0&&days[index].seconds;index--)streak++;
  return {timezone:'Asia/Shanghai',from:dateOf(start),to:dateOf(today),days,summary:{seconds:Math.floor(total/1000),eligibleSeconds:Math.floor(eligible/1000),activeDays,streak,longestStreak},rules:ruleFor(weekOf(stamp)),verification:PLAYTIME_VERIFICATION,updated:stamp};
 }
 function detail(user,date){
  const day=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)?Date.parse(date+'T00:00:00+08:00'):NaN,today=dayOf(now());
  if(!Number.isFinite(day)||dateOf(day)!==date||day<today-364*DAY||day>today)fail('请选择过去365天内的有效日期');
  const rules=ruleFor(weekOf(day)),sessions=db.prepare('SELECT start,end FROM playtime_intervals WHERE uid=? AND day=? ORDER BY start').all(canonical(user.uid),day).map(v=>({...v,seconds:Math.floor((v.end-v.start)/1000)})),milliseconds=sessions.reduce((sum,v)=>sum+v.end-v.start,0);
  return {date,timezone:'Asia/Shanghai',seconds:Math.floor(milliseconds/1000),eligibleSeconds:Math.floor(Math.min(milliseconds,rules.dailyCapMinutes*60000)/1000),sessions,rules,dailyCapMinutes:rules.dailyCapMinutes,verification:PLAYTIME_VERIFICATION};
 }
 function leaderboard(user,week){
  const old=settled(week),rules=old?JSON.parse(old.rules):ruleFor(week),items=old?JSON.parse(old.board):board(week,rules);
  const weeks=db.prepare('SELECT DISTINCT week FROM playtime_days UNION SELECT week FROM playtime_settlements ORDER BY week DESC LIMIT 104').all().map(v=>({...v,label:weekLabel(v.week),settled:!!settled(v.week)}));
  if(!weeks.some(v=>v.week===weekOf(now())))weeks.unshift({week:weekOf(now()),label:weekLabel(weekOf(now())),settled:false});
  const clean=item=>{if(!item)return null;const {milliseconds,...value}=item;return value;};
  return {week,label:weekLabel(week),timezone:'Asia/Shanghai',items:items.slice(0,100).map(clean),self:clean(items.find(v=>canonical(v.uid)===canonical(user.uid))),total:items.length,settled:!!old,settledAt:old?.created||null,rules,weeks,verification:PLAYTIME_VERIFICATION};
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
   send(res,200,leaderboard(user,week));return true;
  }
  if(p==='/api/admin/playtime/rules'){
   const current=weekOf(now()),effectiveWeek=current+WEEK;
   if(req.method==='PUT'){const rules=validate(await body(req));db.prepare('INSERT INTO playtime_rules VALUES(?,?,?,?) ON CONFLICT(week) DO UPDATE SET value=excluded.value,actor=excluded.actor,updated=excluded.updated').run(effectiveWeek,JSON.stringify(rules),user.uid,now());send(res,200,{ok:true,effectiveWeek,rules});return true;}
   if(req.method==='GET'){send(res,200,{rules:ruleFor(current),nextRules:ruleFor(effectiveWeek),effectiveWeek,timezone:'Asia/Shanghai',verification:PLAYTIME_VERIFICATION,maxHeartbeatGapSeconds:PLAYTIME_MAX_GAP/1000,settlements:db.prepare('SELECT week,created,total,points,rules FROM playtime_settlements ORDER BY week DESC LIMIT 104').all().map(v=>({...v,label:weekLabel(v.week),rules:JSON.parse(v.rules)}))});return true;}
  }
  fail('不支持的游玩统计操作',405);
 }
 settle();
 const timer=setInterval(()=>{try{settle();}catch(error){console.error('[游玩周榜结算]',error.message);}},60000);timer.unref();
 return {route,observe,settle,calendar,detail,leaderboard,ruleFor,close:()=>clearInterval(timer)};
}
