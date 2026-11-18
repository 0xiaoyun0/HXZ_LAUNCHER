import {useEffect,useState} from 'react';
import {desktop,invoke} from '../model';

export function useHomeCards(){
 const [cards,setCards]=useState<any[]>([]);
 useEffect(()=>{if(!desktop)return;let mounted=true;
  const read=async()=>{try{const result=await invoke('plugins.list');if(mounted)setCards(result.safeMode?[]:result.items.filter((i:any)=>i.enabled&&i.card));}catch{/* Plugin errors remain visible in Settings. */}};
  void read();const unsubscribe=window.launcher?.subscribe(ev=>{if(ev.type==='cards-changed')void read();});
  return()=>{mounted=false;unsubscribe?.();};
 },[]);
 return cards;
}
