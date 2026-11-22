import {useEffect,useState} from 'react';
import {UserRound} from 'lucide-react';
import {invoke} from '../model';

type Role={id?:string;uuid?:string;name?:string;avatar?:string};
const heads=new Map<string,{until:number;image:Promise<string|null>}>();
function loadHead(id:string,uuid:string){
  const key=id+'/'+uuid,previous=heads.get(key);
  if(previous&&previous.until>Date.now())return previous.image;
  if(heads.size>=64)heads.delete(heads.keys().next().value!);
  const entry={until:Date.now()+600000,image:invoke<string|null>('account.skinHead',{id,uuid}).catch(()=>null)};
  heads.set(key,entry);
  entry.image.then(image=>{if(!image)entry.until=Date.now()+30000;});
  return entry.image;
}
export function PlayerAvatar({role,size}:{role?:Role;size:number}){
  const id=role?.id,uuid=role?.uuid,key=id+'/'+uuid;
  const [resolved,setResolved]=useState({key:'',url:''});
  useEffect(()=>{
    if(!id||!uuid||role?.avatar)return;
    let current=true,loaded=false,retry:ReturnType<typeof setTimeout>|undefined;
    const fetchHead=()=>{
      clearTimeout(retry);
      if(!current||loaded||document.hidden)return;
      loadHead(id,uuid).then(url=>{
        if(!current)return;
        loaded=!!url;setResolved({key,url:url||''});
        if(!loaded){clearTimeout(retry);retry=setTimeout(fetchHead,120000);}
      });
    };
    const online=()=>{if(!loaded){heads.delete(key);fetchHead();}};
    fetchHead();window.addEventListener('online',online);document.addEventListener('visibilitychange',fetchHead);
    return()=>{current=false;clearTimeout(retry);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',fetchHead);};
  },[id,uuid,key,role?.avatar]);
  const src=role?.avatar||(resolved.key===key?resolved.url:'');
  return <span className="avatar player-head" style={{width:size,height:size}}>{src?<img src={src} alt={(role?.name||'角色')+'的头像'} data-pixel={!role?.avatar||undefined}/>:<UserRound size="52%" aria-label={role?.name?'角色头像暂无缓存':'游客'}/>}</span>;
}
