import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Link,Route,Routes,useNavigate,useParams} from 'react-router-dom';
import {useSnapshot} from 'valtio';
import {ArrowLeft,Coins,Gamepad2,Heart,Pause,Play,ShoppingBag,Trophy,Volume2,VolumeX,Users} from 'lucide-react';
import {flightUpgrade} from '../../../server/shared/arcade-upgrades.mjs';
import {GAMES} from '../../../server/shared/arcade-engine.mjs';
import {createArcade} from '../../../packages/games/arcade-controller.mjs';
import {mountGameControls} from '../../../packages/games/game-controls.mjs';
import '../../../packages/games/game-controls.css';
import '../../../packages/games/game-session.css';
import {GameShelf} from './GameShelf';
import {account,invoke,state,ui} from './model';
import {Button,IconButton,Segments,Empty} from './ui';
import {extension} from './launcher/Extensions';
import {RankList} from './launcher/RankList';

export function ArcadePage(){const social=useSnapshot(extension).active;return <section className="launch-page arcade-page">
  <header className="launch-title arcade-heading"><h1><Link to="/arcade">小游戏</Link></h1><nav className="arcade-links" aria-label="小游戏与积分">
    <Link className="small-action" to={social?"/community/ranking":"/points"}><Trophy size={16}/>积分排行榜</Link>
    <Link className="small-action" to="/points"><Coins size={16}/>我的积分</Link>
    {social&&<Link className="small-action" to="/community/shop"><ShoppingBag size={16}/>积分商城</Link>}
  </nav></header>
  <Routes><Route index element={<GameShelf/>}/><Route path="play/:id" element={<ArcadeRoute/>}/><Route path="*" element={<Empty title="未找到这个游戏"><Link className="small-action" to="/arcade">返回游戏厅</Link></Empty>}/></Routes>
</section>}
function TouchControls({api,id}:any){const el=useRef<HTMLDivElement>(null);useEffect(()=>mountGameControls(el.current,api,id),[api,id]);return <div ref={el}/>;}
function ArcadeRoute(){
 const {id}=useParams(),s=useSnapshot(state),role=account(s);
 return <ArcadeGame key={[id,role?.id,role?.uuid,s.settings.communityUrl].join(':')}/>;
}
function ArcadeGame(){
 const {id}=useParams(),navigate=useNavigate(),s=useSnapshot(state),social=useSnapshot(extension).active,role=account(s);
 const member=!!role?.authenticated&&!!role.uuid;
 const [a]=useState(()=>createArcade((route:string,method='GET',body?:unknown)=>invoke('arcade.score',{route,method,body}),{},()=>!!account()?.authenticated&&!!account()?.uuid)),[focused,setFocused]=useState(false),[screenControls,setScreenControls]=useState(()=>matchMedia('(pointer:coarse)').matches);
 useSyncExternalStore(a.subscribe,a.getVersion,a.getVersion);
 const canvas=useRef<HTMLCanvasElement>(null),main=useRef<HTMLElement>(null),game=GAMES.find((g:any)=>g.id===id),puzzle=['merge','snake','mines'].includes(id||'');
 useEffect(()=>{
  a.mount();
  if(game)void a.select(game);
  ui.arcadeRound={
   hasProgress:()=>a.playing.value||!!a.pendingScore.value,
   pause:()=>{if(a.playing.value&&!a.paused.value)a.pause();},
   ranked:()=>a.ranked.value,
   finish:async()=>{if(a.playing.value)await a.finish();else if(a.pendingScore.value)await a.submit();return !a.pendingScore.value;}
  };
  return()=>{ui.arcadeRound=null;a.dispose();};
 },[a,game]);
 useEffect(()=>{a.canvas.value=canvas.current;if(canvas.current&&!a.game.value&&game)a.thumbnail(canvas.current,game);});
 useEffect(()=>{
  const el=main.current;if(!el)return;let frame=0;
  const fit=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const stage=el.querySelector<HTMLElement>('.canvas-stage');if(!stage)return;const children=Array.from(el.children).filter((c:any)=>c!==stage&&getComputedStyle(c).position!=='absolute') as HTMLElement[],style=getComputedStyle(el),padding=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom),gap=parseFloat(style.rowGap)||12;
   const chrome=children.reduce((sum,c)=>sum+c.getBoundingClientRect().height,0)+padding+gap*children.length+2;
   const available=Math.max(230,innerHeight-Math.max(76,el.getBoundingClientRect().top)-chrome-48);
   const width=Math.min(el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),available*(['runner','deck','dice','caravan'].includes(id||'')?18/13:3/4));
   if(Math.abs(stage.getBoundingClientRect().width-width)>1)stage.style.width=width+'px';
  });};
  const observer=new ResizeObserver(fit);observer.observe(el);Array.from(el.children).forEach(c=>observer.observe(c));window.addEventListener('resize',fit);fit();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',fit);};
 },[focused,screenControls,a.playing.value,!!a.detail.value,!!a.message.value,id]);
 if(!game)return <Empty title="未找到这个游戏"><Link className="small-action" to="/arcade">返回游戏厅</Link></Empty>;
 const back=()=>navigate('/arcade');
 const end=()=>{if(!a.paused.value)a.pause();ui.confirm={title:'结束本局？',message:'计分对局将提交成绩，本机练习会记录个人最好成绩。',action:a.finish};};
 const stage=id==='runner'||id==='danmaku'?'无尽挑战':id==='blocks'?'等级 '+a.level.value:puzzle?'经典挑战':'第 '+a.level.value+' 关';
 return <div className={'game-workspace arcade-session game-session-'+id+(focused?' game-focused':'')}><section ref={main} className="game-session-main" aria-label={game.name}>
  {a.choices.value?.length>0&&a.playing.value&&!a.paused.value&&<section className="game-upgrade-panel" role="dialog" aria-modal="true" aria-label="选择本局增益"><div className="game-upgrade-dialog"><small>第 {a.level.value} 阶段</small><h3>选择本局增益</h3><p>增益在本局持续生效</p><div className="choices">{a.choices.value.map((key:any)=><button key={key} onClick={()=>a.input('upgrade:'+key)}><strong>{flightUpgrade(key).title}</strong><small>{flightUpgrade(key).description}</small></button>)}</div></div></section>}
  <header className="game-heading"><div className="game-session-title"><IconButton icon={ArrowLeft} label="返回游戏厅" onClick={back}/><div><small>{game.tag}</small><h2>{game.name}</h2></div></div><div className="game-score"><b>{a.score.value.toLocaleString()}</b><small>本局得分</small></div></header>
  <div className="game-session-metrics"><span className={a.ranked.value?'is-ranked':''}>{a.playing.value||a.finished.value?a.ranked.value?'社区计分':'本机练习':'准备开始'}</span><span>用时 <b>{a.time.value}</b></span><span>{stage}</span>{['breakout','danmaku','maze','fighter'].includes(id||'')&&<span className="game-lives"><Heart size={14}/>{a.lives.value} / 3</span>}</div>
  <div className={'canvas-stage '+(['runner','deck','dice','caravan'].includes(id||'')?'landscape':'')}><canvas ref={canvas} tabIndex={0} aria-label={game.name+' 游戏画面'} onPointerDown={a.pointer} onPointerMove={a.pointer} onPointerUp={a.pointer} onPointerCancel={a.pointer} onLostPointerCapture={a.pointer} onContextMenu={e=>e.preventDefault()}/>
   {(!a.playing.value||a.paused.value||a.countdown.value>0)&&<div className={'game-overlay '+(a.countdown.value>0&&!a.paused.value?'countdown':'')}>
    {a.playing.value&&a.countdown.value>0&&!a.paused.value?<><strong>{a.countdown.value}</strong><small>准备出发</small></>:<><small>{a.paused.value?'进度已保留':a.finished.value?a.game.value?.won?'挑战通关':'本局结束':game.tag}</small><h2>{a.paused.value?'已暂停':a.finished.value?a.score.value.toLocaleString()+' 分':game.name}</h2><p>{a.paused.value?'休息一下，随时继续':a.finished.value?'用时 '+a.time.value:game.keys}</p><Button tone="solid" icon={Play} disabled={a.busy.value||!!a.pendingScore.value} onClick={()=>a.paused.value?a.pause():a.start()}>{a.busy.value?'准备中…':a.paused.value?'继续游戏':a.finished.value?'再来一局':'开始游戏'}</Button>{a.paused.value&&<Button onClick={end}>结束本局</Button>}</>}
   </div>}
  </div>
  {a.detail.value&&<p className="game-detail" role="status">{a.detail.value}</p>}

  <div className="game-controls"><Button onClick={()=>setFocused(v=>!v)}>{focused?'退出专注':'专注游玩'}</Button><span>{a.paused.value?'已暂停':a.playing.value?'游戏进行中':a.finished.value?'本局已结算':'操作区'}</span><Button icon={a.paused.value?Play:Pause} disabled={!a.playing.value} onClick={a.pause}>{a.paused.value?'继续':'暂停'}</Button><IconButton icon={Gamepad2} label={screenControls?'隐藏屏幕按键':'显示屏幕按键'} onClick={()=>setScreenControls(v=>!v)}/><IconButton icon={a.sound.value?Volume2:VolumeX} label="游戏音效" onClick={a.toggleSound}/></div>
  {(screenControls||['garden','mines','deck','dice','caravan'].includes(id||''))&&a.playing.value&&!a.paused.value&&<TouchControls api={a} id={id}/>}
  {a.syncPaused.value&&<Button disabled={a.busy.value} onClick={a.retrySync}>重试同步</Button>}
  {a.message.value&&<p className="game-message">{a.message.value}</p>}{a.pendingScore.value&&<Button disabled={a.busy.value} onClick={a.submit}>重试提交成绩</Button>}
 </section><aside className="game-aside"><section className="game-help-card"><h3>操作指南</h3>{social&&id==='tanks'&&<Link className="small-action" to="/community/arcade/coop/tanks"><Users size={16}/>进入双人合作大厅</Link>}<p>{game.keys}</p><small>Esc / P 暂停 · 离开窗口自动暂停</small>{id==='garden'&&<p>先建塔，再开始下一波。点击“升级”后选择已有炮塔。霜花减速、莓果范围伤害。</p>}{id==='tanks'&&<p>守住下方星灯。砖墙可击碎，钢墙会挡住双方子弹。每波结束恢复生命；单个玩家阵亡后，伙伴可守到下一波救回。</p>}{id==='mines'&&<p>数字表示相邻八格的雷数。插旗数与数字一致时，可点击数字快速展开。</p>}</section><section className="game-rank-card"><h3>单项成绩榜</h3>{member?<><Segments value={a.rankPeriod.value} onChange={a.changeRank} items={[{id:'week',label:'本周'},{id:'all',label:'长期'}]}/><RankList data={a.rankReady.value?{items:a.ranking.value,self:a.rankSelf.value,label:a.rankLabel.value}:null} error={a.rankError.value} onRetry={()=>a.changeRank(a.rankPeriod.value)}/></>:<><p>登录并选择角色后可以参加排名。</p><Link className="small-action" to="/account">账号与角色</Link></>}
    <p className="arcade-personal-best">本机最好成绩 <b>{a.best.value[id||'']??'—'}</b></p></section></aside></div>;
}
