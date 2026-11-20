import {useState} from 'react';
import {invoke,perform} from '../model';
import {Link} from 'react-router-dom';

export function MusicMigration(){
  const [plan,setPlan]=useState<any>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function act(action:'preview'|'import'|'cancel'){
    setBusy(true);setMessage('');
    try{
      const result=await invoke('music.legacy.'+action,action==='preview'?{}:{ticket:plan.ticket});
      if(action==='preview'){setPlan(result.cancelled?null:result);return;}
      setPlan(null);
      if(action==='import')setMessage('已加入 '+result.added+' 首，跳过 '+result.skipped+' 首。');
    }finally{setBusy(false);}
  }
  return <><div className="setting-line"><span><strong>旧版音乐库</strong><small>选择 music-library.json，预览本地曲目和网易云收藏。</small></span><button className="small-action" disabled={busy} onClick={()=>perform(()=>act('preview'))}>预览旧曲库</button></div>
    {plan&&<div className="migration-preview"><p>共 {plan.total} 首，可导入 {plan.ready} 首。重复 {plan.duplicate} 首，无法读取 {plan.missing} 首，超出容量 {plan.limited} 首。</p><p>本地音频将复制到新版资料目录。网易云曲目按歌曲 ID 导入，播放时重新取得音频。</p><div className="desk-actions"><button className="small-action" disabled={busy} onClick={()=>perform(()=>act('cancel'))}>取消</button><button className="launch-primary" disabled={!plan.ready||busy} onClick={()=>perform(()=>act('import'))}>{busy?'正在合并…':'合并到我的音乐'}</button></div></div>}
    {message&&<p role="status">{message} <Link to="/music">打开音乐播放器</Link></p>}</>;
}
