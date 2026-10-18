import test from 'node:test';
import assert from 'node:assert/strict';
import {readLayoutPackage,exportLayoutPackage,applyLayoutPackage} from '../core/layout-package.mjs';
import {normalizeWidgets} from '../core/card-extras.mjs';
import {normalizeWorkflow,runWorkflow} from '../core/card-workflow.mjs';

const settings={accounts:[{password:'never export'}],gameRoot:'X:/private/games',widgets:[{id:'note',page:'home',type:'note',title:'便签',text:'private note'},{id:'flow',page:'home',type:'workflow',steps:['pause-music','page-home']}],cardLayouts:{'home.wide':{items:[{i:'note',w:5,h:10,x:3,y:7}],hidden:['clock'],locked:['note'],fixed:['note']}},cardPlacements:{'music.player':{source:'music',target:'home',card:'player',title:'播放器',w:6}},cardStyle:{opacity:.6,gap:18,radius:12,color:'#edf1fb'},columns:{sidebar:{opacity:.7,visible:true,label:'我的导航'}}};

test('layout files keep geometry and transfers but export neither credentials nor note text by default',()=>{
 const value=exportLayoutPackage(settings),source=JSON.stringify(value,null,2),roundtrip=readLayoutPackage(source);
 assert.ok(!source.includes('private'));assert.ok(!source.includes('password'));assert.ok(!source.includes('gameRoot'));
 assert.equal(roundtrip.layout.cardLayouts['home.wide'].items[0].x,3);assert.deepEqual(roundtrip.layout.cardLayouts['home.wide'].locked,['note']);
 assert.equal(roundtrip.counts.moved,1);assert.equal(roundtrip.counts.notes,0);assert.deepEqual(roundtrip.layout.widgets[1].steps,['pause-music','page-home']);
 assert.equal(exportLayoutPackage(settings,{includeNotes:true}).counts.notes,1);
});

test('imports normalize untrusted fields, reject unknown formats and keep unrelated preferences',()=>{
 const value=exportLayoutPackage(settings);value.layout.accounts=[{password:'bad'}];value.layout.gameRoot='C:/bad';value.layout.widgets.push({id:'script',type:'javascript',page:'home',code:'evil()'});value.layout.cardStyle.opacity=0;
 const patch=applyLayoutPackage(settings,value);assert.equal(patch.accounts,undefined);assert.equal(patch.gameRoot,undefined);assert.equal(patch.widgets.length,2);assert.equal(patch.cardStyle.opacity,.2);assert.equal(patch.columns.sidebar.label,'我的导航');
 assert.throws(()=>readLayoutPackage('{}'),/不.*支持/);assert.throws(()=>readLayoutPackage('{'),/JSON/);assert.throws(()=>readLayoutPackage(' '.repeat(1024*1024+1)),/1 MB/);
 assert.equal(settings.cardStyle.opacity,.6);
});

test('merge replaces same IDs, retains other boards, and rejects overflowing widget sets',()=>{
 const value=exportLayoutPackage({widgets:[{id:'fresh',type:'clock',page:'home'}],cardLayouts:{'chat.wide':{items:[]}}},{appearance:false});
 const patch=applyLayoutPackage(settings,value,'merge');assert.equal(patch.widgets.length,3);assert.equal(Object.keys(patch.cardLayouts).length,2);assert.equal(patch.cardStyle,undefined);
 const full={widgets:Array.from({length:36},(_,i)=>({id:'w'+i,type:'clock',page:'home'}))};assert.throws(()=>applyLayoutPackage(full,value,'merge'),/36/);
 assert.equal(applyLayoutPackage(settings,value,'replace').widgets.length,1);
});

test('declarative workflows allow only built-in actions and put a single navigation last',()=>{
 assert.deepEqual(normalizeWorkflow(['page-chat','eval','pause-music','pause-music','page-home','instance-folder']),['pause-music','instance-folder','page-home']);
 const widget=normalizeWidgets([{id:'a',page:'home',type:'workflow',steps:['exec:/bin/sh','pause-music'],command:'never'}])[0];assert.equal(widget.command,undefined);assert.deepEqual(widget.steps,['pause-music']);
});

test('workflow execution is ordered; a failed or cancelled step never starts the next action',async()=>{
 const seen=[],progress=[];await runWorkflow(['pause-music','instance-folder'],async id=>seen.push(id),{progress:e=>progress.push(e.status)});assert.deepEqual(seen,['pause-music','instance-folder']);assert.deepEqual(progress,['running','done','running','done']);
 const failure=[];await assert.rejects(runWorkflow(['pause-music','instance-folder'],async id=>{failure.push(id);throw Error('not ready');}),/not ready/);assert.deepEqual(failure,['pause-music']);
 const controller=new AbortController(),cancelled=[];await assert.rejects(runWorkflow(['pause-music','instance-folder'],async id=>{cancelled.push(id);controller.abort();},{signal:controller.signal}));assert.deepEqual(cancelled,['pause-music']);
});
