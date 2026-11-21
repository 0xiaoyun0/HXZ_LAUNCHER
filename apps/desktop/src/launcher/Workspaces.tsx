import {SectionHeading} from '../SectionHeading';
import {useState} from 'react';
import {Check,LayoutGrid,LibraryBig,NotebookPen,SlidersHorizontal} from 'lucide-react';
import {useSnapshot} from 'valtio';
import {WORKSPACES,WORKSPACE_MODULES,workspaceLayout,workspaceModules,workspaceShelf} from '../../../../packages/engine/core/desktop-workspace.mjs';
import {perform,saveSettings,state} from '../model';
import {LayoutSharing} from '../LayoutSharing';
import {PreferenceSwitch} from './ChoiceControls';
import {Modal} from '../ui';

const icons=[LayoutGrid,LibraryBig,NotebookPen];
export function Workspaces(){
  const s=useSnapshot(state).settings,active=workspaceLayout(s.workspaceLayout),modules=workspaceModules(s.workspaceModules);
  const shelf=workspaceShelf(s.workspaceShelf),[organize,setOrganize]=useState(false);
  return <>
    <section className="preference-section workspace-picker"><SectionHeading title="首页布局" actions={<button className="text-action" onClick={()=>setOrganize(true)}><SlidersHorizontal size={14}/>整理布局</button>}/>
      <div className="workspace-choices">{WORKSPACES.map((choice,index)=>{
        if(!shelf.includes(choice.id))return null;
        const selected=choice.id===active.id,Icon=icons[index];
        return <button key={choice.id} type="button" className="workspace-choice" data-layout={choice.id} aria-label={'使用'+choice.name} aria-pressed={selected}
          onClick={()=>perform(()=>saveSettings({workspaceLayout:choice.id}))}>
          <span className="workspace-diagram" aria-hidden="true"><span className="diagram-chrome"><i/><i/><i/></span><span className="diagram-grid"><i/><i/><i/><i/><i/></span></span>
          <span className="choice-title"><Icon size={16}/><strong>{choice.name}</strong>{selected&&<Check size={15}/>}</span><small>{choice.caption}</small>
        </button>;
      })}</div>
    </section>
    <section className="preference-section"><h2>启动入口</h2><PreferenceSwitch name="默认打开极简版" caption="下次打开启动器时直接选择实例并游玩。" checked={s.liteStartup===true} change={on=>saveSettings({liteStartup:on})}/></section>
    <section className="preference-section"><h2>界面模块</h2><div className="module-options">
      {WORKSPACE_MODULES.map(item=><PreferenceSwitch key={item.id} name={item.name} caption={item.caption} checked={modules[item.id]}
        change={on=>saveSettings({workspaceModules:{[item.id]:on}})}/>)}
    </div></section>
    <section className="preference-section"><h2>卡片布局</h2><div className="setting-line"><span><strong>备份与分享</strong><small>在各页的「卡片」菜单调整顺序、大小和显隐。三套首页分别记住你的排布。</small></span><LayoutSharing/></div></section>
    <Modal open={organize} title="整理工作台布局" onClose={()=>setOrganize(false)}><p>选择布局列表里保留的界面。再次添加时会恢复之前整理的卡片。至少保留一套。</p>
      {WORKSPACES.map(item=><PreferenceSwitch key={item.id} name={'保留'+item.name} caption={item.caption} checked={shelf.includes(item.id)} disabled={shelf.length===1&&shelf[0]===item.id}
        change={on=>saveSettings((current:any)=>{const ids=workspaceShelf(current.workspaceShelf);return {workspaceShelf:on?[...ids,item.id]:ids.filter(id=>id!==item.id)};})}/>)}
      <footer className="modal-actions"><button className="launch-primary" onClick={()=>setOrganize(false)}>完成</button></footer></Modal>
  </>;
}
