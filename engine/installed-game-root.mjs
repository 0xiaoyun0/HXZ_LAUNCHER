import fs from 'node:fs/promises';
import path from 'node:path';
import {historicalCalendar,readCalendar} from '../packages/engine/core/game-playtime.mjs';
import {lastGameFromHistory} from './profile-import.mjs';

async function readProfileFile(dir,name,limit){
  try{
    const file=path.join(dir,name),info=await fs.lstat(file);
    if(info.isFile()&&info.size<=limit)return JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));
  }catch{/* Earlier installs may lack an optional file or be mid-write. */}
  return null;
}

function runtimePreferences(old){
  const values={},validHeap=v=>Number.isInteger(v)&&v>=512&&v<=131072;
  for(const key of ['fecEnabled','communityRelayEnabled'])if(typeof old[key]==='boolean')values[key]=old[key];
  if(old.memoryMode==='auto'||(old.memoryMode==='manual'&&validHeap(old.defaultMemoryMB)))values.memoryMode=old.memoryMode;
  if(validHeap(old.defaultMemoryMB))values.defaultMemoryMB=old.defaultMemoryMB;
  const instances={};
  for(const [id,config] of Object.entries(old.instanceSettings||{})){
    if(!id||id.length>255||/[\\/:]/.test(id)||['.','..','constructor','__proto__','prototype'].includes(id)||!config)continue;
    if(config.memoryMode==='manual'&&validHeap(config.memoryMB))instances[id]={memoryMode:'manual',memoryMB:config.memoryMB};
    else if(['inherit','auto'].includes(config.memoryMode))instances[id]={memoryMode:config.memoryMode};
  }
  if(Object.keys(instances).length)values.instanceSettings=instances;
  return values;
}

export async function installedLibrary(appData){
  if(!appData)return null;
  const dir=path.join(appData,'幻想镇启动器');
  const settings=await readProfileFile(dir,'settings.json',8*1024*1024),root=settings?.gameRoot;
  if(typeof root!=='string'||!path.isAbsolute(root))return null;
  try{if(!(await fs.stat(path.join(root,'versions'))).isDirectory())return null;}catch{return null;}
  const history=await readProfileFile(dir,'launch-history.json',1024*1024);
  const selected=typeof settings.selectedInstance==='string'?settings.selectedInstance:'';
  let calendar;
  try{calendar=await readCalendar(path.join(dir,'game-playtime.json'));}catch{/* A damaged calendar must not hide the game library. */}
  const playtime=historicalCalendar(calendar,Array.isArray(history)?history:[]);
  const preferences=runtimePreferences(settings);
  return {root:path.resolve(root),selected,...(Object.keys(preferences).length?{preferences}:{}),lastPlayed:lastGameFromHistory(root,history),...(Object.keys(playtime.days).length?{playtime}:{})};
}

export function installedServerCache(appData){
  return appData?readProfileFile(path.join(appData,'幻想镇启动器'),'server-presets-cache.json',1024*1024):null;
}
