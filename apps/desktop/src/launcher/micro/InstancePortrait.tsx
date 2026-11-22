import {useState} from 'react';
import {wallpaperSource} from '../../../../../packages/engine/core/desktop-wallpaper.mjs';
import {PackIcon} from '../../GameLibrary';

export function InstancePortrait({game,media}:{game:any;media?:string}){
  const src=media&&wallpaperSource({wallpaperMode:'image',backgroundImage:media})?.url;
  const [failed,setFailed]=useState('');
  return <div className="instance-portrait" aria-hidden>{src&&failed!==src?
    <img src={src} alt="" onError={()=>setFailed(src)}/>:<PackIcon game={game}/>}</div>;
}
