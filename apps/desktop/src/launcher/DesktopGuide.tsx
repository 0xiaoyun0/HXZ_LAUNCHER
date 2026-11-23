import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Compass} from 'lucide-react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {account,perform,saveSettings,state,ui} from '../model';
import {isLitePage} from './pages';

export function GuideLink({lite=false}:{lite?:boolean}){
  return <Link className="small-action" to={(lite?'/lite':'/')+'?guide=start'}><Compass size={16}/>新手引导</Link>;
}

export function DesktopGuide(){
  const s=useSnapshot(state),u=useSnapshot(ui),location=useLocation(),go=useNavigate();
  const lite=isLitePage(location.pathname),home=lite?'/lite':'/';
  const inspected=useRef(false),heading=useRef<HTMLHeadingElement>(null),[saving,setSaving]=useState(false);
  const steps=[
    {path:home,title:'选择游戏实例',body:lite?'点「版本选择」切换实例，选好后就可以启动。':'在「游戏实例」中选择版本，点旁边的启动按钮进入游戏。'},
    {path:lite?'/lite/download':'/workshop/install',title:'安装游戏',body:'选择 Minecraft 版本和加载器，确认后开始下载。'},
    {path:lite?'/lite/settings':'/settings',title:'调整启动设置',body:'在这里选择游戏目录、Java 和内存。实例也可以单独设置。'}
  ];
  const index=steps.findIndex(step=>step.path===location.pathname);
  const requested=location.pathname===home&&new URLSearchParams(location.search).get('guide')==='start';
  useLayoutEffect(()=>{
    if(!s.ready||s.error)return;
    if(requested){inspected.current=true;ui.onboarding=true;go(home,{replace:true});return;}
    if(inspected.current)return;
    inspected.current=true;
    if(index!==0||location.search||s.settings.onboardingDone||ui.dialog)return;
    if(account(s)?.authenticated){if(!s.settings.lastPlayed)ui.onboarding=true;}
    else ui.dialog='welcome';
  },[s.ready,s.error,requested,home,go,index,location.search,s]);
  useEffect(()=>{
    if(!u.onboarding)return;
    if(index<0){
      ui.onboarding=false;
      if(!state.settings.onboardingDone)void perform(()=>saveSettings({onboardingDone:true}));
    }else heading.current?.focus({preventScroll:true});
  },[index,u.onboarding]);
  if(!u.onboarding||index<0||!s.ready||s.error)return null;
  async function finish(){
    setSaving(true);
    try{await saveSettings({onboardingDone:true});ui.onboarding=false;}
    finally{setSaving(false);}
  }
  return <aside className="desktop-guide" aria-label="新手引导" data-step={index+1}>
    <div className="guide-symbol" aria-hidden="true"><Compass size={21}/></div>
    <div className="guide-instruction">
      <div className="guide-progress"><span>新手引导</span><span aria-label={'第 '+(index+1)+' 步，共 3 步'}>{index+1} / 3</span><i className="guide-meter" aria-hidden><b/></i></div>
      <h2 key={index} ref={heading} tabIndex={-1}>{steps[index].title}</h2><p>{steps[index].body}</p>
    </div>
    <div className="guide-actions">
      <button className="text-action" disabled={saving} onClick={()=>void perform(finish)}>跳过引导</button>
      {index>0&&<button className="small-action" aria-label="上一步" onClick={()=>go(steps[index-1].path)}><ArrowLeft size={15}/></button>}
      {index+1===steps.length?<button className="launch-primary" disabled={saving} onClick={()=>void perform(finish)}>完成引导<Check size={15}/></button>:
        <button className="launch-primary" onClick={()=>go(steps[index+1].path)}>下一步<ArrowRight size={15}/></button>}
    </div>
  </aside>;
}
