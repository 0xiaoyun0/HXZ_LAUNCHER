import {useEffect,useRef,type PointerEvent} from 'react';
import {Grip,Scaling} from 'lucide-react';
import {cloneLayout,moveElement,verticalCompactor,type Layout,type LayoutItem} from 'react-grid-layout/core';
import {boardMetrics,cardHeightUnit,cardPositions} from './CardGrid';

type Kind='move'|'size';
type Props={kind:Kind;id:string;title:string;compact:boolean;locked:boolean;onEdit:(command:any)=>void;onChoose:()=>void};
type Cell={node:HTMLElement;left:number;top:number;width:number;height:number;style:string};
type Gesture={grid:HTMLElement;card:HTMLElement;button:HTMLButtonElement;pointer:number;startX:number;startY:number;x:number;y:number;
  gridTop:number;width:number;height:number;step:number;gap:number;unit:number;minHeight:number;minWidth:number;layout:Layout;result:Layout;
  cells:Map<string,Cell>;original:string;preview?:HTMLElement;frame:number;active:boolean};
const clamp=(value:number,min:number,max:number)=>Math.min(Math.max(value,min),Math.max(min,max));
function begin(p:Gesture){
  delete p.card.dataset.landed;
  p.active=true;p.grid.dataset.dragging='true';p.grid.style.position='relative';p.grid.style.minHeight=p.height+'px';
  for(const cell of p.cells.values()){
    Object.assign(cell.node.style,{position:'absolute',gridArea:'auto',left:cell.left+'px',top:cell.top+'px',width:cell.width+'px',height:cell.height+'px',margin:'0',boxSizing:'border-box'});
  }
  p.card.dataset.gesture='active';
  const placeholder=document.createElement('div');placeholder.className='card-drag-preview';placeholder.setAttribute('aria-hidden','true');p.grid.append(placeholder);p.preview=placeholder;
}
export function CardGestures({kind,id,title,compact,locked,onEdit,onChoose}:Props){
  const gesture=useRef<Gesture|null>(null);
  const label=(kind==='move'?'拖动':'调整大小')+title;
  function finish(){
    const p=gesture.current;if(!p)return;gesture.current=null;cancelAnimationFrame(p.frame);
    if(p.active){p.preview?.remove();for(const cell of p.cells.values())cell.node.style.cssText=cell.style;
      p.grid.style.cssText=p.original;delete p.grid.dataset.dragging;delete p.card.dataset.gesture;}
    if(p.button.hasPointerCapture(p.pointer))p.button.releasePointerCapture(p.pointer);
  }
  useEffect(()=>{
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&gesture.current){e.preventDefault();finish();}};
    window.addEventListener('keydown',escape,true);window.addEventListener('blur',finish);window.addEventListener('resize',finish);
    return()=>{window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',finish);window.removeEventListener('resize',finish);finish();};
  },[compact]);
  function down(e:PointerEvent<HTMLButtonElement>){
    if(locked||e.button!==0||!e.isPrimary)return;
    const button=e.currentTarget,card=button.closest<HTMLElement>('[data-card-id]')!,grid=card.closest<HTMLElement>('[data-card-grid]')!;
    const {rect,gap,step}=boardMetrics(grid),unit=cardHeightUnit(card),cells=new Map<string,Cell>();
    const layout:LayoutItem[]=[];
    for(const node of grid.querySelectorAll<HTMLElement>('[data-card-id]')){
      if(node.closest('[data-card-grid]')!==grid)continue;
      const box=node.getBoundingClientRect(),left=box.left-rect.left,top=box.top-rect.top;
      cells.set(node.dataset.cardId!,{node,left,top,width:box.width,height:box.height,style:node.style.cssText});
      const w=compact?12:clamp(Math.round((box.width+gap)/step),2,12);
      layout.push({i:node.dataset.cardId!,x:clamp(Math.round(left/step),0,12-w),w,y:Math.max(0,Math.round(top/unit)),h:Math.max(1,Math.ceil((box.height+gap)/unit)),static:!!node.dataset.locked});
    }
    const previous=card.style.minHeight;card.style.minHeight='0';const minHeight=card.getBoundingClientRect().height;card.style.minHeight=previous;
    gesture.current={grid,card,button,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,gridTop:rect.top,width:rect.width,height:rect.height,step,gap,unit,minHeight,minWidth:Number(card.dataset.minWidth)||2,layout,result:layout,cells,original:grid.style.cssText,frame:0,active:false};
    button.focus({preventScroll:true});button.setPointerCapture(e.pointerId);e.preventDefault();
  }
  function draw(p:Gesture){
    const rect=p.grid.getBoundingClientRect(),cell=p.cells.get(id)!,dx=p.x-p.startX,dy=p.y-p.startY+p.gridTop-rect.top;
    const items=cloneLayout(p.layout),active=items.find(item=>item.i===id)!;
    let left=cell.left,top=cell.top,width=cell.width,height=cell.height;
    if(kind==='move'){
      left=compact?0:clamp(left+dx,0,p.width-width);top=clamp(top+dy,0,p.height-height);
      moveElement(items,active,clamp(Math.round(left/p.step),0,12-active.w),Math.round(top/p.unit),true,false,'vertical',12);
    }else{
      active.w=compact?12:clamp(Math.round((width+dx+p.gap)/p.step),p.minWidth,12-active.x);
      height=clamp(height+dy,p.minHeight,Math.max(p.minHeight,p.unit*100));
      active.h=Math.ceil((height+p.gap)/p.unit);
      width=compact?cell.width:clamp(width+dx,p.minWidth*p.step-p.gap,p.width-left);
    }
    p.result=verticalCompactor.compact(items,12);
    for(const item of p.result){
      const other=p.cells.get(item.i)!;
      if(item.i===id){
        p.card.style.transform='translate3d('+(left-other.left)+'px,'+(top-other.top)+'px,0)';
        if(kind==='size'){p.card.style.width=width+'px';p.card.style.height=height+'px';p.card.style.minHeight=p.minHeight+'px';}
        Object.assign(p.preview!.style,{left:item.x*p.step+'px',top:item.y*p.unit+'px',width:item.w*p.step-p.gap+'px',height:kind==='move'?cell.height+'px':Math.max(p.minHeight,item.h*p.unit-p.gap)+'px'});
      }else{
        other.node.style.transform='translate3d('+(item.x*p.step-other.left)+'px,'+(item.y*p.unit-other.top)+'px,0)';
      }
    }
  }
  function frame(p:Gesture){
    if(gesture.current!==p)return;
    p.frame=0;
    const main=p.grid.closest('main'),r=main?.getBoundingClientRect();
    const delta=kind==='move'&&r?(p.y<r.top+32?-12:p.y>r.bottom-32?12:0):0;
    if(delta&&main){const old=main.scrollTop;main.scrollBy(0,delta);if(main.scrollTop!==old)p.frame=requestAnimationFrame(()=>frame(p));}
    draw(p);
  }
  function move(e:PointerEvent<HTMLButtonElement>){
    const p=gesture.current;if(!p||e.pointerId!==p.pointer)return;
    p.x=e.clientX;p.y=e.clientY;
    if(!p.active){if(Math.hypot(p.x-p.startX,p.y-p.startY)<5)return;begin(p);}
    if(!p.frame)p.frame=requestAnimationFrame(()=>frame(p));
  }
  function up(e:PointerEvent<HTMLButtonElement>){
    const p=gesture.current;if(!p||p.pointer!==e.pointerId)return;
    if(!p.active){finish();return;}
    p.x=e.clientX;p.y=e.clientY;draw(p);
    const command={op:'layout',id,items:p.result.map(i=>({i:i.i,x:i.x,y:i.y,w:i.w})),
      height:kind==='size'&&Math.abs(p.y-p.startY)>=5?clamp(Math.round(Math.max(p.minHeight,p.cells.get(id)!.height+p.y-p.startY)/p.unit),5,100):undefined};
    finish();onEdit(command);
  }
  return <button type="button" className={'canvas-grip '+kind} aria-label={label} disabled={locked}
    data-hint={kind==='move'?'拖动或使用方向键移动卡片':'拖动调整宽高，双击恢复内容高度'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={finish} onLostPointerCapture={finish}
    onDoubleClick={()=>{if(kind==='size')onEdit({id,op:'height',value:0});}}
    onKeyDown={e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();onChoose();return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();const grid=e.currentTarget.closest<HTMLElement>('[data-card-grid]')!,all=cardPositions(grid),card=all.find(c=>c.id===id)!,delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
      if(kind==='size')onEdit(e.key==='ArrowUp'||e.key==='ArrowDown'?{id,op:'height',value:Math.max(5,Math.round(card.height/cardHeightUnit(e.currentTarget.closest<HTMLElement>('[data-card-id]')!))+delta)}:{id,op:'width',value:compact?12:card.w+delta});
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){if(!compact)onEdit({id,op:'place',x:card.x+delta});}
      else {const ordered=all.slice().sort((a,b)=>a.top-b.top||a.left-b.left),next=ordered[ordered.findIndex(c=>c.id===id)+delta];if(next)onEdit({id,op:'move',to:next.id});}
    }}>{kind==='move'?<Grip size={16}/>:<Scaling size={14}/>}</button>;
}
