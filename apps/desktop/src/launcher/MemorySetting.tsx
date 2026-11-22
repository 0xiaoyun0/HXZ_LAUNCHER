import {Save} from 'lucide-react';
import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {playerError} from '../../../../packages/engine/core/player-errors.mjs';
import {ChoiceGroup} from './ChoiceControls';
import {state,saveSettings} from '../model';
import {StatusMark} from './micro/Feedback';
import {ScrubNumber} from './micro/ScrubNumber';

export function MemorySetting(){
  const {settings}=useSnapshot(state);
  const [mode,setMode]=useState(settings.memoryMode),[amount,setAmount]=useState(String(settings.defaultMemoryMB));
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
  useEffect(()=>{setMode(settings.memoryMode);setAmount(String(settings.defaultMemoryMB));},[settings.memoryMode,settings.defaultMemoryMB]);
  async function save(){
    const mb=Number(amount);
    if(mode==='manual'&&(!Number.isInteger(mb)||mb<512||mb>131072)){setError(true);setMessage('请输入 512 到 131072 之间的整数。');return;}
    setBusy(true);setMessage('');
    try{await saveSettings(mode==='manual'?{memoryMode:'manual',defaultMemoryMB:mb}:{memoryMode:'auto'});setError(false);setMessage('已保存，下次启动游戏时生效。');}
    catch(e){const issue=playerError(e,'settings.save');setError(true);setMessage(issue.title+'。'+issue.message);}finally{setBusy(false);}
  }
  return <form noValidate className="memory-setting" onSubmit={e=>{e.preventDefault();void save();}}>
    <div><strong>默认游戏内存</strong><small>跟随全局的实例使用此值。「启动前检查」可查看实际内存上限。</small></div>
    <div className="memory-controls"><ChoiceGroup label="内存分配方式" value={mode} disabled={busy} options={[['auto','自动分配'],['manual','手动设置']]} onChange={value=>{setMode(value);setMessage('');}}/>
    {mode==='manual'&&<ScrubNumber label="最大内存 MB" value={amount} min={512} max={131072} disabled={busy} onChange={next=>{setAmount(next);setMessage('');}}/>}
    <button className="small-action save-memory" type="submit" disabled={busy}>
      <span className="action-status" aria-hidden>{busy||message?<StatusMark status={busy?'running':error?'failed':'done'}/>:<Save/>}</span>保存内存
    </button></div>
    {message&&<small className={error?'inline-error':'saved-note'} role={error?'alert':'status'}>{message}</small>}</form>;
}
