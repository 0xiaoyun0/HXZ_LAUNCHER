import { randomBytes, createHash } from 'node:crypto';
const DAY=86400000, WEEK=7*DAY, SHIFT=8*3600000;
export function weekOf(time=Date.now()) {
  const local=new Date(time+SHIFT), day=local.getUTCDay()||7;
  return Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-SHIFT-(day-1)*DAY;
}
export function weekLabel(week) {
  const a=new Date(week+SHIFT),b=new Date(week+SHIFT+6*DAY);
  return `${a.getUTCMonth()+1}月${a.getUTCDate()}日–${b.getUTCMonth()+1}月${b.getUTCDate()}日`;
}
const yearOf=t=>new Date(t+SHIFT).getUTCFullYear();
const integer=value=>{if(typeof value!=='string'||!/^\d+$/.test(value))throw Error('积分请输入非负整数');return BigInt(value);};
const compare=(a,b)=>{const x=BigInt(a.points),y=BigInt(b.points);return x===y?a.uid.localeCompare(b.uid):x>y?-1:1;};

export function createPoints({db,auth,admin,body,send,limit,now=()=>Date.now()}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS points_wallet(uid TEXT PRIMARY KEY,name TEXT NOT NULL,balance TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS points_annual(year INTEGER,uid TEXT,name TEXT,points TEXT NOT NULL,PRIMARY KEY(year,uid));
    CREATE TABLE IF NOT EXISTS points_week(week INTEGER,uid TEXT,name TEXT,points TEXT NOT NULL,PRIMARY KEY(week,uid));
    CREATE TABLE IF NOT EXISTS points_ledger(id TEXT PRIMARY KEY,uid TEXT,name TEXT,amount TEXT,earned TEXT,reason TEXT,actor TEXT,created INTEGER,week INTEGER);
    CREATE INDEX IF NOT EXISTS points_ledger_user ON points_ledger(uid,created DESC);
    CREATE TABLE IF NOT EXISTS points_codes(hash TEXT PRIMARY KEY,amount TEXT,created INTEGER,actor TEXT,redeemed_by TEXT,redeemed INTEGER,disabled INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS points_settlements(week INTEGER PRIMARY KEY,created INTEGER);
    CREATE TABLE IF NOT EXISTS game_weekly(game TEXT,week INTEGER,uid TEXT,name TEXT,score INTEGER,updated INTEGER,PRIMARY KEY(game,week,uid));
    CREATE INDEX IF NOT EXISTS game_weekly_rank ON game_weekly(game,week,score DESC,updated);
  `);
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
  function addTotal(table,period,uid,name,earned) {
    const col=table==='points_week'?'week':'year';
    const old=db.prepare(`SELECT points FROM ${table} WHERE ${col}=? AND uid=?`).get(period,uid);
    db.prepare(`INSERT INTO ${table} VALUES(?,?,?,?) ON CONFLICT(${col},uid) DO UPDATE SET name=excluded.name,points=excluded.points`).run(period,uid,name,String(BigInt(old?.points||'0')+earned));
  }
  function credit({id,user,amount,earned=amount>0n?amount:0n,reason,actor='system',created=now(),week=weekOf(created),weekly=true}) {
    if(db.prepare('SELECT 1 FROM points_ledger WHERE id=?').get(id))return false;
    const wallet=db.prepare('SELECT balance FROM points_wallet WHERE uid=?').get(user.uid),balance=BigInt(wallet?.balance||'0')+amount;
    if(balance<0n)throw Error('可用积分不足');
    db.prepare('INSERT INTO points_wallet VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name,balance=excluded.balance').run(user.uid,user.name,String(balance));
    db.prepare('INSERT INTO points_ledger VALUES(?,?,?,?,?,?,?,?,?)').run(id,user.uid,user.name,String(amount),String(earned),reason,actor,created,week);
    if(earned>0n&&weekly)addTotal('points_week',week,user.uid,user.name,earned);
    return true;
  }
  function provisional(week) {
    const out=[];
    for(const {game} of db.prepare('SELECT DISTINCT game FROM game_weekly WHERE week=?').all(week)) {
      const winners=db.prepare('SELECT uid,name,score FROM game_weekly WHERE week=? AND game=? ORDER BY score DESC,updated,uid LIMIT 3').all(week,game);
      winners.forEach((p,i)=>out.push({...p,game,points:String(3-i)}));
    }
    return out;
  }
  function weeklyBoard(week,project=true) {
    const rows=new Map(db.prepare('SELECT uid,name,points FROM points_week WHERE week=?').all(week).map(p=>[p.uid,p]));
    if(project&&!db.prepare('SELECT 1 FROM points_settlements WHERE week=?').get(week))for(const p of provisional(week)){
      const old=rows.get(p.uid);rows.set(p.uid,{uid:p.uid,name:p.name,points:String(BigInt(old?.points||0)+BigInt(p.points))});
    }
    return [...rows.values()].sort(compare).map((p,i)=>({...p,rank:i+1}));
  }
  let lastSettledWeek;
  function settle() {
    const current=weekOf(now());
    if(lastSettledWeek===current)return;
    const weeks=db.prepare('SELECT week FROM points_week WHERE week<? UNION SELECT week FROM game_weekly WHERE week<? ORDER BY week').all(current,current);
    for(const {week} of weeks){
      if(db.prepare('SELECT 1 FROM points_settlements WHERE week=?').get(week))continue;
      transaction(()=>{
        if(db.prepare('SELECT 1 FROM points_settlements WHERE week=?').get(week))return;
        for(const p of provisional(week))credit({id:`game:${week}:${p.game}:${p.uid}`,user:p,amount:BigInt(p.points),reason:p.game+' 周榜奖励',week});
        // The annual table is a roll-up of settled weekly boards only. Current
        // wins, codes and admin credits never bypass the weekly settlement.
        const ranked=weeklyBoard(week,false),year=yearOf(week+WEEK-1);
        for(const [i,p] of ranked.entries()){
          const bonus=i<3?BigInt(3-i):0n;
          if(bonus)credit({id:`weekly:${week}:${p.uid}`,user:p,amount:bonus,reason:'周积分榜额外奖励',week,weekly:false});
          addTotal('points_annual',year,p.uid,p.name,BigInt(p.points)+bonus);
        }
        db.prepare('INSERT INTO points_settlements VALUES(?,?)').run(week,now());
      });
    }
    lastSettledWeek=current;
  }
  function recordScore(game,user,score) {
    settle();
    if(!Number.isSafeInteger(score)||score<1)return;
    db.prepare('INSERT INTO game_weekly VALUES(?,?,?,?,?,?) ON CONFLICT(game,week,uid) DO UPDATE SET name=excluded.name,score=excluded.score,updated=excluded.updated WHERE excluded.score>game_weekly.score')
      .run(game,weekOf(now()),user.uid,user.name,score,now());
  }
  function win(user,match) {
    settle();const week=weekOf(now());
    return transaction(()=>credit({id:`online:${week}:${user.uid}`,user,amount:1n,reason:'联机胜利 · '+match,week}));
  }
  function gameBoard(game,user) {
    settle();const week=weekOf(now());
    const rows=db.prepare('SELECT uid,name,score,updated FROM game_weekly WHERE game=? AND week=? ORDER BY score DESC,updated,uid LIMIT 10').all(game,week).map((p,i)=>({...p,rank:i+1}));
    const self=user&&db.prepare('SELECT uid,name,score,updated FROM game_weekly WHERE game=? AND week=? AND uid=?').get(game,week,user.uid);
    if(self)self.rank=1+db.prepare('SELECT COUNT(*) AS n FROM game_weekly WHERE game=? AND week=? AND (score>? OR (score=? AND (updated<? OR (updated=? AND uid<?))))').get(game,week,self.score,self.score,self.updated,self.updated,self.uid).n;
    return {items:rows,self:self||null,week,label:weekLabel(week)};
  }
  function wallet(user) {return db.prepare('SELECT uid,name,balance FROM points_wallet WHERE uid=?').get(user.uid)||{uid:user.uid,name:user.name,balance:'0'};}
  async function route(req,res,url) {
    const path=url.pathname;if(!path.startsWith('/api/points')&&!path.startsWith('/api/admin/points'))return false;
    settle();const management=path.startsWith('/api/admin/'),user=management?admin(req):auth(req);
    limit('points:'+user.uid,60);
    if(req.method==='GET'){
      if(path==='/api/points/leaderboard'){
        if(url.searchParams.get('period')==='annual'){
          const year=Number(url.searchParams.get('year')||yearOf(now())),offset=Math.max(0,Number(url.searchParams.get('offset')||0));
          if(!Number.isInteger(year)||year<2020||year>yearOf(now())||!Number.isSafeInteger(offset))throw Error('榜单范围无效');
          const items=db.prepare('SELECT uid,name,points FROM points_annual WHERE year=? ORDER BY length(points) DESC,points DESC,uid LIMIT 50 OFFSET ?').all(year,offset).map((p,i)=>({...p,rank:offset+i+1}));
          const self=db.prepare('SELECT uid,name,points FROM points_annual WHERE year=? AND uid=?').get(year,user.uid);
          if(self)self.rank=1+db.prepare('SELECT COUNT(*) AS n FROM points_annual WHERE year=? AND (length(points)>? OR (length(points)=? AND (points>? OR (points=? AND uid<?))))').get(year,self.points.length,self.points.length,self.points,self.points,self.uid).n;
          send(res,200,{items,self:self||null,total:db.prepare('SELECT COUNT(*) AS n FROM points_annual WHERE year=?').get(year).n,year,offset});
        }else{
          const week=Number(url.searchParams.get('week')||weekOf(now()));if(!Number.isSafeInteger(week)||weekOf(week)!==week||week>weekOf(now()))throw Error('周榜日期无效');
          const all=weeklyBoard(week);send(res,200,{items:all.slice(0,10),self:all.find(p=>p.uid===user.uid)||null,week,label:weekLabel(week),settled:!!db.prepare('SELECT 1 FROM points_settlements WHERE week=?').get(week)});
        }
      } else if(management){
        const offset=Math.max(0,Number(url.searchParams.get('offset')||0));if(!Number.isSafeInteger(offset))throw Error('页码无效');
        send(res,200,{accounts:db.prepare('SELECT * FROM points_wallet ORDER BY uid LIMIT 50 OFFSET ?').all(offset),ledger:db.prepare('SELECT * FROM points_ledger ORDER BY created DESC LIMIT 100').all(),total:db.prepare('SELECT COUNT(*) AS n FROM points_wallet').get().n});
      } else send(res,200,{...wallet(user),ledger:db.prepare('SELECT amount,earned,reason,created FROM points_ledger WHERE uid=? ORDER BY created DESC LIMIT 50').all(user.uid)});
      return true;
    }
    if(req.method!=='POST')throw Error('不支持的积分操作');const input=await body(req);
    if(path==='/api/points/redeem') {
      limit('redeem:'+user.uid,8);
      if(typeof input.code!=='string'||!/^[a-f0-9]{40}$/i.test(input.code.trim()))throw Error('兑换码无效');
      const hash=createHash('sha256').update(input.code.trim().toLowerCase()).digest('hex');
      transaction(()=>{
        const code=db.prepare('SELECT * FROM points_codes WHERE hash=?').get(hash);
        if(!code||code.disabled||code.redeemed_by)throw Error('兑换码不存在、已停用或已兑换');
        credit({id:'redeem:'+hash,user,amount:integer(code.amount),reason:'兑换码奖励'});
        db.prepare('UPDATE points_codes SET redeemed_by=?,redeemed=? WHERE hash=?').run(user.uid,now(),hash);
      });send(res,200,wallet(user));
    }else if(path==='/api/admin/points/code'){
      const amount=integer(input.amount);if(amount<=0n)throw Error('额度必须大于零');
      const code=randomBytes(20).toString('hex'),hash=createHash('sha256').update(code).digest('hex');
      db.prepare('INSERT INTO points_codes(hash,amount,created,actor) VALUES(?,?,?,?)').run(hash,String(amount),now(),user.uid);send(res,201,{code,amount:String(amount)});
    }else if(path==='/api/admin/points/adjust'){
      if(typeof input.uid!=='string'||!/^[-\w]{1,64}$/.test(input.uid)||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>300||!['credit','spend'].includes(input.operation)||!/^[-\w]{16,80}$/.test(input.id||''))throw Error('请填写角色 UUID、原因与操作编号');
      const amount=integer(input.amount);if(amount<=0n)throw Error('积分必须大于零');
      const target={uid:input.uid,name:db.prepare('SELECT name FROM points_wallet WHERE uid=?').get(input.uid)?.name||String(input.name||input.uid).slice(0,80)};
      transaction(()=>credit({id:'admin:'+input.id,user:target,amount:input.operation==='spend'?-amount:amount,reason:input.reason,actor:user.uid}));send(res,200,wallet(target));
    }else throw Error('积分接口不存在');return true;
  }
  settle();
  const timer=setInterval(()=>{try{settle();}catch(error){console.error('[积分结算]',error.message);}},60000);timer.unref();
  return {route,recordScore,win,gameBoard,settle,weeklyBoard,close:()=>clearInterval(timer)};
}
