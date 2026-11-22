import {SectionHeading} from './SectionHeading';
import {Children,Fragment,Suspense,createContext,isValidElement,lazy,useContext,useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactElement,type ReactNode} from 'react';
import {ArrowDown,ArrowUp,Check,Ellipsis,GripVertical,LayoutGrid,LockKeyhole,MoveUpRight,Plus,RotateCcw,Undo2,UnlockKeyhole} from 'lucide-react';
import {useSnapshot} from 'valtio';
import {boardCards,updateBoard} from '../../../packages/engine/core/board-preferences.mjs';
import {CARD_PAGES,normalizeCardPlacements,isPortableCard} from '../../../packages/engine/core/card-extras.mjs';
import {ChoiceGroup} from './launcher/ChoiceControls';
import {cardHeightEm,cardPositions,useCardGrid} from './CardGrid';
import {CardGestures} from './CardGestures';
import {CardHarvest,ForeignCard,HarvestedCards,moveCard,startCardTravel} from './PortableCards';
import {state,ui,saveSettings,perform} from './model';
import {DialogSections,Modal} from './ui';

const AddWidget=lazy(()=>import('./Widgets').then(m=>({default:m.AddWidget})));
const Widget=lazy(()=>import('./Widgets').then(m=>({default:m.Widget})));
export const desktopCardSources=[['home','启动游戏'],['music','音乐播放器'],['install','安装游戏']];
export type CardSpec={id:string;title:string;content:ReactNode;w?:number;x?:number;y?:number;h?:number;minW?:number;minH?:number;maxH?:number;className?:string;plain?:boolean;fit?:boolean;native?:boolean;origin?:{source:string;card:string;title:string;w?:number;minW?:number;widget?:boolean}};
type Props={id:string;cards:CardSpec[];label?:string;pageTitle?:boolean;className?:string;transient?:boolean;home?:boolean;layoutKey?:string;columns?:string[][];beforeCards?:ReactNode;actions?:ReactNode};
const CardControls=createContext<{show:(id:string)=>void;id:string;title:string;move:ReactNode}|null>(null);
function CardMenu(){
  const card=useContext(CardControls);
  return card?<span className="card-heading-tools">{card.move}<button className="card-options" type="button" aria-label={card.title+'卡片选项'} title="卡片选项" onClick={()=>card.show(card.id)}><Ellipsis size={17}/></button></span>:null;
}
function panels(children:ReactNode):ReactElement<any>[]{
  return Children.toArray(children).flatMap(child=>isValidElement<any>(child)?child.type===Fragment?panels((child.props as {children?:ReactNode}).children):[child]:[]);
}
export function CardBoard(props:Props){
  const harvest=useContext(CardHarvest);
  return harvest?<HarvestedCards source={props.id} cards={props.cards}/>:<PlayerBoard {...props}/>;
}
export function CardHeading({title,children,className}:{title:ReactNode;children?:ReactNode;className?:string}){
  return <SectionHeading title={title} className={className} actions={<>{children}<CardMenu/></>}/>;
}

function PlayerBoard({id,cards,label,className='',home=false,pageTitle=false,actions,beforeCards,columns,layoutKey=id,transient=false}:Props){
  const s=useSnapshot(state),root=useRef<HTMLDivElement>(null),grid=useRef<HTMLDivElement>(null),[compact,setCompact]=useState(false);
  const [manage,setManage]=useState(false),[target,setTarget]=useState(''),[add,setAdd]=useState(false),[busy,setBusy]=useState(false);
  const [undo,setUndo]=useState<{key:string;value:any}|null>(null),[drag,setDrag]=useState(''),[local,setLocal]=useState<any>();
  const [failure,setFailure]=useState(''),[editing,setEditing]=useState(false);
  const [pending,setPending]=useState<{key:string;value:any}|null>(null);
  useLayoutEffect(()=>{
    const el=root.current;if(!el)return;
    const measure=()=>setCompact(el.clientWidth<=52*parseFloat(getComputedStyle(el).fontSize));
    measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();
  },[s.settings.fontSize]);
  const key=layoutKey+(compact?'.compact':'.wide'),stored=transient?local:s.settings.cardLayouts?.[key];
  const transferable=desktopCardSources.some(([board])=>board===id),supportsWidgets=CARD_PAGES.some(([board])=>board===id);
  const canTravel=(source:string)=>desktopCardSources.some(([b])=>b===source);
  const placements=Object.values(normalizeCardPlacements(s.settings.cardPlacements)) as any[];
  const away=placements.filter(p=>transferable&&p.source===id&&canTravel(p.target));
  const specs=[...cards.filter(c=>!away.some(p=>p.card===c.id))];
  if(transferable)for(const p of placements.filter(p=>p.target===id&&canTravel(p.source)))specs.push({id:'moved.'+p.source+'.'+p.card,title:p.title,w:p.w,origin:p,content:<ForeignCard source={p.source} card={p.card}/>});
  if(supportsWidgets)for(const widget of s.settings.widgets||[])if(widget.page===id)specs.push({id:'widget.'+widget.id,title:widget.title,w:4,origin:{source:id,card:widget.id,title:widget.title,widget:true},content:<Suspense fallback={null}><Widget id={widget.id} editing={editing}/></Suspense>});
  const effective=pending?.key===key?pending.value:stored;
  const rows=boardCards(specs,effective),visible=rows.filter(r=>r.visible),custom=!!effective||!!away.length||specs.length!==cards.length;
  const show=(focus='')=>{setTarget(focus||rows[0]?.id||'');setFailure('');setManage(true);};
  useEffect(()=>{setUndo(null);setLocal(undefined);},[key]);
  async function write(edit:(old:any)=>any,remember=true){
    if(busy)return;setBusy(true);setFailure('');
    try{
      setPending({key,value:edit(stored)});
      let previous:any;
      if(transient){previous=local;setLocal(edit(local));}
      else await saveSettings((settings:any)=>{const map={...settings.cardLayouts};previous=map[key];const next=edit(previous);if(next)map[key]=next;else delete map[key];return {cardLayouts:map};});
      if(remember)setUndo({key,value:previous});else setUndo(null);
    }catch(e){setFailure((e as Error).message);}finally{setPending(null);setBusy(false);}
  }
  const grouped=!!columns&&!compact&&!custom;
  const packed=!compact&&!grouped;
  useCardGrid(grid,packed,JSON.stringify(visible.map(r=>[r.id,r.column,r.gridRow,r.w,r.h,r.fixed,r.locked])));
  function modify(command:any){
    const positions=!compact&&grid.current?cardPositions(grid.current):[];
    return write(old=>updateBoard(specs,old,{...command,positions}));
  }
  const open=<>{undo?.key===key&&!manage&&<button className="small-action" disabled={busy} onClick={()=>write(()=>undo.value,false)}><Undo2 size={15}/>撤销</button>}{editing&&<button className="launch-primary" onClick={()=>perform(async()=>{await ui.layoutUnsaved?.save();setEditing(false);})}><Check size={15}/>完成整理</button>}<button className="small-action board-launch" onClick={()=>show()}><LayoutGrid size={15}/>卡片</button></>;
  function cardSettings(row:typeof rows[number]){
    const origin=row.origin||(transferable&&isPortableCard(id,row.id)?{source:id,card:row.id,title:row.title,w:row.w,minW:row.minW}:null);
    const cmd=(op:string,value:any)=>modify({id:row.id,op,value});
    return <section className="board-card-settings" aria-label={row.title+'的尺寸与位置'}><h3>{row.title}</h3>
            <div><strong>宽度</strong><ChoiceGroup label={row.title+'宽度'} value={row.w} disabled={busy||row.locked||compact} options={[...new Set([4,6,8,12,row.w])].sort((a,b)=>a-b).map(w=>[w,({4:'三分之一',6:'半宽',8:'三分之二',12:'整行'} as Record<number,string>)[w]||w+'/12'])} onChange={v=>cmd('width',Number(v))}/></div>
            <div><strong>高度</strong><ChoiceGroup label={row.title+'高度'} value={row.fixed?row.h:0} disabled={busy||row.locked} options={[...new Set([0,10,16,22,...(row.fixed?[row.h]:[])])].sort((a,b)=>a-b).map(h=>[h,h?h+' 格':'随内容'])} onChange={v=>cmd('height',Number(v))}/></div>
            {origin&&transferable&&<div><strong>移动到</strong><div className="board-destinations">{desktopCardSources.filter(([board])=>board!==id).map(([dest,title])=><button className="small-action" key={dest} disabled={busy||row.locked} onClick={()=>perform(()=>moveCard(origin,dest))}>{title}</button>)}</div></div>}
    </section>;
  }
  const selected=rows.find(r=>r.id===target);
  const renderCard=(row:typeof rows[number])=>{
        const {id:cardId,title}=row,span=Math.min(12,Math.max(row.minW||2,row.w));
        const handle=(kind:'move'|'size')=><CardGestures kind={kind} id={cardId} title={title} compact={compact} locked={busy||row.locked} onEdit={modify} onChoose={()=>show(cardId)}/>;
        return <section key={cardId} data-card-id={cardId} data-min-width={row.minW||2} data-row={row.gridRow} data-column={row.column} data-locked={row.locked||undefined} data-size={span<=6?'narrow':'wide'} data-fixed={row.fixed||undefined} aria-label={title||undefined}
          className={(home?'desk-card ':'desktop-panel ')+(row.className||'')} style={{'--panel-span':span,'--card-height':row.h*cardHeightEm+'em'} as CSSProperties}>
          <CardControls.Provider value={{id:cardId,title,show,move:<>{editing&&transferable&&(row.origin||isPortableCard(id,cardId))&&<button className="card-options" type="button" disabled={busy||row.locked} aria-label={'跨页拖动'+title} onPointerDown={e=>startCardTravel(e,row.origin||{source:id,card:cardId,title,w:row.w,minW:row.minW},id)} onClick={e=>{if(e.detail===0)show(cardId);}}><MoveUpRight size={15}/></button>}{handle('move')}</>}}>
            {row.native?row.content:<><CardHeading title={title} className="board-card-heading"/><div className="desktop-panel-body">{row.content}</div></>}
          </CardControls.Provider>{handle('size')}</section>;

  };
  return <div ref={root} className={'desktop-panels '+className} data-board={id}>
    {pageTitle?<header className="launch-title"><h1>{label}</h1><div className="board-actions">{actions}{open}</div></header>:
      <div className="board-toolbar">{label&&<strong>{label}</strong>}{actions}{open}</div>}
    {beforeCards}
    <div ref={grid} data-card-grid="" data-card-board={id} data-packed={packed||undefined} data-compact={compact||undefined} className={home?'game-board':'desktop-panel-grid'} data-columns={grouped||undefined} data-custom={custom||undefined} data-editing={editing||undefined}>
      {grouped?columns!.map(group=><div key={group[0]} className="board-column">{group.map(id=>{const row=visible.find(item=>item.id===id);return row&&renderCard(row);})}</div>):visible.map(renderCard)}
    </div>
    {failure&&!manage&&<p role="alert">{failure}</p>}
    {!visible.length&&<div className="empty-board"><span>本页暂未显示卡片</span><button className="small-action" onClick={()=>show()}>选择卡片</button></div>}
    <Modal open={manage} title={'整理'+(label||'本页')+'卡片'} onClose={()=>setManage(false)} wide>
      <DialogSections actions={<footer className="board-editor-tools"><button className="small-action" disabled={busy||!stored} onClick={()=>write(()=>undefined)}><RotateCcw size={15}/>恢复默认布局</button>
        {undo?.key===key&&<button className="small-action" disabled={busy} onClick={()=>write(()=>undo.value,false)}><Undo2 size={15}/>撤销</button>}
        <button className="launch-primary" onClick={()=>setManage(false)}><Check size={15}/>完成</button></footer>}><div className="board-editor">
      <div className="board-editor-tools"><span>{compact?'窄窗布局':'宽窗布局'} · 已显示 {visible.length} 张</span>
        {transferable&&<button className="small-action" onClick={()=>{setManage(false);setEditing(true);}}><MoveUpRight size={15}/>跨页整理</button>}
        {supportsWidgets&&<button className="small-action" onClick={()=>{setManage(false);setAdd(true);}}><Plus size={15}/>添加卡片</button>}</div>
      {selected&&cardSettings(selected)}
      <div className="board-rows">{rows.map((row,index)=>{
        const cmd=(op:string,value:any)=>modify({id:row.id,op,value});
        return <div id={'arrange-'+row.id} className="board-edit-row" key={row.id} data-selected={target===row.id||undefined}
          onDragOver={e=>{if(drag&&!row.locked)e.preventDefault();}} onDrop={e=>{e.preventDefault();if(drag)void modify({id:drag,op:'move',to:row.id});setDrag('');}}>
          <div className="board-row-title"><span className="drag-grip" draggable={!busy&&!row.locked} title="拖动排序" onDragStart={e=>{e.dataTransfer.setData('text/plain',row.id);e.dataTransfer.effectAllowed='move';setDrag(row.id);}} onDragEnd={()=>setDrag('')}><GripVertical size={16}/></span>
            <label><input type="checkbox" aria-label={'显示'+row.title} checked={row.visible} disabled={busy||row.locked} onChange={e=>void cmd('visible',e.target.checked)}/>{row.title||'面板'}</label></div>
          <div className="board-row-controls">
            <button type="button" className="board-size-toggle" aria-pressed={target===row.id} aria-label={'调整'+row.title+'的尺寸与位置'} onClick={()=>setTarget(row.id)}>尺寸与位置</button>
            <button aria-label={'上移'+row.title} disabled={busy||row.locked||!index||rows[index-1].locked} onClick={()=>modify({id:row.id,op:'move',to:rows[index-1].id})}><ArrowUp size={15}/></button>
            <button aria-label={'下移'+row.title} disabled={busy||row.locked||index===rows.length-1||rows[index+1].locked} onClick={()=>modify({id:row.id,op:'move',to:rows[index+1].id})}><ArrowDown size={15}/></button>
            <button aria-label={(row.locked?'解锁':'锁定')+row.title} aria-pressed={row.locked} disabled={busy} onClick={()=>cmd('lock',!row.locked)}>{row.locked?<LockKeyhole size={15}/>:<UnlockKeyhole size={15}/>}</button>

            {row.origin?.widget&&<button onClick={()=>{setManage(false);setEditing(true);requestAnimationFrame(()=>root.current?.querySelector('[data-card-id="'+row.id+'"]')?.scrollIntoView({block:'nearest'}));}}>编辑内容</button>}
            {row.origin?.widget&&<button aria-label={'移除'+row.title} disabled={busy||row.locked} onClick={()=>{const widget=row.origin!.card;setManage(false);ui.confirm={title:'移除这张通用卡片？',message:'这张卡片及其内容将从本机移除。',action:()=>saveSettings((settings:any)=>({widgets:settings.widgets.filter((w:any)=>w.id!==widget)}))};}}>移除</button>}</div>
          </div>;
      })}</div>
      {away.map(item=><div className="board-away" key={item.card}><span>{item.title} · {desktopCardSources.find(([board])=>board===item.target)?.[1]}</span><button className="small-action" onClick={()=>perform(()=>moveCard(item,id))}>移回本页</button></div>)}
      {failure&&<p role="alert">{failure}</p>}
      </div></DialogSections></Modal>
    {add&&<Suspense fallback={null}><AddWidget page={id} onClose={()=>{setAdd(false);setManage(true);}}/></Suspense>}
  </div>;
}
export function FormCards({id,children}:{id:string;children:ReactNode}){
  return <CardBoard id={id} cards={panels(children).map((node,i)=>({id:node.props['data-card']||'section-'+i,title:node.props['data-card-title']||node.props.cardTitle||'设置',content:node,w:node.props['data-width']||6}))}/>;
}
export function PanelGroup({id,children,names=[],widths=[],className=''}:{id:string;children:ReactNode;names?:string[];widths?:number[];heights?:number[];maxHeights?:number[];positions?:number[][];className?:string}){
  return <CardBoard id={id} className={className} cards={panels(children).map((node,i)=>({id:node.props['data-card']||'panel-'+i,title:names[i]||'面板',content:node,w:widths[i]||6,fit:node.props['data-fit-content']===true}))}/>;
}
