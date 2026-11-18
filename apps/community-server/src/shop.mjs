import {randomUUID} from 'node:crypto';
import {weekOf} from './points.mjs';
import {monthOf} from './inventory.mjs';

const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('商品名称或说明无效');return value.trim();};
const date=value=>{if(value==null||value===0||value==='')return 0;if(!Number.isSafeInteger(value)||value<0)throw Error('销售时间无效');return value;};
const windowOpen=(row,time)=>!row.starts||row.starts<=time;
const inWindow=(row,time)=>windowOpen(row,time)&&(!row.ends||time<row.ends);
function schedule(input){const starts=date(input.starts),ends=date(input.ends);if(ends&&ends<=starts)throw Error('结束时间必须晚于开始时间');return {starts,ends};}

export function createShop({db,auth,admin,body,send,limit,points,media,inventory,now=()=>Date.now()}){
  db.exec(`CREATE TABLE IF NOT EXISTS shop_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL,starts INTEGER NOT NULL,ends INTEGER NOT NULL);
    INSERT OR IGNORE INTO shop_settings VALUES(1,0,0,0);
    CREATE TABLE IF NOT EXISTS shop_items(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,price TEXT NOT NULL,stock INTEGER NOT NULL,enabled INTEGER NOT NULL,starts INTEGER NOT NULL,ends INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shop_orders(id TEXT PRIMARY KEY,uid TEXT NOT NULL,name TEXT NOT NULL,request_key TEXT NOT NULL,item TEXT NOT NULL,title TEXT NOT NULL,price TEXT NOT NULL,status TEXT NOT NULL,delivery TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL,UNIQUE(uid,request_key));
    CREATE INDEX IF NOT EXISTS shop_orders_user ON shop_orders(uid,created DESC,id);
    CREATE TABLE IF NOT EXISTS shop_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created INTEGER NOT NULL);`);
  if(!db.prepare('PRAGMA table_info(shop_items)').all().some(c=>c.name==='image'))db.exec("ALTER TABLE shop_items ADD COLUMN image TEXT NOT NULL DEFAULT ''");
  const add=(table,column,definition)=>{if(!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);};
  add('shop_items','inventory_item',"TEXT NOT NULL DEFAULT ''");
  add('shop_items','weekly_stock','INTEGER NOT NULL DEFAULT 0');
  add('shop_items','user_limit','INTEGER NOT NULL DEFAULT 0');
  add('shop_items','user_period',"TEXT NOT NULL DEFAULT 'week'");
  add('shop_orders','inventory_item',"TEXT NOT NULL DEFAULT ''");
  add('shop_orders','permission',"TEXT NOT NULL DEFAULT ''");
  add('shop_orders','purchase_week',"TEXT NOT NULL DEFAULT ''");
  add('shop_orders','purchase_month',"TEXT NOT NULL DEFAULT ''");
  if(inventory&&!db.prepare("SELECT 1 FROM inventory_seed WHERE id='shop-072'").get())points.transaction(()=>{
    for(const [id,title,period] of [['hosting-3days','联机开房凭证 · 3 天','week'],['netease-1month','网易云登录凭证 · 1 个月','month']])
      db.prepare(`INSERT OR IGNORE INTO shop_items(id,title,description,price,stock,enabled,starts,ends,created,updated,inventory_item,weekly_stock,user_limit,user_period) VALUES(?,?,?,'100',-1,1,0,0,?,?,?,?,1,?)`).run('voucher-'+id,title,'存入背包，使用后开始计时。每周限量 3 张，每人每'+(period==='week'?'周':'月')+'限购 1 张。',now(),now(),id,3,period);
    db.prepare("INSERT INTO inventory_seed VALUES('shop-072')").run();
  });
  const settings=()=>db.prepare('SELECT enabled,starts,ends FROM shop_settings WHERE id=1').get();
  const audit=(user,action,target)=>db.prepare('INSERT INTO shop_audit(actor,action,target,created) VALUES(?,?,?,?)').run(user.uid,action,target,now());
  function quota(item,uid,time){
    const week=weekOf(time),month=monthOf(time),permission=inventory?.definition(item.inventory_item)?.permission||'';
    const sold=db.prepare("SELECT COUNT(*) n FROM shop_orders WHERE item=? AND purchase_week=? AND status!='refunded'").get(item.id,week).n;
    const column=item.user_period==='month'?'purchase_month':'purchase_week',period=item.user_period==='month'?month:week;
    const bought=uid?db.prepare(`SELECT COUNT(*) n FROM shop_orders WHERE uid=? AND ${permission?'permission=?':'item=?'} AND ${column}=? AND status!='refunded'`).get(uid,permission||item.id,period).n:0;
    return {weeklyRemaining:item.weekly_stock?Math.max(0,item.weekly_stock-sold):null,userRemaining:item.user_limit?Math.max(0,item.user_limit-bought):null};
  }
  function catalog(management=false,uid){
    const config=settings(),time=now();
    const items=db.prepare('SELECT * FROM shop_items WHERE deleted=0'+(management?'':' AND enabled=1')+' ORDER BY created DESC,id LIMIT 300').all();
    return {settings:config,open:!!config.enabled&&inWindow(config,time),serverTime:time,items:items.map(item=>{const remaining=quota(item,uid,time);return {...item,...remaining,available:!!config.enabled&&inWindow(config,time)&&!!item.enabled&&inWindow(item,time)&&item.stock!==0&&remaining.weeklyRemaining!==0&&remaining.userRemaining!==0};})};
  }
  async function route(req,res,url){
    const path=url.pathname,management=path.startsWith('/api/admin/shop');
    if(!management&&!path.startsWith('/api/shop'))return false;
    const user=management?admin(req):auth(req);limit('shop:'+user.uid,60);
    if(req.method==='GET'){
      if(path==='/api/shop'||path==='/api/admin/shop'){send(res,200,catalog(management,user.uid));return true;}
      if(path==='/api/shop/orders'||path==='/api/admin/shop/orders'){
        const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)throw Error('页码无效');
        const clause=management?'':' WHERE uid=?',args=management?[]:[user.uid];
        send(res,200,{items:db.prepare('SELECT * FROM shop_orders'+clause+' ORDER BY created DESC,id DESC LIMIT 30 OFFSET ?').all(...args,offset),total:db.prepare('SELECT COUNT(*) AS n FROM shop_orders'+clause).get(...args).n,offset});return true;
      }
      throw Error('商城接口不存在');
    }
    if(req.method==='DELETE'&&management&&/^\/api\/admin\/shop\/items\/[-\w]+$/.test(path)){
      const id=path.split('/').pop();points.transaction(()=>{db.prepare('UPDATE shop_items SET deleted=1,enabled=0,updated=? WHERE id=?').run(now(),id);audit(user,'delete',id);});send(res,200,{ok:true});return true;
    }
    if(req.method!=='POST')throw Error('不支持的商城操作');
    const input=await body(req);
    if(path==='/api/admin/shop/settings'){
      const {starts,ends}=schedule(input);if(typeof input.enabled!=='boolean')throw Error('商城开关无效');
      points.transaction(()=>{db.prepare('UPDATE shop_settings SET enabled=?,starts=?,ends=? WHERE id=1').run(+input.enabled,starts,ends);audit(user,'settings','shop');});send(res,200,catalog(true));
    }else if(path==='/api/admin/shop/items'){
      const title=text(input.title,100),description=text(input.description,4000),{starts,ends}=schedule(input);
      if(typeof input.price!=='string'||!/^\d{1,1000}$/.test(input.price))throw Error('价格必须为非负整数积分');
      if(!Number.isSafeInteger(input.stock)||input.stock < -1 ||input.stock>1000000000)throw Error('库存必须为非负整数，-1表示不限量');
      if(typeof input.enabled!=='boolean')throw Error('商品开关无效');
      const id=input.id||randomUUID();if(!/^[-\w]{1,80}$/.test(id))throw Error('商品编号无效');
      points.transaction(()=>{
        const old=db.prepare('SELECT updated,deleted FROM shop_items WHERE id=?').get(id);
        if(input.id&&(!old||old.deleted))throw Error('商品不存在');
        if(old&&input.updated!==old.updated)throw Error('商品已变化，请刷新后重试');
        if(!old&&db.prepare('SELECT COUNT(*) AS n FROM shop_items WHERE deleted=0').get().n>=300)throw Error('最多同时展示300件商品');
        const image=input.image===undefined?(db.prepare('SELECT image FROM shop_items WHERE id=?').get(id)?.image||''):media.validate(input.image,user,'shop');
        db.prepare(`INSERT INTO shop_items(id,title,description,price,stock,enabled,starts,ends,deleted,created,updated,image) VALUES(?,?,?,?,?,?,?,?,0,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,price=excluded.price,stock=excluded.stock,enabled=excluded.enabled,starts=excluded.starts,ends=excluded.ends,updated=excluded.updated,image=excluded.image`).run(id,title,description,String(BigInt(input.price)),input.stock,+input.enabled,starts,ends,now(),Math.max(now(),(old?.updated||0)+1),image);audit(user,'save',id);
        const saved=db.prepare('SELECT * FROM shop_items WHERE id=?').get(id),itemId=input.inventory_item??saved.inventory_item,weekly=input.weekly_stock??saved.weekly_stock,personal=input.user_limit??saved.user_limit,period=input.user_period??saved.user_period;
        if(itemId&&(!inventory?.definition(itemId)?.enabled))throw Error('请选择可用的背包道具');
        if(!Number.isSafeInteger(weekly)||weekly<0||weekly>1000000000||!Number.isSafeInteger(personal)||personal<0||personal>1000000000||!['week','month'].includes(period))throw Error('限购设置无效');
        db.prepare('UPDATE shop_items SET inventory_item=?,weekly_stock=?,user_limit=?,user_period=? WHERE id=?').run(itemId,weekly,personal,period,id);
      });send(res,200,{id});
    }else if(path==='/api/shop/buy'){
      if(user.consoleAdmin)throw Error('请使用玩家角色兑换商品');
      if(!/^[-\w]{16,80}$/.test(input.requestId||'')||!/^[-\w]{1,80}$/.test(input.item||''))throw Error('兑换请求无效');
      limit('shop-buy:'+user.uid,15);
      let order;
      points.settle();
      points.transaction(()=>{
        order=db.prepare('SELECT * FROM shop_orders WHERE uid=? AND request_key=?').get(user.uid,input.requestId);
        if(order){if(order.item!==input.item)throw Error('操作编号已被其他订单使用');return;}
        const config=settings(),time=now(),item=db.prepare('SELECT * FROM shop_items WHERE id=? AND deleted=0').get(input.item);
        if(!config.enabled||!inWindow(config,time))throw Error('商城当前未开放');
        if(!item||!item.enabled||!inWindow(item,time))throw Error('商品当前不可兑换');
        if(item.stock===0)throw Error('商品已售罄');
        if(input.price!==item.price)throw Error('商品价格已变化，请刷新后确认');
        const remaining=quota(item,user.uid,time);
        if(remaining.weeklyRemaining===0)throw Error('本周限量已售罄，下周一重新开放');
        if(remaining.userRemaining===0)throw Error(item.user_period==='month'?'本月已达到限购次数':'本周已达到限购次数');
        const reward=item.inventory_item?inventory?.definition(item.inventory_item):null;
        if(item.inventory_item&&(!reward||!reward.enabled))throw Error('商品道具已停用，请联系管理员');
        const id=randomUUID();
        if(reward)inventory.grant(user.uid,reward,1,'shop:'+id,'shop');
        points.credit({id:'shop:'+id,user,amount:-BigInt(item.price),earned:0n,reason:'商城兑换 · '+item.title,weekly:false});
        db.prepare('UPDATE shop_items SET stock=CASE WHEN stock<0 THEN stock ELSE stock-1 END,updated=? WHERE id=?').run(Math.max(time,item.updated+1),item.id);
        db.prepare('INSERT INTO shop_orders(id,uid,name,request_key,item,title,price,status,delivery,created,updated,inventory_item,permission,purchase_week,purchase_month) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user.uid,user.name,input.requestId,item.id,item.title,item.price,reward?'fulfilled':'pending',reward?'已存入背包，请在账号 → 背包使用':'',time,time,reward?.id||'',reward?.permission||'',weekOf(time),monthOf(time));
        order=db.prepare('SELECT * FROM shop_orders WHERE id=?').get(id);
      });send(res,200,{order,wallet:points.wallet(user)});
    }else if(/^\/api\/admin\/shop\/orders\/[-\w]+$/.test(path)){
      const id=path.split('/').pop();if(!['fulfilled','refunded'].includes(input.status))throw Error('订单状态无效');
      const delivery=typeof input.delivery==='string'?input.delivery.trim():'';if(delivery.length>4000)throw Error('交付说明过长');
      points.transaction(()=>{
        const order=db.prepare('SELECT * FROM shop_orders WHERE id=?').get(id);if(!order)throw Error('订单不存在');
        if(order.status===input.status)return;
        if(order.status==='refunded')throw Error('退款订单不能再次交付');
        if(input.status==='fulfilled'&&!delivery)throw Error('请填写交付说明');
        if(input.status==='refunded'){
          if(order.inventory_item)inventory.refund('shop:'+id);
          points.credit({id:'shop-refund:'+id,user:{uid:order.uid,name:order.name},amount:BigInt(order.price),earned:0n,reason:'商城退款 · '+order.title,actor:user.uid,weekly:false});
          db.prepare('UPDATE shop_items SET stock=CASE WHEN stock<0 THEN stock ELSE stock+1 END,updated=MAX(updated+1,?) WHERE id=?').run(now(),order.item);
        }
        db.prepare('UPDATE shop_orders SET status=?,delivery=?,updated=? WHERE id=?').run(input.status,delivery,now(),id);audit(user,input.status,id);
      });send(res,200,{ok:true});
    }else throw Error('商城接口不存在');
    return true;
  }
  return {route,catalog};
}
