import {useEffect,useRef,useState} from 'react';
import {mountTankRoom} from '../../../packages/games/tank-room-ui.mjs';
import {sendCoop} from '../../../packages/community/client';
import {request} from './data';
import {Button} from './ui';
import '../../../packages/games/tank-room.css';
export function TankRoom({solo}:any){const root=useRef<HTMLDivElement>(null);useEffect(()=>mountTankRoom(root.current,{request,send:sendCoop,subscribe:(fn:any)=>{const listen=(e:any)=>fn(e.detail);window.addEventListener('hxz-coop',listen);return()=>window.removeEventListener('hxz-coop',listen);}}),[]);return <><div className="coop-mode-toolbar"><Button onClick={solo}>单人练习</Button><small>双人合作请在两台设备上登录社区，创建或加入同一个房间。</small></div><div ref={root}/></>;}
