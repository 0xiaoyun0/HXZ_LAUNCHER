import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServices} from '../packages/engine/core/services.mjs';
import {legacyAppearance,legacyCardPackage} from '../engine/legacy-appearance.mjs';
import {activeDesign,wallpaperSource} from '../packages/engine/core/desktop-themes.mjs';
import {boardCards,updateBoard} from '../packages/engine/core/board-preferences.mjs';
import {mediaPath} from '../packages/engine/core/media.mjs';

async function fixture(t){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-material-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true,maxRetries:8,retryDelay:200}));
  const home=path.join(dir,'third');await fs.mkdir(home);
  const open=()=>createServices({data:home,resources:home,initialRoot:async()=>'',safeStorage:{isEncryptionAvailable:()=>false},emit(){},window:()=>null});
  return {dir,home,open,file:path.join(home,'settings.json')};
}
test('named designs retain independent looks through restart, failed edits, reset and deletion',async t=>{
  const {file,open}=await fixture(t);
  const future={id:'new-design',base:'future',version:14};
  await fs.writeFile(file,JSON.stringify({unknownField:{keep:1},desktopThemes:{active:'town',newOption:true,entries:[future]},cardStyle:{opacity:.61,radius:19,gap:18,futureField:1},defaultMemoryMB:4096}));
  let service=await open();const change=(op,fields)=>service.invoke('settings.save',{themeChange:{op,...fields}});
  const first=await change('copy',{name:'夜间游玩'}),id=first.desktopThemes.active;
  assert.ok(id.startsWith('custom-'));assert.equal(first.cardStyle.opacity,.61);
  await service.invoke('settings.save',{accentColor:'#113377',cardStyle:{...first.cardStyle,opacity:.54}});
  const stars=await change('select',{id:'observatory'});assert.equal(activeDesign(stars).id,'observatory');assert.equal(stars.theme,'dark');
  const paper=await change('select',{id:'paper'});assert.equal(paper.cardStyle.opacity,1);
  const before=await fs.readFile(file,'utf8');
  await assert.rejects(change('copy',{name:'夜间游玩'}),/同名/);await assert.rejects(change('select',{id:'missing'}),/不存在/);
  assert.equal(await fs.readFile(file,'utf8'),before);
  const disk=JSON.parse(before);disk.desktopThemes.entries.find(entry=>entry.id===id).appearance.defaultMemoryMB=16128;await fs.writeFile(file,JSON.stringify(disk));
  service=await open();const copy=await change('select',{id});
  assert.equal(copy.accentColor,'#113377');assert.equal(copy.cardStyle.opacity,.54);assert.equal(copy.cardStyle.gap,18);
  assert.equal(copy.cardStyle.futureField,1);assert.deepEqual(copy.unknownField,{keep:1});assert.equal(copy.defaultMemoryMB,4096);
  assert.ok(copy.desktopThemes.newOption);assert.deepEqual(copy.desktopThemes.entries.find(t=>t.id===future.id),future);
  assert.equal((await change('reset')).cardStyle.radius,20);const original=await change('delete');assert.equal(original.cardStyle.radius,19);
  assert.ok(!original.desktopThemes.entries.some(entry=>entry.id===id));
});
test('old wallpaper preview, retry, missing files and cancellation leave the old installation intact',async t=>{
  const {dir,home,open}=await fixture(t),service=await open(),old=path.join(dir,'幻想镇启动器');
  const media=path.join(old,'media'),id='12345678-1234-4321-9876-123456789012.mp4';
  await fs.mkdir(media,{recursive:true});const bytes=Buffer.from('local fixture media bytes');await fs.writeFile(path.join(media,id),bytes);
  const document=JSON.stringify({theme:'dark',cardStyle:{opacity:.6,radius:20},backgroundVideo:'hxz-media://local/'+id,accentColor:'#5668bc',privateField:'fixture-only',backgroundOpacity:.75});
  const config=path.join(old,'settings.json');await fs.writeFile(config,document);
  assert.deepEqual(await legacyAppearance(dir,home,service),{available:true,kind:'动态壁纸',missing:false,radius:20,opacity:60});
  await assert.rejects(fs.access(path.join(home,'media')));
  await legacyAppearance(dir,home,service,true);await legacyAppearance(dir,home,service,true);
  const snapshot=await service.invoke('settings.save',{}),source=wallpaperSource(snapshot);
  assert.equal(snapshot.desktopThemes.active,'legacy-092');assert.equal(source.video,true);
  assert.deepEqual(await fs.readFile(mediaPath(home,source.url)),bytes);assert.equal((await fs.readdir(path.join(home,'media'))).length,1);
  assert.ok(!Object.hasOwn(snapshot,'privateField'));assert.equal(await fs.readFile(config,'utf8'),document);
  await fs.rm(path.join(media,id));assert.equal((await legacyAppearance(dir,home,service,true)).missing,true);
  assert.equal(wallpaperSource(await service.invoke('settings.save',{})),null);
  assert.equal(wallpaperSource({backgroundVideo:'https://unrelated.example/video.mp4'}),null);
});
test('legacy layout preview and merged import preserve outside boards, widget notes and unknown settings',async t=>{
  const {dir,home,open}=await fixture(t),service=await open(),old=path.join(dir,'幻想镇启动器');
  await fs.mkdir(old);const file=path.join(old,'settings.json'),document=JSON.stringify({cardLayouts:{'home.wide':{items:[{i:'roles',w:6,x:0,y:0,h:10}],hidden:['monitor']}},widgets:[{id:'note-092',type:'note',page:'home',title:'备忘',text:'旧版笔记'}],outside:1});await fs.writeFile(file,document);
  await service.invoke('settings.save',{cardLayouts:{'music.wide':{hidden:['library']}}});
  const before=await fs.readFile(path.join(home,'settings.json'),'utf8');const fileLayout=await legacyCardPackage(dir);
  assert.equal(fileLayout.counts.pages,1);assert.equal(fileLayout.counts.notes,1);assert.equal(await fs.readFile(path.join(home,'settings.json'),'utf8'),before);
  await assert.rejects(service.invoke('cards.apply',{package:fileLayout,mode:'merge',confirmed:false}),/确认/);
  for(let i=0;i<2;i++)await service.invoke('cards.apply',{package:fileLayout,mode:'merge',confirmed:true});
  const settings=await service.invoke('settings.save',{});assert.deepEqual(settings.cardLayouts['home.wide'].hidden,['monitor']);assert.deepEqual(settings.cardLayouts['music.wide'].hidden,['library']);assert.equal(settings.widgets.length,1);assert.equal(settings.widgets[0].text,'旧版笔记');assert.equal(await fs.readFile(file,'utf8'),document);
});
test('board edits preserve unmounted cards and legacy order, and enforce locked neighbors',()=>{
  const specs=[{id:'library',w:8},{id:'roles',w:4},{id:'monitor',w:4}];
  const saved={items:[{i:'roles',x:0,y:0,w:4,h:8},{i:'library',x:4,y:0,w:8,h:15},{i:'future',x:2,y:7,w:4,h:12}],hidden:['future'],locked:[],fixed:['future']};
  assert.deepEqual(boardCards(specs,saved).map(r=>r.id),['roles','library','monitor']);
  let v=updateBoard(specs,saved,{id:'library',op:'move',to:'roles'});
  assert.equal(boardCards(specs,v)[0].id,'library');
  for(const [op,value] of [['width',12],['height',16],['visible',false],['lock',true]])v=updateBoard(specs,v,{id:'roles',op,value});
  assert.equal(v.items.find(i=>i.i==='roles').w,12);assert.ok(v.fixed.includes('roles'));assert.ok(v.hidden.includes('roles'));
  assert.ok(v.items.some(i=>i.i==='future'));assert.ok(v.hidden.includes('future')&&v.fixed.includes('future'));
  assert.throws(()=>updateBoard(specs,v,{id:'monitor',op:'move',to:'library'}),/解锁/);
  assert.throws(()=>updateBoard(specs,v,{id:'roles',op:'visible',value:true}),/解锁/);
  assert.deepEqual(saved.hidden,['future']);
});
