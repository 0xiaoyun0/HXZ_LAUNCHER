import {useState} from 'react';
import {IssueHelp} from '../IssueHelp';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';
import {invoke,perform} from '../model';
export function SkinConnection(){
  const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[issue,setIssue]=useState<any>(null);
  async function check(){
    setBusy(true);setStatus('');setIssue(null);
    try{const result=await invoke('skin.status');setStatus((result.authenticated?'当前角色验证成功':'皮肤站可访问')+' · '+result.latency+' ms');}
    catch(e){setIssue(playerError(e,'skin.status'));}finally{setBusy(false);}
  }
  return <section className="preference-section"><h2>皮肤站连接</h2><div className="setting-line"><span><strong>幻想镇皮肤站</strong><small role="status">{busy?'正在连接…':status||'检测本机到账号服务的连接'}</small></span><button className="small-action" disabled={busy} onClick={check}>{status||issue?'重新检测':'检测连接'}</button><button className="small-action" onClick={()=>void perform(()=>invoke('skin.open'))}>打开皮肤站</button></div>{issue&&<div className="setting-line"><IssueHelp issue={issue}/></div>}</section>;
}
