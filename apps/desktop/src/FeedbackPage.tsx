import {Link} from 'react-router-dom';
import {FileText,RefreshCw} from 'lucide-react';
import {PageTitle,Button} from './ui';
import {FeedbackCenter} from './Feedback';
import {CardBoard} from './CardBoard';
import {ui,invoke,notify} from './model';
export function FeedbackPage(){return <div className="standard-page"><PageTitle title="帮助与反馈" actions={<><Button icon={FileText} onClick={()=>ui.tasks=true}>运行日志</Button><Button icon={RefreshCw} onClick={async()=>{ui.crash=await invoke('diagnostics.current');if(ui.crash)ui.dialog='crash';else notify('暂无游戏异常报告');}}>游戏诊断</Button></>}/><CardBoard id="feedback" cards={[{id:'tickets',title:'问题反馈',w:12,minW:5,content:<FeedbackCenter/>}]}/></div>;}
