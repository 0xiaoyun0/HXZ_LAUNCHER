import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {readCalendar,historicalCalendar} from '../packages/engine/core/game-playtime.mjs';
const fields=['gameWindowAction','autoCheckUpdates','promptJavaDownload','memoryOptimization','selectedInstance','gameRoot','javaPath','theme','fontSize','accentColor','memoryMode','defaultMemoryMB','downloadConcurrency','downloadSpeedMBps','downloadMode','voiceMode','voiceKey','voiceSounds','showCover','animationSpeed','gameSleep','keepLauncherAvailable','communityUrl','confirmUnsaved','cardStyle','cardLayouts','hiddenLinks','pinnedLinks'];
export async function importPreferences(home,choose,services){
  const choice=await choose({title:'选择旧启动器的 settings.json',properties:['openFile'],filters:[{name:'启动器设置',extensions:['json']}]});
  if(choice.canceled)return {cancelled:true};
  const file=choice.filePaths[0],info=await fs.stat(file);
  if(!info.isFile()||info.size>8*1024*1024)throw Error('配置文件超过 8 MiB 或格式无效');
  const bytes=await fs.readFile(file),old=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
  if(!old||typeof old!=='object'||Array.isArray(old)||!fields.some(k=>Object.hasOwn(old,k)))throw Error('这个文件没有可识别的启动器设置');
  const patch=Object.fromEntries(fields.filter(k=>old[k]!=null).map(k=>[k,old[k]]));
  if(patch.gameRoot==='')delete patch.gameRoot;
  let previousGame=null,records=[];
  const sibling=path.dirname(file),history=path.join(sibling,'launch-history.json');
  try{const info=await fs.lstat(history);if(info.isFile()&&info.size<=1024*1024){const rows=JSON.parse(await fs.readFile(history,'utf8'));if(Array.isArray(rows))records=rows;}}catch{/* Partial older launch history is optional. */}
  const calendar=await readCalendar(path.join(sibling,'game-playtime.json'));
  const playtime=historicalCalendar(calendar,records);
  // 0.9.2 kept the last real start in the history beside settings.json.
  if(typeof old.gameRoot==='string'&&path.isAbsolute(old.gameRoot)){
    const latest=records.filter(r=>typeof r?.instance==='string'&&r.instance.length>0&&r.instance.length<=255&&typeof r.root==='string'&&path.resolve(r.root).toLowerCase()===path.resolve(old.gameRoot).toLowerCase()&&['normal','stopped','crash'].includes(r.status)&&Number.isFinite(r.started)&&r.started>0).sort((a,b)=>b.started-a.started)[0];
    if(latest)previousGame={id:latest.instance,root:path.resolve(old.gameRoot),startedAt:latest.started};
  }
  const dir=path.join(home,'imports');await fs.mkdir(dir,{recursive:true});
  const key=randomUUID();const previous=await services.invoke('state',{localOnly:true});
  await fs.writeFile(path.join(dir,key+'-before.json'),JSON.stringify(previous.settings,null,2),{flag:'wx',mode:0o600});
  await fs.writeFile(path.join(dir,key+'-source.json'),bytes,{flag:'wx',mode:0o600});
  await services.importPreferences(patch,old,previousGame,playtime);
  return {count:Object.keys(patch).length,backup:dir};
}
