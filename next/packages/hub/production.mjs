import {el} from './dom.mjs';
import {HUB_SERVERS} from '../../server/shared/hub-catalog.mjs';
export function productionDialog(ctx,recipe){
 const {dialog,field,button,select,row}=ctx.surface,d=dialog('生产计划 · '+recipe.title),grid=el('div','','hub-form-grid');d.content.append(el('p',(HUB_SERVERS.find(v=>v[0]===recipe.data.server)?.[1]||'不限服务器')+' · '+(recipe.data.version||'未限定版本')+' · 只组合此范围内已公开配方','hub-muted'),grid);
 const quantity=field(grid,'目标产出数量',recipe.data.quantity,'number'),stock=field(grid,'已有库存 · 每行 ID=数量','','textarea');stock.placeholder='minecraft:stone=64';quantity.min=1;
 const alternative=el('div','','hub-list'),output=el('div','','hub-production-plan'),choices={};d.content.append(alternative,output);let revision=0;
 const invalidate=()=>{revision++;output.replaceChildren();d.footer.querySelector('[data-copy]')?.remove();};d.content.addEventListener('input',invalidate);d.content.addEventListener('change',invalidate);
 async function compute(){const inventory=Object.create(null);for(const line of stock.value.split('\n').filter(s=>s.trim())){const m=line.trim().match(/^([\w.-]+:[\w/.-]+)\s*=\s*([\d.]+)$/);if(!m||!Number.isFinite(Number(m[2])))throw Error('库存格式为 minecraft:stone=64');inventory[m[1]]=(inventory[m[1]]||0)+Number(m[2]);}
  invalidate();const ticket=revision,result=await ctx.api('production','POST',{record:recipe.id,quantity:Number(quantity.value),stock:inventory,choices});if(!ctx.alive()||!d.node.isConnected||ticket!==revision)return;alternative.replaceChildren();output.replaceChildren();
  if(result.needs.length){alternative.append(el('p','以下材料存在多种制作方式或循环转换，请选择配方，或直接备料后重新计算。','hub-muted'));for(const need of result.needs){const input=select(alternative,need.item,[['','选择制作方式'],['raw','直接备料'],...need.options.map(r=>[r.id,r.title+' · 每批 '+r.quantity])],choices[need.item]||'');input.onchange=v=>{if(v)choices[need.item]=v;else delete choices[need.item];};}return;}
  const {plan}=result,raw=row('需要补充的原材料');if(!plan.raw.length)raw.append(el('p','现有库存已满足需求。'));for(const item of plan.raw)raw.append(line(item.item,item.quantity));output.append(raw);
  const steps=row('制作顺序');plan.steps.forEach((step,i)=>steps.append(line((i+1)+'. '+step.title,step.batches+' 批 → '+step.produced)));if(!plan.steps.length)steps.append(el('p','无需额外制作。'));steps.append(el('small','顺序制作约 '+formatTime(plan.seconds)+'；不含搬运、燃料与机器并行。'));output.append(steps);
  const used=row('消耗已有库存');for(const item of plan.consumed)used.append(line(item.item,item.quantity));if(!plan.consumed.length)used.append(el('p','未使用已有库存。'));output.append(used);
  if(plan.leftovers.length){const left=row('计划结束后的剩余材料');for(const item of plan.leftovers)left.append(line(item.item,item.quantity));output.append(left);}
  d.footer.querySelector('[data-copy]')?.remove();const copy=button('复制材料清单',()=>navigator.clipboard.writeText([recipe.title+' × '+plan.quantity,...plan.raw.map(v=>v.item+' × '+v.quantity)].join('\n')));copy.dataset.copy='true';d.footer.append(copy);
 }
 function line(label,value){const r=el('div','','hub-production-line');r.append(el('span',label),el('strong',String(value)));return r;}
 d.footer.append(button('计算计划',compute,true));return d;
}
const formatTime=n=>n<60?n+' 秒':Math.floor(n/60)+' 分 '+Math.round(n%60)+' 秒';
