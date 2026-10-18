import {useState} from 'react';
import {useSnapshot} from 'valtio';
import {ArchiveRestore,Copy,HardDrive,History,RefreshCw,Trash2} from 'lucide-react';
import {CardBoard} from './CardBoard';
import {Button,Empty,Field,Modal,Select} from './ui';
import {useData} from './data';
import {cfg,invoke,notify,reload,state,task,ui} from './model';
import './instance-maintenance.css';
import {PresetTools,PerformanceTools,MigrationTools} from './InstanceTools';

const size=(value:number)=>value>=1024**3?(value/1024**3).toFixed(2)+' GB':value>=1024**2?(value/1024**2).toFixed(1)+' MB':value>=1024?Math.ceil(value/1024)+' KB':value+' B';
const date=(value:number)=>new Date(value).toLocaleString('zh-CN');
export function InstanceMaintenance({id}:{id:string}){
 const s=useSnapshot(state),t=useSnapshot(task),locked=t.busy||s.running,isolated=cfg(id,s).isolated;
 const info=useData<any>(()=>locked?Promise.resolve(null):invoke('instance.maintenance',{id,op:'inspect'}),[id,s.settings.gameRoot]);
 const [dialog,setDialog]=useState<any>(null),[name,setName]=useState(''),[working,setWorking]=useState(false);
 const [worlds,setWorlds]=useState<string[]>([]),[world,setWorld]=useState(''),[exported,setExported]=useState<any>(null);
 const chooseWorld=async()=>{const values=await invoke('addons.worlds',{instance:id});setWorlds(values);setWorld(values[0]||'');setExported(null);setDialog({op:'world'});};
 const open=(op:string,item?:any)=>{setName(op==='clone'?id+'-实验':op==='snapshot'?new Date().toLocaleDateString('zh-CN')+' 手动恢复点':'');setDialog({op,item});};
 const submit=async()=>{
  setWorking(true);try{
   if(dialog.op==='world'){const value=await invoke('world.export',{id,world});if(value)setExported(value);return;}
   await invoke('instance.maintenance',{id,op:dialog.op,label:name,name,key:dialog.item?.key,confirmed:true});
   const clone=dialog.op==='clone';setDialog(null);notify(clone?'实验副本已创建，自动更新和自动进服已关闭':'实例维护已完成');
   await reload();if(!clone)await info.reload();
  }finally{setWorking(false);}
 };
 const views=info.data,snapshots=views?.snapshots||[],total=views?.bytes||0;
 return <div className="maintenance-view">
  <div className="maintenance-toolbar"><p>恢复点与副本包含当前版本目录的模组、配置和存档，共用的资源库不重复复制。</p><Button icon={RefreshCw} disabled={locked||info.loading} onClick={info.reload}>重新统计</Button><Button disabled={!t.phase} onClick={()=>ui.tasks=true}>任务详情</Button></div>
  {info.error&&<div className="maintenance-error" role="alert">{info.error}<Button disabled={locked} onClick={info.reload}>重试</Button></div>}
  {info.loading&&<p role="status">正在统计空间与读取恢复点…</p>}
  {!isolated&&<p className="maintenance-warning">当前实例未开启隔离。请先在配置中启用实例隔离，再创建恢复点或实验副本，以免遗漏共享目录里的存档。</p>}
  {s.running&&<p className="maintenance-warning">游戏运行期间暂停维护，关闭游戏后可重新统计。</p>}
  <CardBoard id="instance-maintenance" cards={[
   {id:'storage',title:'空间占用',w:5,minW:4,content:<div className="maintenance-storage"><div className="maintenance-stat"><HardDrive size={24}/><strong>{views?size(total):'—'}</strong><span>{views?views.files.toLocaleString()+' 个文件':'等待统计'}</span></div><div className="maintenance-groups">{(views?.groups||[]).map((group:any)=><div key={group.name}><div><span title={group.name}>{group.name}</span><b>{size(group.bytes)}</b></div><div className="maintenance-bar"><i style={{width:(total?Math.max(.5,group.bytes/total*100):0)+'%'}}/></div></div>)}</div></div>},
   {id:'snapshots',title:'恢复点',x:5,w:7,minW:4,content:<div className="maintenance-snapshots"><div className="maintenance-actions"><span>{snapshots.length} 个恢复点 · {size(snapshots.reduce((sum:number,item:any)=>sum+item.bytes,0))}</span><Button icon={History} tone="solid" disabled={locked||!isolated||!views} onClick={()=>open('snapshot')}>创建恢复点</Button></div>{snapshots.length?<div className="maintenance-snapshot-list">{snapshots.map((item:any)=><article key={item.key}><div><h3>{item.label}</h3><p>{date(item.created)}</p><small>{size(item.bytes)} · {item.files.toLocaleString()} 个文件</small></div><div className="maintenance-actions"><Button icon={ArchiveRestore} disabled={locked||!isolated} onClick={()=>open('restore',item)}>还原</Button><Button icon={Trash2} aria-label={'删除恢复点 '+item.label} disabled={locked} onClick={()=>open('delete',item)}>删除</Button></div></article>)}</div>:<Empty icon={History} title="改动之前，留下一个恢复点">添加模组或调整配置前保存，之后可以回到此时的文件状态。</Empty>}</div>},
   {id:'experiment',title:'实验副本',w:5,minW:4,content:<div className="maintenance-experiment"><Copy size={24}/><p>复制为一个独立实例，用来试新模组、配置或存档。自动更新和自动进服默认关闭。</p><Button icon={Copy} disabled={locked||!isolated||!views} onClick={()=>open('clone')}>创建实验副本</Button></div>},
   {id:'world-export',title:'世界快照',w:7,minW:4,content:<div className="maintenance-experiment"><ArchiveRestore size={24}/><p>将一个存档导出为 ZIP，并获取校验值，用于世界体验或接力交接。</p><Button disabled={locked||!isolated} onClick={chooseWorld}>导出世界快照</Button></div>},
   {id:'presets',title:'配置预设',w:5,minW:4,content:<PresetTools id={id}/>},
   {id:'performance',title:'启动记录',w:7,minW:4,content:<PerformanceTools id={id}/>},
   {id:'migration',title:'目录迁移',w:12,minW:4,content:<MigrationTools/>}
  ]}/>
  <Modal open={!!dialog} onClose={()=>{if(!working)setDialog(null);}} title={dialog?.op==='world'?'导出世界快照':dialog?.op==='clone'?'创建实验副本':dialog?.op==='restore'?'还原实例':dialog?.op==='delete'?'删除恢复点':'创建恢复点'}>
   {dialog&&<div className="maintenance-dialog">
    {dialog.op==='world'?<><Field label="世界存档"><Select label="世界存档" value={world} onChange={setWorld} options={worlds.map(value=>({value,label:value}))} disabled={working||!worlds.length}/></Field>{!worlds.length&&<p>此实例还没有世界存档。</p>}{exported&&<><p>已导出：{exported.file}</p><Field label="SHA-256"><input readOnly value={exported.sha256}/></Field><Button onClick={()=>navigator.clipboard.writeText(exported.sha256)}>复制校验值</Button></>}</>:['snapshot','clone'].includes(dialog.op)?<Field label={dialog.op==='clone'?'新实例名称':'恢复点名称'}><input autoFocus value={name} maxLength={dialog.op==='clone'?90:80} onChange={e=>setName(e.target.value)} disabled={working}/></Field>:<><h3>{dialog.item.label}</h3><p>{dialog.op==='restore'?'这会替换当前实例目录。还原前的文件会自动保留为另一个恢复点；公共资源库和 Java 不变。':'仅删除这个恢复点，当前游戏文件不受影响。删除后不能再用它还原。'}</p></>}
    {dialog.op==='snapshot'&&<p>不备份日志和可重建的本机缓存；请先关闭其他启动器正在运行的同一实例。</p>}
    {dialog.op==='clone'&&<p>与原实例共用游戏资源库，新副本的模组、配置和存档独立保存。</p>}
    <div className="maintenance-actions"><Button disabled={working} onClick={()=>setDialog(null)}>关闭</Button><Button tone={dialog.op==='delete'?'danger':'solid'} disabled={working||(['snapshot','clone'].includes(dialog.op)&&!name.trim())||dialog.op==='world'&&!world} onClick={submit}>{working?'正在处理…':dialog.op==='world'?'选择位置并导出':dialog.op==='restore'?'确认还原':dialog.op==='delete'?'确认删除':'创建'}</Button></div>
   </div>}
  </Modal>
 </div>;
}
