import {useEffect,useRef,useState} from 'react';
import {useSnapshot} from 'valtio';
import {Check,Copy,FolderOpen,History,RotateCcw,Trash2} from 'lucide-react';
import {DESKTOP_THEMES,activeDesign,themeBook} from '../../../../packages/engine/core/desktop-themes.mjs';
import {desktop,invoke,notify,perform,reload,saveSettings,state,ui} from '../model';
import {Modal} from '../ui';
import {LayoutSharing} from '../LayoutSharing';

const tones=[['鸢尾蓝','#5769b7'],['海松绿','#37887a'],['落日橙','#b7633f'],['莓果紫','#9d629a']];
type SliderProps={label:string;value:number;min:number;max:number;unit:string;preview:string;save:(value:number)=>Promise<unknown>};
function AppearanceSlider({label,value,min,max,unit,preview,save}:SliderProps){
  const [draft,setDraft]=useState(value),pending=useRef<number|null>(null);
  useEffect(()=>{if(pending.current===null)setDraft(value);},[value]);
  useEffect(()=>()=>{document.documentElement.style.removeProperty(preview);},[preview]);
  function commit(){
    const n=pending.current;if(n===null)return;
    pending.current=null;
    void perform(async()=>{try{await save(n);}finally{if(pending.current===null)document.documentElement.style.removeProperty(preview);}});
  }
  return <label className="appearance-range"><span>{label}</span><output>{draft}{unit}</output>
    <input aria-label={label} type="range" value={draft} min={min} max={max}
      onChange={e=>{const n=Number(e.target.value);pending.current=n;setDraft(n);document.documentElement.style.setProperty(preview,unit===' px'?n+'px':String(n/100));}}
      onPointerUp={commit} onPointerCancel={commit} onKeyUp={commit} onBlur={commit}/></label>;
}

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
  const source=s.backgroundVideo?'动态壁纸':s.backgroundImage?'图片壁纸':s.desktopBackdrop==='plain'||!base.scene?'纯色背景':'主题插画';
  return <><section className="preference-section appearance-gallery"><h2>外观方案</h2>
    <div className="design-options">{DESKTOP_THEMES.map(item=>
      <button type="button" className="design-choice" key={item.id} data-design={item.id} aria-label={'使用'+item.name} aria-pressed={book.active===item.id} onClick={()=>perform(()=>change('select',{id:item.id}))}>
        <span className="design-sample" aria-hidden="true" style={item.scene?{backgroundImage:'url("./media/'+item.scene+'")'}:{}}>
          <span className="sample-window"><i/><b/><b/><b/></span></span>
        <span className="design-caption"><span><strong>{item.name}</strong><small>{item.caption}</small></span>{book.active===item.id&&<Check size={16}/>}</span>
      </button>)}</div>
    <div className="setting-line theme-shelf"><span><strong>当前方案</strong><small>{current?.name||base.name}</small></span>
      {saved.length>0&&<select aria-label="我的外观方案" value={book.active} onChange={e=>{const id=e.target.value;void perform(()=>change('select',{id}));}}><optgroup label="内置风格">{DESKTOP_THEMES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup><optgroup label="我的方案">{saved.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup></select>}
      <button className="small-action" onClick={()=>{setError('');setName('');setCopy(true);}}><Copy size={15}/>另存方案</button>
      {saved.some((entry:any)=>entry.id===book.active)&&<button className="small-action" aria-label="删除当前方案" onClick={()=>{ui.confirm={title:'删除这个外观方案？',body:'删除后会切回「'+base.name+'」。',action:()=>change('delete')};}}><Trash2 size={15}/></button>}</div>
  </section>
  <section className="preference-section appearance-editor"><h2>窗格与壁纸</h2>
    <div className="appearance-sliders" key={book.active}>
      <AppearanceSlider label="窗格不透明度" value={Math.round(s.cardStyle.opacity*100)} min={20} max={100} unit="%" preview="--preview-opacity" save={n=>card({opacity:n/100})}/>
      <AppearanceSlider label="窗格圆角" value={s.cardStyle.radius} min={4} max={20} unit=" px" preview="--preview-radius" save={n=>card({radius:n})}/>
      <AppearanceSlider label="卡片间距" value={s.cardStyle.gap} min={8} max={24} unit=" px" preview="--preview-gap" save={n=>card({gap:n})}/>
      <AppearanceSlider label="壁纸浓度" value={Math.round(s.backgroundOpacity*100)} min={20} max={100} unit="%" preview="--preview-strength" save={n=>saveSettings({backgroundOpacity:n/100})}/>
    </div>
    <div className="setting-line"><span><strong>卡片底色</strong></span><label className="native-color">自选底色<input type="color" aria-label="自定义卡片底色" value={s.cardStyle.color||(s.theme==='dark'?'#273239':'#fcfdff')} onChange={e=>{const color=e.target.value;void perform(()=>card({color}));}}/></label><button className="small-action" onClick={()=>perform(()=>card({color:''}))}>跟随主题</button></div>
    <div className="setting-line"><strong>强调色</strong><div className="tone-picker">{tones.map(([label,color])=><button key={color} aria-label={label} aria-pressed={s.accentColor.toLowerCase()===color} title={label} style={{backgroundColor:color}} onClick={()=>patch({accentColor:color})}>{s.accentColor.toLowerCase()===color&&<Check size={14}/>}</button>)}
      <label className="native-color">自选颜色<input aria-label="自选强调色" type="color" value={s.accentColor||base.accent} onChange={e=>patch({accentColor:e.target.value})}/></label></div></div>
    <div className="setting-line"><span><strong>工作台背景</strong><small>{source}</small></span><div className="appearance-actions">
      {base.scene&&<button className="small-action" onClick={()=>patch({desktopBackdrop:'scene',backgroundImage:'',backgroundVideo:''})}>主题插画</button>}
      <button className="small-action" onClick={()=>patch({desktopBackdrop:'plain',backgroundImage:'',backgroundVideo:''})}>纯色</button>
      {desktop&&<button className="small-action" onClick={()=>perform(async()=>{const file=await invoke('background.choose',{kind:'wallpaper'});if(file)await saveSettings({backgroundVideo:/\.(mp4|webm)$/i.test(file)?file:'',backgroundImage:/\.(mp4|webm)$/i.test(file)?'':file});})}><FolderOpen size={15}/>选择壁纸</button>}</div></div>
    <div className="setting-line"><span><strong>还原当前方案</strong><small>使用「{base.name}」的预设颜色、圆角与背景。</small></span><button className="small-action" onClick={()=>{ui.confirm={title:'还原当前方案？',body:'此方案的颜色、窗格和壁纸将恢复为「'+base.name+'」的预设。',action:()=>change('reset')};}}><RotateCcw size={15}/>恢复预设</button></div>
    {legacy?.available&&<div className="setting-line"><span><strong>本机 0.9.2 外观</strong><small>{legacy.kind} · 圆角 {legacy.radius} px · 窗格 {legacy.opacity}%</small></span><button className="small-action" onClick={()=>setShowLegacy(true)}><History size={15}/>接回旧版外观</button></div>}
  </section>
  <section className="preference-section"><h2>卡片布局</h2><div className="setting-line"><span><strong>备份与分享</strong><small>在各页的「卡片」菜单调整顺序、大小和显隐。布局文件可在导入前预览。</small></span><LayoutSharing/></div></section>
  <Modal open={copy} title="另存外观方案" onClose={()=>setCopy(false)}><form className="theme-form" onSubmit={addCopy}><label>方案名称<input autoFocus required maxLength={32} value={name} onChange={e=>{setName(e.target.value);setError('');}}/></label>{error&&<p role="alert">{error}</p>}<button className="launch-primary" disabled={busy||!name.trim()}>保存方案</button></form></Modal>
  <Modal open={showLegacy} title="接回 0.9.2 外观" onClose={()=>setShowLegacy(false)}><div className="theme-form"><p>{legacy?.missing?'旧版壁纸文件已缺失，可以先恢复窗格和配色。':('将「'+(legacy?.kind||'无壁纸')+'」和窗格设置存入本机方案「我的 0.9.2」。')}{book.entries.some((e:any)=>e.id==='legacy-092')?'会覆盖上次接回的同名方案。':''}</p><button className="launch-primary" disabled={busy} onClick={()=>perform(async()=>{setBusy(true);try{const result=await invoke('profile.look',{apply:true});if(!result.available)throw Error('未找到旧版外观设置');await reload();setShowLegacy(false);notify(result.missing?'已恢复窗格与配色，壁纸文件已缺失':'已接回旧版外观');}finally{setBusy(false);}})}>应用旧版外观</button></div></Modal>
  </>;
}
