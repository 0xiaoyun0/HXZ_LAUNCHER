import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useLocation,useNavigationType} from 'react-router-dom';
import {LatticeGlyph} from './launcher/micro/Feedback';
import {useSnapshot} from 'valtio';
import {state} from './model';

let reducedMotionQuery:MediaQueryList|undefined;
const motionPreference=()=>typeof window==='undefined'?undefined:(reducedMotionQuery??=matchMedia('(prefers-reduced-motion: reduce)'));
const subscribeMotionPreference=(listener:()=>void)=>{const query=motionPreference();query?.addEventListener('change',listener);return()=>query?.removeEventListener('change',listener);};
// Keep MotionConfig, CSS and imperative entrances in sync when the OS changes
// this preference while the launcher is already open.
export function useReducedMotionPreference(){return useSyncExternalStore(subscribeMotionPreference,()=>motionPreference()?.matches??false,()=>false);}

const pending=new Map<symbol,string>(),listeners=new Set<()=>void>();
const changed=()=>listeners.forEach(fn=>fn());
const subscribeLoading=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
const isPageLoading=()=>{for(const path of pending.values())if(path===location.hash)return true;return false;};
export function beginPageLoad(){const id=Symbol();pending.set(id,location.hash);changed();return()=>{if(pending.delete(id))changed();};}
export function PageLoadIndicator(){
 const route=useLocation(),[visibleFor,setVisibleFor]=useState<string|null>(null);
 const loading=useSyncExternalStore(subscribeLoading,isPageLoading,()=>false);
 useEffect(()=>{
   setVisibleFor(null);
   if(!loading)return;
   const timer=setTimeout(()=>setVisibleFor(route.key),180);
   return()=>clearTimeout(timer);
 },[loading,route.key]);
 return loading&&visibleFor===route.key?<div className="page-load-indicator" role="status" aria-label="正在加载页面内容"><span/></div>:null;
}
export function PageSkeleton({label='正在加载页面…'}:{label?:string}){return <div className="page-skeleton" role="status"><p className="micro-wait"><LatticeGlyph/>{label}</p><div className="skeleton-title"/><div className="skeleton-cards">{[0,1,2].map(n=><div className="skeleton-card" key={n}><i/><i/><i/></div>)}</div></div>;}
// Reveal only the visible content inside each card. RGL owns the outer card
// geometry; transforming that element (or the whole page) can cross its bounds.
export function usePageEnter(key:unknown){
 const ref=useRef<HTMLDivElement>(null),last=useRef<unknown>(Symbol()),s=useSnapshot(state),reduced=useReducedMotionPreference();
 const previousIndex=useRef<number|null>(null),navigation=useNavigationType(),location=useLocation();
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;
  el.dataset.motionScope='page';
  const entering=last.current!==key,index=window.history.state?.idx;
  // Browser Back and Forward are both POP operations; the router's entry index distinguishes them.
  const back=navigation==='POP'&&typeof index==='number'&&previousIndex.current!==null&&index<previousIndex.current;
  if(entering)el.dataset.pageDirection=back?'back':'forward';
  last.current=key;previousIndex.current=typeof index==='number'?index:null;
  // Changing the speed cancels an in-flight reveal, but never replays the page.
  if(s.settings.animationSpeed===0||reduced)return;
  const animations=new Set<Animation>();
  const speed=s.settings.animationSpeed||1,duration=Math.min(520,245/speed);
  let seen=new WeakSet<Element>(),frame=0,switchFrame=0,order=0,stopped=false,includeTitle=true;
  let timeout:ReturnType<typeof setTimeout>|undefined,settleTimeout:ReturnType<typeof setTimeout>|undefined;
  const reveal=()=>{
   frame=0;if(stopped||document.hidden)return;
   const viewport=el.closest('.app-main,.launcher-content')?.getBoundingClientRect()||{top:0,bottom:innerHeight};
   const desktop=el.classList.contains('launcher-content');
   const panels='[data-card-id],.preference-section,.resource-section,.lite-game,.lite-identity,.resource-target,.installation-summary,.hub-page>header,.hub-page>.hub-panel';
   const selector=desktop?(includeTitle?'.launch-title,.lite-rail-heading,.page-header,'+panels:panels):includeTitle?'.page-header,.card-page-title,.air-card':'.air-card';
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
    const layers=node.hasAttribute('data-card-id')?Array.from(node.querySelectorAll<HTMLElement>(':scope > header,:scope > .desktop-panel-body')):node.classList.contains('air-card')?Array.from(node.querySelectorAll<HTMLElement>(':scope > .card-heading,:scope > .card-content')):[node];
    const delay=Math.min(order++*16,64)/speed;
    for(const [index,layer] of layers.entries()){
     const heading=layer.matches('.launch-title,.page-header,.lite-rail-heading');
     const from=heading?(back?'translateX(-.48em)':'translateX(.48em)'):(back?'translateY(-.22em)':'translateY(.32em)');
     const animation=layer.animate([{opacity:.55,transform:from},{opacity:1,transform:'translate(0)'}],{duration,delay:delay+index*24/speed,easing:'cubic-bezier(.22,.76,.25,1)',fill:'backwards'});
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
 },[key,s.settings.animationSpeed,reduced,navigation,location.key]);
 return ref;
}
