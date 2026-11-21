import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServices} from '../packages/engine/core/services.mjs';
import {legacyAppearance,legacyCardPackage} from '../engine/legacy-appearance.mjs';
import {activeDesign} from '../packages/engine/core/desktop-themes.mjs';
import {wallpaperSource} from '../packages/engine/core/desktop-wallpaper.mjs';
import {boardCards,updateBoard} from '../packages/engine/core/board-preferences.mjs';
import {normalizeCardLayouts} from '../packages/engine/core/card-layout.mjs';
import {mediaPath} from '../packages/engine/core/media.mjs';

async function fixture(t){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-material-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true,maxRetries:8,retryDelay:200}));
  const home=path.join(dir,'third');await fs.mkdir(home);
  const open=(dialog)=>createServices({dialog,data:home,resources:home,initialRoot:async()=>'',safeStorage:{isEncryptionAvailable:()=>false},emit(){},window:()=>null});
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
  assert.deepEqual(wallpaperSource(await service.invoke('settings.save',{})),source);
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

test('player wallpaper survives layout and material switches, reset, copy and restart',async t=>{
  const {dir,file,open}=await fixture(t),chosen=[];
  const dialog={showOpenDialog:async(_window,options)=>{
    const next=chosen.shift();
    if(next)assert.ok(options.filters[0].extensions.includes(path.extname(next).slice(1)));
    return {canceled:!next,filePaths:next?[next]:[]};
  }};
  let service=await open(dialog);
  const save=values=>service.invoke('settings.save',values);
  assert.equal((await save({})).wallpaperMode,'plain');
  const image=path.join(dir,'still.webp'),video=path.join(dir,'loop.mp4');
  await fs.writeFile(image,'fixture image');await fs.writeFile(video,'fixture video');
  chosen.push(image,video,null);
  const jpg=await service.invoke('background.choose',{kind:'image'}),mp4=await service.invoke('background.choose',{kind:'video'});
  await save({backgroundImage:jpg,wallpaperImageSource:'file',wallpaperMode:'image'});
  await save({backgroundVideo:mp4,wallpaperMode:'video',backgroundPositionX:25,backgroundFit:'contain'});
  const before=await fs.readFile(file);assert.equal(await service.invoke('background.choose',{kind:'image'}),null);
  assert.deepEqual(await fs.readFile(file),before);
  for(const command of [{op:'select',id:'paper'},{op:'copy',name:'晚间'},{op:'reset'},{op:'delete'}]){
    const stored=await save({themeChange:command,workspaceLayout:'journal'});
    assert.deepEqual(wallpaperSource(stored),{url:mp4,video:true});
    assert.equal(stored.backgroundPositionX,25);assert.equal(stored.backgroundFit,'contain');
  }
  await save({wallpaperMode:'plain',workspaceModules:{featured:false}});
  service=await open(dialog);
  assert.equal(wallpaperSource(await save({workspaceLayout:'library',workspaceModules:{quickLinks:true}})),null);
  const again=await save({wallpaperMode:'image'});
  assert.deepEqual(wallpaperSource(again),{url:jpg,video:false});assert.equal(again.backgroundVideo,mp4);
  assert.deepEqual(again.workspaceModules,{featured:false,quickLinks:true});
  const backup=await fs.readFile(file);
  for(const input of [{workspaceLayout:'old'},{workspaceModules:{miniPlayer:0}},{wallpaperMode:'remote'},{wallpaperImageSource:'unknown'},{backgroundVideo:jpg}]){
    await assert.rejects(save(input));assert.deepEqual(await fs.readFile(file),backup);
  }
  assert.deepEqual(wallpaperSource(await save({wallpaperMode:'video'})),{url:mp4,video:true});
  assert.equal(await fs.readFile(image,'utf8'),'fixture image');assert.equal(await fs.readFile(video,'utf8'),'fixture video');
});

test('upgrade freezes the old active artwork and retains fields in inactive schemes',async t=>{
  const {open,file}=await fixture(t);
  const previous={desktopThemes:{active:'observatory',entries:[{id:'paper',base:'paper',appearance:{backgroundFit:'contain',future:'keep'}}]},
    desktopBackdrop:'scene',workspaceModules:{futureModule:'keep'},cardLayouts:{'home.wide':{hidden:['monitor']}},unknown:'keep'};
  await fs.writeFile(file,JSON.stringify(previous));
  const service=await open(),save=input=>service.invoke('settings.save',input);
  const upgraded=await save({themeChange:{op:'select',id:'paper'},workspaceLayout:'journal',workspaceModules:{shortcuts:false}});
  assert.deepEqual(wallpaperSource(upgraded),{url:'./media/adventure.webp',video:false});
  assert.equal(upgraded.liteStartup,false);
  const enabled=await save({liteStartup:true});
  assert.equal(enabled.workspaceLayout,'journal');
  assert.deepEqual(enabled.cardLayouts,upgraded.cardLayouts);
  await assert.rejects(save({liteStartup:'yes'}),/启动偏好无效/);
  assert.equal((await (await open()).invoke('settings.save',{})).liteStartup,true);
  assert.equal((await save({liteStartup:false})).unknown,'keep');
  assert.equal(upgraded.workspaceModules.futureModule,'keep');assert.equal(upgraded.unknown,'keep');
  assert.deepEqual(upgraded.cardLayouts['home.wide'].hidden,['monitor']);
  const reset=await save({themeChange:{op:'reset'}});
  assert.equal(reset.desktopThemes.entries.find(p=>p.id==='paper').appearance.future,'keep');
  assert.deepEqual(wallpaperSource(await (await open()).invoke('settings.save',{})),wallpaperSource(upgraded));
  const trimmed=await save({workspaceShelf:['classic','library']});
  assert.equal(trimmed.workspaceLayout,'classic');await assert.rejects(save({workspaceLayout:'journal'}),/先在/);
  await assert.rejects(save({workspaceShelf:[]}),/至少/);
  await save({workspaceShelf:['classic','library','journal']});
  assert.equal((await save({workspaceLayout:'journal'})).workspaceLayout,'journal');
});
test('a direct drop keeps its column and reflowed legacy cards only adopt a height deliberately set on the new board',()=>{
  const specs=[{id:'join',w:6},{id:'network',w:6,fit:true},{id:'guide',w:6}];
  const key='multiplayer.wide',old={items:[{i:'join',x:6,y:35,w:6,h:16},{i:'guide',x:6,y:51,w:6,h:14},{i:'network',x:0,y:69,w:6,h:20}],hidden:[],locked:[],fixed:['network']};
  const store=value=>normalizeCardLayouts({[key]:value})[key];
  const read=(layout,id)=>boardCards(specs,layout).find(r=>r.id===id);
  assert.equal(read(old,'network').fixed,false);
  const moved=store(updateBoard(specs,old,{id:'network',op:'place',x:3,to:'guide',after:false}));
  assert.deepEqual(boardCards(specs,moved).map(c=>c.id),['join','network','guide']);assert.equal(read(moved,'network').column,3);
  assert.equal(read(moved,'guide').column,6);assert.deepEqual(moved.fixed,['network']);assert.equal(read(moved,'network').fixed,false);
  const wider=store(updateBoard(specs,moved,{id:'network',op:'size',w:8}));assert.equal(read(wider,'network').fixed,false);
  const sized=store(updateBoard(specs,wider,{id:'network',op:'size',h:18}));assert.equal(read(sized,'network').fixed,true);assert.equal(read(sized,'network').h,18);
  const auto=store(updateBoard(specs,sized,{id:'network',op:'height',value:0}));assert.equal(read(auto,'network').fixed,false);
  assert.deepEqual(old.items.at(-1),{i:'network',x:0,y:69,w:6,h:20});
});
