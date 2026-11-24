import {useEffect,useRef,type PointerEvent} from 'react';
import {ArrowDown,ArrowUp,Check,GripVertical,ImagePlus,Trash2,Video} from 'lucide-react';
import {cardNames,importVisual,useLocalMedia,type CardId,type Personalization,type Slot,type TownLayout} from './personalization';

type EditProps={personal:Personalization;busy:boolean;run:(action:()=>Promise<void>)=>void};

function Choices<T extends string|number>({label,choices,value,onChange,disabled}:{label:string;choices:readonly (readonly [T,string])[];value:T;onChange:(value:T)=>void;disabled:boolean}){
  return <div className="town-editor-choice" role="group" aria-label={label}>{choices.map(([id,name])=>
    <button type="button" key={id} aria-pressed={value===id} disabled={disabled} onClick={()=>onChange(id)}>{name}</button>)}</div>;
}

export function TownMediaEditor({slot,personal,busy,run}:{slot:Slot}&EditProps){
  const {layout,media,save}=personal,background=slot==='background',asset=media[slot];
  const imageInput=useRef<HTMLInputElement>(null),videoInput=useRef<HTMLInputElement>(null);
  const cached=useLocalMedia(asset?.kind==='video'?asset.poster:asset?.blob);
  const focusKey=background?'backgroundFocus':'coverFocus';
  const src=layout[slot]==='scene'?'./media/town/town-hall.webp':layout[slot]==='custom'?cached:undefined;
  function select<K extends keyof TownLayout>(key:K,value:TownLayout[K]){run(()=>save(current=>({...current,[key]:value})));}
  function pick(file:File|undefined,kind:'image'|'video'){
    if(!file)return;
    run(async()=>{const visual=await importVisual(file,kind);await save(current=>({...current,[slot]:'custom'}),{slot,value:visual});});
  }
  return <div className="town-media-editor">
    <div className={'town-media-preview '+(background?'back-preview':'cover-preview')} aria-label={background?'背景预览':'头图预览'}>
      {src&&<img src={src} alt="" style={{objectPosition:'50% '+layout[focusKey]+'%'}}/>}
      {background&&src&&<span className="preview-wash" style={{opacity:layout.shade/100}}/>}
      <strong className={!background&&src?'photo-label':''}>{background?'社区背景':'社区大厅'}</strong>
    </div>
    <Choices label={background?'背景样式':'头图样式'} disabled={busy} value={layout[slot]} onChange={value=>select(slot,value)} choices={[
      ['plain',background?'跟随主题':'简洁标题'],...(!background&&layout.cover==='scene'?[['scene','现用头图'] as const]:[]),...(asset?[['custom',background?'我的背景':'我的头图'] as const]:[])]}/>
    <div className="town-editor-actions">
      <button className="small-action" type="button" disabled={busy} onClick={()=>imageInput.current?.click()}><ImagePlus size={16}/>选择图片</button>
      <input ref={imageInput} className="town-file-input" type="file" tabIndex={-1} aria-label={background?'背景图片文件':'头图图片文件'} accept="image/*" onChange={e=>{const file=e.target.files?.[0];e.target.value='';pick(file,'image');}}/>
      {background&&<><button className="small-action" type="button" disabled={busy} onClick={()=>videoInput.current?.click()}><Video size={16}/>选择视频</button>
        <input ref={videoInput} className="town-file-input" type="file" tabIndex={-1} aria-label="背景视频文件" accept="video/*" onChange={e=>{const file=e.target.files?.[0];e.target.value='';pick(file,'video');}}/></>}
    </div>
    {layout[slot]!=='plain'&&<div><h3>画面位置</h3><Choices label="画面位置" disabled={busy} value={layout[focusKey]} onChange={v=>select(focusKey,v)} choices={[[0,'靠上'],[50,'居中'],[100,'靠下']]}/></div>}
    {background&&layout.background==='custom'&&<div><h3>背景淡化</h3><Choices label="背景淡化" disabled={busy} value={layout.shade} onChange={v=>select('shade',v)} choices={[[28,'轻'],[60,'适中'],[82,'强']]}/></div>}
    {asset?.kind==='video'&&background&&<p>视频静音循环，切到后台时暂停。开启减少动态效果后显示静态画面。</p>}
    {asset&&<button type="button" className="text-action town-remove" disabled={busy} onClick={()=>run(()=>save(current=>({...current,[slot]:current[slot]==='custom'?'plain':current[slot]}),{slot,value:null}))}><Trash2 size={15}/>{background?'移除自选背景':'移除自选头图'}</button>}
  </div>;
}

export function TownCardEditor({personal,busy,run}:EditProps){
  const {layout,save}=personal;
  const list=useRef<HTMLDivElement>(null);
  type Row={node:HTMLElement;top:number;height:number};
  const drag=useRef<{pointer:number;startY:number;from:number;to:number;rows:Row[];gap:number}|null>(null);
  function release(){
    const active=drag.current;drag.current=null;
    active?.rows.forEach(({node})=>{node.style.removeProperty('--card-shift');node.removeAttribute('data-lift');node.removeAttribute('data-target');});
    return active;
  }
  useEffect(()=>{window.addEventListener('town-pause',release);return ()=>{release();window.removeEventListener('town-pause',release);};},[]);
  function begin(event:PointerEvent<HTMLElement>,from:number){
    if(busy||!list.current||!event.isPrimary||event.button!==0)return;
    const rows=Array.from(list.current.querySelectorAll<HTMLElement>('.town-edit-card'),node=>{
      const {top,height}=node.getBoundingClientRect();return {node,top,height};
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    const gap=parseFloat(getComputedStyle(list.current).rowGap)||0;
    drag.current={pointer:event.pointerId,startY:event.clientY,from,to:from,rows,gap};
    rows[from].node.dataset.lift='true';
  }
  function track(event:PointerEvent<HTMLElement>){
    const active=drag.current;if(!active||active.pointer!==event.pointerId)return;
    const {from,rows,startY,gap}=active,row=rows[from],last=rows[rows.length-1];
    const travel=Math.min(last.top+last.height-row.top-row.height,Math.max(rows[0].top-row.top,event.clientY-startY));
    const center=row.top+row.height/2+travel;
    let to=from;
    rows.forEach((item,i)=>{if(i<from&&center<item.top+item.height/2)to=Math.min(to,i);
      if(i>from&&center>item.top+item.height/2)to=Math.max(to,i);});
    active.to=to;
    rows.forEach(({node},i)=>{
      const shift=i===from?travel:i>=to&&i<from?row.height+gap:i<=to&&i>from?-row.height-gap:0;
      node.style.setProperty('--card-shift',shift+'px');
      if(i===to)node.dataset.target='true';else node.removeAttribute('data-target');
    });
  }
  function drop(event:PointerEvent<HTMLElement>){
    if(drag.current?.pointer!==event.pointerId)return;
    const action=release();
    if(action&&action.to!==action.from)move(layout.order[action.from],action.to-action.from);
  }
  function move(card:CardId,delta:number){run(()=>save(current=>{
    const index=current.order.indexOf(card),to=index+delta;if(to<0||to>=current.order.length)return current;
    const order=[...current.order];order.splice(index,1);order.splice(to,0,card);return {...current,order};
  }));}
  function toggle(card:CardId){run(()=>save(current=>({...current,hidden:current.hidden.includes(card)?current.hidden.filter(id=>id!==card):[...current.hidden,card]})));}
  return <div ref={list} className="town-card-editor">{layout.order.map((id,index)=><div className="town-edit-card" key={id}>
    <div className="town-card-label"><span className="town-grip" aria-hidden="true" onPointerDown={e=>begin(e,index)} onPointerMove={track}
      onPointerUp={drop} onPointerCancel={release} onLostPointerCapture={release}><GripVertical size={18}/></span><strong>{cardNames[id]}</strong></div><div className="town-card-tools">
      <button type="button" aria-label={'将'+cardNames[id]+'上移'} disabled={busy||index===0} onClick={()=>move(id,-1)}><ArrowUp size={16}/></button>
      <button type="button" aria-label={'将'+cardNames[id]+'下移'} disabled={busy||index===layout.order.length-1} onClick={()=>move(id,1)}><ArrowDown size={16}/></button>
      <button type="button" className="town-switch" role="switch" aria-label={'显示'+cardNames[id]} aria-checked={!layout.hidden.includes(id)} disabled={busy} onClick={()=>toggle(id)}><span>{!layout.hidden.includes(id)&&<Check size={12}/>}</span></button>
    </div></div>)}<button type="button" className="text-action" disabled={busy} onClick={()=>run(()=>save(current=>({...current,order:['servers','notices','topics'],hidden:[]})))}>恢复默认顺序与显示</button></div>;
}
