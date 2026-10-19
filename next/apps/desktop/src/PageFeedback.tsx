import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {state} from './model';

let reducedMotionQuery:MediaQueryList|undefined;
const motionPreference=()=>typeof window==='undefined'?undefined:(reducedMotionQuery??=matchMedia('(prefers-reduced-motion: reduce)'));
const subscribeMotionPreference=(listener:()=>void)=>{const query=motionPreference();query?.addEventListener('change',listener);return()=>query?.removeEventListener('change',listener);};
// Keep MotionConfig, CSS and imperative entrances in sync when the OS changes
// this preference while the launcher is already open.
export function useReducedMotionPreference(){return useSyncExternalStore(subscribeMotionPreference,()=>motionPreference()?.matches??false,()=>false);}

const pending=new Map<symbol,string>(),listeners=new Set<()=>void>();let revision=0;
const changed=()=>{revision++;listeners.forEach(fn=>fn());};
export function beginPageLoad(){const id=Symbol();pending.set(id,location.hash);changed();return()=>{if(pending.delete(id))changed();};}
export function PageLoadIndicator(){
 const route=useLocation(),[visible,setVisible]=useState(false);
 useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>revision);
 const loading=[...pending.values()].some(path=>path===location.hash);
 useEffect(()=>{setVisible(false);if(!loading)return;const timer=setTimeout(()=>setVisible(true),180);return()=>clearTimeout(timer);},[loading,route.pathname,route.search]);
 return visible?<div className="page-load-indicator" role="status" aria-label="正在加载页面内容"><span/></div>:null;
}
export function PageSkeleton({label='正在加载页面…'}:{label?:string}){return <div className="page-skeleton" role="status"><p>{label}</p><div className="skeleton-title"/><div className="skeleton-cards">{[0,1,2].map(n=><div className="skeleton-card" key={n}><i/><i/><i/></div>)}</div></div>;}
// Reveal only the visible content inside each card. RGL owns the outer card
// geometry; transforming that element (or the whole page) can cross its bounds.
export function usePageEnter(key:unknown){
 const ref=useRef<HTMLDivElement>(null),last=useRef<unknown>(Symbol()),s=useSnapshot(state),reduced=useReducedMotionPreference();
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  el.dataset.motionScope='page';
  const entering=last.current!==key;last.current=key;
  // Changing the speed cancels an in-flight reveal, but never replays the page.
  if(s.settings.animationSpeed===0||reduced)return;
  const animations=new Set<Animation>();
  const speed=s.settings.animationSpeed||1,duration=Math.min(800,420/speed);
  let seen=new WeakSet<Element>(),frame=0,switchFrame=0,order=0,stopped=false,includeTitle=true;
  let timeout:ReturnType<typeof setTimeout>|undefined,settleTimeout:ReturnType<typeof setTimeout>|undefined;
  const reveal=()=>{
   frame=0;if(stopped||document.hidden)return;
   const viewport=el.closest('.app-main')?.getBoundingClientRect()||{top:0,bottom:innerHeight};
   const selector=includeTitle?'.page-header,.card-page-title,.air-card':'.air-card';
   let nodes=Array.from(el.querySelectorAll<HTMLElement>(selector));
   // Non-card result pages still reveal their changing list, never a game canvas.
   if(!nodes.length)nodes=Array.from(el.querySelectorAll<HTMLElement>('.forum-list,.rank-list,.blueprint-list,.resource-results'));
   const candidates=nodes
    .filter(node=>!seen.has(node)&&node.closest('[data-motion-scope]')===el&&!node.parentElement?.closest('.air-card'))
    .map(node=>({node,rect:node.getBoundingClientRect()}))
    .filter(({rect})=>rect.width>0&&rect.height>0&&rect.bottom>viewport.top&&rect.top<viewport.bottom)
    .sort((a,b)=>a.rect.top-b.rect.top||a.rect.left-b.rect.left).slice(0,12);
   if(candidates.some(({node})=>node.classList.contains('air-card'))){
    el.dataset.motionEntering='true';clearTimeout(settleTimeout);
    settleTimeout=setTimeout(()=>{delete el.dataset.motionEntering;settleTimeout=undefined;},600);
   }
   for(const {node} of candidates){
    seen.add(node);
    const layers=node.classList.contains('air-card')?Array.from(node.querySelectorAll<HTMLElement>(':scope > .card-heading,:scope > .card-content')):[node];
    const delay=Math.min(order++*28,112)/speed;
    for(const [index,layer] of layers.entries()){
     const animation=layer.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration,delay:delay+index*24/speed,easing:'cubic-bezier(.22,.61,.36,1)',fill:'backwards'});
     animations.add(animation);animation.onfinish=()=>animations.delete(animation);
    }
   }
  };
  const queue=()=>{if(!frame&&!stopped)frame=requestAnimationFrame(reveal);};
  // Lazy pages and measured cards can arrive just after the route commits.
  // Keep a bounded observation window for cold imports and RGL measurement.
  const observer=new MutationObserver(queue);
  const stop=()=>{stopped=true;cancelAnimationFrame(frame);cancelAnimationFrame(switchFrame);frame=0;observer.disconnect();clearTimeout(timeout);clearTimeout(settleTimeout);settleTimeout=undefined;delete el.dataset.motionEntering;animations.forEach(animation=>animation.cancel());animations.clear();};
  const begin=(title:boolean)=>{stop();stopped=false;includeTitle=title;seen=new WeakSet<Element>();order=0;el.dataset.motionEntering='true';observer.observe(el,{childList:true,subtree:true});timeout=setTimeout(()=>{observer.disconnect();if(!settleTimeout)delete el.dataset.motionEntering;},2000);queue();};
  const switchContent=(event:MouseEvent)=>{
   const button=(event.target as Element)?.closest<HTMLButtonElement>('.segments>button,[role=tab]');
   if(!button||button.disabled||button.closest('[data-motion-scope]')!==el||button.getAttribute('aria-pressed')==='true'||button.getAttribute('aria-selected')==='true'||button.classList.contains('selected'))return;
   // React commits the selected tab after the capture listener. Wait for that
   // commit, then reveal the results even though the route has not changed.
   switchFrame=requestAnimationFrame(()=>{switchFrame=requestAnimationFrame(()=>begin(false));});
  };
  if(entering)begin(true);
  const hidden=()=>{if(document.hidden)stop();};
  window.addEventListener('resize',stop);el.addEventListener('pointerdown',stop);el.addEventListener('click',switchContent,true);document.addEventListener('visibilitychange',hidden);
  return()=>{stop();window.removeEventListener('resize',stop);el.removeEventListener('pointerdown',stop);el.removeEventListener('click',switchContent,true);document.removeEventListener('visibilitychange',hidden);};
 },[key,s.settings.animationSpeed,reduced]);
 return ref;
}
