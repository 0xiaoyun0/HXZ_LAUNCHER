import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {Activity,ArrowRight,CalendarDays,ChevronRight,Box,Globe,Network,ContactRound,RefreshCw,Settings2,Stethoscope,UserRoundPlus} from 'lucide-react';
import {account,cfg,invoke,perform,reload,saveSettings,state,ui} from '../model';
import {CardMenu} from '../CardBoard';
import {Avatar} from '../ui';

export function playDuration(seconds:number){
  if(seconds>=3600)return Math.floor(seconds/3600)+' 小时 '+Math.floor(seconds%3600/60)+' 分钟';
  return seconds>=60?Math.floor(seconds/60)+' 分钟':seconds+' 秒';
}

export function HomeServers(){
  const s=useSnapshot(state),settings=s.settings;
  const [servers,setServers]=useState<any[]|null>(null),[loading,setLoading]=useState(false),[unavailable,setUnavailable]=useState(false);
  async function checkServers(refresh=true){
    setLoading(true);
    try{const result=await invoke('servers.status',{refresh});setServers(result.items||[]);setUnavailable(!(result.items||[]).some((item:any)=>item.available));}
    catch{setUnavailable(true);}finally{setLoading(false);}
  }
  useEffect(()=>{void checkServers(false);},[settings.communityUrl]);
  const online=servers?.filter(row=>row.available)||[];
  return <><header><h2><Network size={16}/>默认服务器</h2><button className="icon-plain" aria-label="刷新服务器状态" disabled={loading} onClick={()=>void checkServers()}><RefreshCw size={15}/></button><CardMenu/></header>
      <div className="home-server-list">{s.instances.filter((row:any)=>row.builtin).map((game:any)=>{
        const status=servers?.find(row=>row.id===game.group);
        return <Link key={game.id} to={'/servers?id='+encodeURIComponent(game.id)}><span>{game.name}</span><small>{game.placeholder?'尚未开放':status?.available?status.online+' 人在线':game.installed?'已安装':'可安装'}</small></Link>;
      })}</div><div className="server-reading"><Activity size={17}/><span role="status">{loading?'正在读取在线状态…':unavailable?'暂时无法读取在线状态':servers?online.length+' 个服务器可查询 · '+online.reduce((sum,row)=>sum+(Number(row.online)||0),0)+' 人在线':'尚未查询在线状态'}</span><Link to="/servers">详情 <ChevronRight size={13}/></Link></div>
    </>;
}

export function HomeRole(){
  const s=useSnapshot(state),role=account(s),settings=s.settings;
  return <><header><h2><ContactRound size={16}/>我的角色</h2><CardMenu/></header>
      <div className="home-role"><Avatar name={role?.name||'旅'} image={role?.avatar} size={44}/><div><strong>{role?.name||'本地游客'}</strong>
        <small>{role?.authenticated?(role.uuid?'已登录 · 当前游戏角色':'已登录 · 请选择角色'):'使用幻想镇皮肤站账号登录'}</small></div></div>
      {s.accounts.length>1&&<label className="home-picker">切换账号<select aria-label="切换当前账号" value={settings.selectedAccount} onChange={e=>{const id=e.target.value;void perform(()=>saveSettings({selectedAccount:id}));}}>{s.accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name||a.username}</option>)}</select></label>}
      {role?.profiles?.length>1&&<label className="home-picker">当前角色<select aria-label="切换当前角色" value={role.uuid||''} onChange={e=>{const uuid=e.target.value;void perform(async()=>{await invoke('account.profile',{id:role.id,uuid});await reload();});}}>{!role.uuid&&<option value="" disabled>选择角色</option>}{role.profiles.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <div className="desk-actions"><button className="small-action" onClick={()=>perform(()=>invoke('skin.open'))}><Globe size={15}/>管理皮肤站</button>
        <button className="small-action" onClick={()=>ui.dialog='account'}><UserRoundPlus size={15}/>{role?.authenticated?'添加账号':'登录账号'}</button></div>
    </>;
}

export function InstanceSummary({game}:{game:any}){
  const s=useSnapshot(state),settings=s.settings,options=game&&cfg(game.id,s);
  const memory=options?.memoryMode==='manual'?options.memoryMB+' MB · 实例':options?.memoryMode==='auto'?'自动分配':
    settings.memoryMode==='manual'?settings.defaultMemoryMB+' MB · 全局':'自动分配';
  return <><header><h2><Box size={16}/>实例详情</h2><CardMenu/></header>{game?<><h3>{game.name||game.id}</h3><small>{[game.version===game.id?'本地实例':game.version,game.loader].filter(Boolean).join(' · ')}</small>
      <dl className="detail-rows"><div><dt>状态</dt><dd>{game.error?'需要检查':game.installed?'已安装':'待安装'}</dd></div><div><dt>Java</dt><dd>{options.javaMode==='custom'||(options.javaMode==='inherit'&&settings.javaPath)?'指定运行环境':'自动匹配'}</dd></div><div><dt>最大内存</dt><dd>{memory}</dd></div></dl>
      {game.installed&&<details className="home-folders"><summary>常用文件夹</summary><div className="desk-actions">{[['versions','版本目录'],['screenshots','截图'],['saves','存档']].map(([kind,label])=><button className="small-action" key={kind} onClick={()=>perform(()=>invoke('instance.folder',{id:game.id,kind}))}>{label}</button>)}</div></details>}
      <div className="desk-actions"><button className="small-action" onClick={()=>{ui.instance=game.id;ui.dialog='instance';}}><Settings2 size={15}/>实例配置</button><Link className="small-action" to={'/check?id='+encodeURIComponent(game.id)}><Stethoscope size={15}/>启动前检查</Link></div></>:<p>选择游戏实例后可查看配置。</p>}
    </>;
}
export function PlayCalendar({journal=false}:{journal?:boolean}={}){
  const s=useSnapshot(state),[days,setDays]=useState<{date:string;seconds:number}[]>(),[failed,setFailed]=useState(false),[weeks,setWeeks]=useState(26);
  const refresh=useCallback(async()=>{try{const result=await invoke('game.playtime');setDays(result.days);setFailed(false);}catch{setFailed(true);}},[]);
  useEffect(()=>{void refresh();if(s.running){const tick=setInterval(refresh,5000);return ()=>clearInterval(tick);}},[s.running,refresh]);
  const day=86400000,now=new Date(Date.now()+8*3600000),today=now.toISOString().slice(0,10),midnight=Date.parse(today+'T00:00:00Z');
  const weekday=(now.getUTCDay()+6)%7,monday=new Date(midnight-weekday*day).toISOString().slice(0,10);
  const sum=(start:string)=>(days||[]).reduce((n,d)=>n+(d.date>=start&&d.date<=today?d.seconds:0),0);
  const byDate=new Map(days?.map(d=>[d.date,d.seconds]));
  const first=midnight-(7*(weeks-1)+weekday)*day;
  const squares=Array.from({length:weeks*7},(_,i)=>new Date(first+i*day).toISOString().slice(0,10));
  const columns={gridTemplateColumns:'repeat('+weeks+',minmax(0,1fr))'};
  const months=squares.flatMap((date,index)=>{
    if(index%7!==0)return [];
    const monthDay=Number(date.slice(8));
    if(index===0?monthDay>20:monthDay>7)return [];
    return [{column:1+index/7,month:Number(date.slice(5,7))}];
  });
  const recent=journal?(days||[]).filter(d=>d.seconds>0&&d.date<=today).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3):[];
  function move(event:React.KeyboardEvent<HTMLAnchorElement>){
    const delta={ArrowUp:-1,ArrowDown:1,ArrowLeft:-7,ArrowRight:7}[event.key];
    if(!delta)return;event.preventDefault();
    const cells=Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLAnchorElement>('a'));
    cells[Math.max(0,Math.min(cells.length-1,cells.indexOf(event.currentTarget)+delta))]?.focus();
  }
  return <><header><h2><CalendarDays size={16}/>游玩日历</h2><Link to="/playtime">游玩记录 <ArrowRight size={14}/></Link><CardMenu/></header>
    {failed?<p role="alert">本机记录读取失败。<button className="small-action" onClick={refresh}>重试</button></p>:!days?<p>正在读取本机记录…</p>:<>
    <dl className="time-periods">{[['今天',sum(today)],['本周',sum(monday)],['本月',sum(today.slice(0,7)+'-01')]].map(([label,seconds])=><div key={label}><dt>{label}</dt><dd>{playDuration(Number(seconds))}</dd></div>)}</dl>
    <div className="calendar-tools"><small>最近 {weeks} 周 · 本机游玩</small><div className="segmented" aria-label="日历范围">{[[26,'半年'],[52,'一年']].map(([count,text])=><button key={count} aria-pressed={weeks===count} onClick={()=>setWeeks(Number(count))}>{text}</button>)}</div></div>
    <div className="calendar-chart" role="group" aria-label="本机游玩日历">
      <div className="calendar-months" style={columns} aria-hidden="true">{months.map(({month,column})=>
        <span key={column} style={{gridColumn:column}}>{month}月</span>)}</div>
      <div className="calendar-weekdays" aria-hidden="true">{['一','三','五','日'].map((day,index)=>
        <span key={day} style={{gridRow:1+index*2}}>{day}</span>)}</div>
      <div className="calendar-grid" style={columns}>{squares.map(date=>{
        const seconds=byDate.get(date)||0;
        if(date>today)return <i key={date} data-level="future"/>;
        return <Link key={date} tabIndex={date===today?0:-1} aria-label={date+' · '+playDuration(seconds)} onKeyDown={move} to={'/playtime?date='+date} title={date+' · '+playDuration(seconds)}><i data-level={seconds>=7200?3:seconds>=1800?2:seconds>0?1:0}/></Link>;
      })}</div>
    </div>{journal&&recent.length>0&&<div className="journal-entries"><h3>最近游玩</h3>{recent.map(day=><Link key={day.date} to={'/playtime?date='+day.date}><time dateTime={day.date}>{day.date}</time><strong>{playDuration(day.seconds)}</strong><ChevronRight size={14}/></Link>)}</div>}</>}
  </>;
}
