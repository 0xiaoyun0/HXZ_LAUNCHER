// Stable destinations: notifications using /community/hub remain valid.
export const HUB_AREAS=Object.freeze({
 people:{title:'好友与小队',path:'/community/people',parent:'chat',sections:['social']},
 events:{title:'活动与赛事',path:'/community/events',parent:'notice',sections:['event']},
 council:{title:'社区议事',path:'/community/council',parent:'notice',sections:['proposal','ledger']},
 creation:{title:'作品与共建',path:'/workshop/creation',parent:'community',sections:['work','project']},
 knowledge:{title:'知识与建造',path:'/workshop/knowledge',parent:'community',sections:['article','recipe','landmark']},
 worlds:{title:'世界与入服',path:'/library/worlds',parent:'discover',sections:['world','servers','whitelist']},
 games:{title:'棋局与互动作品',path:'/arcade/workshop',parent:'discover',sections:['challenges','story']},
 media:{title:'一起看视频',path:'/music/watch',parent:'discover',sections:['program']},
 personal:{title:'玩家空间',path:'/account/community',parent:'me',sections:['space','journal','saved','devices']},
 trades:{title:'玩家交易',path:'/arcade/shop/trades',parent:'discover',sections:['trades']},
 support:{title:'申诉与协商',path:'/settings/appeals',parent:'me',sections:['appeal']},
 admin:{title:'管理工作台',path:'/manage',parent:'me',sections:['workbench'],admin:true},
});
export function hubAreaFor(section){return Object.keys(HUB_AREAS).find(key=>HUB_AREAS[key].sections.includes(section))||'events';}
export function hubDestination(section,item=''){
 if(section==='desk')return '/community/hub';
 const area=HUB_AREAS[hubAreaFor(section)],params=new URLSearchParams();
 if(area.sections.includes(section)&&section!==area.sections[0])params.set('section',section);
 if(item)params.set('item',item);
 const query=params.toString();return area.path+(query?'?'+query:'');
}
export function resolveHubTarget(target){
 let url;try{url=new URL(target,'https://hxz.invalid');}catch{return null;}
 if(url.origin!=='https://hxz.invalid')return null;
 if(url.pathname==='/community/hub'&&(!url.searchParams.get('section')||url.searchParams.get('section')==='desk'))return {area:'all',section:'desk',item:url.searchParams.get('item')||'',parent:'discover'};
 const legacy=url.pathname==='/community/hub',areaKey=legacy?hubAreaFor(url.searchParams.get('section')||'event'):Object.keys(HUB_AREAS).find(key=>HUB_AREAS[key].path===url.pathname);
 if(!areaKey)return null;const area=HUB_AREAS[areaKey],candidate=url.searchParams.get('section'),section=area.sections.includes(candidate)?candidate:area.sections[0];
 return {area:areaKey,section,item:url.searchParams.get('item')||'',parent:area.parent};
}
