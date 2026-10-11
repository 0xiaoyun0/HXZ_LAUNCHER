import {useEffect,useRef} from 'react';
import {useSnapshot} from 'valtio';
import {useSearchParams} from 'react-router-dom';
import {community} from '../../../packages/community/client';
import {mountGuild} from '../../../packages/guild/ui.mjs';
import '../../../packages/guild/style.css';
import {request} from './data';
import {CardBoard} from './CardBoard';
function GuildContents(){const c=useSnapshot(community),[params]=useSearchParams(),root=useRef<HTMLDivElement>(null),id=params.get('task')||'';
 useEffect(()=>{if(!root.current)return;return mountGuild(root.current,{request,uid:c.user?.uid,initialTask:id});},[c.user?.uid,c.connected,id]);
 return <div ref={root}/>;
}
export function GuildPage(){
 return <div className="standard-page"><CardBoard id="guild" cards={[{id:'quests',title:'冒险者公会',w:12,minW:5,minH:16,content:<GuildContents/>}]}/></div>;
}
