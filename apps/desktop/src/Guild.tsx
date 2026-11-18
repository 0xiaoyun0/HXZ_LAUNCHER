import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useSnapshot} from 'valtio';
import {useSearchParams} from 'react-router-dom';
import {community} from '../../../packages/community/client';
import {mountGuild} from '../../../packages/guild/ui.mjs';
import '../../../packages/guild/style.css';
import {request} from './data';
import {PageTitle} from './ui';
import {CardBoard} from './CardBoard';
function Region({node}:{node:HTMLElement}){
 const host=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{host.current?.append(node);return()=>node.remove();},[node]);
 return <div ref={host}/>;
}
export function GuildPage(){
 const c=useSnapshot(community),[params]=useSearchParams(),id=params.get('task')||'';
 const regions=useMemo(()=>Object.fromEntries(['overview','ongoing','board'].map(key=>{const node=document.createElement('section');node.className='guild-workspace';node.dataset.region=key;return [key,node];})) as Record<string,HTMLElement>,[]);
 useEffect(()=>mountGuild(regions.board,{request,uid:c.user?.uid,initialTask:id,regions}),[regions,c.user?.uid,c.connected,id]);
 return <div className="standard-page"><PageTitle title="冒险家协会"/><CardBoard id="guild" label="" cards={[
  {id:'overview',title:'协会概览',x:0,y:0,w:8,minW:4,minH:9,content:<Region node={regions.overview}/>},
  {id:'ongoing',title:'我的进行中',x:8,y:0,w:4,minW:3,minH:9,content:<Region node={regions.ongoing}/>},
  {id:'quests',title:'委托广场',x:0,y:11,w:12,minW:4,minH:15,content:<Region node={regions.board}/>},
 ]}/></div>;
}
