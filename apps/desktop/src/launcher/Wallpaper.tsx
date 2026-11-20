import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {activeDesign,wallpaperSource} from '../../../../packages/engine/core/desktop-themes.mjs';

export function Wallpaper({settings,sleeping}:{settings:any;sleeping:boolean}){
  const design=activeDesign(settings),source=wallpaperSource(settings),url=source?.url||'';
  const [failed,setFailed]=useState(''),video=useRef<HTMLVideoElement>(null);
  const available=!!url&&failed!==url;
  const builtIn=design.scene?'./media/'+design.scene:'';
  const image=available&&!source?.video?url:(settings.desktopBackdrop!=='plain'||(url&&!available)?builtIn:'');
  useEffect(()=>{
    const el=video.current;if(!el)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    function playback(){
      if(sleeping||document.hidden||settings.animationSpeed===0||reduced.matches)el!.pause();
      else void el!.play().catch(()=>{});
    }
    playback();el.addEventListener('loadeddata',playback);document.addEventListener('visibilitychange',playback);reduced.addEventListener('change',playback);
    return ()=>{el.pause();el.removeEventListener('loadeddata',playback);document.removeEventListener('visibilitychange',playback);reduced.removeEventListener('change',playback);};
  },[available,url,sleeping,settings.animationSpeed]);
  const fit=settings.backgroundFit==='contain'?'contain':settings.backgroundFit==='100% 100%'?'fill':'cover';
  const position=(settings.backgroundPositionX??50)+'% '+(settings.backgroundPositionY??50)+'%';
  const style={'--scene-strength':settings.backgroundOpacity??design.strength,'--scene-position':position} as CSSProperties;
  return <div className="launcher-wallpaper" aria-hidden="true" style={style}>
    {image&&<img key={image} src={image} alt="" draggable={false} style={{objectFit:fit}} onError={()=>{if(image===url)setFailed(url);}}/>}
    {available&&source?.video&&<video ref={video} key={url} src={url} muted loop playsInline preload="auto" style={{objectFit:fit}} onError={()=>setFailed(url)}/>}
  </div>;
}
