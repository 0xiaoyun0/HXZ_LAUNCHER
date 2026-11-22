import {useId,useState} from 'react';
import {Check} from 'lucide-react';
import {useSnapshot} from 'valtio';
import {saveSettings,state} from '../../desktop/src/model';
import {Modal} from '../../desktop/src/ui';
import {activeDesign,DESKTOP_THEMES} from '../../../packages/engine/core/desktop-themes.mjs';
import {TownCardEditor,TownMediaEditor} from './TownHomeEditor';
import type {Personalization} from './personalization';

const sections=[['style','风格'],['background','背景'],['cover','头图'],['cards','首页卡片']] as const;
export type AppearanceSection=typeof sections[number][0];
export function TownAppearance({close,systemReduced,personal,initial}:{close:()=>void;systemReduced:boolean;personal:Personalization;initial:AppearanceSection}){
  const model=useSnapshot(state),[busy,setBusy]=useState(false),[error,setError]=useState(''),[section,setSection]=useState(initial),prefix=useId();
  const active=activeDesign(model.settings).id,reduce=model.settings.animationSpeed===0;
  async function run(action:()=>Promise<void>){
    setBusy(true);setError('');
    try{await action();}catch(e){setError(e instanceof Error?e.message:'外观设置未保存，请重试。');}finally{setBusy(false);}
  }
  const save=(patch:Record<string,unknown>)=>run(async()=>{await saveSettings(patch);});
  function tab(id:AppearanceSection){setSection(id);setError('');}
  return <Modal open title="外观与动效" onClose={close}><div className="town-appearance">
    <div className="town-custom-tabs" role="tablist" aria-label="个性化分类">{sections.map(([id,label],index)=><button key={id} type="button" role="tab" aria-selected={section===id} id={prefix+id} aria-controls={prefix+'panel'} tabIndex={section===id?0:-1} disabled={busy} onClick={()=>tab(id)} onKeyDown={event=>{
      const n=sections.length;const next=event.key==='Home'?0:event.key==='End'?n-1:event.key==='ArrowRight'?(index+1)%n:event.key==='ArrowLeft'?(index+n-1)%n:-1;
      if(next>=0){event.preventDefault();tab(sections[next][0]);document.getElementById(prefix+sections[next][0])?.focus();}
    }}>{label}</button>)}</div><div className="town-custom-panel" role="tabpanel" id={prefix+'panel'} aria-labelledby={prefix+section}>
    {section==='style'?<>
    <div className="town-themes" role="group" aria-label="界面风格">{DESKTOP_THEMES.map(theme=><button type="button" key={theme.id} data-palette={theme.id}
      aria-pressed={theme.id===active} disabled={busy} onClick={()=>void save({townTheme:theme.id})}>
      <span className="town-swatch" aria-hidden><i/><i/><i/></span><span>{theme.name}</span>{theme.id===active&&<Check size={17} aria-hidden/>}
    </button>)}</div>
    <div className="town-option-row"><div><strong>减少动态效果</strong><p id="town-motion-help">{systemReduced?'系统已开启减少动态效果。':'关闭页面过渡和按钮动效，立即生效。'}</p></div>
      <button type="button" className="town-switch" role="switch" aria-label="减少动态效果" aria-describedby="town-motion-help" aria-checked={systemReduced||reduce} disabled={busy||systemReduced} onClick={()=>void save({animationSpeed:reduce?1:0})}><span>{(systemReduced||reduce)&&<Check size={12}/>}</span></button></div>
    </>:section==='cards'?<TownCardEditor personal={personal} busy={busy||!personal.ready} run={run}/>:<TownMediaEditor key={section} slot={section} personal={personal} busy={busy||!personal.ready} run={run}/>}</div>
    {busy&&<p role="status">正在保存…</p>}{error&&<p className="inline-error" role="alert">{error}</p>}
  </div></Modal>;
}
