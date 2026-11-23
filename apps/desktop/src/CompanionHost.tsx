import {normalizeShortcuts} from '../../../packages/engine/core/shortcuts.mjs';
import {useEffect} from 'react';import {useSnapshot} from 'valtio';
import {community,sendChat,voiceActivity,leaveVoice} from '../../../packages/community/client';
import {music,stopMusic} from './music-player';
import {invoke,state,notify,perform} from './model';
export function CompanionHost(){const c=useSnapshot(community),s=useSnapshot(state);
 useEffect(()=>{void invoke('companion.configure',{enabled:s.settings.shortcutEnabled!==false,keys:normalizeShortcuts(s.settings.shortcuts)}).catch(()=>{});return()=>{void invoke('companion.configure',{enabled:false,keys:{}}).catch(()=>{});};},[s.settings.shortcuts,s.settings.shortcutEnabled]);
 useEffect(()=>window.launcher?.subscribe((event:any)=>{if(event.type!=='companion-action')return;if(event.action==='sendChat')void perform(async()=>sendChat(event.body));if(event.action==='leaveVoice')leaveVoice();if(event.action==='stopMusic')stopMusic();if(event.action==='hideLyrics')music.lyricsFloating=false;}),[]);
 useEffect(()=>{if(!window.launcher)return;let last='';const sync=()=>{const now=performance.now(),value={voiceOverlay:!!state.settings.voiceOverlay,joined:!!community.room,room:community.rooms.find(r=>r.id===community.room)?.name||'语音房间',connected:community.connected,uid:community.user?.uid||'',dark:state.settings.theme==='dark',motionOff:state.settings.animationSpeed===0,speakers:community.room?community.users.filter(u=>u.room===community.room&&!u.muted&&(voiceActivity.get(u.id)||0)>now-650).map(u=>({name:u.name})):[],messages:community.messages.slice(-40)};const fingerprint=JSON.stringify(value);if(last===fingerprint)return;void invoke('companion.sync',JSON.parse(fingerprint)).then(()=>{last=fingerprint;}).catch(()=>{});};sync();const timer=setInterval(sync,c.room&&s.settings.voiceOverlay?250:1500);return()=>{if(timer)clearInterval(timer);};},[c.room,c.connected,c.messages,c.users,s.settings.voiceOverlay,s.settings.theme,s.settings.animationSpeed]);
 return null;
}
