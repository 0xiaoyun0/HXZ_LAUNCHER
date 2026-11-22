import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useLocation} from 'react-router-dom';

// One warm tooltip group for the shell and its portaled dialogs, with no additional tab stops.
export function WarmHints(){
  const {key}=useLocation(),[anchor,setAnchor]=useState<HTMLElement|null>(null);
  const bubble=useRef<HTMLDivElement>(null),id=useId();
  useEffect(()=>{
    let target:HTMLElement|null=null,visible=false,warmUntil=0,timer:ReturnType<typeof setTimeout>|undefined;
    setAnchor(null);
    const hide=()=>{
      clearTimeout(timer);if(visible)warmUntil=performance.now()+550;
      visible=false;target=null;setAnchor(null);
    };
    const find=(node:EventTarget|null)=>node instanceof Element?node.closest<HTMLElement>('[data-hint]'):null;
    const show=(next:HTMLElement|null,keyboard=false)=>{
      if(next===target)return;
      hide();
      if(!next||next.matches(':disabled,[aria-disabled=true]'))return;
      if(next.hasAttribute('data-hint-compact')&&next.querySelector('span')?.getClientRects().length)return;
      target=next;
      const display=()=>{if(next.isConnected){visible=true;setAnchor(next);}};
      if(keyboard||performance.now()<warmUntil)display();else timer=setTimeout(display,400);
    };
    const over=(e:PointerEvent)=>{if(e.pointerType!=='touch'&&!e.buttons)show(find(e.target));};
    const out=(e:PointerEvent)=>{if(target&&!target.contains(e.relatedTarget as Node|null))hide();};
    const focus=(e:FocusEvent)=>{const next=find(e.target);if(next?.matches(':focus-visible'))show(next,true);};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')hide();};
    document.addEventListener('pointerover',over);document.addEventListener('pointerout',out);
    document.addEventListener('focusin',focus);document.addEventListener('focusout',hide);
    document.addEventListener('pointerdown',hide,true);document.addEventListener('keydown',escape,true);
    document.addEventListener('scroll',hide,true);window.addEventListener('blur',hide);window.addEventListener('resize',hide);
    return()=>{
      clearTimeout(timer);document.removeEventListener('pointerover',over);document.removeEventListener('pointerout',out);
      document.removeEventListener('focusin',focus);document.removeEventListener('focusout',hide);
      document.removeEventListener('pointerdown',hide,true);document.removeEventListener('keydown',escape,true);
      document.removeEventListener('scroll',hide,true);window.removeEventListener('blur',hide);window.removeEventListener('resize',hide);
    };
  },[key]);
  useLayoutEffect(()=>{
    const el=bubble.current;if(!anchor||!el)return;
    const a=anchor.getBoundingClientRect(),b=el.getBoundingClientRect(),gap=7;
    const below=a.bottom+gap+b.height<=innerHeight-gap;
    el.style.left=Math.max(gap,Math.min(innerWidth-b.width-gap,a.left+(a.width-b.width)/2))+'px';
    el.style.top=Math.max(gap,below?a.bottom+gap:a.top-b.height-gap)+'px';
    el.dataset.side=below?'below':'above';
    const describe=anchor.dataset.hint!==anchor.getAttribute('aria-label');
    if(describe)anchor.setAttribute('aria-describedby',[anchor.getAttribute('aria-describedby'),id].filter(Boolean).join(' '));
    return()=>{
      if(!describe)return;
      const remaining=(anchor.getAttribute('aria-describedby')||'').split(' ').filter(token=>token&&token!==id);
      if(remaining.length)anchor.setAttribute('aria-describedby',remaining.join(' '));else anchor.removeAttribute('aria-describedby');
    };
  },[anchor,id]);
  return anchor?createPortal(<div ref={bubble} id={id} className="warm-hint" role="tooltip">{anchor.dataset.hint}</div>,document.body):null;
}
