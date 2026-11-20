import {useState} from 'react';
import {useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {FeedbackCenter} from '../Feedback';
import {useData} from '../data';
import {account,invoke,perform,saveSettings,state,ui} from '../model';

export function Support(){
  const s=useSnapshot(state),role=account(s),location=useLocation();
  const enabled=s.settings.autoReportErrors===true;
  const status=useData(()=>invoke('errors.status'),[enabled]);
  const [busy,setBusy]=useState(false);
  async function queue(action:string){
    setBusy(true);
    try{await invoke(action);await status.reload();}finally{setBusy(false);}
  }
  const pending=Number(status.data?.pending)||0;
  return <section className="launch-page"><header className="launch-title"><h1>帮助与反馈</h1></header>
    <section className="preference-section"><h2>我的工单</h2>
      {role?.authenticated&&role.uuid?<FeedbackCenter key={role.id+role.uuid+s.settings.communityUrl} core summary={location.state?.summary||''}/>:<div className="setting-line"><span>登录并选择角色，即可联系管理员或查看之前的回复。</span><button className="small-action" onClick={()=>ui.dialog='account'}>登录账号</button></div>}
    </section>
    <details className="preference-section"><summary>错误报告</summary>
      <label className="setting-line"><span>自动提交脱敏的错误报告</span><input type="checkbox" checked={enabled} onChange={e=>{const on=e.target.checked;void perform(()=>saveSettings({autoReportErrors:on}));}}/></label>
      <p role="status">{status.error||(!status.data?'正在读取队列…':pending?'等待发送 '+pending+' 份报告':'当前没有待发送的报告')}{status.data?.lastError?' · '+status.data.lastError:''}</p>
      <div className="desk-actions"><button className="small-action" disabled={busy||!enabled||!pending} onClick={()=>perform(()=>queue('errors.flush'))}>重试发送</button><button className="small-action" disabled={busy||!pending} onClick={()=>{ui.confirm={title:'清空待发送报告？',message:'本机的待发送报告将被清空。',action:()=>queue('errors.clear')};}}>清空队列</button><button className="small-action" onClick={status.reload}>刷新</button></div>
    </details></section>;
}
