import {Minus,Square,X} from 'lucide-react';
import {IconButton} from '../ui';
import {perform,invoke} from '../model';
export function WindowButtons(){
 return <div className="window-buttons">{[{id:'minimize',label:'最小化',Icon:Minus},{id:'maximize',label:'最大化',Icon:Square},{id:'close',label:'关闭',Icon:X}].map(({id,label,Icon})=><IconButton key={id} icon={Icon} label={label} onClick={()=>perform(()=>invoke('window.control',{action:id}))}/>)}</div>;
}
