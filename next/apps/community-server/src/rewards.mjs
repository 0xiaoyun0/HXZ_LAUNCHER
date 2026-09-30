import {createHash,randomUUID} from 'node:crypto';
const normalize=value=>typeof value==='string'?value.trim().normalize('NFKC').toLowerCase():'';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function createRewards({db,auth,admin,body,send,limit,points,inbox,now=Date.now}) {
  db.exec(`CREATE TABLE IF NOT EXISTS activity_rewards(id TEXT PRIMARY KEY,hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL,amount TEXT NOT NULL,starts INTEGER NOT NULL,expires INTEGER NOT NULL,per_user INTEGER NOT NULL,max_uses INTEGER NOT NULL,enabled INTEGER NOT NULL,actor TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS activity_claims(id TEXT PRIMARY KEY,reward_id TEXT NOT NULL,uid TEXT NOT NULL,created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS activity_claims_user ON activity_claims(reward_id,uid);`);
  async function redeem(req,res,input){
    const code=normalize(input.code);if(!code)return false;
    const reward=db.prepare('SELECT * FROM activity_rewards WHERE hash=?').get(hash(code));if(!reward)return false;
    const user=auth(req);limit('reward:'+user.uid,8);const id=randomUUID();
    points.transaction(()=>{
      if(!reward.enabled)throw Error('活动兑换码已停用');if(now()<reward.starts)throw Error('活动尚未开始');if(now()>=reward.expires)throw Error('活动兑换码已过期');
      const used=db.prepare('SELECT COUNT(*) AS n FROM activity_claims WHERE reward_id=? AND uid=?').get(reward.id,user.uid).n;
      if(reward.per_user&&used>=reward.per_user)throw Error('你已领取过本次活动奖励');
      if(reward.max_uses&&db.prepare('SELECT COUNT(*) AS n FROM activity_claims WHERE reward_id=?').get(reward.id).n>=reward.max_uses)throw Error('活动奖励已领完');
      points.credit({id:'activity:'+id,user,amount:BigInt(reward.amount),reason:'活动奖励：'+reward.label,actor:reward.actor});
      db.prepare('INSERT INTO activity_claims VALUES(?,?,?,?)').run(id,reward.id,user.uid,now());
      inbox.notify({recipients:[user.uid],actor:{uid:'system',name:'活动奖励'},kind:'reward',title:'活动奖励已到账',body:reward.label+' · 获得 '+reward.amount+' 积分',target:'/account',dedupe:'reward:'+id});
    });send(res,200,points.wallet(user));return true;
  }
  async function route(req,res,url){
    if(url.pathname!=='/api/admin/rewards')return false;const user=admin(req);limit('reward-admin:'+user.uid,30);
    if(req.method==='GET'){send(res,200,{items:db.prepare('SELECT r.id,r.label,r.amount,r.starts,r.expires,r.per_user AS perUserLimit,r.max_uses AS maxUses,r.enabled,r.created,(SELECT COUNT(*) FROM activity_claims WHERE reward_id=r.id) AS claimed FROM activity_rewards r ORDER BY r.created DESC LIMIT 100').all()});return true;}
    const input=await body(req);
    if(req.method==='PUT'){if(typeof input.id!=='string'||typeof input.enabled!=='boolean')throw Error('无效活动');db.prepare('UPDATE activity_rewards SET enabled=? WHERE id=?').run(Number(input.enabled),input.id);send(res,200,{ok:true});return true;}
    if(req.method!=='POST')throw Error('不支持的活动操作');
    const code=normalize(input.code),starts=Number(input.starts||now()),expires=Number(input.expires),perUser=Number(input.perUserLimit??1),maxUses=Number(input.maxUses||0);
    if(!/^[\p{L}\p{N}_-]{4,64}$/u.test(code))throw Error('活动码需为 4–64 个汉字、字母、数字、下划线或短横线');
    if(typeof input.amount!=='string'||!/^\d{1,1000}$/.test(input.amount)||BigInt(input.amount)<=0n)throw Error('奖励额度需为正整数');
    if(!Number.isSafeInteger(starts)||!Number.isSafeInteger(expires)||starts<0||expires<=starts||expires<=now())throw Error('请设置有效的开始与结束时间');
    if(!Number.isSafeInteger(perUser)||perUser<0||perUser>1000||!Number.isSafeInteger(maxUses)||maxUses<0)throw Error('领取次数无效');
    const digest=hash(code);if(db.prepare('SELECT 1 FROM activity_rewards WHERE hash=?').get(digest)||db.prepare('SELECT 1 FROM points_codes WHERE hash=?').get(digest))throw Error('兑换码已存在，请使用新的活动码');
    const id=randomUUID();db.prepare('INSERT INTO activity_rewards VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,digest,input.code.trim().normalize('NFKC'),String(BigInt(input.amount)),starts,expires,perUser,maxUses,1,user.uid,now());send(res,201,{id,code:input.code.trim(),amount:input.amount});return true;
  }
  return {route,redeem};
}
