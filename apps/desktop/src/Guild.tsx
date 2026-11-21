import {useEffect,useLayoutEffect,useMemo,useRef,type ReactNode} from 'react';
import {useSnapshot} from 'valtio';
import {useSearchParams} from 'react-router-dom';
import {community} from '../../../packages/community/client';
import {mountGuild} from '../../../packages/guild/ui.mjs';
import '../../../packages/guild/style.css';
import {request} from './data';
import {CardBoard} from './CardBoard';
function Region({node}:{node:HTMLElement}){
 const host=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{host.current?.append(node);return()=>node.remove();},[node]);
 return <div ref={host}/>;
}
export function GuildPage({navigation,status}:{navigation?:ReactNode;status?:ReactNode}){
 const c=useSnapshot(community),[params]=useSearchParams(),id=params.get('task')||'';
 const regions=useMemo(()=>Object.fromEntries(['overview','ongoing','board'].map(key=>{const node=document.createElement('section');node.className='guild-workspace';node.dataset.region=key;return [key,node];})) as Record<string,HTMLElement>,[]);
 useEffect(()=>mountGuild(regions.board,{request,uid:c.user?.uid,initialTask:id,regions}),[regions,c.user?.uid,c.connected,id]);
 return <section className="launch-page guild-page"><CardBoard id="guild" className="guild-columns" label="冒险者协会" pageTitle actions={navigation} beforeCards={status} cards={[
   {id:'overview',title:'协会概览',w:6,content:<Region node={regions.overview}/>},
   {id:'ongoing',title:'我的进行中',w:6,content:<Region node={regions.ongoing}/>},
   {id:'quests',title:'委托广场',w:12,content:<Region node={regions.board}/>}
 ]}/></section>;
}
