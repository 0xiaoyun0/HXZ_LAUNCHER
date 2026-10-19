import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {Play,Download,RefreshCw,Users,Settings2} from 'lucide-react';
import {state,task,ui,launch,selectInstance} from './model';
import {request,useData} from './data';
import {Button,Modal} from './ui';
import {PackIcon} from './GameLibrary';
import {CardCollection,ContentCard} from './CardPrimitives';
import './server-online.css';
const statusIds:Record<string,string>={'HXZ-survival':'survival','HXZ-mod-1':'mod-1','HXZ-mod-2':'mod-2'};
export function ServerOnline(){
 const s=useSnapshot(state),t=useSnapshot(task),value=useData(()=>request('/api/server-online')),[players,setPlayers]=useState('');
 const servers=s.instances.filter((item:any)=>item.builtin),busy=t.busy||s.running;
 useEffect(()=>{const tick=setInterval(()=>{if(!document.hidden)void value.reload();},30000);return()=>clearInterval(tick);},[value.reload]);
 const statusFor=(id:string)=>value.data?.items?.find((item:any)=>item.id===statusIds[id]);
 const shown=statusFor(players),game=servers.find((item:any)=>item.id===players);
 return <div className="default-server-hub">
  <div className="default-server-toolbar"><span className="muted">{value.error?'在线状态暂不可用，仍可安装和启动。':value.loading&&!value.data?'正在读取在线状态…':value.data?.at?'在线状态更新于 '+new Date(value.data.at).toLocaleTimeString('zh-CN'):'选择服务器，即可安装并进入。'}</span><Button icon={RefreshCw} disabled={value.loading} onClick={value.reload}>刷新状态</Button></div>
  <CardCollection minWidth={300}>{servers.map((item:any)=>{const status=statusFor(item.id);const version=[item.version==='跟随整合包'?'版本由整合包提供':item.version,item.loader==='跟随整合包'?'':item.loader].filter(Boolean).join(' · ');return <ContentCard key={item.id} className="default-server-card" title={<><PackIcon game={item}/><span>{item.name}<small>{version||'版本由服务器配置'}</small></span></>} footer={<><Button tone="solid" icon={item.installed?Play:Download} disabled={busy||item.placeholder} onClick={async()=>{await selectInstance(item.id);await launch(item.id);}}>{item.placeholder?'尚未开放':item.installed?'进入服务器':'安装并进入'}</Button><Button icon={Settings2} disabled={busy} onClick={async()=>{await selectInstance(item.id);ui.instance=item.id;ui.dialog='instance';}}>配置</Button></>}>
   <div className="default-server-state"><span className={status?.available?'online':'muted'}><i/>{status?.available?`${status.online} 人在线`:status?.enabled===false?'暂未开放状态查询':'在线人数待确认'}</span><span className="muted">{item.installed?'已安装':'尚未安装'}</span></div>
   <button className="server-players-link" disabled={!status?.available} onClick={()=>setPlayers(item.id)}><Users size={15}/>查看在线玩家</button>
  </ContentCard>;})}</CardCollection>
  {!servers.length&&<p className="muted">正在准备默认服务器配置…</p>}
  <Modal open={!!players} onClose={()=>setPlayers('')} title={(game?.name||'服务器')+' · 在线玩家'}><p>{shown?.online||0} 人在线</p><div className="server-player-chips">{shown?.players?.map((player:any,i:number)=><span key={(player.id||player.name)+'-'+i}>{player.name}</span>)}</div><p className="muted">{shown?.players?.length?'这里显示服务器公开的玩家名单，可能不是全部在线玩家。':shown?.online?'服务器未公开玩家名单。':'目前没有在线玩家。'}</p></Modal>
 </div>;
}
