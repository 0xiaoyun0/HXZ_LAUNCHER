import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {noLinks,writeJSON} from './io.mjs';

const DAY=86400000,OFFSET=28800000;
const date=ms=>new Date(ms+OFFSET).toISOString().slice(0,10);
// Personal device history only. Never used as a server activity or points source.
export function gamePlaytime(home,{wall=Date.now,mono=()=>performance.now(),schedule=setInterval,cancel=clearInterval,onError=()=>{}}={}){
 const file=path.join(home,'game-playtime.json');let queue=Promise.resolve(),loaded=false,rows={},through=0,updated=0,previousWall=0,previousMono=0,timer=null;
 const sessions=new Set();
 const enqueue=fn=>{const job=queue.catch(()=>{}).then(fn);queue=job.catch(()=>{});return job;};
 async function load(){if(loaded)return;await noLinks(file);try{const info=await fs.stat(file);if(info.size>65536)throw Error('游玩日历文件过大');const value=JSON.parse(await fs.readFile(file,'utf8'));if(value.version!==1||!value.days||typeof value.days!=='object'||Array.isArray(value.days)||Object.keys(value.days).length>365)throw Error('游玩日历格式无效');rows=value.days;through=Number(value.through)||0;updated=Number(value.updated)||0;}catch(e){if(e.code!=='ENOENT')throw e;}loaded=true;}
 function prune(now){now=Math.max(now,through);const first=date(now-364*DAY),last=date(now);rows=Object.fromEntries(Object.entries(rows).filter(([key,ms])=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&key>=first&&key<=last&&Number.isFinite(ms)&&ms>0).map(([key,ms])=>[key,Math.min(DAY,Math.floor(ms))]));}
 async function checkpoint(now,clock){await load();const elapsed=Math.max(0,Math.min(60000,clock-previousMono,now-previousWall));previousWall=now;previousMono=clock;let start=Math.max(now-elapsed,through);prune(now);if(now>start){while(start<now){const end=Math.min(now,(Math.floor((start+OFFSET)/DAY)+1)*DAY-OFFSET),key=date(start);rows[key]=Math.min(DAY,(rows[key]||0)+end-start);start=end;}through=Math.max(through,now);updated=now;}await noLinks(file);await writeJSON(file,{version:1,days:rows,through,updated});}
 const pulse=()=>{const now=wall(),clock=mono();return enqueue(()=>sessions.size?checkpoint(now,clock):undefined);};
 return {
  start(key){const now=wall(),clock=mono();return enqueue(async()=>{await load();if(sessions.has(key))return;if(!sessions.size){previousWall=now;previousMono=clock;timer=schedule(()=>{void pulse().catch(onError);},30000);timer?.unref?.();}sessions.add(key);});},
  stop(key){const now=wall(),clock=mono();return enqueue(async()=>{if(!sessions.has(key))return;try{await checkpoint(now,clock);}finally{sessions.delete(key);if(!sessions.size){cancel(timer);timer=null;}}});},
  pulse,
  snapshot(){return enqueue(async()=>{await load();prune(wall());const days=Object.entries(rows).sort(([a],[b])=>a.localeCompare(b)).map(([date,ms])=>({date,seconds:Math.floor(ms/1000)})).filter(row=>row.seconds>0);return {timezone:'Asia/Shanghai',days,totalSeconds:days.reduce((n,row)=>n+row.seconds,0),activeDays:days.length,updated};});},
  dispose(){cancel(timer);timer=null; // Deliberately no unobserved tail on shutdown/restart.
   sessions.clear();
  }
 };
}
