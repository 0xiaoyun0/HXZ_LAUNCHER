import {useEffect,useState} from 'react';
import {desktop,invoke,notify,perform} from '../model';
import {Modal} from '../ui';
export default function UserCards(){
  const [items,setItems]=useState<any[]>([]),[pending,setPending]=useState<any>(null);
  async function read(){setItems((await invoke('plugins.list')).items);}
  useEffect(()=>{if(desktop)void perform(read);},[]);
  async function act(action:string,input:Record<string,unknown>={}){
    const result=await invoke('plugins.'+action,input);await read();return result;
  }
  return <section className="preference-section"><h2>玩家自制卡片</h2>
    <div className="setting-line"><span><strong>本地导入 .hxzplugin</strong><small>API 2 卡片可在首页显示文字和站内入口。导入后由你确认启用。</small></span><button className="small-action" onClick={()=>perform(async()=>{const result=await act('install');if(!result?.cancelled)notify('已导入，在下方启用卡片');})}>导入卡片</button></div>
    {items.map(item=><div className="setting-line" key={item.manifest.id}><span><strong>{item.manifest.name}</strong><small>{item.manifest.author} · {item.manifest.version}</small></span><div className="desk-actions"><button className="small-action" onClick={()=>item.enabled?perform(()=>act('disable',{id:item.manifest.id})):setPending(item)}>{item.enabled?'停用':'启用'}</button><button className="small-action" onClick={()=>perform(()=>act('remove',{id:item.manifest.id}))}>移除</button></div></div>)}
    <Modal open={!!pending} title="允许在首页显示卡片？" onClose={()=>setPending(null)}>{pending&&<><p>{pending.manifest.name} · {pending.manifest.author} · {pending.manifest.version}</p><p>{pending.card.body}</p><footer className="modal-actions"><button className="small-action" onClick={()=>setPending(null)}>取消</button><button className="launch-primary" onClick={()=>perform(async()=>{await act('enable',{id:pending.manifest.id,accepted:true});setPending(null);})}>允许在首页显示</button></footer></>}</Modal>
  </section>;
}
