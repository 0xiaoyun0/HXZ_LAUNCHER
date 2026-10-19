import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {state} from './model';
import {community} from '../../../packages/community/client';
import {requestLinkingEffects} from './linking-effects';

type Appearance = {owner:string;earned:boolean;classic:boolean};
const prefix='hxz.music-appearance.081:';
function read(owner:string):Appearance {
  try {const saved=JSON.parse(localStorage.getItem(prefix+owner)||'{}');return {owner,earned:!!owner&&saved.earned===true,classic:saved.classic===true};}
  catch {return {owner,earned:false,classic:false};}
}
function write(value:Appearance){if(value.owner)try{localStorage.setItem(prefix+value.owner,JSON.stringify({earned:value.earned,classic:value.classic}));}catch{/* A cosmetic preference must not interrupt music. */}}

// This cache is cosmetic only. Music-account and hosting permissions remain
// server-authorized independently; changing an appearance never grants access.
export function useMusicAppearance(){
  const c=useSnapshot(community),s=useSnapshot(state);
  const owner=c.user?.uid?JSON.stringify([s.settings.communityUrl,c.user.uid]):'';
  const [value,setValue]=useState<Appearance>(()=>read(owner));
  const [previewOwner,setPreviewOwner]=useState('');
  const current=value.owner===owner?value:read(owner);
  useEffect(()=>{
    const initial=read(owner);setValue(initial);
    if(!owner||!c.connected)return;
    let generation=0,disposed=false;
    const refresh=async(force=false)=>{
      const token=++generation;
      try {
        const effects=await requestLinkingEffects(owner,force);
        if(disposed||token!==generation)return;
        setValue(previous=>{const next={...read(owner),earned:effects.includes('music-archive')};if(previous.owner===owner)next.classic=previous.classic;write(next);return next;});
      }catch{/* Old community versions and temporary outages retain the last earned appearance. */}
    };
    const changed=()=>void refresh(true);void refresh();window.addEventListener('hxz-linking-progress',changed);
    return()=>{disposed=true;window.removeEventListener('hxz-linking-progress',changed);};
  },[owner,c.connected]);
  const preview=!!owner&&c.user?.admin===true&&previewOwner===owner;
  return {earned:current.earned,archive:preview||(current.earned&&!current.classic),preview,
    canPreview:c.user?.admin===true,
    setArchive(archive:boolean){const next={...current,classic:!archive};setPreviewOwner('');setValue(next);write(next);},
    setPreview(enabled:boolean){setPreviewOwner(enabled?owner:'');}
  };
}
