import test from 'node:test';import assert from 'node:assert/strict';
import {hubDestination,resolveHubTarget,appDestination,HUB_AREAS} from './navigation.mjs';
import {RETIRED_HUB_SECTIONS,isActiveHubKind,isActiveHubSection} from '../../server/shared/hub-visibility.mjs';
import {normalizeCardPlacements} from '../engine/core/card-extras.mjs';
test('retired records and old workbench links cannot resurrect an item',()=>{
 for(const section of RETIRED_HUB_SECTIONS){const target=resolveHubTarget('/community/hub?section='+section+'&item=old');assert.equal(target.retired,true,section);assert.equal(target.item,'');assert(!appDestination('/community/hub?section='+section+'&item=old').includes('old'));}
 assert.equal(resolveHubTarget('/community/hub').retired,true);
 assert.equal(resolveHubTarget('/account/community?section=devices&item=old').retired,true);
});
test('active areas and old notifications preserve exact active item identity',()=>{
 for(const area of Object.values(HUB_AREAS))for(const section of area.sections){assert(isActiveHubSection(section));assert.deepEqual(resolveHubTarget('/community/hub?section='+section+'&item=keep'),resolveHubTarget(hubDestination(section,'keep')));}
 assert.equal(resolveHubTarget('/community/events?section=workbench').section,'event');
});
test('app targets reject external schemes and unknown pages while retaining gameplay, music and Linking',()=>{
 for(const target of ['//outside.invalid/','https://outside.invalid/community','javascript:alert(1)','/does-not-exist'])assert.equal(appDestination(target),null);
 for(const target of ['/linking','/guild?task=abc','/music','/multiplayer','/arcade/board/chess?match=a','/community/forum/post?reply=1','/community/blueprints?item=b','/feedback'])assert.equal(appDestination(target),target);
 assert.equal(appDestination('/arcade/workshop'),'/arcade');
});
test('retained record renderer policy is a whitelist',()=>{assert.equal(isActiveHubKind('work'),false);assert.equal(isActiveHubKind('future-kind'),false);assert.equal(isActiveHubKind('appeal'),true);});
test('imported legacy placements discard deleted cards without losing active card sizes',()=>{
 const valid={source:'home',target:'music',card:'roles',title:'我的角色',w:4,minW:3};
 const result=normalizeCardPlacements({good:valid,old:{...valid,card:'quicklinks'},retired:{...valid,source:'community-hub',card:'content'},active:{source:'chat',target:'home',card:'panel-0',title:'文字大厅',w:9}});
 assert.deepEqual(result['home.roles'],valid);assert(result['chat.panel-0']);assert.equal(Object.keys(result).length,2);
});
