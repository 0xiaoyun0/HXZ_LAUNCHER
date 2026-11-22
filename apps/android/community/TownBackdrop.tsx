import {useEffect,useRef,useState} from 'react';
import {useLocalMedia,type Personalization} from './personalization';

export function TownBackdrop({personal,reduced}:{personal:Personalization;reduced:boolean}){
  const {layout,media}=personal,asset=layout.background==='custom'?media.background:undefined;
  const still=useLocalMedia(asset?.kind==='video'?asset.poster:asset?.blob);
  const stream=useLocalMedia(asset?.kind==='video'&&!reduced?asset.blob:undefined);
  const video=useRef<HTMLVideoElement>(null),[foreground,setForeground]=useState(!document.hidden);
  useEffect(()=>{
    const show=()=>setForeground(!document.hidden),hide=()=>setForeground(false);
    document.addEventListener('visibilitychange',show);window.addEventListener('town-pause',hide);window.addEventListener('town-resume',show);
    return ()=>{document.removeEventListener('visibilitychange',show);window.removeEventListener('town-pause',hide);window.removeEventListener('town-resume',show);};
  },[]);
  useEffect(()=>{
    const element=video.current;if(!element)return;
    if(foreground&&stream)void element.play().catch(()=>{});else element.pause();
    return ()=>element.pause();
  },[foreground,stream]);
  if(!still&&!stream)return null;
  const position={objectPosition:'50% '+layout.backgroundFocus+'%'};
  return <div className="town-backdrop" aria-hidden="true">
    {still&&<img alt="" src={still} style={position}/>}
    {stream&&<video ref={video} src={stream} poster={still} style={position} muted loop playsInline preload="metadata"/>}
    <div className="town-backdrop-wash" style={{opacity:layout.shade/100}}/>
  </div>;
}
