import {fail,string,integer,choice,page} from './common.mjs';
import {createHash} from 'node:crypto';

export function createTrading(ctx,{inventory,points,social}){
 const {db,member,manager,now,id,once,transaction,audit,notify}=ctx;
 db.exec(`CREATE TABLE IF NOT EXISTS hub_trades(id TEXT PRIMARY KEY,owner TEXT NOT NULL,item TEXT NOT NULL,snapshot TEXT NOT NULL,quantity INTEGER NOT NULL,price TEXT NOT NULL,status TEXT NOT NULL,buyer TEXT NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS hub_trades_status ON hub_trades(status,updated DESC);
 CREATE INDEX IF NOT EXISTS hub_trades_owner ON hub_trades(owner,updated DESC);`);
 const fingerprint=input=>createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const view=row=>({...row,snapshot:JSON.parse(row.snapshot)});
 function expire(){transaction(()=>{for(const row of db.prepare("SELECT id FROM hub_trades WHERE status='open' AND expires<=? LIMIT 100").all(now())){inventory.releaseEscrow('trade:'+row.id,undefined,'交易到期 · 物品已退还');db.prepare("UPDATE hub_trades SET status='expired',updated=? WHERE id=?").run(now(),row.id);}});}
 async function route(user,p,method,input,search){
  if(!p.startsWith('trades'))return undefined;
  if(user.consoleAdmin&&method!=='GET'&&!p.endsWith('/close'))fail('请使用玩家角色操作交易');
  if(p==='trades'&&method==='GET'){
   expire();const scope=choice(search.get('scope')||'public',['public','mine'],'范围'),{offset,query}=page(search);
   const where=scope==='mine'?'(t.owner=? OR t.buyer=?)':"t.status='open' AND t.expires>?",args=scope==='mine'?[user.uid,user.uid]:[now()];
   return {items:db.prepare('SELECT t.*,m.name FROM hub_trades t JOIN members m ON m.uid=t.owner WHERE '+where+" AND instr(lower(json_extract(t.snapshot,'$.title')),lower(?))>0 ORDER BY t.updated DESC,t.id LIMIT 24 OFFSET ?").all(...args,query,offset).map(view),inventory:inventory.view(user.uid).items.filter(v=>v.kind==='material'&&v.commission&&v.enabled),balance:db.prepare('SELECT balance FROM points_wallet WHERE uid=?').get(user.uid)?.balance||'0'};
  }
  if(p==='trades'&&method==='POST'){
   const item=string(input.item,80,'道具'),quantity=integer(input.quantity,1,99999,'数量'),price=string(input.price,30,'售价');if(!/^[1-9]\d{0,29}$/.test(price))fail('售价须为正整数');
   const days=integer(input.days||7,1,30,'有效天数');
   return once(user,input.requestId,'trade-create:'+fingerprint({item,quantity,price,days}),()=>{
    if(db.prepare("SELECT COUNT(*) n FROM hub_trades WHERE owner=? AND status='open'").get(user.uid).n>=30)fail('最多同时出售 30 件物品');
    const key=id();inventory.escrow(user.uid,item,quantity,'trade:'+key);
    const held=db.prepare('SELECT snapshot FROM inventory_escrow WHERE id=?').get('trade:'+key);
    db.prepare("INSERT INTO hub_trades VALUES(?,?,?,?,?,?,'open','',?,?,?)").run(key,user.uid,item,held.snapshot,quantity,price,now(),now()+days*86400000,now());audit(user,'trade-list',key);return view(db.prepare('SELECT * FROM hub_trades WHERE id=?').get(key));
   });
  }
  const match=p.match(/^trades\/([\w-]+)\/(buy|close)$/);
  if(match&&method==='POST')return once(user,input.requestId,'trade-'+match[2]+':'+match[1],()=>{
   const row=db.prepare('SELECT * FROM hub_trades WHERE id=?').get(match[1]);if(!row)fail('交易不存在',404);
   if(match[2]==='close'){
    if(row.owner!==user.uid&&!manager(user))fail('无权撤销交易',403);
    if(row.status!=='open')fail('该交易已结束',409);
    inventory.releaseEscrow('trade:'+row.id,undefined,'交易撤回 · 物品已退还');db.prepare("UPDATE hub_trades SET status='cancelled',updated=? WHERE id=?").run(now(),row.id);audit(user,'trade-close',row.id);
   }else{
    if(row.owner===user.uid)fail('不能购买自己的物品');if(social.blocked(user.uid,row.owner))fail('无法与该成员交易',403);
    if(row.status!=='open'||now()>=row.expires)fail('交易已售出、撤回或到期',409);
    const seller=member(row.owner),amount=BigInt(row.price);
    points.credit({id:'trade-buy:'+row.id,user,amount:-amount,earned:0n,reason:'购买 '+JSON.parse(row.snapshot).title,actor:row.owner});
    points.credit({id:'trade-sell:'+row.id,user:seller,amount,earned:0n,reason:'出售 '+JSON.parse(row.snapshot).title,actor:user.uid});
    inventory.releaseEscrow('trade:'+row.id,user.uid,'交易完成 · 请领取物品');db.prepare("UPDATE hub_trades SET status='sold',buyer=?,updated=? WHERE id=?").run(user.uid,now(),row.id);
    audit(user,'trade-buy',row.id);notify(user,[seller.uid],'物品已售出','/community/hub?section=trades','sold:'+row.id,'收到 '+row.price+' 积分，交易收入不增加榜单积分。');
   }
   return view(db.prepare('SELECT * FROM hub_trades WHERE id=?').get(row.id));
  });
  return undefined;
 }
 return {route};
}
