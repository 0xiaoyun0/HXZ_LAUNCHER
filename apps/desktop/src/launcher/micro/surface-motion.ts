import {useEffect,useLayoutEffect,useRef} from 'react';

const active=new Set<Animation>();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function duration(factor:number){
  const root=document.documentElement;
  if(root.dataset.motion!=='on'||root.hasAttribute('data-motion-paused')||document.hidden||reduced())return 0;
  return (parseFloat(root.style.getPropertyValue('--duration'))||0)*1000*factor;
}
function move(node:HTMLElement,frames:Keyframe[],ms:number,id:string){
  const animation=node.animate(frames,{duration:ms,easing:'cubic-bezier(.19,.78,.22,1)'});
  animation.id=id;
  active.add(animation);
  void animation.finished.then(()=>active.delete(animation),()=>active.delete(animation));
  return animation;
}

// Float the ink over its target so adding feedback never changes its flex or grid children.
export function usePressSurfaces(){
  useEffect(()=>{
    let ink:HTMLElement|undefined,playing:Animation|undefined;
    const clear=()=>{playing?.cancel();playing=undefined;ink?.remove();ink=undefined;};
    function press(e:PointerEvent|KeyboardEvent){
      if(!(e.target instanceof Element))return;
      if(e instanceof KeyboardEvent&&(e.repeat||e.isComposing||!['Enter',' '].includes(e.key)))return;
      if(e instanceof PointerEvent&&(!e.isPrimary||e.button!==0))return;
      const target=e.target.closest<HTMLElement>('button,a[href],[role=radio],[role=tab]');
      if(!target||target.matches(':disabled,[aria-disabled=true],.canvas-grip,.card-drag-handle,.card-resize-handle')||
        target.closest('.game-overlay,.window-buttons,.calendar-grid,[data-card-handle]')||target.hasAttribute('data-tauri-drag-region'))return;
      const ms=duration(.94);
      if(!ms)return;
      const r=target.getBoundingClientRect();
      if(r.width<12||r.height<12||r.width*r.height>98000)return;
      clear();
      const x=e instanceof PointerEvent?e.clientX-r.left:r.width/2,y=e instanceof PointerEvent?e.clientY-r.top:r.height/2;
      const radius=Math.hypot(Math.max(x,r.width-x),Math.max(y,r.height-y));
      const clip=document.createElement('span'),dot=document.createElement('i');
      clip.className='surface-ink';clip.setAttribute('aria-hidden','true');
      Object.assign(clip.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px',borderRadius:getComputedStyle(target).borderRadius,color:getComputedStyle(target).color});
      Object.assign(dot.style,{left:x-radius+'px',top:y-radius+'px',width:radius*2+'px',height:radius*2+'px'});
      clip.append(dot);document.body.append(clip);ink=clip;
      playing=move(dot,[{transform:'scale(.04)',opacity:.23},{opacity:.14,offset:.55},{transform:'scale(1)',opacity:0}],ms,'surface-press');
      void playing.finished.then(()=>clip.remove(),()=>clip.remove());
    }
    const cancelMotion=()=>{if(!duration(1)){clear();for(const animation of active)animation.cancel();}};
    const observer=new MutationObserver(cancelMotion);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion','data-motion-paused']});
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    preference.addEventListener('change',cancelMotion);
    document.addEventListener('visibilitychange',cancelMotion);
    document.addEventListener('pointerdown',press,true);document.addEventListener('keydown',press,true);
    document.addEventListener('scroll',clear,true);window.addEventListener('resize',clear);
    return ()=>{
      clear();for(const animation of active)animation.cancel();observer.disconnect();
      preference.removeEventListener('change',cancelMotion);document.removeEventListener('visibilitychange',cancelMotion);
      document.removeEventListener('pointerdown',press,true);document.removeEventListener('keydown',press,true);
      document.removeEventListener('scroll',clear,true);window.removeEventListener('resize',clear);
    };
  },[]);
}

type Place={x:number;y:number};
export function settleCardDrop(grid:HTMLElement,from:Map<string,DOMRect>,kind:'drop'|'return'='drop'){
  const ms=duration(kind==='return'?.76:.98);
  if(!ms)return;
  for(const card of grid.querySelectorAll<HTMLElement>('[data-card-id]')){
    if(card.closest('[data-card-grid]')!==grid)continue;
    const old=from.get(card.dataset.cardId!);
    if(!old)continue;
    const rect=card.getBoundingClientRect(),x=old.left-rect.left,y=old.top-rect.top;
    const sx=rect.width?Math.max(.91,Math.min(1.09,old.width/rect.width)):1;
    const sy=rect.height?Math.max(.91,Math.min(1.09,old.height/rect.height)):1;
    if(Math.abs(x)+Math.abs(y)<1&&Math.abs(sx-1)+Math.abs(sy-1)<.01)continue;
    move(card,[{translate:x+'px '+y+'px',scale:sx+' '+sy,transformOrigin:'top left'},{translate:'0 0',scale:'1',transformOrigin:'top left'}],ms,'card-settle-'+kind);
  }
}
// Measure layout coordinates rather than transformed screen rectangles. Fast sorts always
// finish at the current DOM order and a scrolling ancestor never looks like a moved row.
export function useReflowList<T extends HTMLElement>(signature:string){
  const ref=useRef<T>(null),last=useRef<{node:T;width:number;places:Map<string,Place>}|null>(null);
  const running=useRef<Animation[]>([]);
  useLayoutEffect(()=>{
    const root=ref.current;
    const stop=()=>{for(const a of running.current)a.cancel();running.current=[];};
    stop();
    if(!root){last.current=null;return;}
    const before=last.current,places=new Map<string,Place>();
    const ms=duration(.98),viewport=root.getBoundingClientRect();
    let animated=0;
    for(const child of root.children){
      if(!(child instanceof HTMLElement)||!child.dataset.flowKey)continue;
      const key=child.dataset.flowKey,x=child.offsetLeft,y=child.offsetTop;
      places.set(key,{x,y});
      if(!ms||before?.node!==root||before.width!==root.clientWidth||animated>=32)continue;
      if(viewport.top+y>innerHeight+child.offsetHeight||viewport.top+y+child.offsetHeight<0)continue;
      const previous=before.places.get(key),dx=previous?previous.x-x:0,dy=previous?previous.y-y:0;
      if(previous&&!dx&&!dy)continue;
      const span=Math.hypot(dx,dy),limit=span?Math.min(1,Math.max(72,root.clientWidth*.22)/span):1;
      const start=previous?{translate:dx*limit+'px '+dy*limit+'px',opacity:.75}:{translate:'0 .7em',opacity:.24};
      running.current.push(move(child,[start,{translate:'0 0',opacity:1}],ms,'list-reflow'));
      animated++;
    }
    last.current={node:root,width:root.clientWidth,places};
    root.addEventListener('pointerdown',stop,{passive:true});
    return ()=>{root.removeEventListener('pointerdown',stop);stop();};
  },[signature]);
  return ref;
}
