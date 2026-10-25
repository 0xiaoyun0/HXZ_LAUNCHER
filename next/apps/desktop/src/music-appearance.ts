import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {state} from './model';
import {community,communityRequest,communitySessionMatches} from '../../../packages/community/client';
import {createMusicAppearanceGate} from '../../../packages/engine/core/music-appearance.mjs';

export function useMusicAppearance(){
  const c=useSnapshot(community),s=useSnapshot(state);
  const sessionReady=c.connected&&!!c.user?.uid&&communitySessionMatches(c.user.uid,s.settings.communityUrl);
  const owner=sessionReady?JSON.stringify([s.settings.communityUrl.replace(/\/$/,''),c.user.uid]):'';
  const [value,setValue]=useState({owner:'',connected:false,earned:false,classic:false,unlockPending:false});
  const [gate]=useState(()=>createMusicAppearanceGate({storage:localStorage,onChange:setValue,loadEffects:async()=>{
    const response=await communityRequest<{effects:string[]}>('/api/linking/features',{signal:AbortSignal.timeout(8000)},true);
    return response.effects;
  }}));
  useEffect(()=>{gate.setSession(owner,sessionReady);return()=>gate.setSession('',false);},[gate,owner,sessionReady]);
  useEffect(()=>{
    const refresh=()=>void gate.refresh();
    window.addEventListener('hxz-linking-progress',refresh);
    window.addEventListener('focus',refresh);
    return()=>{window.removeEventListener('hxz-linking-progress',refresh);window.removeEventListener('focus',refresh);};
  },[gate]);
  // Guard the render immediately when the account or connection changes, before effects run.
  const earned=!!owner&&value.owner===owner&&sessionReady&&value.earned;
  return {earned,archive:earned&&!value.classic&&!value.unlockPending,
    unlockPending:earned&&value.unlockPending,
    setArchive:gate.setArchive,markUnlockShown:gate.markUnlockShown,dismissUnlock:gate.dismissUnlock};
}
