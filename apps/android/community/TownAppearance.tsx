import {useState} from 'react';
import {Check} from 'lucide-react';
import {useSnapshot} from 'valtio';
import {saveSettings,state} from '../../desktop/src/model';
import {Modal} from '../../desktop/src/ui';
import {activeDesign,DESKTOP_THEMES} from '../../../packages/engine/core/desktop-themes.mjs';

export function TownAppearance({close,systemReduced}:{close:()=>void;systemReduced:boolean}){
  const model=useSnapshot(state),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const active=activeDesign(model.settings).id,reduce=model.settings.animationSpeed===0;
  async function save(patch:Record<string,unknown>){
    setBusy(true);setError('');
    try{await saveSettings(patch);}catch{setError('外观设置未保存，请重试。');}finally{setBusy(false);}
  }
  return <Modal open title="外观与动效" onClose={close}><div className="town-appearance">
    <div className="town-themes" role="group" aria-label="界面风格">{DESKTOP_THEMES.map(theme=><button type="button" key={theme.id} data-palette={theme.id}
      aria-pressed={theme.id===active} disabled={busy} onClick={()=>void save({townTheme:theme.id})}>
      <span className="town-swatch" aria-hidden><i/><i/><i/></span><span>{theme.name}</span>{theme.id===active&&<Check size={17} aria-hidden/>}
    </button>)}</div>
    <div className="town-option-row"><div><strong>减少动态效果</strong><p id="town-motion-help">{systemReduced?'系统已开启减少动态效果。':'关闭页面过渡和按钮动效，立即生效。'}</p></div>
      <button type="button" className="town-switch" role="switch" aria-label="减少动态效果" aria-describedby="town-motion-help" aria-checked={systemReduced||reduce} disabled={busy||systemReduced} onClick={()=>void save({animationSpeed:reduce?1:0})}><span>{(systemReduced||reduce)&&<Check size={12}/>}</span></button></div>
    {error&&<p role="alert">{error}</p>}
  </div></Modal>;
}
