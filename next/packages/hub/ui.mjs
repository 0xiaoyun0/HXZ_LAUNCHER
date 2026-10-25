import {el,createSurface} from './dom.mjs';
import {HUB_KINDS} from '../../server/shared/hub-catalog.mjs';
import {recordUI} from './records.mjs';
import {socialUI} from './social.mjs';
import {gameUI} from './game.mjs';
import {workbenchUI} from './workbench.mjs';

import {HUB_AREAS} from './navigation.mjs';
import {isActiveHubSection} from '../../server/shared/hub-visibility.mjs';

const groups=[['游戏与活动',[['event','活动与赛事'],['servers','服务器服务'],['world','世界体验'],['program','一起看视频']]],['我的社区',[['space','玩家空间'],['saved','收藏与订阅'],['trades','玩家交易'],['whitelist','入服申请'],['appeal','申诉']]]];
export const hubSectionName=section=>section==='workbench'?'社区管理':groups.flatMap(g=>g[1]).find(([key])=>key===section)?.[1]||'活动与赛事';
export function mountHub(root,options){
 const cleanups=new Set();let alive=true,sequence=0,section=options.section||'event';const surface=createSurface({alive:()=>alive});
 const regions=options.regions||{board:root,nav:el('div'),summary:el('div')};let filter={query:'',scope:'public',offset:0};
 const ctx={...options,addCleanup:fn=>{cleanups.add(fn);return()=>cleanups.delete(fn);},copy:options.copy||((text)=>navigator.clipboard.writeText(text)),surface,alive:()=>alive,manager:false,api:(p,method='GET',input)=>options.request('/api/hub/'+p,method,input),refresh:()=>load()};
 const records=recordUI(ctx);ctx.openRecord=records.detail;const social=socialUI(ctx),game=gameUI(ctx);
 async function choose(value){if(!isActiveHubSection(value))return;if(options.onSection&&value!==section){options.onSection(value);return;}section=value;filter={query:'',scope:'public',offset:0};drawNav();await load();}
 ctx.choose=choose;
 function navigation(close=()=>{}){const nav=el('nav','','hub-navigation');nav.setAttribute('aria-label','社区功能');for(const [title,items] of [...groups,...ctx.manager?[['管理',[['workbench','社区管理']]]]:[]]){const group=el('section','','hub-nav-group');group.append(el('h3',title));for(const [key,label] of items){const b=surface.button(label,()=>{close();return choose(key);});b.setAttribute('aria-current',String(key===section));group.append(b);}nav.append(group);}return nav;}
 function drawNav(){regions.nav.replaceChildren();const area=HUB_AREAS[options.area];regions.nav.classList.toggle('hub-context-region',!!area);if(area){regions.nav.hidden=area.sections.length<2;if(regions.nav.hidden)return;const nav=el('nav','','hub-context-navigation');nav.setAttribute('aria-label',area.title);for(const key of area.sections){const b=surface.button(hubSectionName(key),()=>choose(key));b.setAttribute('aria-current',String(key===section));nav.append(b);}regions.nav.append(nav);return;}if(options.platform==='android'){const top=el('div','','hub-toolbar-title');top.append(el('h2',hubSectionName(section)),surface.button('切换栏目',()=>{const d=surface.dialog('社区导航');d.content.append(navigation(d.close));}));regions.nav.append(top);}else regions.nav.append(navigation());}
 async function summary(ticket){const value=await ctx.api('profiles/'+encodeURIComponent(options.uid));if(!alive||ticket!==sequence)return;regions.summary.replaceChildren();const card=el('div','','hub-surface');card.append(el('h3',value.name),el('p',value.home?.motto||'欢迎回到幻想镇。','hub-muted'));const actions=el('div','','hub-actions');actions.append(surface.button('我的空间',()=>choose('space')),surface.button('我的收藏',()=>choose('saved')));card.append(actions);regions.summary.append(card);}
 async function load(){const ticket=++sequence;const target=regions.board;target.setAttribute('aria-busy','true');const content=el('div','','hub-surface');
  try{if(!options.uid){surface.empty(content,'登录皮肤站并连接社区后使用社区功能。');target.replaceChildren(content);return;}
   if(!isActiveHubSection(section)){surface.empty(content,'这个旧栏目已归档，请从主导航选择现有功能。');}
   else if(section==='workbench')await workbenchUI(ctx,content,filter);
   else if(HUB_KINDS[section])await records.list(content,section,filter);
   else if(social[section])await social[section](content,filter);
   else if(game[section])await game[section](content,filter);
   else {section='event';await records.list(content,section,filter);}
   if(alive&&ticket===sequence){target.replaceChildren(content);if(options.showSummary!==false)void summary(ticket).catch(error=>surface.report(error,regions.summary));}
  }catch(error){if(alive&&ticket===sequence){content.replaceChildren();surface.report(error,content);content.append(surface.button('重新连接并读取',load));target.replaceChildren(content);}}
  finally{if(alive&&ticket===sequence)target.removeAttribute('aria-busy');}
 }
 for(const node of Object.values(regions))node.classList.add('hub-surface');
 if(!options.regions){regions.board=el('section');for(const node of Object.values(regions))node.classList.add('card','hub-surface');root.append(regions.nav,regions.board);if(options.showSummary!==false)root.append(regions.summary);}
 drawNav();void ctx.api('catalog').then(v=>{ctx.manager=v.manager;drawNav();}).catch(()=>{}).finally(async()=>{if(!alive)return;await load();if(options.item&&alive)await records.detail(options.item);});
 return ()=>{alive=false;sequence++;for(const fn of cleanups)fn();cleanups.clear();surface.close();void records.dispose().catch(()=>{});for(const n of Object.values(regions))n.replaceChildren();};
}
