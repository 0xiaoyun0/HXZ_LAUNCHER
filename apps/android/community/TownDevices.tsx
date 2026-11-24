import {useCallback,useEffect,useRef,useState} from 'react';
import {useSnapshot} from 'valtio';
import {Check,Monitor,RefreshCw,Smartphone} from 'lucide-react';
import {community,connect} from '../../../packages/community/client';
import {request,useData} from '../../desktop/src/data';
import type {TownServer} from './TownLobby';

type Device={id:string;name:string;platform:string};
type Handoff={id:string;device:string;kind:string;status:string;payload:{title:string;note?:string}};
const base='/api/hub/';
function phoneID(){
  const key='town-handoff-device';
  let id=localStorage.getItem(key);
  if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}
  return id;
}

export function TownDevices({uid,servers}:{uid:string;servers:TownServer[]}){
  const social=useSnapshot(community),[phone]=useState(phoneID);
  const [target,setTarget]=useState(''),[note,setNote]=useState(''),[server,setServer]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const previous=useRef({key:'',id:''});
  useEffect(()=>{if(!community.connected&&!community.connecting)void connect().catch(()=>{});},[uid]);
  const load=useCallback(async()=>{
    if(community.user?.uid!==uid||!community.connected)return null;
    const [devices,tasks]=await Promise.all([request<{items:Device[]}>(base+'devices'),request<{items:Handoff[]}>(base+'handoffs')]);
    return {devices:devices.items,tasks:tasks.items};
  },[uid]);
  const {data,reload,loading,error:loadError}=useData(load,[load,social.connected,social.user?.uid],true);
  const selected=data?.devices.find(d=>d.id===target);
  async function act(action:()=>Promise<unknown>,success:string){
    if(busy)return;
    setBusy(true);setError('');setMessage('');
    try{await action();setMessage(success);await reload();}
    catch(e){setError(e instanceof Error?e.message:'操作未完成，可以重试。');}
    finally{setBusy(false);}
  }
  async function send(){
    if(!selected)return;
    const preset=selected.platform==='desktop'&&servers.find(s=>s.id===server);
    const payload=preset?{kind:'server-download',server:preset.id,title:'安装'+preset.name}:{kind:'note',title:note.trim(),note:note.trim()};
    if(!payload.title)return;
    const key=JSON.stringify([uid,target,payload]);
    if(key!==previous.current.key)previous.current={key,id:crypto.randomUUID()};
    await request(base+'handoffs','POST',{...payload,device:target,requestId:previous.current.id});
    previous.current={key:'',id:''};setNote('');setServer('');
  }
  const paired=data?.devices.some(d=>d.id===phone);
  return <section className="launch-page town-content town-profile"><header className="town-heading"><h1>多端接续</h1>
    <button className="icon-button" aria-label="刷新接续设备" disabled={busy||loading} onClick={()=>social.connected?void reload():void connect()}><RefreshCw size={18}/></button></header>
    {(error||loadError)&&<p className="town-feedback" role="alert">{error||loadError}</p>}{message&&<p role="status">{message}</p>}
    {!social.connected?<section className="desk-card"><p>{social.connecting?'正在连接社区…':social.error||'连上社区即可查看这个角色的设备。'}</p></section>:<>
      <section className="desk-card town-device-tools"><h2>我的设备</h2>
        {data?.devices.map(d=><div className="town-tool-line" key={d.id}>{d.platform==='desktop'?<Monitor size={18}/>:<Smartphone size={18}/>}
          <div><strong>{d.name}</strong><small>{d.id===phone?'这台手机':d.platform==='desktop'?'电脑':'安卓'}</small></div>
          {d.id!==phone&&<button className="small-action" aria-pressed={target===d.id} onClick={()=>{setTarget(d.id);setServer('');}}>{target===d.id?<><Check size={15}/>已选</>:'发送待办'}</button>}</div>)}
        {data&&!paired&&<button className="small-action" disabled={busy} onClick={()=>void act(()=>request(base+'devices','POST',{id:phone,name:'我的安卓手机',platform:'android'}),'已登记这台手机')}>登记这台手机</button>}
      </section>
      {selected&&<section className="desk-card town-device-tools town-handoff-compose"><h2>发给{selected.name}</h2>
        <label>待办内容<input maxLength={120} value={note} onChange={e=>{setNote(e.target.value);setServer('');}}/></label>
        {selected.platform==='desktop'&&<div className="desk-actions">{servers.filter(s=>s.enabled).map(s=><button key={s.id} className="small-action" aria-pressed={s.id===server} onClick={()=>setServer(s.id===server?'':s.id)}>{s.name}</button>)}</div>}
        <button className="launch-primary" disabled={busy||(!note.trim()&&!server)} onClick={()=>void act(send,'待办已发送')}>{server?'发送安装待办':'发送待办'}</button></section>}
      <section className="desk-card town-device-tools"><h2>最近待办</h2>{data?.tasks.map(t=><div className="town-tool-line" key={t.id}><Check size={17}/><div><strong>{t.payload.title}</strong>
        <small>{t.status==='done'?'已完成':t.status==='cancelled'?'已取消':'待处理'} · {data.devices.find(d=>d.id===t.device)?.name||'已移除的设备'}</small></div>
        {t.status==='pending'&&<button className="small-action" disabled={busy} onClick={()=>void act(()=>request(base+'handoffs/'+encodeURIComponent(t.id),'POST',t.device===phone?{status:'done',device:phone}:{status:'cancelled'}),t.device===phone?'已完成待办':'已取消待办')}>{t.device===phone?'完成':'取消'}</button>}</div>)}
        {data&&!data.tasks.length&&<p>还没有待办。</p>}</section>
    </>}</section>;
}
