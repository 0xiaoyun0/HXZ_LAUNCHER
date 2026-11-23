import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {noLinks,writeJSON} from './io.mjs';

const dayMs=86400000, offset=28800000;
const date=ms=>new Date(ms+offset).toISOString().slice(0,10);
function split(start,end,add){
  while(start<end){
    const boundary=(Math.floor((start+offset)/dayMs)+1)*dayMs-offset;
    const until=Math.min(end,boundary);
    add(date(start),until-start,start);start=until;
  }
}
function daysOf(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>60000)throw Error('游玩日历格式无效');
  const result={};
  for(const [key,ms] of Object.entries(value)){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(key)||!Number.isFinite(ms)||ms<0||ms>dayMs)throw Error('游玩时长记录无效');
    if(ms)result[key]=ms;
  }
  return result;
}
export async function readCalendar(file){
  await noLinks(file);
  let stat;try{stat=await fs.stat(file);}catch(error){if(error.code==='ENOENT')return null;throw error;}
  if(!stat.isFile()||stat.size>4*1024*1024)throw Error('游玩日历文件过大');
  const raw=await fs.readFile(file,'utf8');
  if(stat.size>65536&&!raw.trimStart().startsWith('{'))throw Error('游玩日历文件过大');
  const value=JSON.parse(raw.replace(/^\uFEFF/,''));
  if(![1,2].includes(value?.version))throw Error('游玩日历版本不支持');
  if(value.version===1&&stat.size>65536)throw Error('游玩日历文件过大');
  return {...value,days:daysOf(value.days),olderDays:daysOf(value.olderDays||{})};
}
// Missing calendar days can be reconstructed from completed launches. Overlapping processes count once.
export function historicalCalendar(calendar,history=[]){
  const days={...calendar?.olderDays,...calendar?.days},fromHistory={};
  const entries=history.filter(r=>['normal','stopped','crash'].includes(r?.status)&&Number.isFinite(r.started)&&r.started>0&&Number.isFinite(r.ended)&&r.ended>r.started&&r.ended<=Date.now()+dayMs&&r.ended-r.started<=366*dayMs).sort((a,b)=>a.started-b.started);
  let through=0;
  for(const entry of entries){
    split(Math.max(through,entry.started),entry.ended,(day,ms)=>fromHistory[day]=(fromHistory[day]||0)+ms);
    through=Math.max(through,entry.ended);
  }
  for(const [day,ms] of Object.entries(fromHistory))days[day]=Math.max(days[day]||0,ms);
  return {days,through:Math.max(through,Number(calendar?.through)||0)};
}
export function gamePlaytime(home,{wall=Date.now,mono=()=>performance.now(),schedule=setInterval,cancel=clearInterval,onError=()=>{}}={}){
  const file=path.join(home,'game-playtime.json'),sessions=new Set();
  let queue=Promise.resolve(),data,through=0,previousWall=0,previousMono=0,timer;
  const enqueue=fn=>{const task=queue.then(fn,fn);queue=task.catch(()=>{});return task;};
  async function load(){
    if(data)return;
    const saved=await readCalendar(file);
    data={...saved,version:2,days:{...saved?.olderDays,...saved?.days},olderDays:{},imported:{...saved?.imported},firstLocal:{...saved?.firstLocal},updated:saved?.updated||0};
    through=saved?.through||0;
  }
  async function save(now){
    const days={},olderDays={},first=date(Math.max(now,through)-364*dayMs);
    for(const [key,ms] of Object.entries(data.days))(key<first?olderDays:days)[key]=ms;
    await noLinks(file);await writeJSON(file,{...data,days,olderDays,through});
  }
  async function checkpoint(now,clock){
    await load();
    const elapsed=Math.max(0,Math.min(60000,clock-previousMono,now-previousWall));
    previousWall=now;previousMono=clock;
    const start=Math.max(now-elapsed,through);
    if(start>=now)return;
    split(start,now,(key,ms,from)=>{data.firstLocal[key]??=from;data.days[key]=Math.min(dayMs,(data.days[key]||0)+ms);});
    through=now;data.updated=now;await save(now);
  }
  const pulse=()=>{const now=wall(),clock=mono();return enqueue(()=>sessions.size?checkpoint(now,clock):undefined);};
  return {
    start(key){const now=wall(),clock=mono();return enqueue(async()=>{
      await load();if(sessions.has(key))return;
      if(!sessions.size){previousWall=now;previousMono=clock;timer=schedule(()=>void pulse().catch(onError),5000);timer?.unref?.();}
      sessions.add(key);
    });},
    stop(key){const now=wall(),clock=mono();return enqueue(async()=>{
      if(!sessions.has(key))return;
      try{await checkpoint(now,clock);}finally{sessions.delete(key);if(!sessions.size){cancel(timer);timer=null;}}
    });},
    pulse,
    snapshot(){const now=wall(),clock=mono();return enqueue(async()=>{
      await load();if(sessions.size)await checkpoint(now,clock);
      const cutoff=date(now-364*dayMs),last=date(now);
      const all=Object.entries(data.days).sort(([a],[b])=>a.localeCompare(b));
      const days=all.filter(([date,ms])=>date>=cutoff&&date<=last&&ms>=1000).map(([date,ms])=>({date,seconds:Math.floor(ms/1000)}));
      return {timezone:'Asia/Shanghai',days,totalSeconds:Math.floor(all.reduce((sum,[,ms])=>sum+ms,0)/1000),activeDays:days.length,updated:data.updated,running:sessions.size>0};
    });},
    importHistory(source){return enqueue(async()=>{
      await load();
      for(const [key,ms] of Object.entries(daysOf(source.days))){
        const baseline=data.imported[key]||0,current=data.days[key]||0;
        if(ms<=baseline)continue;
        const disjoint=source.through>0&&data.firstLocal[key]>=source.through;
        data.days[key]=Math.min(dayMs,disjoint?current+ms-baseline:Math.max(current,ms));data.imported[key]=ms;
      }
      data.updated=Math.max(data.updated,source.through||0);await save(wall());
    });},
    dispose(){const now=wall(),clock=mono();cancel(timer);timer=null;return enqueue(async()=>{
      try{if(sessions.size)await checkpoint(now,clock);}finally{sessions.clear();cancel(timer);timer=null;}
    });}
  };
}
