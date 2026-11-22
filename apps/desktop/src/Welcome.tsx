import {useRef,useState,type FormEvent} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {ArrowLeft,ArrowRight,ArrowUpRight,Eye,EyeOff,KeyRound,UserRound} from 'lucide-react';
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
  const submitting=useRef(false);
  async function login(event:FormEvent){
    event.preventDefault();
    if(submitting.current||!username.trim()||!password)return;
    submitting.current=true;onBusyChange?.(true);setBusy(true);setFailure(null);
    try{
      await invoke('account.login',{username:username.trim(),password});
      setPassword('');await reload();ui.toast='';onSignedIn?.();
    }catch(cause){setFailure(playerError(cause,'account.login'));}
    finally{submitting.current=false;onBusyChange?.(false);setBusy(false);}
  }
  async function openSkin(path:'register'|'forgot'){
    try{await invoke('external.open',{url:'https://skin.hxzmc.top/auth/'+path});}
    catch(cause){setFailure(playerError(cause,'external.open'));}
  }
  return <div className="welcome-screen" data-testid="welcome-screen">
    <header className="welcome-bar" data-tauri-drag-region>
      <span className="welcome-brand" data-tauri-drag-region><img src="./media/brand/launcher.svg" alt=""/>幻想镇</span>
      <WindowButtons/>
    </header>
    <div className="welcome-scroll"><div className="welcome-spread">
      <div className="welcome-picture"><img src="./media/hero.webp" alt="" fetchPriority="high"/><span aria-hidden="true">{firstVisit?'欢迎来到幻想镇':'欢迎回来'}</span></div>
      <section className="welcome-form-card" aria-labelledby="welcome-heading">
        <header><h1 id="welcome-heading">登录幻想镇</h1><p>使用你的皮肤站账号</p></header>
        {!ready?<p role="status">正在读取本地账号…</p>:error?<div role="alert"><p>{error}</p><button className="entry-secondary" onClick={()=>void reload().catch(()=>{})}>重新读取</button></div>:
        <form onSubmit={login} aria-busy={busy}>
          <label className="entry-field"><span>邮箱或用户名</span><span className="entry-input"><UserRound size={17} aria-hidden/><input name="username" autoComplete="username" maxLength={254} required value={username} onChange={e=>setUsername(e.target.value)} disabled={busy}/></span></label>
          <div className="entry-field"><div className="entry-label-line"><label htmlFor="town-login-password">密码</label><button type="button" className="entry-link" onClick={()=>void openSkin('forgot')}>忘记密码</button></div>
            <div className="entry-input"><KeyRound size={17} aria-hidden/><input id="town-login-password" name="password" autoComplete="current-password" type={visible?'text':'password'} maxLength={1024} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/>
              <button type="button" className="entry-eye" aria-label={visible?'隐藏密码':'显示密码'} aria-pressed={visible} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
          {failure&&<IssueHelp issue={failure}/>}
          <button type="submit" className="entry-submit" disabled={busy||!username.trim()||!password}>
            <span>{busy?'正在登录…':'登录幻想镇'}</span>{busy?<LatticeGlyph/>:<ArrowRight size={17} aria-hidden/>}
          </button>
          <button className="entry-register entry-link" type="button" onClick={()=>void openSkin('register')}>注册皮肤站账号<ArrowUpRight size={14} aria-hidden/></button>
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
    <Dialog.Portal><Dialog.Content ref={content} className="entry-dialog" aria-describedby={undefined}
      onOpenAutoFocus={e=>{origin.current=document.activeElement as HTMLElement;e.preventDefault();content.current?.querySelector<HTMLInputElement>('input[name=username]')?.focus({preventScroll:true});}}
      onCloseAutoFocus={e=>{if(origin.current?.isConnected){e.preventDefault();origin.current.focus({preventScroll:true});}}}>
      <Dialog.Title className="visually-hidden">登录幻想镇</Dialog.Title>
      <Welcome ready error="" firstVisit={first.current} onBusyChange={value=>{busy.current=value;}} onBrowse={leave} onSignedIn={leave}/>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
