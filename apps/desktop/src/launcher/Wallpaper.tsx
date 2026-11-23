import {useEffect,useRef,type CSSProperties} from 'react';
import {proxy,useSnapshot} from 'valtio';
import {wallpaperSource} from '../../../../packages/engine/core/desktop-wallpaper.mjs';

export const wallpaperHealth=proxy({failed:'',attempt:0});
export function retryWallpaper(){wallpaperHealth.failed='';wallpaperHealth.attempt++;}
export function Wallpaper({settings,sleeping}:{settings:any;sleeping:boolean}){
  const source=wallpaperSource(settings),url=source?.url||'',health=useSnapshot(wallpaperHealth);
  const video=useRef<HTMLVideoElement>(null),available=!!url&&health.failed!==url;
  useEffect(()=>{wallpaperHealth.failed='';},[url]);
  useEffect(()=>{
    const el=video.current;if(!el)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    function playback(){
      if(sleeping||document.hidden||settings.animationSpeed===0||reduced.matches)el!.pause();
      else void el!.play().catch(()=>{});
    }
    playback();el.addEventListener('loadeddata',playback);document.addEventListener('visibilitychange',playback);reduced.addEventListener('change',playback);
    return ()=>{el.pause();el.removeEventListener('loadeddata',playback);document.removeEventListener('visibilitychange',playback);reduced.removeEventListener('change',playback);};
  },[available,url,sleeping,settings.animationSpeed,health.attempt]);
  const objectFit=settings.backgroundFit==='contain'?'contain':settings.backgroundFit==='100% 100%'?'fill':'cover';
  const style={'--scene-strength':settings.backgroundOpacity??.77,'--scene-position':(settings.backgroundPositionX??50)+'% '+(settings.backgroundPositionY??50)+'%'} as CSSProperties;
  return <div className="launcher-wallpaper" aria-hidden="true" style={style}>
    {available&&(source?.video?<video ref={video} key={url+health.attempt} src={url} muted loop playsInline preload="auto" style={{objectFit}} onError={()=>wallpaperHealth.failed=url}/>:
      <img key={url+health.attempt} src={url} alt="" draggable={false} style={{objectFit}} onError={()=>wallpaperHealth.failed=url}/>)}
  </div>;
}
