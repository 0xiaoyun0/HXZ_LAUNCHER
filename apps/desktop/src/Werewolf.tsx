import {useEffect,useRef} from 'react';
import {mountWerewolf} from '../../../packages/games/werewolf-ui.mjs';
import '../../../packages/games/werewolf.css';
import {request} from './data';
export function Werewolf(){const ref=useRef<HTMLDivElement>(null);useEffect(()=>mountWerewolf(ref.current,request),[]);return <div ref={ref}/>;}
