import './compat';
import type {} from '../../desktop/src/model';

declare global { interface Window { townHostPort:Promise<MessagePort> } }
let sequence=0;
const channel=window.townHostPort;
window.addEventListener('town-back',event=>{
  const dialogs=document.querySelectorAll<HTMLElement>('[role=dialog][data-state=open]');
  const close=dialogs[dialogs.length-1]?.querySelector<HTMLButtonElement>('button[aria-label="关闭"]');
  if(close){event.preventDefault();close.click();}
});
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
        const {state}=await import('../../desktop/src/model');
        const uid=state.settings.selectedAccount;
        for(const refresh of [false,true]){
          const result=await window.launcher.invoke('community.connect',{refresh});
          if(!result.ok)throw Error(result.error||'暂时无法连接社区。');
          const session=result.value;
          if(!uid||uid!==state.settings.selectedAccount||session.user.uid!==uid)throw Error('角色已切换，请重新开始本局。');
          const response=await fetch(new URL(input.route,session.base),{
            method:input.method,headers:{Authorization:'Bearer '+session.token,'Content-Type':'application/json'},
            body:write?JSON.stringify(input.body):undefined,redirect:'error',signal:AbortSignal.timeout(30000)
          });
          if(response.status===401&&!refresh)continue;
          const data=await response.json();
          if(!response.ok)throw Error(data.error||'成绩暂未同步，请稍后重试。');
          return {ok:true,value:data};
        }
        throw Error('社区登录已过期，请重新登录。');
      }catch(e){return {ok:false,error:e instanceof Error?e.message:'成绩暂时无法同步。'};}
    }
    if(action==='settings.save'){
      const {state}=await import('../../desktop/src/model');
      const allowed=['blueprintInstance','voiceMode','voiceKey','voiceSounds','chatHistoryDays'];
      const preferences=Object.fromEntries(Object.entries(input).filter(([key])=>allowed.includes(key)));
      if(input.animationSpeed===0||input.animationSpeed===1)preferences.animationSpeed=input.animationSpeed;
      if(typeof input.townTheme==='string'){
        const {changeDesktopTheme,DESKTOP_THEMES}=await import('../../../packages/engine/core/desktop-themes.mjs');
        if(!DESKTOP_THEMES.some(theme=>theme.id===input.townTheme))return {ok:false,error:'该外观方案不存在。'};
        Object.assign(preferences,changeDesktopTheme(state.settings,{op:'select',id:input.townTheme}));
      }
      const previous=JSON.parse(localStorage.getItem('town-community-options')||'{}');
      localStorage.setItem('town-community-options',JSON.stringify({...previous,...preferences}));
      return {ok:true,value:{...state.settings,...preferences}};
    }
    const id=++sequence;
    return new Promise(resolve=>{
      const documentAction=action==='asset.export'&&input.action==='finish'||['blueprints.download','android.world.save'].includes(action);
      const timer=setTimeout(()=>{
        pending.delete(id);
        resolve({ok:false,error:'操作超时，请在社区重试。'});
      },documentAction||action==='android.account'?900000:32000);
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
