import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import {useLocation} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {state} from './model';

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
// Animate a stable content container, never the grid's geometry or the fixed app chrome.
export function usePageEnter(key:unknown){
 const ref=useRef<HTMLDivElement>(null),s=useSnapshot(state);
 useLayoutEffect(()=>{
  const el=ref.current;if(!el)return;let animation:Animation|undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const frame=requestAnimationFrame(()=>{if(s.settings.animationSpeed===0||reduced.matches)return;animation=el.animate([{opacity:.55,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:Math.min(600,240/(s.settings.animationSpeed||1)),easing:'cubic-bezier(.22,.68,.24,1)'});});
  const stop=()=>animation?.cancel();reduced.addEventListener('change',stop);return()=>{cancelAnimationFrame(frame);animation?.cancel();reduced.removeEventListener('change',stop);};
 },[key,s.settings.animationSpeed]);
 return ref;
}
