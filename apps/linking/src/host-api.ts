let serial=0;
const waiting=new Map<string,{resolve:(value:any)=>void,reject:(error:Error)=>void,timer:ReturnType<typeof setTimeout>}>();
window.addEventListener('message',event=>{
  if(event.source!==parent||event.data?.channel!=='hxz-linking-v1')return;
  const task=waiting.get(event.data.id);if(!task)return;waiting.delete(event.data.id);clearTimeout(task.timer);
  if(event.data.error)task.reject(Error(event.data.error));else task.resolve(event.data.value);
});
function call(payload:Record<string,unknown>):Promise<any>{
  if(parent===window)return Promise.reject(Error('请从幻想镇启动器、安卓版社区或社区后台进入 LINKING。'));
  const id=Date.now().toString(36)+'-'+(++serial);
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{waiting.delete(id);reject(Error('社区暂未响应，请稍后重试。你的已保存进度不会丢失。'));},35000);
    waiting.set(id,{resolve,reject,timer});parent.postMessage({channel:'hxz-linking-v1',id,...payload},'*');
  });
}
export const api=(path:string,method='GET',body?:unknown)=>call({path,method,body});
export const hostPreferences=()=>call({kind:'preferences'});
let navigationGuard:(()=>Promise<boolean>)|undefined;
export function setNavigationGuard(guard:()=>Promise<boolean>){navigationGuard=guard;}
let navigating=false;
export async function navigate(params:Record<string,string>={}){
  if(navigating||navigationGuard&&!await navigationGuard())return;navigating=true;
  const url=new URL(location.href);url.search='';for(const [key,value]of Object.entries(params))url.searchParams.set(key,value);
  document.body.classList.add('activity-departing');
  if(document.documentElement.dataset.reduced!=='true'&&!matchMedia('(prefers-reduced-motion:reduce)').matches)await new Promise(resolve=>setTimeout(resolve,180));
  location.replace(url.href);
}
