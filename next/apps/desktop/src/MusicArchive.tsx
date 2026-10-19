import type {CSSProperties} from 'react';
import './music-archive.css';
const hues=[78,194,28,256,146,337];
function trackHue(id:string){let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))|0;return hues[Math.abs(hash)%hues.length];}
export function ArchiveDisc({id='',large=false}:{id?:string;large?:boolean}){
  return <span aria-hidden className={'archive-disc-art'+(large?' large':'')} style={{'--disc-hue':trackHue(id)} as CSSProperties}><i/><b/><span/></span>;
}
