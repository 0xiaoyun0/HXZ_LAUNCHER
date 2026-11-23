import {useEffect,useRef} from 'react';import {useSnapshot} from 'valtio';import {community} from '../../../packages/community/client';import {mountVoiceTools} from '../../../packages/community/voice-tools-ui.mjs';import {el} from '../../../packages/hub/dom.mjs';import '../../../packages/hub/style.css';import '../../../packages/community/voice-tools.css';import {request} from './data';import {invoke,ui} from './model';

async function capture(surface:any){
 const stream=await navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:1280,max:1920},height:{ideal:720,max:1080},frameRate:{ideal:10,max:15}},audio:false});return stream;
}
export function VoiceTools(){const c=useSnapshot(community),root=useRef<HTMLDivElement>(null);useEffect(()=>{if(!root.current||!c.room||!c.id)return;return mountVoiceTools(root.current,{request,client:c.id,capture,isMuted:()=>community.muted,onSharing:(active:boolean)=>ui.screenSharing=active});},[c.room,c.id]);return c.room?<div ref={root}/>:<p className="muted">加入语音后可以分享窗口、举手和使用房间字幕。</p>;}
