import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {type LucideIcon} from 'lucide-react';
import {Button} from '../../ui';

type Props={pressed:boolean;icon:LucideIcon;label:string;disabled?:boolean;children:ReactNode;onClick:()=>Promise<unknown>};
export function ReactionButton({pressed,icon:Icon,label,disabled,children,onClick}:Props){
  const face=useRef<HTMLSpanElement>(null),last=useRef(pressed);
  useLayoutEffect(()=>{
    if(last.current!==pressed&&face.current)face.current.dataset.changed='true';
    last.current=pressed;
  },[pressed]);
  return <Button className="micro-reaction" busyIndicator={false} aria-pressed={pressed} aria-label={label}
    tone={pressed?'accent':''} disabled={disabled} onClick={onClick}>
    <span className="reaction-face" key={String(pressed)} ref={face}><Icon className="reaction-ink" size={17}/><span className="reaction-count">{children}</span></span>
  </Button>;
}
