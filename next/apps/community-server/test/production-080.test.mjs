import test from 'node:test';import assert from 'node:assert/strict';import {productionPlan} from '../shared/production-plan.mjs';import {fixture} from './helpers/hub.mjs';
const recipe=(id,output,quantity,ingredients,seconds=1)=>({id,title:id,output,quantity,ingredients:Object.entries(ingredients).map(([item,quantity])=>({item,quantity})),seconds});
test('production plan reuses intermediate surplus, consumes inventory and aggregates a finite dependency graph',()=>{
 const recipes=[recipe('灯','lamp',1,{plank:2,stick:1}),recipe('木板','plank',4,{log:1}),recipe('木棍','stick',4,{plank:2})],v=productionPlan(recipes,'灯',2,{stock:{plank:1}}).plan;
 assert.deepEqual(v.raw,[{item:'log',quantity:2}]);assert.deepEqual(v.consumed,[{item:'plank',quantity:1}]);assert.equal(v.leftovers.find(r=>r.item==='plank').quantity,3);assert.equal(v.leftovers.find(r=>r.item==='stick').quantity,2);assert.deepEqual(v.steps.map(r=>r.id),['木板','木棍','灯']);assert.equal(v.steps[0].batches,2);assert.equal(v.seconds,5);
 const ready=productionPlan(recipes,'灯',2,{stock:{lamp:2}}).plan;assert.deepEqual(ready.steps,[]);assert.deepEqual(ready.raw,[]);
});
test('alternative and cyclic recipes require explicit choices, and malformed or excessive plans are rejected',()=>{
 const recipes=[recipe('root','machine',1,{plate:2}),recipe('a','plate',1,{ore:1}),recipe('b','plate',2,{ore:3})];assert.equal(productionPlan(recipes,'root',1).plan,null);assert.equal(productionPlan(recipes,'root',1).needs[0].options.length,2);assert.deepEqual(productionPlan(recipes,'root',1,{choices:{plate:'b'}}).plan.raw,[{item:'ore',quantity:3}]);
 const cycle=[recipe('root','a',1,{b:1}),recipe('other','b',1,{a:1})];assert.equal(productionPlan(cycle,'root',1).plan,null);assert.deepEqual(productionPlan(cycle,'root',1,{choices:{b:'raw'}}).plan.raw,[{item:'b',quantity:1}]);
 assert.throws(()=>productionPlan(recipes,'root',0));assert.throws(()=>productionPlan(recipes,'root',NaN));assert.throws(()=>productionPlan(recipes,'root',1,{stock:{plate:-1}}));assert.throws(()=>productionPlan(recipes,'root',1,{choices:{plate:'root'}}));
});
test('production API only composes public recipes of exactly the same server and game version',async t=>{
 const {req}=await fixture(t),add=(title,server,version,output,ingredients,status='review')=>req('admin','/api/hub/records','POST',{kind:'recipe',title,revision:0,status,data:{server,version,output,quantity:1,ingredients,seconds:2}});
 const root=await add('铁箱','mod-1','1.21.1','mod:box','minecraft:iron_ingot=4');await add('铁锭','mod-2','1.21.1','minecraft:iron_ingot','minecraft:iron_ore=1');await add('未来铁锭','mod-1','26.2','minecraft:iron_ingot','minecraft:iron_ore=1');const draft=await add('草稿铁锭','mod-1','1.21.1','minecraft:iron_ingot','minecraft:iron_ore=1','draft');
 let v=await req('alice','/api/hub/production','POST',{record:root.id,quantity:2});assert.deepEqual(v.plan.raw,[{item:'minecraft:iron_ingot',quantity:8}]);await req('alice','/api/hub/production','POST',{record:draft.id,quantity:1},404);
 await add('可用铁锭','mod-1','1.21.1','minecraft:iron_ingot','minecraft:iron_ore=1');v=await req('alice','/api/hub/production','POST',{record:root.id,quantity:2,stock:{'minecraft:iron_ingot':3}});assert.deepEqual(v.plan.raw,[{item:'minecraft:iron_ore',quantity:5}]);
});
