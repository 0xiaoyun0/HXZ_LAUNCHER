import {useEffect,useLayoutEffect,useRef,type RefObject} from 'react';
import {useLocation,useNavigationType} from 'react-router-dom';
import {ArrowDown,CheckCircle2,Info,X} from 'lucide-react';
import {holdNotice,ui} from '../../desktop/src/model';
import {destinationIndex,destinations} from './TownNavigation';

// Keep the scroll owner mounted: community pages contain editors, live chat and game canvases.
export function useTownPage(scroller:RefObject<HTMLElement|null>,reduced:boolean){
  const {pathname}=useLocation(),action=useNavigationType();
  const previous=useRef(''),positions=useRef(new Map<string,number>());
  useLayoutEffect(()=>{
    const main=scroller.current;
    if(!main)return;
    const from=previous.current;
    previous.current=pathname;
    const restore=action==='POP'||destinations.some(item=>item.path===pathname);
    if(from!==pathname)main.scrollTop=restore?(positions.current.get(pathname)??0):0;
    const save=()=>positions.current.set(pathname,main.scrollTop);
    main.addEventListener('scroll',save,{passive:true});
    const page=main.querySelector<HTMLElement>('.launch-page,.social-workspace');
    let transition:Animation|undefined;
    if(from&&from!==pathname&&!reduced&&page?.animate){
      const distance=destinationIndex(pathname)-destinationIndex(from);
      const side=distance?Math.sign(distance):action==='POP'?-1:1;
      transition=page.animate([{opacity:.65,transform:'translateX('+side*.75+'rem)'},{opacity:1,transform:'translateX(0)'}],
        {duration:235,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
    return ()=>{main.removeEventListener('scroll',save);transition?.cancel();};
  },[pathname,action,reduced,scroller]);
}

// Only a pull starting at the top of the lobby can refresh. Horizontal drags and multi-touch stay native.
export function TownPullRefresh({busy,refresh}:{busy:boolean;refresh:()=>void}){
  const mark=useRef<HTMLDivElement>(null),latest=useRef({busy,refresh});
  latest.current={busy,refresh};
  useEffect(()=>{
    const node=mark.current,main=node?.closest('main');
    if(!node||!main)return;
    let start:Touch|undefined,amount=0;
    const clear=()=>{start=undefined;amount=0;node.removeAttribute('data-pull');node.style.removeProperty('--pull');};
    const begin=(event:TouchEvent)=>{
      if(event.touches.length!==1||main.scrollTop>0||latest.current.busy){clear();return;}
      start=event.touches[0];amount=0;
    };
    const move=(event:TouchEvent)=>{
      if(!start)return;
      const touch=event.touches[0];
      if(event.touches.length!==1||!touch||main.scrollTop>0){clear();return;}
      const dy=touch.clientY-start.clientY,dx=touch.clientX-start.clientX;
      if(dy<0||Math.abs(dx)>Math.max(10,dy)){clear();return;}
      if(dy<8)return;
      amount=Math.min(1,dy/(parseFloat(getComputedStyle(document.documentElement).fontSize)*4.5));
      node.dataset.pull=amount===1?'ready':'drag';
      node.style.setProperty('--pull',String(amount));
    };
    const end=()=>{const commit=!!start&&amount===1&&!latest.current.busy;clear();
      if(commit){node.dataset.refresh='true';latest.current.refresh();}};
    main.addEventListener('touchstart',begin,{passive:true});main.addEventListener('touchmove',move,{passive:true});
    main.addEventListener('touchend',end);main.addEventListener('touchcancel',clear);
    return ()=>{main.removeEventListener('touchstart',begin);main.removeEventListener('touchmove',move);
      main.removeEventListener('touchend',end);main.removeEventListener('touchcancel',clear);};
  },[]);
  useEffect(()=>{if(!busy)mark.current?.removeAttribute('data-refresh');},[busy]);
  return <div ref={mark} className="town-pull" aria-hidden="true"><ArrowDown size={18}/></div>;
}

// Drag the sheet header only. Long forms, sliders and the keyboard keep their normal gestures.
export function useTownSheetGesture(){
  useEffect(()=>{
    let sheet:HTMLElement|null=null,contact:number|undefined,start=0,travel=0;
    const reset=()=>{sheet?.style.removeProperty('--sheet-drag');sheet?.removeAttribute('data-dragging');sheet=null;contact=undefined;travel=0;};
    const down=(event:PointerEvent)=>{
      if(contact!==undefined){reset();return;}
      if(event.pointerType!=='touch'||!(event.target instanceof Element)||event.target.closest('button,a')||
          !window.matchMedia('(max-width: 42rem)').matches)return;
      sheet=event.target.closest<HTMLElement>('.modal > header')?.parentElement??null;
      if(sheet){contact=event.pointerId;start=event.clientY;}
    };
    const move=(event:PointerEvent)=>{
      if(!sheet||contact!==event.pointerId)return;
      travel=Math.max(0,event.clientY-start);
      if(travel>5){sheet.dataset.dragging='true';sheet.style.setProperty('--sheet-drag',Math.round(travel*.66)+'px');}
    };
    const up=(event:PointerEvent)=>{
      if(!sheet||contact!==event.pointerId)return;
      const close=travel>Math.min(84,sheet.offsetHeight*.23)?sheet.querySelector<HTMLButtonElement>('header button[aria-label="关闭"]'):null;
      reset();close?.click();
    };
    document.addEventListener('pointerdown',down);document.addEventListener('pointermove',move,{passive:true});
    document.addEventListener('pointerup',up);document.addEventListener('pointercancel',reset);window.addEventListener('town-pause',reset);
    return ()=>{reset();document.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);
      document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',reset);window.removeEventListener('town-pause',reset);};
  },[]);
}

export function TownToast({id,message,error}:{id:number;message:string;error:boolean}){
  const initial=useRef<number|null>(null);
  const close=()=>{if(ui.toastId===id)ui.toast='';};
  useEffect(()=>()=>holdNotice(id,'touch',false),[id]);
  const Icon=error?Info:CheckCircle2;
  return <aside className="town-toast" data-error={error||undefined}
    onPointerDown={e=>{initial.current=e.clientY;holdNotice(id,'touch',true);e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerUp={e=>{if(initial.current!==null&&e.clientY-initial.current>32)close();initial.current=null;holdNotice(id,'touch',false);}}
    onPointerCancel={()=>{initial.current=null;holdNotice(id,'touch',false);}}>
    <Icon size={19} aria-hidden/><span role={error?'alert':'status'}>{message}</span>
    <button aria-label="关闭提示" onPointerDown={e=>e.stopPropagation()} onClick={close}><X size={17}/></button>
  </aside>;
}
