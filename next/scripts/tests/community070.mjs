import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createCommunity} from '../../apps/community-server/src/server.mjs';
const ids={admin:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',owner:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',player:'cccccccccccccccccccccccccccccccc'};
const dir=await fs.mkdtemp(path.resolve('.runtime/community070-'));
const service=createCommunity({data:dir,adminIDs:[ids.admin],origins:['http://127.0.0.1:5178','http://127.0.0.1:5193','http://127.0.0.1:5240'],exchange:async input=>({selectedProfile:{id:ids[input.role],name:{admin:'活动管理员',owner:'星野',player:'小满'}[input.role]}})});
await new Promise(resolve=>service.server.listen(process.argv.includes('--serve')?5240:0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+service.server.address().port,tokens={};
async function api(role,p,method='GET',value,expected=200){const r=await fetch(base+p,{method,headers:{'Content-Type':'application/json',...(tokens[role]?{Authorization:'Bearer '+tokens[role]}:{})},body:value===undefined?undefined:JSON.stringify(value)}),data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
try{
 for(const role of Object.keys(ids))tokens[role]=(await api(role,'/api/session','POST',{role})).token;
 await api('admin','/api/admin/points/adjust','POST',{uid:ids.owner,name:'星野',amount:'100',operation:'credit',reason:'测试初始积分',id:randomUUID()});
 const task=randomUUID();await api('owner','/api/guild','POST',{requestId:task,title:'一起完成码头建设',description:'在资源世界建造一座可停靠小船的码头，提交两张完工图片。',kind:'request',rewardType:'points',reward:'40',images:[]},201);
 assert.equal((await api('owner','/api/points')).balance,'60');
 assert.equal((await api('player','/api/guild')).items.length,0);
 await api('player','/api/guild/'+task+'/review','POST',{status:'approved'},403);
 await api('admin','/api/guild/'+task+'/review','POST',{status:'approved'});
 await api('owner','/api/guild/'+task+'/accept','POST',{},400);
 await api('player','/api/guild/'+task+'/accept','POST',{});
 await api('player','/api/guild/'+task+'/submit','POST',{body:'码头已完成，坐标 120,64,80。',images:[]});
 const claim=(await api('owner','/api/guild/'+task)).claims[0].id;
 await api('player','/api/guild/'+task+'/resolve','POST',{claim,approved:true},403);
 await api('owner','/api/guild/'+task+'/resolve','POST',{claim,approved:true});
 await api('owner','/api/guild/'+task+'/resolve','POST',{claim,approved:true});
 assert.equal((await api('player','/api/points')).balance,'40');
 assert.equal((await api('owner','/api/points')).balance,'60');
 const other=randomUUID();await api('owner','/api/guild','POST',{requestId:other,title:'收集橡木',description:'需要十组橡木。',kind:'request',rewardType:'points',reward:'10',images:[]},201);
 await api('owner','/api/guild/'+other+'/cancel','POST',{});await api('owner','/api/guild/'+other+'/cancel','POST',{});assert.equal((await api('owner','/api/points')).balance,'60');
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCG0AAAAASUVORK5CYII=';
 await api('owner','/api/media/upload','POST',{scope:'shop',image:png},403);
 const picture=await api('admin','/api/media/upload','POST',{scope:'shop',image:png},201);
 const shop=await api('admin','/api/admin/shop/items','POST',{title:'纪念徽章',description:'领取幻想镇活动纪念徽章',price:'1',stock:10,enabled:true,image:picture.url});
 assert.equal((await api('player','/api/shop')).items[0].image,picture.url);assert.equal((await api('player',picture.url+'/data')).image,png);
 const bridge=await api('admin','/api/admin/game-bridges','POST',{server:'mod-2',rotate:true});
 const packet={id:randomUUID(),observed:Date.now(),players:[{uid:ids.player,stats:{'minecraft:custom/minecraft:play_time':24000}}]};
 const report=await fetch(base+'/api/game-stats/report',{method:'POST',headers:{Authorization:'Bearer '+bridge.token,'X-HXZ-Server':'mod-2','Content-Type':'application/json'},body:JSON.stringify(packet)});assert.equal(report.status,200);assert.equal((await api('player','/api/game-stats')).items[0].value,24000);
 await api('player','/api/game-stats/report','POST',packet,403);
 // Since 0.7.2 all commissions, including administrator-created ones, escrow their reward.
 await api('admin','/api/admin/points/adjust','POST',{uid:ids.admin,name:'活动管理员',amount:'7',operation:'credit',reason:'测试委托资金',id:randomUUID()});
 const main=randomUUID();await api('admin','/api/guild','POST',{requestId:main,title:'档案前置任务',description:'完成入门记录。',kind:'main',rewardType:'points',reward:'7',images:[]},201);await api('admin','/api/guild/'+main+'/review','POST',{status:'approved'});
 const chapter={id:'guild-integration',title:'公会协作',archives:[{id:'after-guild',title:'奖励档案',body:'仅在任务和数据均达成后可见',requires:['main-done','stats-done']}],tasks:[{id:'main-done',title:'完成主线',type:'guild',guildId:main},{id:'stats-done',title:'游戏记录',type:'stat',server:'mod-2',metric:'minecraft:custom/minecraft:play_time',value:24000}]};
 const draft=await api('admin','/api/admin/linking/chapters/guild-integration','PUT',{chapter,revision:0});await api('admin','/api/admin/linking/chapters/guild-integration/publish','POST',{revision:draft.revision});
 const before=await api('player','/api/linking/chapters/guild-integration');assert(!JSON.stringify(before).includes('仅在任务和数据均达成后可见'));
 await api('player','/api/guild/'+main+'/accept','POST',{});await api('player','/api/guild/'+main+'/submit','POST',{body:'已完成',images:[]});const mainClaim=(await api('admin','/api/guild/'+main)).claims[0].id;await api('admin','/api/guild/'+main+'/resolve','POST',{claim:mainClaim,approved:true});
 assert(JSON.stringify(await api('player','/api/linking/chapters/guild-integration')).includes('仅在任务和数据均达成后可见'));assert.equal((await api('player','/api/points')).balance,'47');
 const voice=await api('admin','/api/admin/voice-rooms');assert(voice.rooms.some(r=>r.kind==='music'));await api('player','/api/admin/voice-rooms','PUT',voice,403);const changed=await api('admin','/api/admin/voice-rooms','PUT',{...voice,rooms:voice.rooms.map((r,i)=>i===0?{...r,capacity:30}:r)});assert.equal(changed.rooms[0].capacity,30);await api('admin','/api/admin/voice-rooms','PUT',voice,400);
 console.log('PASS guild moderation/escrow/idempotent payment/refund, shop image persistence, trusted game statistics');
 if(process.argv.includes('--serve')){await fs.writeFile('.runtime/community070-fixture.json',JSON.stringify({base,tokens,ids,dir,task}));console.log('Local fixture listening on 5240');}
 else await service.close();
}catch(e){await service.close();throw e;}
