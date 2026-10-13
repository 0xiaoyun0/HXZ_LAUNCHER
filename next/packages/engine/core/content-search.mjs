import {remoteJSON} from './io.mjs';
import {getDownloadMode} from './sources.mjs';

// Search aliases are discovery aids, not official translations of project names.
// Keep the author's title, release metadata and compatibility checks unchanged.
const aliases=[
 ['机械动力','Create'],['应用能源','Applied Energistics'],['精妙背包','Sophisticated Backpacks'],['精妙存储','Sophisticated Storage'],
 ['旅行者背包','Traveler\'s Backpack'],['农夫乐事','Farmer\'s Delight'],['农夫暇事','Farmer\'s Respite'],['饮食多样化','Spice of Life'],
 ['玉','Jade'],['方块信息','Jade'],['物品管理器','JEI'],['物品管理','JEI'],['连锁采集','FTB Ultimine'],['一键挖矿','FTB Ultimine'],
 ['暮色森林','Twilight Forest'],['天境','Aether'],['植物魔法','Botania'],['新生魔艺','Ars Nouveau'],['血魔法','Blood Magic'],
 ['冰火传说','Ice and Fire'],['龙之进化','Draconic Evolution'],['通用机械','Mekanism'],['沉浸工程','Immersive Engineering'],
 ['热力膨胀','Thermal Expansion'],['工业先锋','Industrial Foregoing'],['格雷科技','GregTech'],['末影接口','Ender IO'],
 ['简单存储','Simple Storage'],['精致存储','Refined Storage'],['储物抽屉','Storage Drawers'],['铁箱子','Iron Chests'],
 ['墓碑','Gravestone'],['墓石','Gravestone'],['遗体','Corpse'],['传送石碑','Waystones'],['Xaero小地图','Xaero\'s Minimap'],
 ['小地图','Minimap'],['旅行地图','JourneyMap'],['世界地图','World Map'],['动态光源','Dynamic Lights'],['实体剔除','Entity Culling'],
 ['现代化修复','ModernFix'],['铁氧体磁芯','FerriteCore'],['钠','Sodium'],['锂','Lithium'],['铷','Rubidium'],['氙','Xenon'],
 ['铷扩展','Rubidium Extra'],['钠扩展','Sodium Extra'],['更好的第三人称','Better Third Person'],['卓越前景','Distant Horizons'],
 ['遥远地平线','Distant Horizons'],['光影核心','Iris'],['窥视','Peek'],['苹果皮','AppleSkin'],['鼠标手势','Mouse Tweaks'],
 ['键位冲突','Controlling'],['整理背包','Inventory Profiles Next'],['更好的末地','BetterEnd'],['更好的下界','BetterNether'],
 ['超多生物群系','Biomes O\' Plenty'],['你将去的生物群系','Oh The Biomes We\'ve Gone'],['群峦传说','TerraFirmaCraft'],
 ['匠魂','Tinkers\' Construct'],['匠魂重铸','Tinkers\' Construct'],['空岛','Skyblock'],['机械动力整合包','Create Modpack'],
 ['瓦尔基里天空','Valkyrien Skies'],['瓦尔基里','Valkyrien Skies'],['女仆','Touhou Little Maid'],['车万女仆','Touhou Little Maid'],
 ['互补光影','Complementary'],['互补','Complementary'],['迭代光影','Iteration'],['原版改良','Vanilla Tweaks'],['附属','addon'],
 ['高清修复','Faithful'],['纯净优化','Fabulously Optimized'],['简单优化','Simply Optimized'],['重新想象','Reimagined'],
 ['生电','technical'],['光影','shader'],['资源包','resource pack'],['数据包','datapack'],['整合包','modpack'],
].sort((a,b)=>b[0].length-a[0].length);
export function resolveSearchQuery(input){
 let text=String(input||'').normalize('NFKC').trim().slice(0,100);
 for(const [cn,en]of aliases){if(cn.length===1){if(text===cn)return en;}else text=text.split(cn).join(en);}
 return text.replace(/\s+/g,' ').trim();
}

const cache=new Map(),pending=new Map();
async function lookup(query,facets,offset){
 const params=new URLSearchParams({query,facets:JSON.stringify(facets),limit:'20',offset:String(offset)}),key=getDownloadMode()+':'+params;
 const saved=cache.get(key);if(saved&&Date.now()-saved.time<300000)return saved.value;
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{try{const value=await remoteJSON('https://api.modrinth.com/v2/search?'+params,{timeoutMs:20000});
  if(!Array.isArray(value.hits)||!Number.isFinite(value.total_hits))throw Error('资源目录返回了不完整的搜索结果');
  if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,{value,time:Date.now()});return value;
 }finally{pending.delete(key);}})();pending.set(key,task);return task;
}
export async function searchContent(input,facets,offset=0){
 const original=String(input||'').normalize('NFKC').trim().slice(0,100),alias=resolveSearchQuery(original);
 let query=alias,first=await lookup(query,facets,0);
 // Keep pagination on one result set. Unknown names still reach the original
 // catalogue verbatim, and an alias with no compatible results can fall back.
 if(!first.total_hits&&alias!==original){query=original;first=await lookup(query,facets,0);}
 const page=Math.max(0,Math.min(10000,Math.floor(Number(offset)||0)));
 const result=page?await lookup(query,facets,page):first;
 return {...result,search_query:query,original_query:original,search_alias:query!==original?query:''};
}
