import {el,beijing} from './dom.mjs';
import {HUB_SERVERS} from '../../server/shared/hub-catalog.mjs';

export function gameUI(ctx){
 const {api,request,surface,refresh,uid}=ctx,{button,field,select,dialog,confirm,row,empty}=surface;
 async function servers(parent){
  const data=await api('game-servers');if(!ctx.alive())return;
  const grid=el('div','','hub-grid');parent.append(grid);
  for(const server of data.items){const card=row(HUB_SERVERS.find(s=>s[0]===server.server)?.[1],server.connected?server.version+' · '+server.loader:'尚未收到游戏服实时数据'),status=el('span',server.connected?server.online+' / '+server.max+' 人在线':'游戏桥未连接','hub-chip');card.prepend(status);
   if(server.observed)card.append(el('small','最后同步 '+beijing(server.observed)));const actions=el('div','','hub-actions');card.append(actions);
   actions.append(button('查看玩家',()=>{const d=dialog('当前在线玩家');if(!server.connected)d.content.append(el('p','数据已过期，以下是最后一次同步结果。','hub-muted'));for(const p of server.players||[])d.content.append(row(p.name));if(!server.players?.length)empty(d.content,'没有可显示的在线玩家。');}),button('空位提醒',()=>api('game/'+server.server+'/watch','POST',{})));
   if(server.access.chat)actions.append(button('服务器聊天',()=>chat(server.server)));
   if(server.capabilities?.includes('recipes'))actions.append(button('配方目录',()=>recipes(server.server)));
   actions.append(button('我的设备统计',()=>machines(server.server)));grid.append(card);
  }
  if(ctx.manager){const settings=row('游戏桥管理','每服使用独立密钥。聊天与白名单同步还需游戏服本地配置允许。');settings.append(button('管理连接',manage));parent.append(settings);}
 }
 async function manage(){
  const [keys,states]=await Promise.all([request('/api/admin/game-bridges'),request('/api/admin/game-access')]),d=dialog('管理游戏桥');
  for(const s of states.items){const card=row(HUB_SERVERS.find(v=>v[0]===s.server)?.[1],s.connected?s.version+' · 已连接':'待连接'),chat=field(card,'允许双向聊天',!!s.chat,'checkbox'),whitelist=field(card,'允许审核后同步白名单',!!s.whitelist,'checkbox');card.append(button('保存此服开关',()=>request('/api/admin/game-access','PUT',{server:s.server,chat:chat.checked,whitelist:whitelist.checked})),button('生成新密钥',()=>confirm('替换游戏服密钥？','旧密钥立即失效。新密钥只显示一次，请填入对应游戏服的配置文件。',async()=>{const result=await request('/api/admin/game-bridges','POST',{server:s.server,rotate:true}),secret=dialog('请保存新密钥'),input=field(secret.content,'密钥',result.token);input.readOnly=true;secret.footer.append(button('复制',()=>navigator.clipboard.writeText(result.token)));})),button(keys.items.find(k=>k.server===s.server)?.enabled?'停用连接':'启用连接',async()=>{await request('/api/admin/game-bridges','POST',{server:s.server,enabled:!keys.items.find(k=>k.server===s.server)?.enabled});d.close();await manage();}));d.content.append(card);}
 }
 async function chat(server){const d=dialog('游戏服聊天'),list=el('div','','hub-list'),text=field(d.content,'消息','','textarea');d.content.prepend(list);let requestId=crypto.randomUUID();
  const load=async()=>{const value=await api('game/'+server+'/chat');if(!d.node.isConnected)return;list.replaceChildren(...value.items.map(m=>{const item=el('div','','hub-message');item.append(el('small',m.name+' · '+(m.origin==='game'?'游戏':'社区')+' · '+beijing(m.created)),el('p',m.body));return item;}));list.scrollTop=list.scrollHeight;};
  d.footer.append(button('刷新消息',load),button('发送到游戏服',async()=>{await api('game/'+server+'/chat','POST',{requestId,body:text.value});requestId=crypto.randomUUID();text.value='';await load();},true));await load();
 }
 async function recipes(server){const d=dialog('服务端配方目录'),tools=el('div','','hub-tools'),q=field(tools,'物品或配方 ID'),list=el('div','','hub-list');d.content.append(tools,list);const load=async()=>{const v=await api('game/'+server+'/recipes?q='+encodeURIComponent(q.value));if(!d.node.isConnected)return;list.replaceChildren();for(const recipe of v.items){const card=row(recipe.output+' × '+recipe.quantity,recipe.id);card.append(el('p',recipe.ingredients.map(i=>i.options.join(' / ')+' × '+i.quantity).join('\n'),'hub-prose'));if(recipe.approximate)card.append(el('small','来自游戏配方接口；特殊机器的材料数量或条件请在游戏内核对。'));list.append(card);}if(!v.items.length)empty(list,'没有找到配方；请等待游戏服首次同步完成。');};tools.append(button('查找',load));await load();}
 async function machines(server){const d=dialog('我的设备统计'),v=await api('game/'+server+'/machines');for(const m of v.items)d.content.append(row(m.name,m.metric+' · '+m.value+' '+m.unit+'\n'+beijing(m.observed)));if(!v.items.length)empty(d.content,'没有已授权的设备数据。服务器管理员可通过游戏桥的设备适配接口接入。');}
 async function trades(parent,filter){
  const v=await api('trades?scope='+filter.scope+'&q='+encodeURIComponent(filter.query)+'&offset='+filter.offset);if(!ctx.alive())return;
  const tools=el('div','','hub-tools'),scope=select(tools,'范围',[['public','交易市场'],['mine','我的交易']],filter.scope),q=field(tools,'搜索道具',filter.query);scope.onchange=value=>{filter.scope=value;filter.offset=0;refresh();};tools.append(button('查找',()=>{filter.query=q.value;filter.offset=0;return refresh();}),button('出售背包材料',()=>sell(v.inventory),true));parent.append(tools,el('p','可用积分 '+v.balance+' · 交易物品托管，收到后在背包领取。','hub-muted'));
  const grid=el('div','','hub-grid');parent.append(grid);for(const t of v.items){const item=row(t.snapshot.title+' × '+t.quantity,t.snapshot.description),actions=el('div','','hub-actions');item.append(el('strong',t.price+' 积分'),el('small',t.name+' · '+({open:'出售中',sold:'已售出',expired:'已到期',cancelled:'已撤回'}[t.status])),actions);
   if(t.status==='open'){if(t.owner!==uid)actions.append(button('购买',()=>{const requestId=crypto.randomUUID();return confirm('确认购买？','使用 '+t.price+' 积分购买 '+t.quantity+' 个 '+t.snapshot.title,async()=>{await api('trades/'+t.id+'/buy','POST',{requestId});await refresh();});},true));if(t.owner===uid||ctx.manager)actions.append(button('撤回',()=>{const requestId=crypto.randomUUID();return confirm('撤回交易？','托管的物品将退回背包待领区。',async()=>{await api('trades/'+t.id+'/close','POST',{requestId});await refresh();});}));}grid.append(item);
  }if(!v.items.length)empty(grid,'暂时没有交易。');const pagination=el('div','','hub-actions');if(filter.offset)pagination.append(button('上一页',()=>{filter.offset=Math.max(0,filter.offset-24);return refresh();}));if(v.items.length===24)pagination.append(button('下一页',()=>{filter.offset+=24;return refresh();}));parent.append(pagination);
 }
 function sell(items){const d=dialog('出售背包材料');if(!items.length){empty(d.content,'没有可交易的材料。凭证和收藏品不可交易。');return;}const item=select(d.content,'物品',items.map(v=>[v.id,v.title+' · 持有 '+v.quantity])),qty=field(d.content,'整批数量',1,'number'),price=field(d.content,'整批售价（积分）','1'),days=field(d.content,'有效天数',7,'number'),requestId=crypto.randomUUID();d.footer.append(button('确认托管并上架',async()=>{await api('trades','POST',{requestId,item:item.value,quantity:Number(qty.value),price:price.value,days:Number(days.value)});d.close();await refresh();},true));}
 return {servers,trades,manage};
}
