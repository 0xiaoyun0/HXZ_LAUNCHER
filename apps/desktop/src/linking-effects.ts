import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {state} from './model';
import {community,communityRequest} from '../../../packages/community/client';

const requests=new Map<string,{at:number;pending:boolean;promise:Promise<string[]>}>();
export function requestLinkingEffects(owner:string,refresh=false){
  const old=requests.get(owner);
  if(old&&(old.pending||!refresh&&Date.now()-old.at<30000))return old.promise;
  const entry={at:Date.now(),pending:true,promise:Promise.resolve([] as string[])};
  entry.promise=communityRequest<{effects:string[]}>('/api/linking/features',{signal:AbortSignal.timeout(8000)},true).then(value=>{
    if(!Array.isArray(value.effects))throw Error('Invalid appearance list');
    return value.effects.filter(v=>v==='music-archive'||v==='archive-signal');
  }).finally(()=>{entry.pending=false;});
  requests.set(owner,entry);return entry.promise;
}
const prefix='hxz.archive-signal.081:';
type SignalPreference={owner:string;earned:boolean;enabled:boolean};
function read(owner:string):SignalPreference{try{const v=JSON.parse(localStorage.getItem(prefix+owner)||'{}');return {owner,earned:!!owner&&v.earned===true,enabled:v.enabled===true};}catch{return {owner,earned:false,enabled:false};}}
function write(v:SignalPreference){if(v.owner)try{localStorage.setItem(prefix+v.owner,JSON.stringify({earned:v.earned,enabled:v.enabled}));}catch{}}
export function useArchiveSignal(){
  const c=useSnapshot(community),s=useSnapshot(state),owner=c.user?.uid?JSON.stringify([s.settings.communityUrl,c.user.uid]):'';
  const [value,setValue]=useState(()=>read(owner));const current=value.owner===owner?value:read(owner);
  useEffect(()=>{
    setValue(read(owner));let disposed=false,run=0;
    const load=async(force=false)=>{if(!owner||!c.connected)return;const id=++run;try{const effects=await requestLinkingEffects(owner,force);if(disposed||id!==run)return;const next={...read(owner),earned:effects.includes('archive-signal')};write(next);setValue(next);}catch{}};
    const refresh=()=>void load(true),preference=()=>setValue(read(owner));void load();
    window.addEventListener('hxz-linking-progress',refresh);window.addEventListener('hxz-archive-signal',preference);
    return()=>{disposed=true;window.removeEventListener('hxz-linking-progress',refresh);window.removeEventListener('hxz-archive-signal',preference);};
  },[owner,c.connected]);
  return {earned:current.earned,enabled:current.earned&&current.enabled,setEnabled(enabled:boolean){const next={...current,enabled};write(next);setValue(next);window.dispatchEvent(new Event('hxz-archive-signal'));}};
}
