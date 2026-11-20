import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {Grip,Scaling} from 'lucide-react';
import {boardMetrics,cardPositions} from './CardGrid';

type Kind='move'|'size';
type Props={kind:Kind;id:string;title:string;compact:boolean;locked:boolean;onEdit:(command:any)=>void;onChoose:()=>void};
type Gesture={grid:HTMLElement;card:HTMLElement;button:HTMLButtonElement;pointer:number;left:number;top:number;width:number;height:number;dx:number;dy:number;minimum:number};
type Preview={left:number;top:number;width:number;height:number;text:string};
export function CardGestures({kind,id,title,compact,locked,onEdit,onChoose}:Props){
  const gesture=useRef<Gesture|null>(null),[preview,setPreview]=useState<Preview|null>(null);
  const label=(kind==='move'?'拖动':'调整大小')+title;
  function finish(){
    const p=gesture.current;gesture.current=null;
    if(p){p.grid.querySelector('[data-drop]')?.removeAttribute('data-drop');p.card.removeAttribute('data-gesture');
      if(p.button.hasPointerCapture(p.pointer))p.button.releasePointerCapture(p.pointer);}
    setPreview(null);
  }
  useEffect(()=>{
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&gesture.current){event.preventDefault();finish();}};
    window.addEventListener('keydown',escape,true);window.addEventListener('blur',finish);
    return ()=>{window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',finish);finish();};
  },[compact]);
  function down(e:PointerEvent<HTMLButtonElement>){
    if(e.button!==0||!e.isPrimary||locked)return;
    const button=e.currentTarget,card=button.closest<HTMLElement>('[data-card-id]')!,grid=card.closest<HTMLElement>('[data-card-grid]')!;
    const r=card.getBoundingClientRect(),area=grid.getBoundingClientRect();
    let minimum=r.height;
    if(kind==='size'){const before=card.style.minHeight;card.style.minHeight='0';minimum=card.getBoundingClientRect().height;card.style.minHeight=before;}
    gesture.current={grid,card,button,pointer:e.pointerId,left:r.left-area.left,top:r.top-area.top,width:r.width,height:r.height,dx:e.clientX,dy:e.clientY,minimum};
    button.focus({preventScroll:true});button.setPointerCapture(e.pointerId);e.preventDefault();
  }
  function project(p:Gesture,x:number,y:number){
    const {rect,step,gap}=boardMetrics(p.grid),dx=x-p.dx,dy=y-p.dy;
    const oldW=Math.max(2,Math.min(12,Math.round((p.width+gap)/step)));
    const col=Math.min(12-oldW,Math.max(0,Math.round((p.left+dx)/step)));
    if(kind==='size'){
      const w=compact?12:Math.max(2,Math.min(12,Math.round((p.width+dx+gap)/step)));
      const h=Math.max(5,Math.min(100,Math.round(Math.max(p.minimum,p.height+dy)/22)));
      return {command:{id,op:'size',w:compact?undefined:w,h:Math.abs(dy)>=5?h:undefined},box:{left:rect.left+Math.min(p.left,(12-w)*step),top:rect.top+p.top,width:w*step-gap,height:Math.abs(dy)>=5?Math.max(p.minimum,h*22):p.height,text:(compact?'整行':w+'/12 宽')+' · '+(Math.abs(dy)>=5?Math.round(Math.max(p.minimum,h*22)):Math.round(p.height))+' px'}};
    }
    const cards=cardPositions(p.grid).filter(c=>c.id!==id&&c.x<col+oldW&&c.x+c.w>col);
    const hit=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-card-id]');
    const target=cards.find(c=>c.id===hit?.dataset.cardId)??cards.reduce<typeof cards[number]|undefined>((best,c)=>!best||Math.abs(c.top+c.height/2-y)<Math.abs(best.top+best.height/2-y)?c:best,undefined);
    const after=!!target&&y>=target.top+Math.min(target.height/2,65);
    const valid=x>=rect.left-4&&x<=rect.right+4&&y>=rect.top-4&&y<=rect.bottom+32&&!target?.locked;
    return {command:valid?{id,op:'place',x:compact?0:col,to:target?.id,after}:undefined,target:valid?target?.id:undefined,after,
      box:{left:rect.left+col*step,top:Math.min(Math.max(rect.top,rect.top+p.top+dy),rect.bottom),width:oldW*step-gap,height:p.height,text:valid?title:'移回卡片区域'}};
  }
  function move(e:PointerEvent<HTMLButtonElement>){
    const p=gesture.current;if(!p||e.pointerId!==p.pointer||Math.hypot(e.clientX-p.dx,e.clientY-p.dy)<5)return;
    if(kind==='move'){const main=p.grid.closest('main'),r=main?.getBoundingClientRect();if(main&&r){if(e.clientY<r.top+28)main.scrollBy(0,-18);if(e.clientY>r.bottom-28)main.scrollBy(0,18);}}
    const result=project(p,e.clientX,e.clientY);p.card.dataset.gesture=kind;p.grid.querySelector('[data-drop]')?.removeAttribute('data-drop');
    if(result.target){const target=Array.from(p.grid.querySelectorAll<HTMLElement>('[data-card-id]')).find(c=>c.dataset.cardId===result.target);if(target)target.dataset.drop=result.after?'after':'before';}
    setPreview(result.box);
  }
  function up(e:PointerEvent<HTMLButtonElement>){
    const p=gesture.current;if(!p||p.pointer!==e.pointerId)return;
    const command=Math.hypot(e.clientX-p.dx,e.clientY-p.dy)>=5?project(p,e.clientX,e.clientY).command:undefined;
    finish();if(command)onEdit(command);
  }
  return <><button type="button" className={'canvas-grip '+kind} aria-label={label} disabled={locked}
    title={locked?'卡片已锁定':kind==='move'?'拖动位置，也可使用方向键':'拖动右下角调整宽高，双击恢复内容高度'}
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={finish} onLostPointerCapture={finish}
    onDoubleClick={()=>{if(kind==='size')onEdit({id,op:'height',value:0});}}
    onKeyDown={e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();onChoose();return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();const grid=e.currentTarget.closest<HTMLElement>('[data-card-grid]')!,all=cardPositions(grid),at=all.findIndex(c=>c.id===id),card=all[at],delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
      if(kind==='size'){onEdit(e.key==='ArrowUp'||e.key==='ArrowDown'?{id,op:'height',value:Math.max(5,Math.round(card.height/22)+delta)}:{id,op:'width',value:compact?12:card.w+delta});}
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){if(!compact)onEdit({id,op:'place',x:card.x+delta});}
      else {const ordered=all.slice().sort((a,b)=>a.top-b.top||a.left-b.left),next=ordered[ordered.findIndex(c=>c.id===id)+delta];if(next)onEdit({id,op:'move',to:next.id});}
    }}>{kind==='move'?<Grip size={16}/>:<Scaling size={14}/>}</button>
    {preview&&createPortal(<div className="card-drag-preview" aria-hidden style={{left:preview.left,top:preview.top,width:preview.width,height:preview.height}}><span>{preview.text}</span></div>,document.body)}</>;
}
