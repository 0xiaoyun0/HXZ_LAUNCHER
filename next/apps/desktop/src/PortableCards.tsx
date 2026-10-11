import React,{createContext,useContext,useEffect,useLayoutEffect,useState,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {MoveUpRight,Grip,X} from 'lucide-react';
import {state,ui,saveSettings,notify} from './model';
import {Button,Modal} from './ui';
import {CARD_PAGES,normalizeCardPlacements,normalizeWidgets} from '../../../packages/engine/core/card-extras.mjs';
import type {CardSpec} from './CardBoard';
export const CardHarvest=createContext(false);
type Move={source:string;card:string;title:string;w?:number;minW?:number;widget?:boolean};
const contents=new Map<string,Map<symbol,CardSpec[]>>(),listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(fn=>fn());
export function useCardRegistry(id:string,cards:CardSpec[]){
 const token=React.useRef(Symbol());
 useLayoutEffect(()=>{if(!CARD_PAGES.some(p=>p[0]===id))return;let all=contents.get(id);if(!all)contents.set(id,all=new Map());all.set(token.current,cards);emit();return()=>{all!.delete(token.current);if(!all!.size)contents.delete(id);emit();};},[id,cards]);
}
export function ForeignCard({source,card}:{source:string;card:string}){
 const value=useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>Array.from(contents.get(source)?.values()||[]).at(-1)?.find(c=>c.id===card));
 return <div className={'foreign-card-content source-'+source}>{value?.content||<div className="card-loading" role="status">正在准备这张卡片…</div>}</div>;
}
export function PortableSources({render}:{render:(route:string)=>React.ReactNode}){
 const s=useSnapshot(state),location=useLocation(),target=CARD_PAGES.find(p=>p[1]===location.pathname)?.[0];
 const sources=Array.from(new Set(Object.values(normalizeCardPlacements(s.settings.cardPlacements)).filter((v:any)=>v.target===target).map((v:any)=>v.source)));
 return <CardHarvest.Provider value={true}><div hidden aria-hidden>{sources.map(id=><React.Fragment key={id}>{render(CARD_PAGES.find(p=>p[0]===id)![1])}</React.Fragment>)}</div></CardHarvest.Provider>;
}
export async function moveCard(card:Move,target:string){
 if(ui.unsaved||ui.layoutUnsaved)throw Error('请先保存正在编辑的内容，再移动卡片');
 await saveSettings((s:any)=>{
  const cardId=card.widget?'widget.'+card.card:card.source===target?card.card:'moved.'+card.source+'.'+card.card,cardLayouts={...s.cardLayouts};
  for(const mode of ['wide','compact']){const key=target+'.'+mode;if(cardLayouts[key])cardLayouts[key]={...cardLayouts[key],hidden:(cardLayouts[key].hidden||[]).filter((id:string)=>id!==cardId)};}
  if(card.widget)return {cardLayouts,widgets:normalizeWidgets((s.widgets||[]).map((v:any)=>v.id===card.card?{...v,page:target}:v))};
  const placements=normalizeCardPlacements(s.cardPlacements),key=card.source+'.'+card.card;
  if(card.source===target)delete placements[key];else placements[key]={source:card.source,card:card.card,title:card.title,w:card.w,minW:card.minW,target};
  return {cardLayouts,cardPlacements:normalizeCardPlacements(placements)};
 });notify('已移到'+CARD_PAGES.find(p=>p[0]===target)?.[2]);
}
export function MoveCardDialog({card,current,onClose}:{card:Move;current:string;onClose:()=>void}){
 return <Modal open onClose={onClose} title={'移动“'+card.title+'”'}><div className="card-destinations">{CARD_PAGES.filter(p=>p[0]!==current).map(p=><Button key={p[0]} icon={MoveUpRight} onClick={async()=>{await moveCard(card,p[0]);onClose();}}>{p[2]}</Button>)}</div></Modal>;
}
export function MovedCardRecovery({board}:{board:string}){const s=useSnapshot(state),items=Object.values(normalizeCardPlacements(s.settings.cardPlacements)).filter((v:any)=>v.source===board) as any[];return items.length?<div className="card-palette"><h3>已移到其他页面</h3>{items.map(v=><section key={v.card}><span>{v.title} · {CARD_PAGES.find(p=>p[0]===v.target)?.[2]}</span><Button onClick={()=>moveCard(v,board)}>移回本页</Button></section>)}</div>:null;}
const dragListeners=new Set<()=>void>();let drag:{card:Move;from:string;x:number;y:number;over:string}|null=null;
const dragEmit=()=>dragListeners.forEach(fn=>fn());
export function startCardTravel(e:React.PointerEvent,card:Move,from:string){
 if(e.button!==0||drag)return;e.preventDefault();e.stopPropagation();
 if(ui.unsaved||ui.layoutUnsaved){notify('请先保存正在编辑的内容',true);return;}
 drag={card,from,x:e.clientX,y:e.clientY,over:''};dragEmit();
}
export function CardTravelLayer(){
 const value=useSyncExternalStore(fn=>{dragListeners.add(fn);return()=>{dragListeners.delete(fn);};},()=>drag),navigate=useNavigate(),location=useLocation();
 useEffect(()=>{if(!value)return;let hover='',timer:any,frame=0;
  const end=(commit:boolean)=>{const current=drag;clearTimeout(timer);cancelAnimationFrame(frame);drag=null;dragEmit();if(commit&&current?.over)void moveCard(current.card,current.over).catch(e=>notify(e.message,true));};
  const move=(e:PointerEvent)=>{if(!drag)return;const element=document.elementFromPoint(e.clientX,e.clientY),nav=element?.closest<HTMLElement>('[data-card-destination],.air-primary-nav a'),board=element?.closest<HTMLElement>('[data-card-board]');
   const target=nav?.dataset.cardDestination||CARD_PAGES.find(p=>nav?.getAttribute('href')==='#'+p[1])?.[0]||board?.dataset.cardBoard||'';
   const valid=CARD_PAGES.some(p=>p[0]===target)&&target!==drag.from?target:'';drag={...drag,x:e.clientX,y:e.clientY,over:valid};cancelAnimationFrame(frame);frame=requestAnimationFrame(dragEmit);
   if(valid!==hover){hover=valid;clearTimeout(timer);if(valid)timer=setTimeout(()=>{const route=CARD_PAGES.find(p=>p[0]===valid)?.[1];if(route&&route!==location.pathname)navigate(route);},650);}
  };
  const up=()=>end(true),cancel=()=>end(false),key=(e:KeyboardEvent)=>{if(e.key==='Escape')cancel();};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key);
  return()=>{clearTimeout(timer);cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key);};
 },[!!value,navigate,location.pathname]);
 useEffect(()=>{document.body.classList.toggle('card-travelling',!!value);return()=>document.body.classList.remove('card-travelling');},[!!value]);
 if(!value)return null;
 return createPortal(<><div className="card-travel-ghost" style={{left:value.x+14,top:value.y+12}}><Grip size={19}/><strong>{value.card.title}</strong><span>{value.over?'松手放到'+CARD_PAGES.find(p=>p[0]===value.over)?.[2]:'拖到栏目或下方目标页'}</span></div><div className="card-travel-dock"><span>移动卡片 · Esc 取消</span><div>{CARD_PAGES.filter(p=>p[0]!==value.from).map(p=><button key={p[0]} data-card-destination={p[0]} className={value.over===p[0]?'active':''}>{p[2]}</button>)}</div></div></>,document.body);
}
