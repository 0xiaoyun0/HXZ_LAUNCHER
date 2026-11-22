import {useEffect,useRef,type PointerEvent} from 'react';
import {settleCardDrop} from './launcher/micro/surface-motion';
import {Grip,Scaling} from 'lucide-react';
import {cloneLayout,moveElement,verticalCompactor,type Layout,type LayoutItem} from 'react-grid-layout/core';
import {boardMetrics,cardHeightUnit,cardPositions} from './CardGrid';

type Kind='move'|'size';
type Props={kind:Kind;id:string;title:string;compact:boolean;locked:boolean;onEdit:(command:any,release?:Map<string,DOMRect>)=>void;onChoose:()=>void};
type Cell={node:HTMLElement;left:number;top:number;width:number;height:number;style:string;target?:string};
type Gesture={grid:HTMLElement;card:HTMLElement;button:HTMLButtonElement;pointer:number;startX:number;startY:number;x:number;y:number;
  scroller:HTMLElement|null;scrollOrigin:number;viewportTop:number;viewportBottom:number;edgeTime:number;slot:string;width:number;height:number;step:number;gap:number;unit:number;minHeight:number;minWidth:number;layout:Layout;result:Layout;
  cells:Map<string,Cell>;original:string;preview?:HTMLElement;frame:number;active:boolean};
const clamp=(value:number,min:number,max:number)=>Math.min(Math.max(value,min),Math.max(min,max));
const translate=(x:number,y:number)=>'translate3d('+x+'px,'+y+'px,0)';
function captureCards(p:Gesture){
  if(document.documentElement.dataset.motion!=='on')return;
  return new Map(Array.from(p.cells,([key,{node}])=>[key,node.getBoundingClientRect()]));
}
function begin(p:Gesture,kind:Kind){
  delete p.card.dataset.landed;
  p.active=true;p.grid.dataset.dragging='true';p.grid.style.position='relative';p.grid.style.minHeight=p.height+'px';
  for(const cell of p.cells.values()){
    Object.assign(cell.node.style,{position:'absolute',gridArea:'auto',left:cell.left+'px',top:cell.top+'px',width:cell.width+'px',height:cell.height+'px',margin:'0',boxSizing:'border-box'});
  }
  p.card.dataset.gesture=kind;
  const cell=p.cells.get(p.card.dataset.cardId!)!,placeholder=document.createElement('div');
  placeholder.className='card-drag-preview';placeholder.setAttribute('aria-hidden','true');
  Object.assign(placeholder.style,{left:'0',top:'0',width:cell.width+'px',height:cell.height+'px',transform:translate(cell.left,cell.top)});
  p.grid.append(placeholder);p.preview=placeholder;
}
export function CardGestures({kind,id,title,compact,locked,onEdit,onChoose}:Props){
  const gesture=useRef<Gesture|null>(null);
  const label=(kind==='move'?'拖动':'调整大小')+title;
  function finish(rewind=false){
    const p=gesture.current;if(!p)return;gesture.current=null;cancelAnimationFrame(p.frame);
    const before=rewind&&p.active?captureCards(p):undefined;
    if(p.active){p.preview?.remove();for(const cell of p.cells.values())cell.node.style.cssText=cell.style;
      p.grid.style.cssText=p.original;delete p.grid.dataset.dragging;delete p.card.dataset.gesture;}
    if(p.button.hasPointerCapture(p.pointer))p.button.releasePointerCapture(p.pointer);
    if(before)settleCardDrop(p.grid,before,'return');
  }
  useEffect(()=>{
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&gesture.current){e.preventDefault();finish(true);}};
    const reset=()=>finish();
    window.addEventListener('keydown',escape,true);window.addEventListener('blur',reset);window.addEventListener('resize',reset);
    return()=>{window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',reset);window.removeEventListener('resize',reset);finish();};
  },[compact]);
  function down(e:PointerEvent<HTMLButtonElement>){
    if(locked||e.button!==0||!e.isPrimary)return;
    const button=e.currentTarget,card=button.closest<HTMLElement>('[data-card-id]')!,grid=card.closest<HTMLElement>('[data-card-grid]')!;
    for(const animation of grid.getAnimations({subtree:true}))if(animation.id.startsWith('card-settle-'))animation.cancel();
    const {rect,gap,step}=boardMetrics(grid),unit=cardHeightUnit(card),cells=new Map<string,Cell>();
    const layout:LayoutItem[]=[];
    for(const node of grid.querySelectorAll<HTMLElement>('[data-card-id]')){
      if(node.closest('[data-card-grid]')!==grid)continue;
      const box=node.getBoundingClientRect(),left=box.left-rect.left,top=box.top-rect.top;
      cells.set(node.dataset.cardId!,{node,left,top,width:box.width,height:box.height,style:node.style.cssText});
      const w=compact?12:clamp(Math.round((box.width+gap)/step),2,12);
      layout.push({i:node.dataset.cardId!,x:clamp(Math.round(left/step),0,12-w),w,y:Math.max(0,Math.round(top/unit)),h:Math.max(1,Math.ceil((box.height+gap)/unit)),static:!!node.dataset.locked});
    }
    let minHeight=0;
    if(kind==='size'){const previous=card.style.minHeight;card.style.minHeight='0';minHeight=card.getBoundingClientRect().height;card.style.minHeight=previous;}
    const scroller=grid.closest<HTMLElement>('.instance-content,main'),viewport=scroller?.getBoundingClientRect();
    gesture.current={grid,card,button,pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,scroller,scrollOrigin:scroller?.scrollTop??0,viewportTop:viewport?.top??0,viewportBottom:viewport?.bottom??innerHeight,edgeTime:0,slot:'',width:rect.width,height:rect.height,step,gap,unit,minHeight,minWidth:Number(card.dataset.minWidth)||2,layout,result:layout,cells,original:grid.style.cssText,frame:0,active:false};
    button.focus({preventScroll:true});button.setPointerCapture(e.pointerId);e.preventDefault();
  }
  function draw(p:Gesture){
    const cell=p.cells.get(id)!,dx=p.x-p.startX,dy=p.y-p.startY+((p.scroller?.scrollTop??0)-p.scrollOrigin);
    const base=p.layout.find(item=>item.i===id)!;
    const left=kind==='move'&&!compact?clamp(cell.left+dx,0,p.width-cell.width):cell.left;
    const top=kind==='move'?clamp(cell.top+dy,0,p.height-cell.height):cell.top;
    const width=kind==='size'&&!compact?clamp(cell.width+dx,p.minWidth*p.step-p.gap,p.width-left):cell.width;
    const height=kind==='size'?clamp(cell.height+dy,p.minHeight,Math.max(p.minHeight,p.unit*100)):cell.height;
    if(kind==='move')p.card.style.transform=translate(left-cell.left,top-cell.top);
    else{p.card.style.width=width+'px';p.card.style.height=height+'px';p.card.style.minHeight=p.minHeight+'px';}
    const x=kind==='move'?clamp(Math.round(left/p.step),0,12-base.w):base.x,y=kind==='move'?Math.round(top/p.unit):base.y;
    const w=kind==='size'&&!compact?clamp(Math.round((width+p.gap)/p.step),p.minWidth,12-base.x):base.w;
    const h=kind==='size'?Math.ceil((height+p.gap)/p.unit):base.h;
    const slot=[x,y,w,h].join('/');
    if(slot===p.slot)return;
    p.slot=slot;
    const items=cloneLayout(p.layout),active=items.find(item=>item.i===id)!;
    if(kind==='move')moveElement(items,active,x,y,true,false,'vertical',12);
    else{active.w=w;active.h=h;}
    p.result=verticalCompactor.compact(items,12);
    for(const item of p.result){
      const other=p.cells.get(item.i)!;
      if(item.i===id){
        const preview=p.preview!;
        preview.style.transform=translate(item.x*p.step,item.y*p.unit);
        preview.style.width=item.w*p.step-p.gap+'px';preview.style.height=(kind==='move'?cell.height:Math.max(p.minHeight,item.h*p.unit-p.gap))+'px';
      }else{
        const next=translate(item.x*p.step-other.left,item.y*p.unit-other.top);
        if(other.target!==next){other.target=next;other.node.style.transform=next;}
      }
    }
  }
  function frame(p:Gesture,time:number){
    if(gesture.current!==p)return;
    p.frame=0;
    const main=p.scroller,edge=Math.min(64,(p.viewportBottom-p.viewportTop)*.09);
    const depth=kind==='move'&&edge>0?(p.y<p.viewportTop+edge?-clamp((p.viewportTop+edge-p.y)/edge,0,1):clamp((p.y-p.viewportBottom+edge)/edge,0,1)):0;
    if(depth&&main){
      const before=main.scrollTop,elapsed=p.edgeTime?Math.min(32,time-p.edgeTime):16;
      main.scrollTop+=Math.sign(depth)*Math.max(1,elapsed*.9*depth*depth);
      if(before!==main.scrollTop)p.frame=requestAnimationFrame(t=>frame(p,t));
    }
    p.edgeTime=depth?time:0;
    draw(p);
  }
  function move(e:PointerEvent<HTMLButtonElement>){
    const p=gesture.current;if(!p||e.pointerId!==p.pointer)return;
    p.x=e.clientX;p.y=e.clientY;
    if(!p.active){if(Math.hypot(p.x-p.startX,p.y-p.startY)<5)return;begin(p,kind);}
    if(!p.frame)p.frame=requestAnimationFrame(t=>frame(p,t));
  }
  function up(e:PointerEvent<HTMLButtonElement>){
    const p=gesture.current;if(!p||p.pointer!==e.pointerId)return;
    if(!p.active){finish();return;}
    p.x=e.clientX;p.y=e.clientY;draw(p);
    const command={op:'layout',id,items:p.result.map(i=>({i:i.i,x:i.x,y:i.y,w:i.w})),
      height:kind==='size'&&Math.abs(p.y-p.startY)>=5?clamp(Math.round(Math.max(p.minHeight,p.cells.get(id)!.height+p.y-p.startY)/p.unit),5,100):undefined};
    const release=captureCards(p);
    finish();onEdit(command,release);
  }
  return <button type="button" className={'canvas-grip '+kind} aria-label={label} disabled={locked}
    data-hint={kind==='move'?'拖动或使用方向键移动卡片':'拖动调整宽高，双击恢复内容高度'} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>finish(true)} onLostPointerCapture={()=>finish(true)}
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
