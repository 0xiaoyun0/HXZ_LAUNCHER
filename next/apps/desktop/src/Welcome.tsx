import {useState} from 'react';
import {ArrowRight,Eye,EyeOff,Minus,Square,X,ArrowUpRight,LoaderCircle} from 'lucide-react';
import {invoke,reload,state,ui,errorMessage} from './model';
import {connect,disconnect} from '../../../packages/community/client';
import './welcome.css';

export function Welcome({ready,error}:{ready:boolean,error:string}) {
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState('');
 async function login(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setFailure('');try{await invoke('account.login',{username:username.trim(),password});setPassword('');await reload();ui.dialog='';disconnect();if(state.settings.selectedAccount)void connect();}catch(e){setFailure(errorMessage(e));}finally{setBusy(false);}}
 const open=(url:string)=>invoke('external.open',{url}).catch(e=>setFailure(errorMessage(e)));
 return <div className="welcome-screen" data-testid="welcome-screen">
  <div className="welcome-grid" aria-hidden="true"/><div className="welcome-orbit orbit-one" aria-hidden="true"/><div className="welcome-orbit orbit-two" aria-hidden="true"/>
  <header className="welcome-bar"><div className="welcome-brand"><img src="./media/brand/launcher.svg" alt=""/><strong>幻想镇 <small>FANTASY TOWN</small></strong></div><div className="welcome-controls">{[{action:'minimize',title:'最小化',Icon:Minus},{action:'maximize',title:'最大化',Icon:Square},{action:'close',title:'关闭',Icon:X}].map(({action,title,Icon})=><button key={action} aria-label={title} onClick={()=>invoke('window.control',{action})}><Icon size={18}/></button>)}</div></header>
  <main className="welcome-content"><section className="welcome-story"><span className="welcome-kicker">A PLACE TO RETURN TO</span><h1>新的旅程，<br/>从这里开始<span>。</span></h1><p>熟悉的世界，等待相遇的伙伴。<br/>用你的幻想镇身份，连接游戏与社区。</p><div className="welcome-coordinate" aria-hidden="true"><span>01 / CONNECTION</span><i/><span>欢迎回来</span></div></section>
   <section className="welcome-form-card" aria-labelledby="welcome-title"><span className="welcome-kicker">YOUR IDENTITY</span><h2 id="welcome-title">登录幻想镇</h2><p className="welcome-subtitle">使用幻想镇皮肤站账号</p>
    {!ready?<div className="welcome-loading" role="status"><LoaderCircle className="welcome-spinner"/>正在读取本地账号…</div>:error?<div className="welcome-error" role="alert"><p>{error}</p><button onClick={()=>reload().catch(()=>{})}>重新读取</button></div>:<form onSubmit={login}>
      <label>邮箱或用户名<input name="username" autoComplete="username" autoFocus required maxLength={254} value={username} onChange={e=>setUsername(e.target.value)} placeholder="你的皮肤站账号" disabled={busy}/></label>
      <label>密码<div className="welcome-password"><input name="password" autoComplete="current-password" type={visible?'text':'password'} required maxLength={1024} value={password} onChange={e=>setPassword(e.target.value)} placeholder="输入密码" disabled={busy}/><button type="button" aria-label={visible?'隐藏密码':'显示密码'} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      {failure&&<p className="welcome-error" role="alert">{failure}</p>}
      <button className="welcome-submit" disabled={busy} type="submit">{busy?<LoaderCircle className="welcome-spinner" size={19}/>:<ArrowRight size={19}/>}<span>{busy?'正在验证账号…':'登录并进入'}</span></button>
      <div className="welcome-links"><button type="button" onClick={()=>open('https://skin.hxzmc.top/auth/register')}>注册皮肤站账号<ArrowUpRight size={14}/></button><button type="button" onClick={()=>open('https://skin.hxzmc.top/auth/forgot')}>忘记密码</button></div>
    </form>}
    <p className="welcome-note">账号验证通过后即可进入。游戏、角色与社区使用同一个身份。</p>
   </section></main><footer className="welcome-footer"><span>幻想镇 · 游戏与社区</span><span>连接属于你的世界</span></footer>
 </div>;
}
