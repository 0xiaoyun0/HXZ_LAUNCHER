import {useLayoutEffect,useRef} from 'react';

// The line is laid out by its selected link. Only its transition uses measured distances.
export function useTabIndicator(key:string,workspace:string,speed:number,reduce:boolean){
  const navigation=useRef<HTMLDivElement>(null);
  const previous=useRef<{link:HTMLElement;workspace:string}|null>(null);
  useLayoutEffect(()=>{
    const active=navigation.current?.querySelector<HTMLElement>('a[aria-current=page]');
    const from=previous.current;
    previous.current=active?{link:active,workspace}:null;
    const line=active?.querySelector<HTMLElement>('.nav-indicator');
    if(!active||!line||!from?.link.isConnected||from.workspace!==workspace||from.link===active||!speed||reduce)return;
    const before=from.link.getBoundingClientRect(),after=active.getBoundingClientRect();
    if(!before.width||!after.width||Math.abs(before.top-after.top)>after.height)return;
    const delta=(before.left+before.width/2)-(after.left+after.width/2);
    const motion=line.animate([{transform:'translateX('+delta+'px)'},{transform:'translateX(0)'}],
      {duration:Math.min(340,220/speed),easing:'cubic-bezier(.2,.75,.22,1)'});
    const stop=()=>motion.cancel();
    window.addEventListener('resize',stop,{once:true});
    return ()=>{stop();window.removeEventListener('resize',stop);};
  },[key,workspace,speed,reduce]);
  return navigation;
}
