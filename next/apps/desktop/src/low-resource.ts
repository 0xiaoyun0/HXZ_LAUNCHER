import {useEffect,useState} from 'react';import {useSnapshot} from 'valtio';import {state,ui,invoke,desktop} from './model';
export function useGameSleep(){
 const s=useSnapshot(state),u=useSnapshot(ui),[inactive,setInactive]=useState(false);
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const sync=()=>{clearTimeout(timer);if(!document.hidden&&document.hasFocus())setInactive(false);else timer=setTimeout(()=>setInactive(true),2000);};window.addEventListener('focus',sync);window.addEventListener('blur',sync);document.addEventListener('visibilitychange',sync);sync();return()=>{clearTimeout(timer);window.removeEventListener('focus',sync);window.removeEventListener('blur',sync);document.removeEventListener('visibilitychange',sync);};},[]);
 const asleep=!!s.running&&s.settings.gameSleep!==false&&inactive&&!u.unsaved&&!u.layoutUnsaved;
 useEffect(()=>{if(!desktop)return;void invoke('window.sleep',{enabled:asleep}).catch(()=>{});if(asleep&&s.settings.memoryOptimization!==false){const timer=setTimeout(()=>void invoke('memory.compact').catch(()=>{}),600);return()=>clearTimeout(timer);}},[asleep,s.settings.memoryOptimization]);
 return asleep;
}
