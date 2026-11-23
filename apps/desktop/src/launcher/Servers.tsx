import {Link,useSearchParams} from 'react-router-dom';
import {ServerOnline} from '../ServerOnline';
import {DetailDialog} from '../ui';
import {ServerMonitor} from '../Monitor';
import {invoke,reload} from '../model';
import {useState} from 'react';

export function Servers(){
  const [query]=useSearchParams(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
  async function refresh(){
    setBusy(true);setMessage('');setFailed(false);
    try{await invoke('server.refresh');await reload();setMessage('已刷新服务器配置');}
    catch(error){setFailed(true);setMessage(error instanceof Error?error.message:'无法刷新服务器配置，请检查社区地址后重试。');}
    finally{setBusy(false);}
  }
  return <section className="launch-page"><header className="launch-title"><h1>默认服务器</h1>
    <button className="small-action" disabled={busy} onClick={refresh}>{busy?'正在读取…':'刷新服务器配置'}</button></header>
    {message&&<p role={failed?'alert':'status'} className={failed?'inline-error':'muted'}>{message}{failed&&<> <Link to="/settings?section=network">检查服务地址</Link></>}</p>}
    <ServerOnline preferred={query.get('id')||''}/>
    <div className="desk-actions"><Link className="small-action" to="/community/worlds?section=whitelist">入服申请与进度</Link><Link className="small-action" to="/multiplayer">联机大厅</Link></div>
    <DetailDialog title="服务监控与本机延迟" wide><ServerMonitor/></DetailDialog>
  </section>;
}
