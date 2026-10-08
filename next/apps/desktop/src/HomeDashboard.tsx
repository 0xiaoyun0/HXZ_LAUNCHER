import {useEffect,useState} from 'react';
import {useSnapshot} from 'valtio';
import {useNavigate} from 'react-router-dom';
import {Play,Settings2,FolderOpen,Plus,ArrowRight,Square,Layers,UserRound,Search,Star,PackageOpen,MessagesSquare} from 'lucide-react';
import {state,ui,task,account,selected,cfg,perform,invoke,selectInstance,launch,importPack,desktop,onNotices,chooseRoot} from './model';
import {community} from '../../../packages/community/client';
import {CardBoard,type CardSpec} from './CardBoard';
import {Avatar,Button,Modal,Empty} from './ui';
import {PackIcon} from './GameLibrary';
import {InstanceManager} from './InstanceManager';
import {ServerMonitor} from './Monitor';
import {useData} from './data';
const versionLabel=(game:any)=>[...new Set([game.version||'版本待获取',game.loader||'原版'])].join(' · ');
function LatestNotices(){
 const navigate=useNavigate(),c=useSnapshot(community),result=useData(()=>desktop?invoke('notices.list'):Promise.resolve([]),[c.connected]);
 useEffect(()=>onNotices(()=>void result.reload()),[result.reload]);
 const value=result.data,items=Array.isArray(value)?value:value?.items||[];
 return <div className="home-notices">{result.error?<p className="muted">公告暂时无法获取 <button onClick={()=>void result.reload()}>重试</button></p>:items.length?items.slice(0,3).map((n:any)=><button key={n.id} onClick={()=>navigate('/community/notices')}><span>{n.title}</span><ArrowRight size={14}/></button>):<p className="muted">{result.loading?'正在读取社区公告…':'暂无可展示的公告'}</p>}<button className="text-link" onClick={()=>navigate('/community/notices')}>公告与整合包更新日志 <ArrowRight size={14}/></button></div>;
}
export function Home(){
 const s=useSnapshot(state),t=useSnapshot(task),c=useSnapshot(community),navigate=useNavigate();
 const [query,setQuery]=useState(''),[manage,setManage]=useState(false);
 const game=selected(s),role=account(s),config=game?cfg(game.id,s):null,locked=t.busy||s.running;
 const configure=()=>{if(game){ui.instance=game.id;ui.dialog='instance';}};
 const games=[...s.instances].filter((i:any)=>i.name.toLowerCase().includes(query.toLowerCase())).sort((a:any,b:any)=>Number(b.builtin)-Number(a.builtin)||Number(cfg(b.id,s).favorite)-Number(cfg(a.id,s).favorite));
 const cards:CardSpec[]=[
 {id:'account',title:'我的角色',x:0,y:0,w:3,h:8,minW:3,minH:8,content:<div className="home-account"><div><Avatar name={role?.name} image={role?.avatar} size={48}/><span><strong>{role?.name||'还没有登录'}</strong><small>{role?c.connected?'社区已连接':'幻想镇皮肤站':'使用皮肤站账号开始'}</small></span></div><Button icon={UserRound} onClick={()=>role?navigate('/account'):ui.dialog='account'}>{role?'切换与管理角色':'登录角色'}</Button></div>},
 {id:'instance',title:'当前实例',x:0,y:18,w:3,h:13,minW:3,minH:9,content:<div className="home-current">{game?<><div className="current-game"><PackIcon game={game}/><span><strong>{game.name}</strong><small>{versionLabel(game)}</small></span></div><dl><div><dt>Java</dt><dd>{config.javaMode==='custom'?'实例指定':config.javaMode==='inherit'&&s.settings.javaPath?'跟随全局':'自动匹配'}</dd></div><div><dt>内存</dt><dd>{config.memoryMode==='manual'?config.memoryMB+' MB':s.settings.memoryMode==='manual'&&config.memoryMode==='inherit'?s.settings.defaultMemoryMB+' MB':'自动分配'}</dd></div><div><dt>HXZ UP</dt><dd>{config.autoUpdate?'启动前检查':'手动检查'}</dd></div></dl><div className="home-current-actions"><Button icon={Settings2} disabled={locked} onClick={configure}>配置</Button><Button icon={FolderOpen} disabled={!game.installed} onClick={()=>invoke('instance.folder',{id:game.id,kind:'versions'})}>目录</Button></div></>:<Empty title="选择或导入一个游戏"/>}</div>},
 {id:'launch',title:'准备出发',x:0,y:8,w:3,h:10,minW:3,minH:8,className:'launch-card',content:<div className="home-launch"><p>{s.running?'游戏正在运行':t.busy?t.phase:game?.installed?'一切就绪，继续你的世界':game?.placeholder?'该服务器尚未开放':game?'首次游玩将下载所需文件':'先将游戏加入实例库'}</p><Button className="home-launch-button" tone="solid" icon={s.running?Square:Play} disabled={!game||!!game?.placeholder||t.busy&&!s.running} onClick={()=>s.running?invoke('game.stop'):launch(game.id)}>{s.running?'停止游戏':game?.installed?'开始游戏':'安装并开始'}</Button><button className="text-link" onClick={()=>ui.tasks=true}><Layers size={15}/>{t.busy?'查看下载进度与日志':'任务与启动日志'}<ArrowRight size={14}/></button>{t.busy&&t.total>0&&<div className="home-task-progress"><progress max={t.total} value={t.completed}/><small>当前步骤 · {Math.min(100,t.completed/t.total*100).toFixed(2)}%</small></div>}</div>},
 {id:'welcome',title:'快捷入口',x:3,y:0,w:9,h:6,minW:5,minH:6,className:'welcome-card',content:<div className="home-quick-actions"><Button icon={Plus} onClick={()=>navigate('/workshop/install')}>安装新游戏</Button><Button icon={FolderOpen} disabled={locked} onClick={chooseRoot}>选择游戏目录</Button><Button icon={MessagesSquare} onClick={()=>navigate('/community')}>进入社区</Button></div>},
 {id:'library',title:'游戏实例',x:3,y:6,w:9,h:16,minW:5,minH:10,plain:true,content:<div className="home-instance-list"><div className="home-list-tools"><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索实例" aria-label="搜索实例"/></div><Button icon={PackageOpen} disabled={locked} onClick={()=>importPack()}>导入</Button><Button onClick={()=>navigate('/library')}>全部实例</Button></div><div className="home-game-rows">{games.map((i:any)=><button key={i.id} disabled={locked} className={'home-game-row '+(game?.id===i.id?'selected':'')} onClick={()=>perform(()=>selectInstance(i.id))}><PackIcon game={i}/><span><strong>{i.name}{cfg(i.id,s).favorite&&<Star size={13}/>}</strong><small>{versionLabel(i)}{i.builtin?' · 默认服务器':''}</small></span><small className={i.error?'danger':''}>{i.error?'需要处理':i.placeholder?'即将开放':i.installed?'已安装':'待安装'}</small><i className="instance-selected"/></button>)}</div>{!games.length&&<p className="muted">没有匹配的实例</p>}<div className="home-list-footer"><span>{s.instances.length} 个实例</span><button disabled={!game} onClick={()=>setManage(true)}>管理当前实例 <ArrowRight size={14}/></button></div></div>},
 {id:'notices',title:'镇上近况',x:3,y:22,w:4,h:9,minW:4,minH:7,content:<LatestNotices/>},
 {id:'monitor',title:'服务监控',x:7,y:22,w:5,h:9,minW:4,minH:8,content:<ServerMonitor/>}
 ];
 return <div className="air-home"><CardBoard id="home" label="启动游戏" cards={cards}/><Modal open={manage} onClose={()=>setManage(false)} title={game?.name||'实例管理'} wide><InstanceManager/></Modal></div>;
}
