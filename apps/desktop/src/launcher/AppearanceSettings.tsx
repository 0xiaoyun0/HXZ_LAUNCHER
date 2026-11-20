import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {Check,Copy,History,Image,Layers3,PanelsTopLeft,RotateCcw,Trash2} from 'lucide-react';
import {DESKTOP_THEMES,activeDesign,themeBook} from '../../../../packages/engine/core/desktop-themes.mjs';
import {desktop,invoke,notify,perform,reload,saveSettings,state,ui} from '../model';
import {Modal} from '../ui';
import {useSearchParams} from 'react-router-dom';
import {Workspaces} from './Workspaces';
import {AppearanceSlider} from './AppearanceSlider';
import {WallpaperSettings} from './WallpaperSettings';

const tones=[['鸢尾蓝','#5769b7'],['海松绿','#37887a'],['落日橙','#b7633f'],['莓果紫','#9d629a']];
export function AppearanceSettings(){
  const s=useSnapshot(state).settings,book=themeBook(s),base=activeDesign(s);
  const current=book.entries.find((e:any)=>e.id===book.active),saved=book.entries.filter((e:any)=>!DESKTOP_THEMES.some(p=>p.id===e.id));
  const [copy,setCopy]=useState(false),[name,setName]=useState(''),[error,setError]=useState('');
  const [legacy,setLegacy]=useState<any>(null),[showLegacy,setShowLegacy]=useState(false),[busy,setBusy]=useState(false);
  useEffect(()=>{let alive=true;if(desktop)void invoke('profile.look').then(row=>{if(alive)setLegacy(row);}).catch(()=>{});return ()=>{alive=false;};},[]);
  const change=(op:string,options:Record<string,string>={})=>saveSettings({themeChange:{op,...options}});
  const patch=(fields:any)=>perform(()=>saveSettings(fields));
  const card=(fields:any)=>saveSettings((settings:any)=>({cardStyle:{...settings.cardStyle,...fields}}));
  async function addCopy(event:React.FormEvent){
    event.preventDefault();setBusy(true);
    try{await change('copy',{name});setCopy(false);notify('已保存外观方案');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const [params,setParams]=useSearchParams();
  const tabs=[{id:'workspace',name:'工作台',icon:PanelsTopLeft},{id:'surface',name:'颜色与窗格',icon:Layers3},{id:'wallpaper',name:'壁纸',icon:Image}];
  const tab=tabs.find(item=>item.id===params.get('panel'))?.id||'workspace';
  const [scope,setScope]=useState('surface');
  return <><nav className="appearance-navigation" aria-label="外观设置分区">{tabs.map(({id,name,icon:Icon})=>
    <button key={id} type="button" aria-current={tab===id?'page':undefined} onClick={()=>{const next=new URLSearchParams(params);next.set('panel',id);setParams(next,{replace:true});}}><Icon size={16}/>{name}</button>)}</nav>
  {tab==='workspace'&&<Workspaces/>}{tab==='wallpaper'&&<WallpaperSettings/>}
  {tab==='surface'&&<><section className="preference-section appearance-gallery"><h2>窗格配色</h2>
    <div className="design-options">{DESKTOP_THEMES.map(item=>
      <button type="button" className="design-choice" key={item.id} data-design={item.id} aria-label={'使用'+item.name} aria-pressed={book.active===item.id} onClick={()=>perform(()=>change('select',{id:item.id}))}>
        <span className="design-sample" aria-hidden="true">
          <span className="sample-window"><i/><b/><b/><b/></span></span>
        <span className="design-caption"><span><strong>{item.name}</strong><small>{item.caption}</small></span>{book.active===item.id&&<Check size={16}/>}</span>
      </button>)}</div>
    <div className="setting-line theme-shelf"><span><strong>当前方案</strong><small>{current?.name||base.name}</small></span>
      {saved.length>0&&<select aria-label="我的外观方案" value={book.active} onChange={e=>{const id=e.target.value;void perform(()=>change('select',{id}));}}><optgroup label="内置风格">{DESKTOP_THEMES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup><optgroup label="我的方案">{saved.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup></select>}
      <button className="small-action" onClick={()=>{setError('');setName('');setCopy(true);}}><Copy size={15}/>另存方案</button>
      {saved.some((entry:any)=>entry.id===book.active)&&<button className="small-action" aria-label="删除当前方案" onClick={()=>{ui.confirm={title:'删除这个外观方案？',body:'删除后会切回「'+base.name+'」。',action:()=>change('delete')};}}><Trash2 size={15}/></button>}</div>
  </section>
  <section className="preference-section appearance-editor"><h2>窗格细节</h2>
    <div className="appearance-sliders" key={book.active}>
      <AppearanceSlider label="窗格不透明度" value={Math.round(s.cardStyle.opacity*100)} min={20} max={100} unit="%" preview="--preview-opacity" save={n=>card({opacity:n/100})}/>
      <AppearanceSlider label="窗格圆角" value={s.cardStyle.radius} min={4} max={20} unit=" px" preview="--preview-radius" save={n=>card({radius:n})}/>
      <AppearanceSlider label="卡片间距" value={s.cardStyle.gap} min={8} max={24} unit=" px" preview="--preview-gap" save={n=>card({gap:n})}/>
    </div>
    <div className="setting-line"><span><strong>卡片底色</strong></span><label className="native-color">自选底色<input type="color" aria-label="自定义卡片底色" value={s.cardStyle.color||(s.theme==='dark'?'#273239':'#fcfdff')} onChange={e=>{const color=e.target.value;void perform(()=>card({color}));}}/></label><button className="small-action" onClick={()=>perform(()=>card({color:''}))}>跟随主题</button></div>
    <div className="setting-line"><strong>强调色</strong><div className="tone-picker">{tones.map(([label,color])=><button key={color} aria-label={label} aria-pressed={s.accentColor.toLowerCase()===color} title={label} style={{backgroundColor:color}} onClick={()=>patch({accentColor:color})}>{s.accentColor.toLowerCase()===color&&<Check size={14}/>}</button>)}
      <label className="native-color">自选颜色<input aria-label="自选强调色" type="color" value={s.accentColor||base.accent} onChange={e=>patch({accentColor:e.target.value})}/></label></div></div>
    <div className="setting-line"><span><strong>还原当前方案</strong><small>使用「{base.name}」的预设颜色、圆角与透明度。</small></span><button className="small-action" onClick={()=>{ui.confirm={title:'还原当前方案？',body:'此方案的颜色和窗格将恢复为「'+base.name+'」的预设。',action:()=>change('reset')};}}><RotateCcw size={15}/>恢复预设</button></div>
  </section></>}
  {legacy?.available&&tab!=='workspace'&&<section className="preference-section"><h2>本机 0.9.2</h2><div className="setting-line"><span><strong>{tab==='wallpaper'?'旧版壁纸':'旧版窗格'}</strong><small>{legacy.kind} · 圆角 {legacy.radius} px · 窗格 {legacy.opacity}%</small></span><button className="small-action" onClick={()=>{setScope(tab==='wallpaper'?'wallpaper':'surface');setShowLegacy(true);}}><History size={15}/>接回旧版{tab==='wallpaper'?'壁纸':'窗格'}</button></div></section>}
  <Modal open={copy} title="另存外观方案" onClose={()=>setCopy(false)}><form className="theme-form" onSubmit={addCopy}><label>方案名称<input autoFocus required maxLength={32} value={name} onChange={e=>{setName(e.target.value);setError('');}}/></label>{error&&<p role="alert">{error}</p>}<button className="launch-primary" disabled={busy||!name.trim()}>保存方案</button></form></Modal>
  <Modal open={showLegacy} title={scope==='surface'?'接回 0.9.2 窗格':'接回 0.9.2 壁纸'} onClose={()=>setShowLegacy(false)}><div className="theme-form">
    <p>{scope==='surface'?'将旧版配色和窗格存入「我的 0.9.2」。再次接回会更新这个方案。':legacy?.missing?'旧版壁纸文件已缺失。可以返回选择其他图片或视频。':'使用本机旧版的'+legacy?.kind+'和显示位置。'}</p>
    <button className="launch-primary" disabled={busy||(scope==='wallpaper'&&legacy?.missing)} onClick={()=>perform(async()=>{setBusy(true);try{const result=await invoke('profile.look',{apply:true,scope});if(!result.available)throw Error('未找到旧版外观设置');if(scope==='wallpaper'&&result.missing)throw Error('旧版壁纸文件已缺失，请重新选择');await reload();setShowLegacy(false);notify(scope==='surface'?'已接回旧版窗格':'已接回旧版壁纸');}finally{setBusy(false);}})}>应用{scope==='wallpaper'?'旧版壁纸':'旧版窗格'}</button></div></Modal>
  </>;
}
