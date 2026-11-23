import {useLayoutEffect} from 'react';
import {normalizeCardStyle} from '../../../../packages/engine/core/card-layout.mjs';
import {activeDesign} from '../../../../packages/engine/core/desktop-themes.mjs';

const channels=(hex:string)=>hex.slice(1).match(/../g)!.map(c=>parseInt(c,16));
function luminance(rgb:number[]){
  const [r,g,b]=rgb.map(c=>c/255<=.04045?c/255/12.92:((c/255+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
}
function readable(rgb:number[],dark:boolean){
  const ground=dark?.045:.76,edge=dark?255:0;
  let color=rgb;
  for(let i=0;i<22;i++){
    const lum=luminance(color);
    if((Math.max(lum,ground)+.05)/(Math.min(lum,ground)+.05)>=4.8)break;
    color=color.map(c=>Math.round(c+(edge-c)*.12));
  }
  return color.join(',');
}

export function useAppearance(s:any,off:boolean,speed:number){
  const settings=s.settings,design=activeDesign(settings);
  useLayoutEffect(()=>{
    const root=document.documentElement,vars=root.style,dark=settings.theme==='dark';
    const card=normalizeCardStyle(settings.cardStyle),accent=/^#[a-f0-9]{6}$/i.test(settings.accentColor)?settings.accentColor:design.accent;
    const rgb=channels(accent),text=readable(rgb,dark),base=dark?'#252a35':'#ffffff';
    root.dataset.skin=design.id;root.dataset.theme=dark?'dark':'light';root.dataset.motion=off?'off':'on';
    vars.setProperty('--duration',off?'0s':(.32/speed)+'s');
    vars.setProperty('--font-size',(settings.fontSize||16)+'px');vars.setProperty('--accent',accent);
    vars.setProperty('--accent-rgb',rgb.join(','));vars.setProperty('--accent-ink',luminance(rgb)>.179?'#000':'#fff');
    vars.setProperty('--accent-text','rgb('+text+')');vars.setProperty('--accent-soft','rgba('+rgb+','+(dark?.20:.12)+')');
    vars.setProperty('--accent-border','rgba('+text+','+(dark?.53:.34)+')');
    vars.setProperty('--pane-opacity',String(card.opacity));vars.setProperty('--pane-radius',card.radius+'px');
    vars.setProperty('--card-radius',card.radius+'px');vars.setProperty('--card-spacing',card.gap+'px');
    vars.setProperty('--control-radius',Math.max(4,Math.round(card.radius*.48))+'px');
    if(card.color){
      const tint=channels(card.color),canvas=dark?[27,35,45]:[226,232,244];
      const panelDark=luminance(tint.map((c,i)=>Math.round(c*card.opacity+canvas[i]*(1-card.opacity))))<.20;
      vars.setProperty('--custom-pane-rgb',tint.join(','));vars.setProperty('--pane-fg',panelDark?'#f7f8fc':'#202637');
      vars.setProperty('--pane-muted',panelDark?'#d3dce6':'#3d4659');vars.setProperty('--pane-link','rgb('+readable(rgb,panelDark)+')');
    }else for(const key of ['--custom-pane-rgb','--pane-fg','--pane-muted','--pane-link'])vars.removeProperty(key);
    if(/^#[a-f0-9]{6}$/i.test(settings.backgroundColor||''))vars.setProperty('--custom-canvas',settings.backgroundColor);else vars.removeProperty('--custom-canvas');
    vars.setProperty('--wall-protection',String(Math.max(.05,.72-card.opacity*.77)));
    vars.setProperty('--card-surface','var(--theme-pane)');
    for(const [key,value] of Object.entries(settings.columns||{}) as any){
      const hex=/^#[a-f0-9]{6}$/i.test(value.color)?value.color:base;
      vars.setProperty('--'+key+'-surface','rgba('+channels(hex)+','+Math.max(.2,Math.min(1,value.opacity??1))+')');
    }
  },[design.id,design.accent,settings.theme,settings.accentColor,settings.cardStyle,settings.columns,settings.backgroundColor,settings.fontSize,off,speed]);
}
