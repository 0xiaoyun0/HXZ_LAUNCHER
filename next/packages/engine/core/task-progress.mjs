// Preserve measured phase data; there is no trustworthy whole-install byte total.
export function newTaskProgress() {
  return {busy:false,phase:'暂无任务',completed:0,total:0,unit:'项',detail:'',failure:'',failed:false,cancelled:false,activeFiles:[],steps:[],received:0,traffic:0,speed:0,updated:0,changed:0,started:0,ended:0,sampled:0,sampleBytes:0};
}
export function updateTaskProgress(task,event,now=Date.now()) {
  const terminal=event.busy===false;
  if(event.busy&&!task.busy){Object.assign(task,newTaskProgress(),{started:now});}
  const phase=event.phase||task.phase;
  if(!terminal && (phase!==task.phase||!task.steps.length)) {
    const previous=task.steps.at(-1);
    if(previous){previous.status='done';previous.ended=now;}
    Object.assign(task,{phase,completed:0,total:0,unit:'项',received:0,speed:0,detail:'',activeFiles:[],changed:now,sampled:now,sampleBytes:0});
    task.steps.push({phase,time:now,ended:0,status:'running',completed:0,total:0,unit:'项',received:0});
    if(task.steps.length>120)task.steps.shift();
  }
  const bytes=Number.isFinite(event.received)?Math.max(0,event.received):undefined;
  if(bytes!==undefined){
    task.traffic+=bytes>=task.received?bytes-task.received:bytes;
    if(bytes!==task.received)task.changed=now;
    if(bytes<task.received){task.sampled=now;task.sampleBytes=bytes;task.speed=0;}
    else if(now-task.sampled>=250){task.speed=Math.max(0,bytes-task.sampleBytes)*1000/(now-task.sampled);task.sampled=now;task.sampleBytes=bytes;}
    task.received=bytes;
  }
  if(event.completed!=null&&event.completed!==task.completed)task.changed=now;
  for(const key of ['busy','phase','completed','total','unit','detail','failure','failed','cancelled','activeFiles'])if(event[key]!==undefined)task[key]=event[key];
  task.updated=now;
  const step=task.steps.at(-1);
  if(step){
    Object.assign(step,{completed:task.completed,total:task.total,unit:task.unit,received:task.received,detail:task.detail});
    if(terminal){step.ended=now;step.status=event.cancelled?'cancelled':event.failed||event.failure||event.error?'failed':'done';}
  }
  if(terminal){task.failed=!!(event.failed||event.failure||event.error)&&!event.cancelled;task.ended=now;task.speed=0;task.activeFiles=[];}
}
export const progressPercent=task=>task.total>0?Math.min(100,Math.max(0,Math.floor(task.completed/task.total*10000)/100)):null;
