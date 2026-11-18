import {rogueUpgrade} from './arcade-rogue-v8.mjs';
import {TACTICS_UPGRADES} from './arcade-tactics-v8.mjs';
// One catalogue for both clients, simulation and validated replay actions.
export const FLIGHT_UPGRADES=[
 ['power','火力核心','每发基础伤害 +1',15],
 ['rapid','急速扳机','缩短主炮射击间隔',7],
 ['wings','双翼编队','增加两条侧翼弹道',2],
 ['shield','应急护盾','立即获得一层护盾',0],
 ['repair','机体修复','立即恢复一次机会',0],
 ['speed','轻量引擎','持续移动速度提升',6],
 ['pierce','贯穿弹芯','子弹可额外穿过一架敌机',3],
 ['critical','精准打击','暴击率 +10%，暴击造成双倍伤害',4],
 ['homing','追踪制导','子弹逐渐转向最近的敌机',3],
 ['spread','扇面火网','增加斜向弹道，覆盖更宽区域',2],
 ['pulse','脉冲清场','周期清除附近弹幕并打击敌机',3],
 ['magnet','磁力牵引','扩大补给吸附范围',3],
 ['barrier','启航屏障','每关开始补充一层护盾',2],
 ['regeneration','维修工坊','每四关恢复一次机会；升级缩短间隔',3],
 ['armor','缓冲装甲','受伤后的保护时间延长',3],
 ['heavy','重装克星','对重型敌机伤害 +40%',3],
 ['volley','尾翼炮台','定期向后方发射拦截弹',3],
 ['overdrive','超频启动','每关前六秒射速与火力提升',3],
 ['slowfield','缓速力场','靠近机体的敌方子弹减速',3],
 ['execute','终结指令','直接击毁生命低于 8% 的敌机',3],
 ['chain','电弧链接','命中后向附近一架敌机传递伤害',3],
 ['salvage','回收专家','补给掉落率 +5%',3],
 ['afterburner','灵巧机翼','缩小机体受击核心',3],
 ['bulwark','扩容护盾','护盾容量 +1，并补充一层',2]
].map(([id,title,description,max])=>({id,title,description,max}));
export const FLIGHT_UPGRADE_MAP=Object.fromEntries(FLIGHT_UPGRADES.map(item=>[item.id,item]));
export const flightUpgrade=id=>FLIGHT_UPGRADE_MAP[id]||rogueUpgrade(id)||TACTICS_UPGRADES[id]||{title:'航线补给',description:'选择一项本局增益'};
export const flightShieldCap=s=>3+(s.bulwark||0);
export function availableFlightUpgrades(s){return FLIGHT_UPGRADES.filter(({id,max})=>id==='repair'?s.lives<3:id==='shield'?s.shield<flightShieldCap(s):id==='power'?s.power<16:(s[id]||0)<max).map(item=>item.id);}

