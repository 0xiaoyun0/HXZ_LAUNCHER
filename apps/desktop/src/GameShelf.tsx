import {RefineImage} from './launcher/micro/RefineImage';
import {usePageEnter} from './PageFeedback';
import {WEREWOLF} from '../../../packages/games/werewolf-ui.mjs';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Search,Star,Play,Clock3,PanelTop} from 'lucide-react';
import {BOARD_GAMES} from '../../../server/shared/board-catalog.mjs';
import {GAMES} from '../../../server/shared/arcade-engine.mjs';
import {createArcadeCatalog,coverFor} from '../../../server/shared/arcade-catalog.mjs';
import {Button,Segments,Empty} from './ui';
const all=createArcadeCatalog(GAMES,BOARD_GAMES,WEREWOLF);
function read(key:string,fallback:any){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function remember(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
export function GameShelf(){
  const navigate=useNavigate(),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const mobile=window.launcher?.platform==='android';
  const [simplified,setSimplified]=useState(()=>read('hxz-games-simplified',mobile));
  const [favorites,setFavorites]=useState<string[]>(()=>{const v=read('hxz-game-favorites',[]);return Array.isArray(v)?v.filter(i=>typeof i==='string'):[];});
  const recent=all.find(g=>g.id===read('hxz-game-recent',''));
  const play=(g:any)=>{remember('hxz-game-recent',g.id);navigate((g.social?'/community/arcade/social/':g.board?'/community/arcade/board/':'/arcade/play/')+g.id);};
  const toggle=(id:string)=>setFavorites(old=>{const v=old.includes(id)?old.filter(i=>i!==id):[...old,id];remember('hxz-game-favorites',v);return v;});
  const visible=all.filter((g:any)=>(filter==='all'||filter==='favorites'&&favorites.includes(g.id)||filter==='rogue'&&g.tag?.includes('肉鸽')||filter==='board'&&g.symbol||filter==='arcade'&&!g.symbol&&!g.social||filter==='social'&&g.social)&&g.name.includes(query.trim()));
  const setCompact=(value:boolean)=>{setSimplified(value);remember('hxz-games-simplified',value);};
  const contentMotion=usePageEnter(filter+':'+query+':'+simplified);
  return <div className="game-lobby" ref={contentMotion}>
    <div className="game-lobby-tools"><Segments value={filter} onChange={setFilter} items={[{id:'all',label:'全部游戏'},{id:'arcade',label:'街机挑战'},{id:'rogue',label:'肉鸽探险'},{id:'board',label:'棋类对弈'},{id:'social',label:'多人桌游'},{id:'favorites',label:'我的收藏'}]}/><small className="game-result-count">{visible.length} 款游戏</small><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="找个游戏" aria-label="搜索小游戏"/></div><Button icon={PanelTop} onClick={()=>setCompact(!simplified)} aria-pressed={simplified}>{mobile?(simplified?'显示封面':'收起封面'):(simplified?'完整显示':'简化显示')}</Button></div>
    {recent&&<div className="game-lobby-shortcuts"><span><Clock3 size={16}/>上次玩了 {recent.name}</span><Button icon={Play} onClick={()=>play(recent)}>再玩一局</Button></div>}
    {visible.length?<div className={'game-catalog-grid'+(simplified?' compact':'')} aria-label={visible.length+' 款游戏'}>{visible.map((g:any)=><article className={'game-catalog-card game-'+g.id} key={g.id}>
      {simplified?<div className="game-catalog-compact"><div><small>{g.tag}</small><strong>{g.name}</strong><span>{g.social?'进入多人圆桌':g.symbol?'开始一局对弈':'快速开始挑战'}</span></div></div>:<button className="game-catalog-cover" aria-label={'游玩'+g.name} onClick={()=>play(g)}><RefineImage src={coverFor(g.id)+'?v=091'} alt="" loading="lazy" decoding="async"/><span><Play size={21}/></span></button>}
      <div className="game-catalog-info">{!simplified&&<><small>{g.tag}{g.board?' · 社区联机':''}</small><h2>{g.name}</h2><p>{g.description}</p></>}<footer><Button tone="solid" icon={Play} onClick={()=>play(g)}>{g.social?'进入圆桌':g.symbol?'开始对局':'开始挑战'}</Button><button className={'game-favorite '+(favorites.includes(g.id)?'selected':'')} aria-label={(favorites.includes(g.id)?'取消收藏':'收藏')+g.name} aria-pressed={favorites.includes(g.id)} onClick={e=>{e.currentTarget.dataset.chosen=String(!favorites.includes(g.id));toggle(g.id);}}><Star size={18}/></button></footer></div>
    </article>)}</div>:<Empty icon={Star} title={filter==='favorites'?'还没有收藏游戏':'没有匹配的游戏'}>点击游戏卡片上的星标，收进你的常玩列表。</Empty>}
  </div>;
}
