const EPS=1e-8,MAX=1000000000;
const clean=n=>Math.round(n*1e8)/1e8;
const amount=(n,label)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>MAX)throw Error(label+'必须为 0–10 亿之间的数值');return n;};

// Resolve a finite recipe graph, accounting for stock and intermediate leftovers.
// Alternative recipes require an explicit choice; the result never guesses one.
export function productionPlan(recipes,rootId,quantity,{stock={},choices={}}={}){
 if(!Array.isArray(recipes)||recipes.length>2000)throw Error('配方目录过大，请缩小服务器与版本范围');
 amount(quantity,'计划数量');if(!quantity)throw Error('计划数量必须大于零');
 const byId=new Map(recipes.map(r=>[r.id,r])),byOutput=new Map(),root=byId.get(rootId);if(!root)throw Error('目标配方不存在');
 for(const r of recipes){if(!r.output||!Array.isArray(r.ingredients)||!r.quantity||r.quantity<0||r.quantity>MAX)throw Error('配方数据无效');if(!byOutput.has(r.output))byOutput.set(r.output,[]);byOutput.get(r.output).push(r);}
 if(!stock||Array.isArray(stock)||typeof stock!=='object'||Object.keys(stock).length>500||!choices||Array.isArray(choices)||typeof choices!=='object'||Object.keys(choices).length>500)throw Error('库存或配方选择无效');
 const available=new Map(Object.entries(stock).map(([key,value])=>[key,amount(value,'库存')])),used=new Map(),raw=new Map(),steps=new Map(),required=new Map();let visits=0,seconds=0;
 const add=(map,key,n)=>{const total=clean((map.get(key)||0)+n);if(total>MAX)throw Error('计划规模超过上限');map.set(key,total);};
 function need(item,requested,path=[],forced){
  if(++visits>10000||path.length>32)throw Error('配方层级或计算规模过大');amount(requested,'材料数量');
  const inStock=Math.min(available.get(item)||0,requested);if(inStock){available.set(item,clean((available.get(item)||0)-inStock));add(used,item,inStock);}
  const missing=clean(requested-inStock);if(missing<=EPS)return;
  const candidates=byOutput.get(item)||[];let recipe=forced;
  if(!recipe&&Object.hasOwn(choices,item)){if(choices[item]==='raw'){add(raw,item,missing);return;}recipe=byId.get(choices[item]);if(!recipe||recipe.output!==item)throw Error('所选配方与材料不匹配');}
  if(!recipe&&candidates.length===1)recipe=candidates[0];
  if(!recipe&&candidates.length>1){required.set(item,candidates.map(r=>({id:r.id,title:r.title,quantity:r.quantity})));return;}
  if(!recipe){add(raw,item,missing);return;}
  if(path.includes(recipe.id)){required.set(item,candidates.map(r=>({id:r.id,title:r.title,quantity:r.quantity})));return;}
  const batches=Math.ceil(missing/recipe.quantity-EPS);if(!Number.isSafeInteger(batches)||batches>MAX)throw Error('制作批次数量过大');
  for(const ingredient of recipe.ingredients)need(ingredient.item,clean(ingredient.quantity*batches),[...path,recipe.id]);
  const existing=steps.get(recipe.id);if(existing){existing.batches+=batches;existing.produced=clean(existing.produced+batches*recipe.quantity);}else steps.set(recipe.id,{id:recipe.id,title:recipe.title,output:recipe.output,batches,produced:clean(batches*recipe.quantity)});
  const extra=clean(batches*recipe.quantity-missing);if(extra>EPS)add(available,item,extra);seconds+=amount(recipe.seconds||0,'制作时间')*batches;if(seconds>MAX)throw Error('计划耗时超过上限');
 }
 need(root.output,quantity,[],root);
 if(required.size)return {needs:[...required].map(([item,options])=>({item,options})),plan:null};
 // Stock use is measured against the initial stock, not re-used crafted surplus.
 const consumed=Object.entries(stock).map(([item,value])=>({item,quantity:clean(Math.min(value,used.get(item)||0))})).filter(r=>r.quantity>EPS);
 return {needs:[],plan:{output:root.output,quantity,raw:[...raw].map(([item,quantity])=>({item,quantity})),steps:[...steps.values()],consumed,leftovers:[...available].filter(([,n])=>n>EPS).map(([item,quantity])=>({item,quantity})),seconds:clean(seconds)}};
}
