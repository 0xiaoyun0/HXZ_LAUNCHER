import {useState,type ReactNode} from 'react';
import {Smile} from 'lucide-react';
import {EMOJI,KAOMOJI} from '../../../packages/community/expressions';
import {Modal} from './ui';

export function Emoji({pick,stickers,disabled=false}:{pick:(value:string)=>void;stickers?:(close:()=>void)=>ReactNode;disabled?:boolean}){
 const [open,setOpen]=useState(false),[kind,setKind]=useState('emoji');
 const values=kind==='emoji'?EMOJI:KAOMOJI;
 return <><button type="button" className="emoji-trigger composer-tool" disabled={disabled} aria-haspopup="dialog" aria-label={stickers?'表情':'表情与颜文字'} onClick={()=>setOpen(true)}><Smile size={19}/></button>
  <Modal open={open} title="选择表情" onClose={()=>setOpen(false)}>
   <div className="emoji-categories">{[['emoji','Emoji'],['kaomoji','颜文字'],...(stickers?[['stickers','表情包']]:[])].map(([id,label])=><button type="button" className="small-action" key={id} aria-pressed={kind===id} onClick={()=>setKind(id)}>{label}</button>)}</div>
   {kind==='stickers'&&stickers?stickers(()=>setOpen(false)):<div className={'expression-grid '+kind} aria-label={kind==='emoji'?'Emoji':'颜文字'}>
    {values.map(value=><button type="button" className="expression-item" key={value} title={value} onClick={()=>{pick(value);setOpen(false);}}>{value}</button>)}</div>}
  </Modal></>;
}
