import {useState,type ReactNode} from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import {Smile} from 'lucide-react';
import {EMOJI,KAOMOJI} from '../../../packages/community/expressions';

/** Portal keeps the picker out of card measurements and clipped scroll regions. */
export function Emoji({pick,stickers,disabled=false}:{pick:(value:string)=>void;stickers?:(close:()=>void)=>ReactNode;disabled?:boolean}) {
 const [open,setOpen]=useState(false),[kind,setKind]=useState<'emoji'|'kaomoji'|'stickers'>('emoji');
 const values=kind==='emoji'?EMOJI:KAOMOJI;
 return <Menu.Root open={open} onOpenChange={setOpen} modal={false}>
  <Menu.Trigger type="button" className="emoji-trigger composer-tool" disabled={disabled} aria-label={stickers?'表情':'表情与颜文字'} title={stickers?'表情':'表情与颜文字'}><Smile size={19}/></Menu.Trigger>
  <Menu.Portal><Menu.Content className="menu emoji-menu" aria-label="表情栏" side="top" align="end" sideOffset={10} collisionPadding={12} onCloseAutoFocus={e=>e.preventDefault()}>
   <div className="emoji-categories">
    <Menu.Item className={kind==='emoji'?'selected':''} onSelect={e=>{e.preventDefault();setKind('emoji');}}>Emoji <small>{EMOJI.length}</small></Menu.Item>
    <Menu.Item className={kind==='kaomoji'?'selected':''} onSelect={e=>{e.preventDefault();setKind('kaomoji');}}>颜文字 <small>{KAOMOJI.length}</small></Menu.Item>
    {stickers&&<Menu.Item className={kind==='stickers'?'selected':''} onSelect={e=>{e.preventDefault();setKind('stickers');}}>表情包</Menu.Item>}
   </div>
   {kind==='stickers'&&stickers?stickers(()=>setOpen(false)):<Menu.Group className={'expression-grid '+kind} aria-label={kind==='emoji'?'Emoji':'颜文字'}>
    {values.map(value=><Menu.Item className="expression-item" key={value} textValue={value} title={value} onSelect={()=>pick(value)}>{value}</Menu.Item>)}
   </Menu.Group>}
  </Menu.Content></Menu.Portal>
 </Menu.Root>;
}
