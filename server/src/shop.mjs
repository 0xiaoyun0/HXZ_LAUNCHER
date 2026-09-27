import {randomUUID} from 'node:crypto';

const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('商品名称或说明无效');return value.trim();};
const date=value=>{if(value==null||value===0||value==='')return 0;if(!Number.isSafeInteger(value)||value<0)throw Error('销售时间无效');return value;};
const windowOpen=(row,time)=>!row.starts||row.starts<=time;
const inWindow=(row,time)=>windowOpen(row,time)&&(!row.ends||time<row.ends);
function schedule(input){const starts=date(input.starts),ends=date(input.ends);if(ends&&ends<=starts)throw Error('结束时间必须晚于开始时间');return {starts,ends};}

export function createShop({db,auth,admin,body,send,limit,points,now=()=>Date.now()}){
  db.exec(`CREATE TABLE IF NOT EXISTS shop_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL,starts INTEGER NOT NULL,ends INTEGER NOT NULL);
    INSERT OR IGNORE INTO shop_settings VALUES(1,0,0,0);
    CREATE TABLE IF NOT EXISTS shop_items(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,price TEXT NOT NULL,stock INTEGER NOT NULL,enabled INTEGER NOT NULL,starts INTEGER NOT NULL,ends INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS shop_orders(id TEXT PRIMARY KEY,uid TEXT NOT NULL,name TEXT NOT NULL,request_key TEXT NOT NULL,item TEXT NOT NULL,title TEXT NOT NULL,price TEXT NOT NULL,status TEXT NOT NULL,delivery TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL,UNIQUE(uid,request_key));
    CREATE INDEX IF NOT EXISTS shop_orders_user ON shop_orders(uid,created DESC,id);
    CREATE TABLE IF NOT EXISTS shop_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created INTEGER NOT NULL);`);
  const settings=()=>db.prepare('SELECT enabled,starts,ends FROM shop_settings WHERE id=1').get();
  const audit=(user,action,target)=>db.prepare('INSERT INTO shop_audit(actor,action,target,created) VALUES(?,?,?,?)').run(user.uid,action,target,now());
  function catalog(management=false){
    const config=settings(),time=now();
    const items=db.prepare('SELECT * FROM shop_items WHERE deleted=0'+(management?'':' AND enabled=1')+' ORDER BY created DESC,id LIMIT 300').all();
    return {settings:config,open:!!config.enabled&&inWindow(config,time),serverTime:time,items:items.map(item=>({...item,available:!!config.enabled&&inWindow(config,time)&&!!item.enabled&&inWindow(item,time)&&item.stock!==0}))};
  }
  async function route(req,res,url){
    const path=url.pathname,management=path.startsWith('/api/admin/shop');
    if(!management&&!path.startsWith('/api/shop'))return false;
    const user=management?admin(req):auth(req);limit('shop:'+user.uid,60);
    if(req.method==='GET'){
      if(path==='/api/shop'||path==='/api/admin/shop'){send(res,200,catalog(management));return true;}
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
        db.prepare(`INSERT INTO shop_items VALUES(?,?,?,?,?,?,?,?,0,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,price=excluded.price,stock=excluded.stock,enabled=excluded.enabled,starts=excluded.starts,ends=excluded.ends,updated=excluded.updated`).run(id,title,description,String(BigInt(input.price)),input.stock,+input.enabled,starts,ends,now(),Math.max(now(),(old?.updated||0)+1));audit(user,'save',id);
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
        const id=randomUUID();
        points.credit({id:'shop:'+id,user,amount:-BigInt(item.price),earned:0n,reason:'商城兑换 · '+item.title,weekly:false});
        db.prepare('UPDATE shop_items SET stock=CASE WHEN stock<0 THEN stock ELSE stock-1 END,updated=? WHERE id=?').run(Math.max(time,item.updated+1),item.id);
        db.prepare("INSERT INTO shop_orders VALUES(?,?,?,?,?,?,?,'pending','',?,?)").run(id,user.uid,user.name,input.requestId,item.id,item.title,item.price,time,time);
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
