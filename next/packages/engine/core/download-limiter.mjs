// One byte budget for every file and range in this process; no per-file multipliers.
export function createDownloadLimiter(){
 let rate=0,credit=0,updated=performance.now(),timer=null;
 const queue=[];
 function settle(item,error){item.signal?.removeEventListener('abort',item.abort);error?item.reject(error):item.resolve();}
 function pump(){
  clearTimeout(timer);timer=null;const now=performance.now();
  credit=rate?Math.min(rate*.1,credit+(now-updated)*rate/1000):Infinity;updated=now;
  while(queue.length){const item=queue[0];if(item.signal?.aborted){queue.shift();settle(item,item.signal.reason);continue;}
   const take=Math.min(item.remaining,credit);item.remaining-=take;credit-=take;
   if(item.remaining<1){queue.shift();settle(item);}else break;
  }
  if(queue.length)timer=setTimeout(pump,25);
 }
 return {
  configure(mbps){rate=Math.max(0,Number(mbps)||0)*1048576;credit=rate*.1;updated=performance.now();pump();},
  wait(bytes,signal){signal?.throwIfAborted();if(!rate||bytes<=0)return Promise.resolve();return new Promise((resolve,reject)=>{
   const item={remaining:bytes,signal,resolve,reject};item.abort=()=>{const index=queue.indexOf(item);if(index>=0){queue.splice(index,1);settle(item,signal.reason);pump();}};
   queue.push(item);signal?.addEventListener('abort',item.abort,{once:true});pump();
  });},
  get limited(){return rate>0;}
 };
}
