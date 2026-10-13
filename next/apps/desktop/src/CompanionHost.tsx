import {useEffect} from 'react';import {useSnapshot} from 'valtio';
import {community,voiceActivity,leaveVoice} from '../../../packages/community/client';
import {music,stopMusic} from './music-player';
import {invoke,state,notify} from './model';
export function CompanionHost(){const c=useSnapshot(community),s=useSnapshot(state);
 useEffect(()=>window.launcher?.subscribe((event:any)=>{if(event.type!=='companion-action')return;if(event.action==='leaveVoice')leaveVoice();if(event.action==='stopMusic')stopMusic();if(event.action==='hideLyrics')music.lyricsFloating=false;}),[]);
 useEffect(()=>{if(!window.launcher)return;let last='';const sync=()=>{const now=performance.now(),value={joined:!!community.room,room:community.rooms.find(r=>r.id===community.room)?.name||'语音房间',connected:community.connected,uid:community.user?.uid||'',dark:state.settings.theme==='dark',motionOff:state.settings.animationSpeed===0,speakers:community.room?community.users.filter(u=>u.room===community.room&&!u.muted&&(voiceActivity.get(u.id)||0)>now-650).map(u=>({name:u.name})):[],messages:community.messages.slice(-40)};const fingerprint=JSON.stringify(value);if(last===fingerprint)return;last=fingerprint;void invoke('companion.sync',value).catch(()=>{});};sync();const timer=c.room&&s.settings.voiceOverlay?setInterval(sync,250):null;return()=>{if(timer)clearInterval(timer);};},[c.room,c.connected,c.messages,c.users,s.settings.voiceOverlay,s.settings.theme,s.settings.animationSpeed]);
 return null;
}
