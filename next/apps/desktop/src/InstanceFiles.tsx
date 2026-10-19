import {useEffect,useRef,useState} from 'react';
import {useSnapshot} from 'valtio';
import {FolderOpen,Plus,Search,RefreshCw,Trash2,File,Folder,Upload} from 'lucide-react';
import {state,task,invoke,bytes,notify} from './model';
import {Button,IconButton,Toggle,Empty,Modal} from './ui';
import './instance-files.css';

export const fileSections=[{id:'mods',title:'模组',extension:'.jar'},{id:'resources',title:'资源包',extension:'.zip'},{id:'shaders',title:'光影',extension:'.zip'},{id:'schematics',title:'蓝图',extension:'.nbt'}];
export function InstanceFileManager({id}:{id:string}){const [kind,setKind]=useState('mods');return <><nav className="instance-tabs" aria-label="游戏文件类型">{fileSections.map(v=><button key={v.id} className={kind===v.id?'active':''} aria-pressed={kind===v.id} onClick={()=>setKind(v.id)}>{v.title}</button>)}</nav><InstanceFiles key={id+kind} id={id} kind={kind}/></>;}
export function InstanceFiles({id,kind='mods'}:{id:string;kind?:string}){
 const s=useSnapshot(state),t=useSnapshot(task),spec=fileSections.find(v=>v.id===kind)!;
 const [items,setItems]=useState<any[]>([]),[shared,setShared]=useState(false),[loading,setLoading]=useState(true),[working,setWorking]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState(''),[drag,setDrag]=useState(false),[removing,setRemoving]=useState<any>(null);
 const generation=useRef(0),inFlight=useRef(false),depth=useRef(0),locked=!!s.running||!!t.busy||working;
 const load=async()=>{const current=++generation.current;setLoading(true);setError('');try{const result=await invoke('instance.files.list',{id,kind});if(current===generation.current){setItems(result.items);setShared(result.shared);}}catch(e:any){if(current===generation.current)setError(e.message);}finally{if(current===generation.current)setLoading(false);}};
 useEffect(()=>{setItems([]);setQuery('');setRemoving(null);void load();return()=>{generation.current++;};},[id,kind]);
 const mutate=async(action:string,input:any={})=>{if(inFlight.current||locked)return;inFlight.current=true;setWorking(true);setError('');try{const result=await invoke('instance.files.'+action,{id,kind,...input});if(action==='import'&&result.count)notify('已导入 '+result.count+' 个文件');await load();}catch(e:any){setError(e.message);await load().catch(()=>{});setError(e.message);}finally{inFlight.current=false;setWorking(false);}};
 const list=items.filter(v=>v.name.toLowerCase().includes(query.toLowerCase()));
 const dragFiles=(e:React.DragEvent)=>Array.from(e.dataTransfer.types).includes('Files');
 return <section className={'instance-files'+(drag?' drag-over':'')} aria-label={spec.title+'文件管理'}
  onDragEnter={e=>{if(dragFiles(e)){e.preventDefault();e.stopPropagation();depth.current++;setDrag(true);}}}
  onDragOver={e=>{if(dragFiles(e)){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect=locked?'none':'copy';}}}
  onDragLeave={e=>{e.preventDefault();e.stopPropagation();if(--depth.current<=0){depth.current=0;setDrag(false);}}}
  onDrop={e=>{e.preventDefault();e.stopPropagation();depth.current=0;setDrag(false);if(locked)return;const files=Array.from(e.dataTransfer.files).map(file=>window.launcher?.filePath(file)||'');if(!files.length||files.some(v=>!v)){setError('无法读取拖入文件，请使用“导入”选择文件');return;}void mutate('import',{files});}}>
  <div className="instance-files-toolbar"><div className="search"><Search size={16}/><input aria-label={'搜索'+spec.title} placeholder={'搜索'+spec.title+'文件'} value={query} onChange={e=>setQuery(e.target.value)}/></div><Button icon={Plus} tone="solid" disabled={locked} onClick={()=>mutate('import')}>导入</Button><IconButton icon={FolderOpen} label={'打开'+spec.title+'文件夹'} onClick={()=>invoke('instance.files.open',{id,kind})}/><IconButton icon={RefreshCw} label="刷新文件列表" disabled={working||loading} onClick={load}/></div>
  <div className="instance-files-summary"><span>{items.length} 个文件 · {items.filter(v=>v.enabled).length} 个已启用</span><span>可拖入 {spec.extension} 文件</span></div>
  {shared&&<p className="inline-notice">此实例未开启隔离，修改会影响共用此游戏目录的实例。</p>}
  {(s.running||t.busy)&&<p className="inline-notice">游戏或安装任务结束后可修改文件。</p>}
  {error&&<p className="inline-error" role="alert">{error}</p>}
  {loading&&!items.length?<p className="muted" role="status">正在读取文件…</p>:list.length?<div className="instance-file-list" role="list">{list.map(item=><div className={'instance-file-row'+(!item.enabled?' disabled-file':'')} key={item.key} role="listitem"><span className="instance-file-symbol">{item.folder?<Folder size={20}/>:<File size={20}/>}</span><div className="instance-file-name"><strong title={item.name}>{item.name}</strong><small>{item.folder?'文件夹':bytes(item.size)} · {item.enabled?'已启用':'已禁用'}</small></div><Toggle checked={item.enabled} label={item.enabled?'禁用 '+item.name:'启用 '+item.name} disabled={locked} onChange={()=>mutate('toggle',{key:item.key})}/><IconButton icon={Trash2} label={'移除 '+item.name} disabled={locked} onClick={()=>setRemoving(item)}/></div>)}</div>:<Empty icon={Upload} title={query?'没有匹配的文件':'尚未添加'+spec.title}>{query?'换个文件名试试。':'将 '+spec.extension+' 文件拖到这里，或点击导入。'}</Empty>}
  {kind==='mods'&&<p className="instance-file-hint">禁用模组可能影响整合包依赖；HXZ UP 更新可能恢复管理员要求的文件。</p>}
  {kind==='shaders'&&<p className="instance-file-hint">启用后可在游戏内选择光影；实例需安装支持光影的模组。</p>}
  {removing&&<Modal open title="移除文件" onClose={()=>!working&&setRemoving(null)}><p className="file-confirm-name">{removing.name}</p><p>文件将移入系统回收站，确认移除？</p><div className="modal-actions"><Button disabled={working} onClick={()=>setRemoving(null)}>取消</Button><Button tone="danger" disabled={locked} onClick={async()=>{await mutate('remove',{key:removing.key});setRemoving(null);}}>移入回收站</Button></div></Modal>}
 </section>;
}
