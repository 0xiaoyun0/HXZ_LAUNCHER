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
 return <section className="launch-page guild-page"><header className="launch-title"><h1>冒险者协会</h1></header>
 <div className="guild-columns"><section><h2>协会概览</h2><Region node={regions.overview}/></section><section><h2>我的进行中</h2><Region node={regions.ongoing}/></section></div>
 <section className="lobby-block"><h2>委托广场</h2><Region node={regions.board}/></section></section>;
}
