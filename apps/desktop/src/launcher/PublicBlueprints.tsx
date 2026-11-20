import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useData,request} from '../data';
import {invoke,perform,state,notify,saveSettings} from '../model';
import {Button,Modal,Select} from '../ui';

export function PublicBlueprints(){
  const [text,setText]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0);
  const [selected,setSelected]=useState(''),[destination,setDestination]=useState(''),[remember,setRemember]=useState(false);
  const entries=useData(()=>request('/api/blueprints?'+new URLSearchParams({scope:'public',q:query,offset:String(page*24),limit:'24'})),[query,page]);
  const detail=useData(()=>selected?request('/api/blueprints/'+encodeURIComponent(selected)):Promise.resolve(null),[selected]);
  const targets=useData(()=>selected?invoke('blueprints.instances'):Promise.resolve([]),[selected]);
  const ready=targets.data?.some((row:any)=>row.id===destination)?destination:'';
  return <section className="preference-section"><div className="desk-actions"><h2>公共蓝图</h2><Link className="small-action" to="/community/blueprints">投稿与我的蓝图</Link></div>
    <form className="music-find" onSubmit={e=>{e.preventDefault();setQuery(text);setPage(0);}}><input aria-label="搜索公共蓝图" placeholder="名称、作者或说明" value={text} onChange={e=>setText(e.target.value)}/><button className="small-action">搜索</button></form>
    {entries.error?<p role="alert">蓝图目录暂时无法读取。<Button onClick={entries.reload}>重试</Button></p>:entries.loading?<p role="status">正在读取蓝图…</p>:!entries.data?.items?.length?<p>没有找到公开蓝图。</p>:entries.data.items.map((item:any)=><button className="instance-line" key={item.id} onClick={()=>{setSelected(item.id);setDestination(state.settings.blueprintInstance||'');setRemember(false);}}><span><strong>{item.title}</strong><small>{[item.name,item.mc,item.category].filter(Boolean).join(' · ')}</small></span></button>)}
    <div className="pagination"><Button disabled={!page} onClick={()=>setPage(v=>v-1)}>上一页</Button><span>第 {page+1} 页</span><Button disabled={(page+1)*24>=(entries.data?.total||0)} onClick={()=>setPage(v=>v+1)}>下一页</Button></div>
    <Modal open={!!selected} onClose={()=>setSelected('')} title={detail.data?.title||'蓝图详情'}>
      {detail.error?<p role="alert">{detail.error} <Button onClick={detail.reload}>重试</Button></p>:detail.data?<><p>{detail.data.description||'暂无说明'}</p><p>{[detail.data.mc,detail.data.loader,detail.data.create_version].filter(Boolean).join(' · ')}</p>
        <div className="setting-line"><span>保存位置</span><Select label="蓝图保存位置" value={ready} onChange={setDestination} options={[{value:'',label:'另存为文件…'},...(targets.data||[]).map((row:any)=>({value:row.id,label:row.name||row.id}))]}/></div>
        <label className="setting-line">记住保存位置<input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/></label>
        <Button tone="solid" disabled={!detail.data.size||targets.loading} onClick={()=>perform(async()=>{const result=await invoke('blueprints.download',{id:selected,instance:ready});if(result.ok){if(remember)await saveSettings({blueprintInstance:ready});notify('已保存到 '+result.file);setSelected('');}})}>保存蓝图</Button></>:<p>正在读取详情…</p>}
    </Modal></section>;
}
