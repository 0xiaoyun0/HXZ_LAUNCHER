import {reactive} from 'vue';
const pending=new Map(), listeners=new Map();
let serial=0;
export const state=reactive({server:'https://qqbot.hxzmc.top',user:{},profiles:[],selectedProfile:null,hasAccount:false,connected:false,connection:'未登录',users:[],messages:[],room:'',muted:false,deafened:false,ptt:false,id:'',version:'0.5.0'});
export function on(name,handler){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(handler);return()=>listeners.get(name)?.delete(handler);}
window.HXZEvent=(name,data)=>{
  if(name==='result'){const task=pending.get(data.id);if(!task)return;pending.delete(data.id);clearTimeout(task.timer);data.error?task.reject(new Error(data.error)):task.resolve(data.data);return;}
  if(name==='state')Object.assign(state,data);
  if(name==='message'&&!state.messages.some(m=>m.id===data.id)){state.messages.push(data);if(state.messages.length>300)state.messages.shift();}
  for(const handler of listeners.get(name)||[])handler(data);
};
export function native(op,input={}){
  if(!window.HXZNative)return Promise.reject(new Error('请在安卓应用中使用此功能'));
  const id=String(++serial);
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('操作超时，请检查连接后重试'));},['pick','download'].includes(op)?600000:120000);
    pending.set(id,{resolve,reject,timer});
    try{window.HXZNative.call(JSON.stringify({id,op,input}));}catch(e){pending.delete(id);clearTimeout(timer);reject(e);}
  });
}
export const api=(path,method='GET',body)=>native('api',{path,method,body});
export const avatar=(uid,version)=>uid&&version?`/community/api/avatars/${encodeURIComponent(uid)}?v=${encodeURIComponent(version)}`:'';
export const groups=[{id:'survival',name:'原版生存群组',short:'原版生存'},{id:'mod-1',name:'模组一服',short:'模组一服'},{id:'mod-2',name:'模组二服',short:'模组二服'}];
export const rooms=[{id:'lobby',name:'旅人休息室'},...groups];
export const date=value=>new Date(value).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
