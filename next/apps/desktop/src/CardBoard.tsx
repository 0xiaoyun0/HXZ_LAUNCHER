import React, {Children, Fragment, isValidElement, useEffect, useMemo, useRef, useState} from 'react';
import {useSnapshot} from 'valtio';
import {GridLayout, useContainerWidth, verticalCompactor, type Layout, type LayoutItem} from 'react-grid-layout';
import {Grip, EyeOff, LayoutDashboard, RotateCcw, Lock, Unlock, MoreHorizontal, Undo2, AlignStartVertical, Expand} from 'lucide-react';
import {state, saveSettings, notify} from './model';
import {Button, Dropdown, Modal, Toggle} from './ui';
import {normalizeCardLayouts, normalizeCardStyle} from '../../../packages/engine/core/card-layout.mjs';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export type CardSpec = {id:string; title:string; content:React.ReactNode; x?:number; y?:number; w?:number; h?:number; minW?:number; minH?:number; maxH?:number; className?:string; plain?:boolean; fit?:boolean};
type Saved = {items:LayoutItem[]; hidden:string[]; locked?:string[]; fixed?:string[]};
const clone = <T,>(value:T):T => JSON.parse(JSON.stringify(value));
const ROW = 22;
function contentHeight(el:HTMLElement) {
  const {height,minHeight}=el.style;
  el.style.height='auto';el.style.minHeight='0';
  const measured=el.scrollHeight;
  el.style.height=height;el.style.minHeight=minHeight;
  return measured;
}
function minimumContent(el:HTMLElement) {
  const original=el.style.cssText;
  // Measure intrinsic controls without changing the card or persisting a layout.
  el.style.width='min-content';el.style.maxWidth='none';
  const width=Math.ceil(el.scrollWidth);
  el.style.cssText=original;
  const scrollRegions=Array.from(el.querySelectorAll<HTMLElement>('.chat-history,.music-track-list,.home-game-rows,.log-output,.forum-list,.lobby-room-list,.lobby-grants'));
  const styles=scrollRegions.map(node=>node.style.cssText);
  for(const node of scrollRegions){node.style.maxHeight='160px';node.style.overflow='auto';}
  const height=contentHeight(el);
  scrollRegions.forEach((node,i)=>node.style.cssText=styles[i]);
  return {width,height};
}

export function CardBoard(props:{id:string; cards:CardSpec[]; label?:string; className?:string}) {
  const {width, containerRef, mounted} = useContainerWidth({measureBeforeMount:true});
  const compact=width<780;
  // A breakpoint change must not reuse an in-flight gesture from the other layout.
  return <section ref={containerRef} className={'card-workspace '+(props.className||'')} aria-label={props.label||'卡片布局'}>
    {mounted&&<Board key={props.id+(compact?'.compact':'.wide')} {...props} width={width} compact={compact}/>}
  </section>;
}

function Board({id,cards,label='卡片布局',width,compact}:{id:string;cards:CardSpec[];label?:string;className?:string;width:number;compact:boolean}) {
  const s=useSnapshot(state),page=id+(compact?'.compact':'.wide'),style=normalizeCardStyle(s.settings.cardStyle);
  const [drawer,setDrawer]=useState(false),[draft,setDraft]=useState<Saved|null>(null),[previous,setPrevious]=useState<Saved|null>(null);
  const [status,setStatus]=useState(''),[gesture,setGesture]=useState(false),[measured,setMeasured]=useState<Record<string,number>>({});
  const [minimum,setMinimum]=useState<Record<string,{width:number;height:number}>>({});
  const revision=useRef(0),live=useRef(true),rendered=useRef<Layout>([]),board=useRef<HTMLDivElement>(null),beforeGesture=useRef<Saved|null>(null);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const geometry=cards.map(c=>[c.id,c.x,c.y,c.w,c.h,c.minW,c.minH,c.maxH,c.fit]);
  const initial=useMemo(()=>{
    let x=0,y=0,row=0;
    return cards.map(c=>{
      const w=compact?((c.w??6)>=8?12:6):c.w??6;
      if(x+w>12){x=0;y+=row;row=0;}
      const h=c.fit?(measured[c.id]??c.h??14):c.h??20;
      const item={i:c.id,x:compact?x:c.x??x,y:compact?y:c.y??y,w,h,minW:compact?Math.min(w,Math.max(6,c.minW??3)):c.minW??3,minH:c.minH??7,maxH:c.maxH??100};
      x+=w;row=Math.max(row,h);return item;
    });
  },[JSON.stringify(geometry),compact,JSON.stringify(measured)]);
  const saved=normalizeCardLayouts({[page]:s.settings.cardLayouts?.[page]})[page] as Saved|undefined;
  const active:Saved=draft??saved??{items:initial,hidden:[],locked:[],fixed:[]};
  const hidden=active.hidden,locked=active.locked||[],fixed=active.fixed||[];
  const automatic=(card:string)=>!fixed.includes(card)&&!locked.includes(card);
  const layout=verticalCompactor.compact(initial.filter(i=>!hidden.includes(i.i)).map(base=>{
    const minimumWidth=minimum[base.i]?.width||0;
    const minW=Math.min(12,Math.max(base.minW,Math.ceil((minimumWidth+style.gap)/((width+style.gap)/12))));
    const v=active.items.find(i=>i.i===base.i),w=Math.max(minW,Math.min(12,v?.w??base.w));
    const minH=Math.min(base.maxH,Math.max(base.minH,minimum[base.i]?.height||4));
    return {...base,...v,w,x:Math.max(0,Math.min(v?.x??base.x,12-w)),h:Math.min(base.maxH,Math.max(minH,automatic(base.i)?measured[base.i]??v?.h??base.h:v?.h??base.h)),minW,minH,maxH:base.maxH,static:locked.includes(base.i)};
  }),12);
  const merge=(visible:Layout):Saved=>({items:clone([...active.items.filter(i=>!visible.some(v=>v.i===i.i)),...visible]),hidden:[...hidden],locked:[...locked],fixed:[...fixed]});
  const capture=()=>merge(rendered.current.length?rendered.current:layout);
  async function persist(next:Saved,remember=true) {
    const ticket=++revision.current;
    if(remember)setPrevious(capture());
    setDraft(next);setStatus('正在保存…');
    try {
      // Resolve the map when the queued write starts, not at gesture time.
      await saveSettings((settings:any)=>({cardLayouts:normalizeCardLayouts({...settings.cardLayouts,[page]:next})}));
      if(live.current&&ticket===revision.current){setDraft(null);setStatus('已自动保存');}
    } catch(e:any) {
      if(live.current&&ticket===revision.current){setStatus('保存失败，点击重试');notify('布局仍保留在本页：'+e.message,true);}
    }
  }
  function change(card:string,action:string) {
    const next=capture(),item=next.items.find(i=>i.i===card),base=initial.find(i=>i.i===card);
    if(!base)return;
    if(action==='hide')next.hidden=[...new Set([...next.hidden,card])];
    if(action==='show'){next.hidden=next.hidden.filter(i=>i!==card);if(!item)next.items.push({...base,y:Math.max(0,...next.items.map(i=>i.y+i.h))});}
    if(action==='lock')next.locked=locked.includes(card)?locked.filter(i=>i!==card):[...locked,card];
    if(item&&action==='reset'){Object.assign(item,base);next.locked=locked.filter(i=>i!==card);next.fixed=fixed.filter(i=>i!==card);}
    if(action==='auto')next.fixed=fixed.includes(card)?fixed.filter(i=>i!==card):[...fixed,card];
    if(item&&action==='fit'){
      next.fixed=fixed.filter(i=>i!==card);
      const el=Array.from(board.current?.querySelectorAll<HTMLElement>('[data-card]')||[]).find(e=>e.dataset.card===card);
      const inner=el?.querySelector<HTMLElement>('.card-inner');
      if(inner)item.h=Math.min(100,Math.max(base.minH,Math.ceil((contentHeight(inner)+64+style.gap)/ROW)));
    }
    if(item&&['narrow','half','wide','full'].includes(action)){
      item.w=Math.max(base.minW,({narrow:3,half:6,wide:8,full:12} as Record<string,number>)[action]!);item.x=Math.min(item.x,12-item.w);
    }
    if(item&&action==='align'){
      next.fixed=[...new Set([...fixed,card])];
      const neighbors=next.items.filter(i=>i.i!==card&&!hidden.includes(i.i)&&Math.abs(i.y-item.y)<=2);
      if(neighbors.length){const edge=Math.max(...neighbors.map(i=>i.y+i.h));item.h=Math.max(base.minH,edge-item.y);}
    }
    rendered.current=[];void persist(next);
  }
  function start(){beforeGesture.current=capture();setGesture(true);}
  function stop(value:Layout,resizeId?:string){setGesture(false);setPrevious(beforeGesture.current);const next=merge(value);if(resizeId)next.fixed=[...new Set([...fixed,resizeId])];void persist(next,false);}
  return <div ref={board} className={'card-board '+(gesture?'moving':'')} style={{'--card-gap':style.gap+'px'} as React.CSSProperties}>
    <div className="card-layout-toolbar"><span>{label}</span><div>
      <button className={'layout-save-status '+(status.startsWith('保存失败')?'error':'')} disabled={!status.startsWith('保存失败')} onClick={()=>draft&&void persist(draft,false)} aria-live="polite">{gesture?'松手即可对齐':status||'拖动手柄整理 · 自动保存'}</button>
      {previous&&<Button icon={Undo2} onClick={()=>{const value=previous;setPrevious(null);rendered.current=[];return persist(value,false);}}>撤销</Button>}
      <Button icon={LayoutDashboard} onClick={()=>setDrawer(true)}>卡片{hidden.length?' · '+hidden.length+' 已隐藏':''}</Button>
    </div></div>
    <GridLayout width={width} layout={layout} gridConfig={{cols:12,rowHeight:ROW,margin:[style.gap,0],containerPadding:[0,0]}}
      dragConfig={{enabled:true,handle:'.card-drag-handle',cancel:'input,textarea,a,.card-content,.card-menu-trigger',threshold:5}}
      resizeConfig={{enabled:true,handles:['se']}} compactor={verticalCompactor}
      onLayoutChange={v=>{rendered.current=v;}} onDragStart={start} onResizeStart={start} onDragStop={v=>stop(v)} onResizeStop={(v,_old,item)=>stop(v,item?.i)}>
      {cards.filter(c=>!hidden.includes(c.id)).map(c=><article key={c.id} data-card={c.id} data-min-w={layout.find(item=>item.i===c.id)?.minW} data-min-h={layout.find(item=>item.i===c.id)?.minH} data-sizing={automatic(c.id)?'auto':'fixed'} className={'card-slot '+(automatic(c.id)?'auto-sized ':'')+(locked.includes(c.id)?'locked ':'')+(c.className||'')}>
        <div className="air-card"><header className="card-heading"><h2>{c.title}</h2><div>
          <button className="card-drag-handle" aria-label={'拖动'+c.title} title={locked.includes(c.id)?'已锁定，可在菜单解锁':'拖动位置；方向键也可移动'} disabled={locked.includes(c.id)} onKeyDown={e=>{
            if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();
            const next=capture(),item=next.items.find(i=>i.i===c.id);if(!item)return;
            if(e.key==='ArrowLeft')item.x=Math.max(0,item.x-1);if(e.key==='ArrowRight')item.x=Math.min(12-item.w,item.x+1);
            if(e.key==='ArrowUp'||e.key==='ArrowDown'){
              const ordered=next.items.filter(i=>!hidden.includes(i.i)).sort((a,b)=>a.y-b.y||a.x-b.x),index=ordered.findIndex(i=>i.i===c.id),other=ordered[index+(e.key==='ArrowUp'?-1:1)];
              if(other&&!locked.includes(other.i)){const {x,y}=item;item.x=Math.min(other.x,12-item.w);item.y=other.y;other.x=Math.min(x,12-other.w);other.y=y;}
            }rendered.current=[];void persist(next);
          }}><Grip size={15}/></button>
          <Dropdown trigger={<button className="card-menu-trigger" aria-label={c.title+'卡片选项'} title="尺寸、对齐与隐藏">{locked.includes(c.id)?<Lock size={14}/>:<MoreHorizontal size={17}/>}</button>} items={[
            {label:locked.includes(c.id)?'解锁卡片':'锁定位置与尺寸',icon:locked.includes(c.id)?Unlock:Lock,action:()=>change(c.id,'lock')},
            {separator:true},...['narrow','half','wide','full'].map((size,n)=>({label:['紧凑宽度','半页宽度','宽幅卡片','整行宽度'][n],disabled:locked.includes(c.id),action:()=>change(c.id,size)})),
            {label:'按内容自动调整',checked:!fixed.includes(c.id),disabled:locked.includes(c.id),action:()=>change(c.id,'auto')},
            {label:'适应内容高度',icon:Expand,disabled:locked.includes(c.id),action:()=>change(c.id,'fit')},
            {label:'与同排卡片等高',icon:AlignStartVertical,disabled:locked.includes(c.id),action:()=>change(c.id,'align')},
            {separator:true},{label:'恢复这张卡片',icon:RotateCcw,action:()=>change(c.id,'reset')},
            {label:'隐藏卡片',icon:EyeOff,action:()=>change(c.id,'hide')}
          ]}/></div></header>
          <div className={'card-content '+(c.plain?'plain':'')}><CardContents fit={automatic(c.id)} paused={gesture} gap={style.gap} onHeight={h=>setMeasured(m=>m[c.id]===h?m:{...m,[c.id]:h})} onMinimum={value=>setMinimum(m=>m[c.id]?.width===value.width&&m[c.id]?.height===value.height?m:{...m,[c.id]:value})}>{c.content}</CardContents></div>
        </div>
      </article>)}
    </GridLayout>
    {!layout.length&&<div className="all-cards-hidden"><LayoutDashboard/><p>这里的卡片都已隐藏</p><Button onClick={()=>setDrawer(true)}>找回卡片</Button></div>}
    <Modal open={drawer} onClose={()=>setDrawer(false)} title="这个页面的卡片" description="默认按内容调整高度，宽度保持网格对齐。长列表保留滚动；手动拉伸后固定尺寸，可在卡片菜单重新开启自动调整。">
      <div className="card-palette">{cards.map(c=><section key={c.id}><Toggle label={c.title} checked={!hidden.includes(c.id)} onChange={(visible:boolean)=>change(c.id,visible?'show':'hide')}/></section>)}</div>
      <footer className="modal-actions"><Button icon={Expand} onClick={()=>{const next=capture();next.fixed=[];void persist(next);}}>全部按内容调整</Button><Button icon={RotateCcw} onClick={()=>{rendered.current=[];void persist({items:clone(initial),hidden:[],locked:[],fixed:[]});setDrawer(false);}}>恢复默认布局</Button><Button onClick={()=>setDrawer(false)}>完成</Button></footer>
    </Modal>
  </div>;
}
function CardContents({fit,paused,gap,onHeight,onMinimum,children}:{fit:boolean;paused:boolean;gap:number;onHeight:(n:number)=>void;onMinimum:(value:{width:number;height:number})=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDivElement>(null),callback=useRef(onHeight),minCallback=useRef(onMinimum);callback.current=onHeight;minCallback.current=onMinimum;
  useEffect(()=>{
    if(paused||!ref.current)return;
    const el=ref.current;let frame=0;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      // Temporary intrinsic sizing must not change a reader's scroll position.
      const scrollPositions=Array.from(el.querySelectorAll<HTMLElement>('.chat-history,.music-track-list,.home-game-rows,.log-output,.forum-list,.lobby-room-list,.lobby-grants')).map(node=>({node,top:node.scrollTop,left:node.scrollLeft}));
      const parent=el.parentElement!,card=parent.parentElement!,heading=card.querySelector<HTMLElement>('.card-heading');
      const css=getComputedStyle(parent),padding=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom);
      const natural=contentHeight(el)+(heading?.offsetHeight||40)+padding+gap+2;
      // Avoid unbounded growth for chat/history/library cards. Overflow stays usable inside the card.
      const limit=Math.max(12,Math.min(40,Math.floor((window.innerHeight-170)/ROW)));
      if(fit)callback.current(Math.max(4,Math.min(limit,Math.ceil(natural/ROW))));
      const min=minimumContent(el),sidePadding=parseFloat(css.paddingLeft)+parseFloat(css.paddingRight);
      for(const {node,top,left} of scrollPositions){node.scrollTop=top;node.scrollLeft=left;}
      minCallback.current({width:min.width+sidePadding+2,height:Math.max(4,Math.min(limit,Math.ceil((min.height+(heading?.offsetHeight||40)+padding+gap+2)/ROW)))});
    });};
    const observer=new ResizeObserver(measure);observer.observe(el);
    const mutations=new MutationObserver(measure);mutations.observe(el,{subtree:true,childList:true,characterData:true});
    el.addEventListener('load',measure,true);window.addEventListener('resize',measure);measure();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();mutations.disconnect();el.removeEventListener('load',measure,true);window.removeEventListener('resize',measure);};
  },[fit,paused,gap]);
  return <div ref={ref} className={'card-inner '+(fit?'natural-height':'')}>{children}</div>;
}
function flatten(children:React.ReactNode):React.ReactNode[] {return Children.toArray(children).flatMap(c=>isValidElement(c)&&c.type===Fragment?flatten((c.props as any).children):[c]);}
function heading(children:React.ReactNode):string {for(const c of flatten(children))if(isValidElement(c)){if(['h2','h3'].includes(String(c.type))){return Children.toArray((c.props as any).children).filter(v=>typeof v==='string').join('');}const nested=heading((c.props as any).children);if(nested)return nested;}return '';}
export function FormCards({id,children}:{id:string;children:React.ReactNode}) {
  const nodes=flatten(children).filter(isValidElement) as React.ReactElement<any>[];
  return <CardBoard id={id} label="设置卡片" cards={nodes.map((node,i)=>({id:node.props['data-card']||'section-'+i,title:node.props['data-card-title']||heading(node.props.children)||'外观预览',content:node,w:6,h:node.props['data-height']||14,minW:5,minH:7,fit:true,className:'form-card'}))}/>;
}
export function PanelGroup({id,children,names=[],widths=[],heights=[],maxHeights=[],positions=[],className=''}:{id:string;children:React.ReactNode;names?:string[];widths?:number[];heights?:number[];maxHeights?:number[];positions?:number[][];className?:string}) {
  const nodes=flatten(children).filter(isValidElement) as React.ReactElement<any>[];
  let x=0,y=0,row=0;
  const cards=nodes.map((node,i)=>{
    const w=widths[i]||6,h=heights[i]||24;if(x+w>12){x=0;y+=row;row=0;}
    const card={id:node.props['data-card']||'panel-'+i,title:names[i]||heading(node.props.children)||'功能面板',content:node,w,h,x:positions[i]?.[0]??x,y:positions[i]?.[1]??y,minW:Math.min(5,w),minH:Math.min(h,10),maxH:maxHeights[i],className:'panel-card'};
    x+=w;row=Math.max(row,h);return card;
  });
  return <CardBoard id={id} cards={cards} className={className} label="页面布局"/>;
}
