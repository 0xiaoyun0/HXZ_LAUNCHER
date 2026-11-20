import {useEffect} from 'react';
import {normalizeCardStyle} from '../../../../packages/engine/core/card-layout.mjs';
export function useAppearance(s:any,off:boolean,speed:number){
 useEffect(()=>{
  const root=document.documentElement;root.dataset.theme=s.settings.theme;root.dataset.motion=off?'off':'on';root.style.setProperty('--duration',off?'0s':(.32/speed)+'s');root.style.setProperty('--accent',s.settings.accentColor||'#5668bc');root.style.setProperty('--font-size',(s.settings.fontSize||16)+'px');
  const rgba=(hex:string,alpha:number)=>`rgba(${hex.slice(1).match(/../g)?.map(v=>parseInt(v,16)).join(',')||'255,255,255'},${Math.max(.2,Math.min(1,alpha))})`;
  const base=s.settings.theme==='dark'?'#252a35':'#ffffff';
  // Derive selection surfaces from the player's accent, including Chromium 108.
  const accent=s.settings.accentColor||'#5668bc',rgb=/^#[0-9a-f]{6}$/i.test(accent)?accent.slice(1).match(/../g)!.map(v=>parseInt(v,16)).join(','):'86,104,188';
  const [red,green,blue]=rgb.split(',').map(channel=>{
   const value=Number(channel)/255;
   return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
  });
  const luminance=.2126*red+.7152*green+.0722*blue;
  root.style.setProperty('--accent-ink',luminance>.179?'#000':'#fff');
  root.style.setProperty('--accent-soft',`rgba(${rgb},${s.settings.theme==='dark'?.19:.09})`);
  root.style.setProperty('--accent-border',`rgba(${rgb},${s.settings.theme==='dark'?.5:.28})`);
  root.style.setProperty('--accent-text',s.settings.theme==='dark'?`rgb(${rgb.split(',').map(v=>Math.round(Number(v)+(255-Number(v))*.55)).join(',')})`:accent);
  for(const [key,value] of Object.entries(s.settings.columns||{}) as any)root.style.setProperty('--'+key+'-surface',rgba(value.color||base,value.opacity??1));
  const card=normalizeCardStyle(s.settings.cardStyle),workspace=s.settings.columns?.workspace;
  root.style.setProperty('--card-surface',rgba(card.color||workspace?.color||base,card.opacity));root.style.setProperty('--card-radius',card.radius+'px');
 },[s.settings.theme,s.settings.fontSize,s.settings.accentColor,s.settings.columns,s.settings.cardStyle,speed,off]);
}
