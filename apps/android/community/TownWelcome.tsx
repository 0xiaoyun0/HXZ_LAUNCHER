import {useEffect,useState} from 'react';
import {ArrowRight,ScrollText,ShieldCheck} from 'lucide-react';
import {invoke} from '../../desktop/src/model';
import {Modal} from '../../desktop/src/ui';
import {useTownSheetGesture} from './TownInteractions';
export function TownWelcome({children}:{children:React.ReactNode}){
 useTownSheetGesture();
 const [accepted,setAccepted]=useState<boolean|null>(null),[document,setDocument]=useState(''),[body,setBody]=useState(''),[error,setError]=useState('');
 async function readState(){try{setError('');setAccepted(await invoke<boolean>('android.legal'));}catch{setError('无法读取本机设置，请重试。');}}
 useEffect(()=>{void readState();},[]);
 async function show(key:string){setDocument(key);setBody('正在读取…');try{setBody(await invoke<string>('android.legal.read',{document:key}));}catch{setBody('暂时无法读取，请关闭后重试。');}}
 if(accepted)return <>{children}</>;
 return <main className="launcher-frame town-shell town-welcome"><section className="launch-page town-content">
 <header className="town-welcome-hero"><h1>欢迎来到幻想镇</h1></header><div className="desk-card">
 {error?<><p role="alert">{error}</p><button className="small-action" onClick={()=>void readState()}>重试</button></>:accepted===null?<p role="status">正在打开社区…</p>:<><h2>使用协议与隐私政策</h2><p>你可以先逛逛社区。聊天和进服时，再用幻想镇皮肤站角色登录。</p><div className="town-legal-links"><button className="small-action" onClick={()=>void show('eula')}><ScrollText size={17}/>阅读使用协议</button><button className="small-action" onClick={()=>void show('privacy')}><ShieldCheck size={17}/>阅读隐私政策</button></div>
 <div className="desk-actions"><button className="launch-primary" onClick={async()=>{try{await invoke('android.legal.accept');setAccepted(true);}catch{setError('无法保存选择，请重试。');}}}>同意并进入社区<ArrowRight size={17}/></button><button className="text-action" onClick={()=>void invoke('android.close')}>退出</button></div></>}</div></section>
 <Modal open={!!document} title={document==='privacy'?'隐私政策':'使用协议'} onClose={()=>setDocument('')}><article className="town-copy">{body}</article></Modal></main>;
}
