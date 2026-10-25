import {usePageEnter} from './PageFeedback';
import {WEREWOLF} from '../../../packages/games/werewolf-ui.mjs';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Search,Star,Play,Clock3,Trophy,PanelTop} from 'lucide-react';
import {BOARD_GAMES} from '../../../server/shared/board-catalog.mjs';
import {GAMES} from '../../../server/shared/arcade-engine.mjs';
import {CardBoard} from './CardBoard';
import {Button,Segments,Empty} from './ui';
const all=[...GAMES.map((g:any,i:number)=>({...g,number:g.number||i+1})),...BOARD_GAMES.map((g:any,i:number)=>({...g,number:i+4})),WEREWOLF].sort((a,b)=>a.number-b.number);
const cover=(g:any)=>['orbit','supply','rhythm','alchemy'].includes(g.id)?'./media/games/'+g.id+'.svg':'./media/games/'+g.id+'.webp';
function read(key:string,fallback:any){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function remember(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
export function GameShelf(){
  const navigate=useNavigate(),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const [simplified,setSimplified]=useState(()=>read('hxz-games-simplified',false));
  const [favorites,setFavorites]=useState<string[]>(()=>{const v=read('hxz-game-favorites',[]);return Array.isArray(v)?v.filter(i=>typeof i==='string'):[];});
  const recent=all.find(g=>g.id===read('hxz-game-recent',''));
  const play=(g:any)=>{remember('hxz-game-recent',g.id);navigate('/arcade/'+(g.social?'social/':g.symbol?'board/':'play/')+g.id);};
  const toggle=(id:string)=>setFavorites(old=>{const v=old.includes(id)?old.filter(i=>i!==id):[...old,id];remember('hxz-game-favorites',v);return v;});
  const visible=all.filter((g:any)=>(filter==='all'||filter==='favorites'&&favorites.includes(g.id)||filter==='rogue'&&g.tag?.includes('肉鸽')||filter==='board'&&g.symbol||filter==='arcade'&&!g.symbol&&!g.social||filter==='social'&&g.social)&&g.name.includes(query.trim()));
  const setCompact=(value:boolean)=>{setSimplified(value);remember('hxz-games-simplified',value);};
  const contentMotion=usePageEnter(filter+':'+query+':'+simplified);
  return <div className="game-lobby" ref={contentMotion}>
    <div className="game-lobby-tools"><Segments value={filter} onChange={setFilter} items={[{id:'all',label:'全部游戏'},{id:'arcade',label:'街机挑战'},{id:'rogue',label:'肉鸽探险'},{id:'board',label:'棋类对弈'},{id:'social',label:'多人桌游'},{id:'favorites',label:'我的收藏'}]}/><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="找个游戏" aria-label="搜索小游戏"/></div><Button icon={PanelTop} onClick={()=>setCompact(!simplified)} aria-pressed={simplified}>{simplified?'完整显示':'简化显示'}</Button></div>
    <div className="game-lobby-shortcuts"><span><Clock3 size={16}/>{recent?'上次玩了 '+recent.name:'挑一个游戏，休息片刻'}</span>{recent&&<Button icon={Play} onClick={()=>play(recent)}>再玩一局</Button>}<Button icon={Trophy} onClick={()=>navigate('/arcade/ranking')}>本周积分榜</Button></div>
    {visible.length?<CardBoard id="games" transient={filter!=='all'||!!query.trim()} className="game-card-boards" label={visible.length+' 款游戏'} cards={visible.map((g:any,i:number)=>({
      id:'game-'+g.id,title:g.name,w:4,h:simplified?7:14,minW:3,minH:simplified?6:11,x:i%3*4,y:Math.floor(i/3)*(simplified?7:14),plain:true,
      content:<div className={'game-tile game-'+g.id+(simplified?' game-tile-compact':'')}>{simplified&&<div className="game-compact-summary"><span className="game-compact-number">{String(g.number).padStart(2,'0')}</span><div><small>{g.tag}</small><span>{g.social?'进入多人圆桌':g.symbol?'开始一局对弈':'快速开始挑战'}</span></div></div>}{!simplified&&<button className="game-preview-button" aria-label={'游玩'+g.name} onClick={()=>play(g)}><div className="arcade-art"><img src={cover(g)+'?v=087'} alt="" loading="lazy" decoding="async"/><i>{String(g.number).padStart(2,'0')}</i></div><span className="game-preview-play"><Play size={21}/></span></button>}<div className="game-tile-info">{!simplified&&<><small>{g.tag}</small><p>{g.description}</p></>}<footer><Button tone="solid" icon={Play} onClick={()=>play(g)}>{g.social?'进入圆桌':g.symbol?'开始对局':'开始挑战'}</Button><button className={'game-favorite '+(favorites.includes(g.id)?'selected':'')} aria-label={(favorites.includes(g.id)?'取消收藏':'收藏')+g.name} aria-pressed={favorites.includes(g.id)} onClick={()=>toggle(g.id)}><Star size={18}/></button></footer></div></div>
    }))}/>:<Empty icon={Star} title={filter==='favorites'?'还没有收藏游戏':'没有匹配的游戏'}>点击游戏卡片上的星标，收进你的常玩列表。</Empty>}
  </div>;
}
