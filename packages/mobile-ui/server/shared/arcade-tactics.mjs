// Turn based roguelikes: deterministic, serializable and replayed by the server.
export const TACTICS_GAMES=[
 {id:'dice',number:19,name:'骰光远征',tag:'肉鸽 · 骰子战术',description:'分配骰面，预判敌招，用遗物改变每一掷',keys:'选择骰子，再选择攻击、护盾、修复或蓄能；每回合可重掷一枚，E 结束回合。通关十二场遭遇。',color:'#9bb9e4'},
 {id:'caravan',number:20,name:'风帆补给线',tag:'肉鸽 · 航路探索',description:'在变幻航路间权衡补给、风暴与宝藏',keys:'选择一条航路，处理途中事件；补给、船体、金币都影响下一步。每三站选择船舱改装，抵达第十二站。',color:'#99cabb'}
];
export const TACTICS_UPGRADES={
 't-edge':{title:'棱光剑柄',description:'攻击骰伤害 +2',stat:'edge',max:4},
 't-aegis':{title:'镜面护盾',description:'护盾骰格挡 +2；每回合保留最多 3 点护盾',stat:'aegis',max:3},
 't-forge':{title:'六面锻炉',description:'每回合第一枚骰子至少为 4',stat:'forge',max:1},
 't-echo':{title:'双响铃',description:'每回合第一次使用偶数攻击骰，追加 3 点伤害；蓄能时再追加最多 4 点',stat:'echo',max:1},
 't-spark':{title:'余辉电容',description:'蓄能骰额外积蓄 2 点威力；下一次攻击消耗全部蓄能',stat:'spark',max:3},
 't-medic':{title:'月泉扳手',description:'修复骰额外恢复 2 点生命；每回合最多修复一次',stat:'medic',max:3},
 't-heart':{title:'远征之心',description:'最大生命 +8，并恢复 8 点生命',stat:'heart',max:3},
 't-thorns':{title:'反射棱镜',description:'敌人攻击被全部格挡时，反击 4 点伤害',stat:'thorns',max:2},
 't-sails':{title:'折光风帆',description:'每段航路燃料消耗减少 1（最低 1）',stat:'sails',max:2},
 't-hull':{title:'柔韧龙骨',description:'最大船体 +6；航路损伤减少 1',stat:'hull',max:3},
 't-garden':{title:'船上苗圃',description:'每段旅程结束后恢复 1 份补给',stat:'garden',max:2},
 't-trade':{title:'海市通行证',description:'每次获得金币额外 +3；港口维修与补给更划算',stat:'trade',max:2},
 't-beacon':{title:'探星灯塔',description:'藏宝事件收益 +12；每到一站额外获得 15 分',stat:'beacon',max:2},
 't-reserve':{title:'应急货舱',description:'立即获得 7 燃料、7 补给和 4 船体',stat:'reserve',max:3},
 't-shelter':{title:'风雨屏障',description:'每段航路的船体损伤减少 2（最低 0）',stat:'shelter',max:2},
 't-compass':{title:'潮汐罗盘',description:'遗迹航路燃料消耗 -1；修复古代信标额外获得 1 补给',stat:'compass',max:2}
};
const rng=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;};
const pick=(s,n)=>Math.floor(rng(s)*n);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function message(s,value){s.log=[...(s.log||[]),value].slice(-3);s.revision++;}
function heal(s,n){s.hp=Math.min(s.maxHp,s.hp+n);}
function offer(s,prefix){const ids=Object.keys(TACTICS_UPGRADES).filter(id=>(prefix==='dice'?['edge','aegis','forge','echo','spark','medic','heart','thorns']:['sails','hull','garden','trade','beacon','reserve','shelter','compass']).includes(TACTICS_UPGRADES[id].stat)&&(s[TACTICS_UPGRADES[id].stat]||0)<TACTICS_UPGRADES[id].max);for(let i=ids.length-1;i>0;i--){const j=pick(s,i+1);[ids[i],ids[j]]=[ids[j],ids[i]];}s.choices=ids.slice(0,3);}
export function validTacticsAction(game,a){if(typeof a!=='string'||!TACTICS_GAMES.some(g=>g.id===game))return false;return (game==='dice'&&(/^die:[0-3]$/.test(a)||['use:attack','use:guard','use:repair','use:charge','reroll','endturn'].includes(a)))||(game==='caravan'&&/^(route|event):[0-2]$/.test(a))||(a.startsWith('upgrade:')&&Object.hasOwn(TACTICS_UPGRADES,a.slice(8)));}
export function createTactics(s){Object.assign(s,{level:1,hp:s.game==='dice'?36:28,maxHp:s.game==='dice'?36:28,choices:[],log:[],revision:0,age:0,relics:[]});if(s.game==='dice'){Object.assign(s,{turn:1,block:0,charge:0,selectedDie:0});encounter(s);}else{Object.assign(s,{fuel:18,food:17,coins:14,weather:'晴风',history:[],phase:'route'});routes(s);}}
function roll(s){s.dice=Array.from({length:4},()=>1+pick(s,6));if(s.forge)s.dice[0]=Math.max(4,s.dice[0]);s.used=[false,false,false,false];s.selectedDie=0;s.rerolled=false;s.repaired=false;s.echoUsed=false;}
function encounter(s){const boss=s.level%4===0;const kind=pick(s,3);s.enemy={name:boss?'棱光守卫':['雾影巡游者','破帆猎手','镜甲傀儡'][kind],hp:20+s.level*5+(boss?12:0),max:20+s.level*5+(boss?12:0),boss,kind,shield:0,charge:0,intent:'attack',amount:0};s.turn=1;s.block=0;s.charge=0;roll(s);enemyIntent(s);message(s,'第 '+s.level+' 场遭遇：'+s.enemy.name);}
function enemyIntent(s){const e=s.enemy,r=pick(s,10);e.intent=e.charge?'attack':r<2?'brace':r<4?'pierce':r<7?'attack':r<9&&s.level>=3?'windup':s.level>=5?'siphon':'attack';e.amount=e.intent==='brace'?3+s.level:e.intent==='windup'?4+Math.floor(s.level/3):e.intent==='siphon'?3+Math.floor(s.level*.55):5+Math.floor(s.level*.7)+(e.boss?2:0)+(e.intent==='pierce'?-2:0)+e.charge;}
function strike(s,n){const blocked=Math.min(s.enemy.shield,n);s.enemy.shield-=blocked;s.enemy.hp=Math.max(0,s.enemy.hp-n+blocked);}
function wonBattle(s){s.score+=s.level*120+Math.max(0,80-s.turn*5);if(s.level===12){s.won=true;s.over=true;s.score+=s.hp*12;message(s,'远征完成，十二处棱光已经点亮。');}else{heal(s,3);offer(s,'dice');message(s,'遭遇结束，选择一件遗物。');}}
function diceAction(s,a){if(a.startsWith('die:')){const i=Number(a.slice(4));if(!s.used[i])s.selectedDie=i;return;}const i=s.selectedDie,n=s.dice[i];if(a==='reroll'){if(!s.rerolled&&!s.used[i]){s.dice[i]=1+pick(s,6);s.rerolled=true;message(s,'重掷得到 '+s.dice[i]);}return;}
 if(a.startsWith('use:')&&!s.used[i]){const kind=a.slice(4);if(kind==='repair'&&s.repaired)return;s.used[i]=true;if(kind==='attack'){let hit=n+(s.edge||0)*2+s.charge;if(s.echo&&n%2===0&&!s.echoUsed){hit+=3+Math.min(4,s.charge);s.echoUsed=true;}s.charge=0;strike(s,hit);message(s,'攻击 '+hit+' 点');}else if(kind==='guard'){s.block+=n+(s.aegis||0)*2;message(s,'获得 '+(n+(s.aegis||0)*2)+' 点格挡');}else if(kind==='repair'){heal(s,Math.ceil(n/2)+(s.medic||0)*2);s.repaired=true;message(s,'修复生命');}else if(kind==='charge'){s.charge+=n+(s.spark||0)*2;message(s,'下一次攻击积蓄 '+s.charge+' 点威力');}s.selectedDie=Math.max(0,s.used.findIndex(v=>!v));}
 if(a==='endturn'&&s.enemy.hp>0){const e=s.enemy;if(e.intent==='brace'){e.shield=e.amount;message(s,e.name+' 获得 '+e.amount+' 护甲');}else if(e.intent==='windup'){e.charge=e.amount;message(s,e.name+' 蓄势 '+e.amount+' 点，下回合将重击');}else{const hit=e.intent==='pierce'?Math.max(0,e.amount-Math.floor(s.block/2)):Math.max(0,e.amount-s.block);s.block=Math.max(0,s.block-(e.intent==='pierce'?e.amount*2:e.amount));s.hp=Math.max(0,s.hp-hit);if(e.intent==='siphon'&&hit>0){const gain=Math.min(5,hit);e.hp=Math.min(e.max,e.hp+gain);message(s,e.name+' 汲取 '+gain+' 点生命');}else message(s,e.name+' 造成 '+hit+' 伤害');if(hit===0&&s.thorns)strike(s,s.thorns*4);if(e.charge)e.charge=0;}if(!s.hp){s.over=true;message(s,'远征结束，下次试试提前分配护盾。');return;}s.block=s.aegis?Math.min(s.block,3):0;s.turn++;roll(s);enemyIntent(s);}
 if(s.enemy.hp<=0&&!s.over)wonBattle(s);
}
const ROUTES=[{id:'port',name:'沿岸港口',text:'稳妥补给，金币换取修复',fuel:2,food:2,risk:1},{id:'ruins',name:'遗迹航道',text:'中等损耗，寻找遗物与宝藏',fuel:3,food:2,risk:3},{id:'storm',name:'风暴捷径',text:'高风险、高收益的快速航线',fuel:2,food:3,risk:5},{id:'reef',name:'珊瑚群岛',text:'寻找食物，避开暗礁',fuel:3,food:1,risk:2},{id:'trade',name:'海上集市',text:'筹集金币，购买下一站补给',fuel:3,food:2,risk:1}];
function routes(s){s.phase='route';s.weather=['晴风','逆风','雨幕'][pick(s,3)];const pool=[...ROUTES];for(let i=pool.length-1;i>0;i--){const j=pick(s,i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}s.routes=pool.slice(0,3).map(r=>({...r,fuel:Math.max(1,r.fuel+(s.weather==='逆风'?1:0)-(s.sails||0)-(r.id==='ruins'?(s.compass||0):0)),food:Math.max(1,r.food),risk:r.risk+(s.weather==='雨幕'?1:0)-(s.shelter||0)*2}));message(s,'第 '+s.level+' 站 · '+s.weather+'，选择下一条航路。');}
function credit(s,n){s.coins+=n+(s.trade||0)*3;}
function routeAction(s,index){const r=s.routes[index];if(!r)return;s.activeRoute=r;s.fuel-=r.fuel;s.food-=r.food;let damage=r.risk+pick(s,3)-(s.hull||0);if(s.fuel<0){damage+=Math.abs(s.fuel)*2;s.fuel=0;}if(s.food<0){damage+=Math.abs(s.food)*2;s.food=0;}s.hp=Math.max(0,s.hp-Math.max(0,damage));s.history.push(r.id);if(!s.hp){s.over=true;message(s,'船体无法继续航行，已保存本次成绩。');return;}s.phase='event';s.eventVariant=pick(s,3);message(s,'抵达'+r.name+'，选择如何度过这一站。');}
export function voyageOptions(s){const r=s.activeRoute;if(!r)return[];const benefit=s.eventVariant||0,discount=s.trade||0;
 const available=options=>{if(s.hp<=10||s.fuel<=4||s.food<=4)options[2]={title:'应急停泊',text:'放弃本站得分，恢复 5 船体、4 燃料与 4 补给',hp:5,fuel:4,food:4,points:-100};return options;};
 if(r.id==='port'||r.id==='trade')return available([{title:'停泊修缮',text:'花费 '+Math.max(3,7-discount*2)+' 金币，恢复 8 船体、获得 3 燃料',cost:Math.max(3,7-discount*2),hp:8,fuel:3},{title:'采购补给',text:'花费 '+Math.max(3,6-discount*2)+' 金币，获得 6 补给、5 燃料',cost:Math.max(3,6-discount*2),food:6,fuel:5},{title:'护送商队',text:'获得 8 金币、2 燃料，消耗 1 船体',coins:8,fuel:2,hp:-1}]);
 if(r.id==='ruins')return available([{title:'深入藏宝室',text:'消耗 3 船体，获得 '+(14+benefit*3+(s.beacon||0)*12)+' 金币与额外分数',hp:-3,coins:14+benefit*3+(s.beacon||0)*12,points:100},{title:'修复古代信标',text:'获得 4 燃料、3 补给与 '+(60+(s.beacon||0)*20)+' 分',fuel:4,food:3+(s.compass||0),points:60+(s.beacon||0)*20},{title:'安全休整',text:'恢复 5 船体，获得 2 补给',hp:5,food:2}]);
 if(r.id==='storm')return available([{title:'借风远航',text:'获得 8 燃料、6 金币与 80 分',fuel:8,coins:6,points:80},{title:'营救漂流者',text:'消耗 2 补给，恢复 6 船体、获得 8 金币',food:-2,hp:6,coins:8},{title:'收集风晶',text:'消耗 2 船体，获得 5 燃料、3 补给与 130 分',hp:-2,fuel:5,food:3,points:130}]);
 return available([{title:'采集珊瑚果',text:'获得 7 补给、2 燃料',food:7,fuel:2},{title:'寻访旧船骸',text:'获得 7 金币、5 燃料，消耗 1 船体',coins:7,fuel:5,hp:-1},{title:'修补船帆',text:'恢复 7 船体，获得 1 补给',hp:7,food:1}]);}
function eventAction(s,index){const o=voyageOptions(s)[index];if(!o||s.coins<(o.cost||0)||s.food<-(o.food||0))return;s.coins-=o.cost||0;if(o.coins)credit(s,o.coins);s.food=clamp(s.food+(o.food||0)+(s.garden||0),0,40);s.fuel=clamp(s.fuel+(o.fuel||0),0,40);s.hp=clamp(s.hp+(o.hp||0),0,s.maxHp);s.score+=100+(o.points||0)+(s.beacon||0)*15;if(!s.hp){s.over=true;message(s,'本次航行结束。');return;}message(s,o.title+'完成');if(s.level>=12){s.won=true;s.over=true;s.score+=s.hp*8+s.food*3+s.fuel*3+s.coins;message(s,'成功抵达星湾港，航行结算完成。');}else if(s.level%3===0)offer(s,'caravan');else{s.level++;routes(s);}}
function upgrade(s,id){const o=TACTICS_UPGRADES[id];if(!o||!s.choices.includes(id))return;s.choices=[];s[o.stat]=(s[o.stat]||0)+1;s.relics.push(id);if(id==='t-heart'){s.maxHp+=8;heal(s,8);}if(id==='t-hull'){s.maxHp+=6;heal(s,6);}if(id==='t-reserve'){s.fuel=Math.min(40,s.fuel+7);s.food=Math.min(40,s.food+7);heal(s,4);}s.level++;if(s.game==='dice')encounter(s);else routes(s);}
export function stepTactics(s,actions){s.age++;for(const a of actions){if(s.over)break;if(!validTacticsAction(s.game,a))continue;if(s.choices.length){if(a.startsWith('upgrade:'))upgrade(s,a.slice(8));continue;}if(s.game==='dice')diceAction(s,a);else if(s.phase==='route'&&a.startsWith('route:'))routeAction(s,Number(a.slice(6)));else if(s.phase==='event'&&a.startsWith('event:'))eventAction(s,Number(a.slice(6)));}}
