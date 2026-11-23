import {useEffect,useLayoutEffect,useRef,type MouseEvent} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {perform} from '../model';

export function useWorkspaceNavigation(animate:boolean){
  const navigate=useNavigate(),location=useLocation(),active=useRef<ViewTransition|null>(null);
  useLayoutEffect(()=>{if(!animate)active.current?.skipTransition();},[animate]);
  useEffect(()=>{
    const skip=()=>active.current?.skipTransition();
    const hidden=()=>{if(document.hidden)skip();};
    window.addEventListener('resize',skip);
    document.addEventListener('visibilitychange',hidden);
    return()=>{skip();window.removeEventListener('resize',skip);document.removeEventListener('visibilitychange',hidden);};
  },[]);

  function go(path:string){
    const replace=path===location.pathname+location.search+location.hash;
    const update=()=>navigate(path,{flushSync:true,replace});
    if(!animate||document.hidden||!document.startViewTransition){void perform(update);return;}
    active.current?.skipTransition();
    const next=document.startViewTransition(update);
    active.current=next;
    // Resizing or superseding a snapshot rejects ready even when the route commits.
    // finished also reports callback failures, so present those to the player once.
    void next.ready.catch(()=>{});
    void next.updateCallbackDone.catch(()=>{});
    void perform(async()=>{
      try{await next.finished;}
      finally{if(active.current===next)active.current=null;}
    });
  }
  function follow(event:MouseEvent<HTMLAnchorElement>,path:string){
    if(!animate||event.defaultPrevented||event.button!==0||event.metaKey||event.altKey||event.ctrlKey||event.shiftKey||
      (event.currentTarget.target&&event.currentTarget.target!=='_self'))return;
    event.preventDefault();
    go(path);
  }
  return {go,follow};
}
