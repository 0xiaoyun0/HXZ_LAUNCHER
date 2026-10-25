import {isActiveHubSection,retiredHubRedirect} from '../../server/shared/hub-visibility.mjs';
// Stable destinations: notifications using /community/hub remain valid.
export const HUB_AREAS=Object.freeze({
 events:{title:'活动与赛事',path:'/community/events',parent:'notice',sections:['event']},
 council:{title:'社区议事',path:'/community/council',parent:'notice',sections:['proposal','ledger']},
 worlds:{title:'世界与入服',path:'/library/worlds',parent:'discover',sections:['world','servers','whitelist']},
 media:{title:'一起看视频',path:'/music/watch',parent:'discover',sections:['program']},
 personal:{title:'玩家空间',path:'/account/community',parent:'me',sections:['space','saved']},
 trades:{title:'玩家交易',path:'/arcade/shop/trades',parent:'discover',sections:['trades']},
 support:{title:'申诉与协商',path:'/settings/appeals',parent:'me',sections:['appeal']},
 admin:{title:'社区管理',path:'/manage',parent:'me',sections:['workbench'],admin:true},
});
export function hubAreaFor(section){return Object.keys(HUB_AREAS).find(key=>HUB_AREAS[key].sections.includes(section))||'events';}
export function hubDestination(section,item=''){
 if(!isActiveHubSection(section))return retiredHubRedirect(section);
 const area=HUB_AREAS[hubAreaFor(section)],params=new URLSearchParams();
 if(area.sections.includes(section)&&section!==area.sections[0])params.set('section',section);
 if(item)params.set('item',item);
 const query=params.toString();return area.path+(query?'?'+query:'');
}
export function resolveHubTarget(target){
 let url;try{url=new URL(target,'https://hxz.invalid');}catch{return null;}
 if(url.origin!=='https://hxz.invalid')return null;
 const retiredAreas={'/community/people':'social','/community/creation':'project','/workshop/creation':'project','/workshop/knowledge':'article','/arcade/workshop':'challenges'};
 const oldSection=url.searchParams.get('section');
 if(retiredAreas[url.pathname]||url.pathname==='/community/hub'&&!isActiveHubSection(oldSection))return {retired:true,redirect:retiredHubRedirect(retiredAreas[url.pathname]||oldSection),item:''};
 if(oldSection&&!isActiveHubSection(oldSection)&&Object.values(HUB_AREAS).some(area=>area.path===url.pathname))return {retired:true,redirect:retiredHubRedirect(oldSection),item:''};
 const legacy=url.pathname==='/community/hub',areaKey=legacy?hubAreaFor(url.searchParams.get('section')||'event'):Object.keys(HUB_AREAS).find(key=>HUB_AREAS[key].path===url.pathname);
 if(!areaKey)return null;const area=HUB_AREAS[areaKey],candidate=url.searchParams.get('section'),section=area.sections.includes(candidate)?candidate:area.sections[0];
 return {area:areaKey,section,item:url.searchParams.get('item')||'',parent:area.parent};
}

// Only local app destinations can come from stored notifications/bookmarks.
// Unknown and retired destinations never fall through to arbitrary blank pages.
export function appDestination(target){
 let url;try{url=new URL(target,'https://hxz.invalid');}catch{return null;}
 if(url.origin!=='https://hxz.invalid'||!String(target).startsWith('/')||String(target).startsWith('//'))return null;
 const hub=resolveHubTarget(url.pathname+url.search);
 if(hub?.retired)return hub.redirect;
 if(hub)return hubDestination(hub.section,hub.item);
 const path=url.pathname;
 if(/^\/(?:community(?:\/(?:voice|forum(?:\/[^/]+)?|blueprints|inbox|notices|playtime))?|workshop(?:\/(?:install|addons|blueprints))?|account(?:\/backpack)?|settings|feedback|guild|linking|music|multiplayer|library|arcade(?:\/(?:ranking|shop|social\/werewolf|play\/[\w-]+|board\/(?:chess|gomoku|xiangqi)))?)\/?$/.test(path)||path==='/')return path+url.search;
 return null;
}
