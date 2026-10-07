import {WEREWOLF} from '../../../packages/games/werewolf-ui.mjs';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Search,Star,Play,Clock3,Trophy} from 'lucide-react';
import {BOARD_GAMES} from '../../../server/shared/board-catalog.mjs';
import {GAMES} from '../../../server/shared/arcade-engine.mjs';
import {CardBoard} from './CardBoard';
import {Button,Segments,Empty} from './ui';
const all=[...GAMES.slice(0,3),...BOARD_GAMES,...GAMES.slice(3),WEREWOLF];
function read(key:string,fallback:any){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function remember(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
export function GameShelf(){
  const navigate=useNavigate(),[filter,setFilter]=useState('all'),[query,setQuery]=useState('');
  const [favorites,setFavorites]=useState<string[]>(()=>{const v=read('hxz-game-favorites',[]);return Array.isArray(v)?v.filter(i=>typeof i==='string'):[];});
  const recent=all.find(g=>g.id===read('hxz-game-recent',''));
  const play=(g:any)=>{remember('hxz-game-recent',g.id);navigate('/arcade/'+(g.social?'social/':g.symbol?'board/':'play/')+g.id);};
  const toggle=(id:string)=>setFavorites(old=>{const v=old.includes(id)?old.filter(i=>i!==id):[...old,id];remember('hxz-game-favorites',v);return v;});
  const visible=all.filter((g:any)=>(filter==='all'||filter==='favorites'&&favorites.includes(g.id)||filter==='board'&&g.symbol||filter==='arcade'&&!g.symbol&&!g.social||filter==='social'&&g.social)&&g.name.includes(query.trim()));
  return <div className="game-lobby">
    <div className="game-lobby-tools"><Segments value={filter} onChange={setFilter} items={[{id:'all',label:'全部游戏'},{id:'arcade',label:'街机挑战'},{id:'board',label:'棋类对弈'},{id:'social',label:'多人桌游'},{id:'favorites',label:'我的收藏'}]}/><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="找个游戏" aria-label="搜索小游戏"/></div></div>
    <div className="game-lobby-shortcuts"><span><Clock3 size={16}/>{recent?'上次玩了 '+recent.name:'挑一个游戏，休息片刻'}</span>{recent&&<Button icon={Play} onClick={()=>play(recent)}>再玩一局</Button>}<Button icon={Trophy} onClick={()=>navigate('/arcade/ranking')}>本周积分榜</Button></div>
    {visible.length?<CardBoard id="games" className="game-card-boards" label={visible.length+' 款游戏'} cards={visible.map((g:any,i:number)=>({
      id:'panel-'+all.findIndex(v=>v.id===g.id),title:g.name,w:4,h:14,minW:3,minH:11,x:i%3*4,y:Math.floor(i/3)*14,plain:true,
      content:<div className={'game-tile game-'+g.id}><button className="game-preview-button" aria-label={'游玩'+g.name} onClick={()=>play(g)}><div className="arcade-art"><img src={'./media/games/'+g.id+(['contra','garden','werewolf'].includes(g.id)?'.svg':'.webp')} alt="" loading="lazy" decoding="async"/><i>{String(all.findIndex(v=>v.id===g.id)+1).padStart(2,'0')}</i></div><span className="game-preview-play"><Play size={21}/></span></button><div className="game-tile-info"><small>{g.tag}</small><p>{g.description}</p><footer><Button tone="solid" icon={Play} onClick={()=>play(g)}>{g.social?'进入圆桌':g.symbol?'开始对局':'开始挑战'}</Button><button className={'game-favorite '+(favorites.includes(g.id)?'selected':'')} aria-label={(favorites.includes(g.id)?'取消收藏':'收藏')+g.name} aria-pressed={favorites.includes(g.id)} onClick={()=>toggle(g.id)}><Star size={18}/></button></footer></div></div>
    }))}/>:<Empty icon={Star} title={filter==='favorites'?'还没有收藏游戏':'没有匹配的游戏'}>点击游戏卡片上的星标，收进你的常玩列表。</Empty>}
  </div>;
}
