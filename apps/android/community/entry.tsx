import './compat';
import type {} from '../../desktop/src/model';

declare global { interface Window { townHostPort:Promise<MessagePort> } }
let sequence=0;
const channel=window.townHostPort;
const pending=new Map<number,(value:any)=>void>();
void channel.then(port=>{
  port.onmessage=({data})=>{
    const result=JSON.parse(data);
    pending.get(result.id)?.(result);
    pending.delete(result.id);
  };
});
window.launcher={
  platform:'android',
  async invoke(action,input={}){
    if(action==='arcade.score'){
      const read=input.method==='GET'&&/^\/api\/arcade\/[a-z][a-z0-9-]{0,31}\?period=(week|all)$/.test(input.route);
      const write=input.method==='POST'&&/^\/api\/arcade\/[a-z][a-z0-9-]{0,31}\/(start|checkpoint|finish)$/.test(input.route);
      if(!read&&!write)return {ok:false,error:'小游戏成绩请求无效。'};
      try {
        const {request}=await import('../../desktop/src/data');
        return {ok:true,value:await request(input.route,input.method,input.body)};
      }catch(e){return {ok:false,error:e instanceof Error?e.message:'成绩暂时无法同步。'};}
    }
    if(action==='settings.save'){
      const {state}=await import('../../desktop/src/model');
      const allowed=['blueprintInstance','voiceMode','voiceKey','voiceSounds','chatHistoryDays'];
      const preferences=Object.fromEntries(Object.entries(input).filter(([key])=>allowed.includes(key)));
      const previous=JSON.parse(localStorage.getItem('town-community-options')||'{}');
      localStorage.setItem('town-community-options',JSON.stringify({...previous,...preferences}));
      return {ok:true,value:{...state.settings,...preferences}};
    }
    const id=++sequence;
    return new Promise(resolve=>{
      const documentAction=action==='asset.export'&&input.action==='finish'||['blueprints.download','android.world.save'].includes(action);
      const timer=setTimeout(()=>{
        pending.delete(id);
        resolve({ok:false,error:'连接未完成，请返回游戏首页再打开社区。'});
      },documentAction?900000:32000);
      pending.set(id,value=>{clearTimeout(timer);resolve(value);});
      void channel.then(port=>{if(pending.has(id))port.postMessage(JSON.stringify({id,action,input}));});
    });
  },
  subscribe:()=>()=>{},filePath:()=>''
};
void import('./TownApp').catch(()=>{
  const tip=document.getElementById('loading-community');
  if(tip)tip.textContent='社区页面加载失败。请更新 Android System WebView 后重新打开社区。';
});
