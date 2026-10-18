import './layout-sharing.css';
import {useRef,useState} from 'react';
import {Download,FileUp,Undo2} from 'lucide-react';
import {Button,Field,Modal,Select,Toggle} from './ui';
import {desktop,invoke,notify,reload,saveSettings,state,ui} from './model';
import {exportLayoutPackage,readLayoutPackage,applyLayoutPackage,LAYOUT_LIMIT} from '../../../packages/engine/core/layout-package.mjs';
export function LayoutSharing(){
 const [mode,setMode]=useState(''),[incoming,setIncoming]=useState<any>(null),[merge,setMerge]=useState('merge'),[includeNotes,setIncludeNotes]=useState(false),[appearance,setAppearance]=useState(true),[name,setName]=useState('我的卡片布局'),[previous,setPrevious]=useState<any>(null),[busy,setBusy]=useState(false);
 const file=useRef<HTMLInputElement>(null);
 async function read(){if(desktop){const value=await invoke('cards.import');if(value){setIncoming(readLayoutPackage(value));setMode('import');}}else file.current?.click();}
 async function write(){setBusy(true);try{
  if(desktop){if(!await invoke('cards.export',{name,includeNotes,appearance}))return;}
  else{const blob=new Blob([JSON.stringify(exportLayoutPackage(state.settings,{name,includeNotes,appearance}),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='幻想镇卡片布局.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  setMode('');notify('卡片布局已导出');
 }finally{setBusy(false);}}
 async function apply(){
  setBusy(true);try{
   const backup=exportLayoutPackage(state.settings,{includeNotes:true,appearance:true});
   if(desktop){await invoke('cards.apply',{package:incoming,mode:merge,confirmed:true});await reload();}
   else await saveSettings(applyLayoutPackage(state.settings,incoming,merge));
   ui.layoutUnsaved?.discard();setPrevious(backup);setMode('');notify('卡片布局已应用');
  }finally{setBusy(false);}
 }
 return <><div className="toolbar layout-sharing"><Button icon={Download} onClick={()=>setMode('export')}>导出布局</Button><Button icon={FileUp} onClick={read}>导入布局</Button>{previous&&<Button icon={Undo2} onClick={async()=>{if(desktop){await invoke('cards.apply',{package:previous,mode:'replace',confirmed:true});await reload();}else await saveSettings(applyLayoutPackage(state.settings,previous));setPrevious(null);notify('已撤销本次布局导入');}}>撤销本次导入</Button>}</div>
  <input ref={file} type="file" hidden accept=".json,application/json" aria-label="选择卡片布局文件" onChange={async e=>{const source=e.target.files?.[0];e.target.value='';if(!source)return;try{if(source.size>LAYOUT_LIMIT)throw Error('布局文件超过 1 MB');setIncoming(readLayoutPackage(await source.text()));setMode('import');}catch(error:any){notify(error.message,true);}}}/>
  <Modal open={!!mode} title={mode==='import'?'预览卡片布局':'导出卡片布局'} onClose={()=>{if(!busy)setMode('');}}>
   <div className="layout-sharing-dialog">
    {mode==='export'?<><Field label="方案名称"><input value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></Field><Toggle label="包含颜色、间距与圆角" checked={appearance} onChange={setAppearance}/><Toggle label="包含便利贴正文" description="分享给其他人前，确认便签里没有私人内容。" checked={includeNotes} onChange={setIncludeNotes}/><p className="muted">仅导出卡片与布局设置，不包含账号、游戏路径或登录信息。</p><Button icon={Download} tone="solid" disabled={busy} onClick={write}>保存布局文件</Button></>:incoming&&<><h3>{incoming.name}</h3><div className="layout-sharing-counts"><span><strong>{incoming.counts.pages}</strong>页面布局</span><span><strong>{incoming.counts.moved}</strong>跨页卡片</span><span><strong>{incoming.counts.widgets}</strong>通用卡片</span></div><p className="muted">{incoming.appearance?'附带颜色与卡片外观。':'沿用当前颜色与卡片外观。'}{incoming.counts.notes>0?' 含 '+incoming.counts.notes+' 张有正文的便利贴。':''}</p><Field label="导入方式"><Select label="布局导入方式" value={merge} onChange={setMerge} options={[{value:'merge',label:'合并 · 未包含的页面与卡片保留'},{value:'replace',label:'替换 · 使用完整方案'}]}/></Field><p className="muted">应用后可撤销本次导入。未保存的卡片编辑将被放弃。</p><Button tone="solid" disabled={busy} onClick={apply}>应用布局</Button></>}
   </div>
  </Modal>
 </>;
}
