import {useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {ArrowLeft,ArrowRight,ArrowUpRight,Check,ExternalLink,Eye,EyeOff,KeyRound,UserRound} from 'lucide-react';
import {invoke,reload,ui} from './model';
import {useSnapshot} from 'valtio';
import {IssueHelp} from './IssueHelp';
import {playerError} from '../../../packages/engine/core/player-errors.mjs';
import {WindowButtons} from './launcher/WindowButtons';
import {LatticeGlyph} from './launcher/micro/Feedback';
import './welcome.css';

type WelcomeProps={
  ready:boolean;error:string;onBrowse:()=>void;onSignedIn?:()=>void;
  firstVisit?:boolean;onBusyChange?:(busy:boolean)=>void;
};

export function Welcome({ready,error,onBrowse,onSignedIn,firstVisit=true,onBusyChange}:WelcomeProps){
  const [username,setUsername]=useState(''),[password,setPassword]=useState('');
  const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState<ReturnType<typeof playerError>|null>(null);
  const submitting=useRef(false),launchingSite=useRef(false),loginField=useRef<HTMLInputElement>(null),restoreField=useRef(false);
  const [mode,setMode]=useState<'login'|'register'>('login'),[opened,setOpened]=useState(false),[opening,setOpening]=useState(false);
  const [attempt,setAttempt]=useState(0);
  function changeMode(next:'login'|'register',focus=false){
    if(submitting.current||launchingSite.current||next===mode)return;
    restoreField.current=focus;setMode(next);setVisible(false);setFailure(null);
  }
  useLayoutEffect(()=>{if(mode==='login'&&restoreField.current){restoreField.current=false;loginField.current?.focus({preventScroll:true});}},[mode]);
  async function login(event:FormEvent){
    event.preventDefault();
    if(submitting.current||!username.trim()||!password)return;
    submitting.current=true;onBusyChange?.(true);setBusy(true);setFailure(null);
    try{
      await invoke('account.login',{username:username.trim(),password});
      setPassword('');await reload();ui.toast='';onSignedIn?.();
    }catch(cause){setAttempt(n=>n+1);setFailure(playerError(cause,'account.login'));}
    finally{submitting.current=false;onBusyChange?.(false);setBusy(false);}
  }
  async function openSkin(path:'register'|'forgot'){
    if(launchingSite.current)return;
    launchingSite.current=true;setOpening(true);setFailure(null);
    try{await invoke('external.open',{url:'https://skin.hxzmc.top/auth/'+path});if(path==='register')setOpened(true);}
    catch(cause){setAttempt(n=>n+1);setFailure(playerError(cause,'external.open'));}
    finally{launchingSite.current=false;setOpening(false);}
  }
  return <div className="welcome-screen" data-entry-mode={mode} data-testid="welcome-screen">
    <header className="welcome-bar" data-tauri-drag-region>
      <span className="welcome-brand" data-tauri-drag-region><img src="./media/brand/launcher.svg" alt=""/>幻想镇</span>
      <WindowButtons/>
    </header>
    <div className="welcome-scroll"><div className="welcome-spread">
      <div className="welcome-picture"><img className="entry-landscape" src="./media/hero.webp" alt="" fetchPriority="high"/><img className="entry-landscape alternate" src="./media/adventure.webp" alt=""/>
        <div className="entry-caption" key={mode}><span>{mode==='register'?'初次见面':firstVisit?'欢迎来到幻想镇':'欢迎回来'}</span></div></div>
      <section className="welcome-form-card" aria-labelledby="welcome-heading">
        <div className="entry-mode" role="group" aria-label="账号入口"><i aria-hidden/><button type="button" aria-pressed={mode==='login'} disabled={busy||opening} onClick={()=>changeMode('login')}>登录</button><button type="button" aria-pressed={mode==='register'} disabled={busy||opening} onClick={()=>changeMode('register')}>注册</button></div>
        <header className="entry-heading" key={mode}><h1 id="welcome-heading">{mode==='login'?'登录幻想镇':'创建皮肤站账号'}</h1><p>{mode==='login'?'使用你的皮肤站账号':'在官方皮肤站完成注册，再用同一账号进入幻想镇。'}</p></header>
        {!ready?<p role="status">正在读取本地账号…</p>:error?<div role="alert"><p>{error}</p><button className="entry-secondary" onClick={()=>void reload().catch(()=>{})}>重新读取</button></div>:
        mode==='register'?<div className="entry-enroll">
          <ol className="entry-steps"><li className="current"><span><ExternalLink size={16} aria-hidden/></span><div><strong>打开官方皮肤站</strong><small>skin.hxzmc.top</small></div></li>
            <li><span><UserRound size={16} aria-hidden/></span><div><strong>返回启动器登录</strong><small>使用刚注册的邮箱或用户名</small></div></li></ol>
          {failure&&<div className="entry-error" key={attempt}><IssueHelp issue={failure}/></div>}
          <button className="entry-submit" type="button" disabled={opening} onClick={()=>void openSkin('register')}>{opening?'正在打开…':opened?'再次打开注册页':'前往皮肤站注册'}<ArrowUpRight size={17} aria-hidden/></button>
          {opened&&<p className="entry-handoff" role="status"><Check size={15} aria-hidden/>已请求浏览器打开注册页</p>}
          <button className="entry-link" type="button" onClick={()=>changeMode('login',true)}>已有账号，返回登录<ArrowRight size={15} aria-hidden/></button>
        </div>:<form onSubmit={login} aria-busy={busy}>
          <label className="entry-field"><span>邮箱或用户名</span><span className="entry-input"><UserRound size={17} aria-hidden/><input ref={loginField} name="username" autoComplete="username" maxLength={254} required value={username} onChange={e=>setUsername(e.target.value)} disabled={busy}/></span></label>
          <div className="entry-field"><div className="entry-label-line"><label htmlFor="town-login-password">密码</label><button type="button" className="entry-link" onClick={()=>void openSkin('forgot')}>忘记密码</button></div>
            <div className="entry-input"><KeyRound size={17} aria-hidden/><input id="town-login-password" name="password" autoComplete="current-password" type={visible?'text':'password'} maxLength={1024} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/>
              <button type="button" className="entry-eye" aria-label={visible?'隐藏密码':'显示密码'} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
          {failure&&<div className="entry-error" key={attempt}><IssueHelp issue={failure}/></div>}
          <button type="submit" className="entry-submit" disabled={busy||!username.trim()||!password}>
            <span>{busy?'正在登录…':'登录幻想镇'}</span>{busy?<LatticeGlyph/>:<ArrowRight size={17} aria-hidden/>}
          </button>
        </form>}
        <footer><button type="button" className="entry-link entry-return" onClick={onBrowse} disabled={busy}>{firstVisit?'先以游客身份浏览':'返回上一页'}{firstVisit?<ArrowRight size={15}/>:<ArrowLeft size={15}/>}</button></footer>
      </section>
    </div></div>
  </div>;
}

export function AccountEntryDialog(){
  const u=useSnapshot(ui),open=u.dialog==='account'||u.dialog==='welcome';
  const busy=useRef(false),origin=useRef<HTMLElement|null>(null),content=useRef<HTMLDivElement>(null);
  const first=useRef(false);if(open)first.current=u.dialog==='welcome';
  function leave(){
    if(ui.dialog==='welcome')ui.onboarding=true;
    ui.dialog='';
  }
  return <Dialog.Root open={open} onOpenChange={next=>{if(!next&&!busy.current)leave();}}>
    <Dialog.Portal><Dialog.Content ref={content} className="entry-dialog" aria-labelledby="welcome-heading" aria-describedby={undefined}
      onOpenAutoFocus={e=>{origin.current=document.activeElement as HTMLElement;e.preventDefault();content.current?.querySelector<HTMLInputElement>('input[name=username]')?.focus({preventScroll:true});}}
      onCloseAutoFocus={e=>{if(origin.current?.isConnected){e.preventDefault();origin.current.focus({preventScroll:true});}}}>
      <Dialog.Title className="visually-hidden">登录幻想镇</Dialog.Title>
      <Welcome ready error="" firstVisit={first.current} onBusyChange={value=>{busy.current=value;}} onBrowse={leave} onSignedIn={leave}/>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
