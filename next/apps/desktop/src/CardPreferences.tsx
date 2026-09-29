import {useSnapshot} from 'valtio';
import {Link} from 'react-router-dom';
import {LayoutDashboard,RotateCcw} from 'lucide-react';
import {state,ui,saveSettings,perform,notify} from './model';
import {normalizeCardStyle} from '../../../packages/engine/core/card-layout.mjs';
import {Button,Field} from './ui';
export function CardPreferences(){
 const s=useSnapshot(state),style=normalizeCardStyle(s.settings.cardStyle);
 const update=(patch:any)=>perform(()=>saveSettings((settings:any)=>({cardStyle:{...normalizeCardStyle(settings.cardStyle),...patch}})));
 return <div className="setting-group card-preferences"><h3>卡片与布局</h3><p className="muted">拖动每张卡片标题旁的手柄，右下角改变大小，松手自动对齐并保存。卡片菜单可以锁定、隐藏、等高或恢复。</p><div className="toolbar"><Link className="button" to="/"><LayoutDashboard size={17}/>整理启动页</Link><Button icon={RotateCcw} onClick={()=>ui.confirm={title:'恢复所有页面的布局？',message:'恢复卡片的位置、尺寸和显隐。账号、实例与其他设置会保留。',action:async()=>{ui.layoutUnsaved?.discard();await saveSettings({cardLayouts:{}});notify('所有页面的卡片布局已恢复');}}}>恢复全部布局</Button></div><Field label="卡片底色"><div className="color-options">{['','#ffffff','#edf1fb','#f6f2e9','#e9f1ed'].map(color=><button key={color} title={color||'随主题'} style={{background:color||'var(--surface)',border:'1px solid var(--line)'}} onClick={()=>update({color})}>{!color?'随':' '}</button>)}<input type="color" aria-label="自定义卡片颜色" value={style.color||'#ffffff'} onChange={e=>update({color:e.target.value})}/></div></Field><Field label={'卡片不透明度 · '+Math.round(style.opacity*100)+'%'} hint="最低 20%；弹窗使用实色，避免文字相互重叠"><input type="range" min=".2" max="1" step=".05" value={style.opacity} onChange={e=>update({opacity:Number(e.target.value)})}/></Field><Field label={'卡片间距 · '+style.gap+' px'}><input type="range" min="8" max="24" step="2" value={style.gap} onChange={e=>update({gap:Number(e.target.value)})}/></Field><Field label={'卡片圆角 · '+style.radius+' px'}><input type="range" min="4" max="20" step="2" value={style.radius} onChange={e=>update({radius:Number(e.target.value)})}/></Field></div>;
}
