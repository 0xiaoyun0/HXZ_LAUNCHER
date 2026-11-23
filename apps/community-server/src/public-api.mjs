import {weekOf,weekLabel} from './points.mjs';
import {GAMES} from '../shared/arcade-engine.mjs';
import {BOARD_GAMES} from '../shared/board-catalog.mjs';
export function createPublicAPI({db,send,points,shop}){
 const games=[...GAMES,...BOARD_GAMES];
 return async(req,res,url)=>{
  const prefix='/api/public/v1/',path=url.pathname;if(!path.startsWith(prefix))return false;
  if(req.method!=='GET'){send(res,405,{error:'此接口只提供公开查询'});return true;}
  const offset=Number(url.searchParams.get('offset')||0),size=Number(url.searchParams.get('limit')||20);
  if(!Number.isSafeInteger(offset)||offset<0||offset>1000000||!Number.isInteger(size)||size<1||size>50)throw Error('分页参数无效');
  const list=(table,columns,where,args,order)=>({items:db.prepare(`SELECT ${columns} FROM ${table} WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args,size,offset),total:db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${where}`).get(...args).n,offset,limit:size});
  res.setHeader('Cache-Control','public, max-age=15');
  let value;const route=path.slice(prefix.length);
  if(route==='overview')value={apiVersion:1,games:games.map(({id,name,tag})=>({id,name,tag})),counts:{posts:db.prepare('SELECT COUNT(*) n FROM forum_posts WHERE hidden=0').get().n,blueprints:db.prepare("SELECT COUNT(*) n FROM blueprints WHERE status='approved'").get().n},links:{notices:prefix+'notices',forum:prefix+'forum',blueprints:prefix+'blueprints',shop:prefix+'shop',leaderboard:prefix+'leaderboard'}};
  else if(route==='notices'){const group=url.searchParams.get('group');if(group&&!['survival','mod-1','mod-2'].includes(group))throw Error('公告分组无效');value=list('notices','id,group_id AS groupId,title,body,author,updated',group?'group_id=?':'1=1',group?[group]:[],'updated DESC,id');}
  else if(route==='forum'){
   const sort={newest:'created DESC,id',oldest:'created ASC,id',likes:'likes DESC,created DESC,id',replies:'replies DESC,created DESC,id',active:'updated DESC,id'}[url.searchParams.get('sort')]||'created DESC,id';
   const q=(url.searchParams.get('q')||'').slice(0,100);value=list('forum_posts p','id,name,title,substr(body,1,180) AS body,category,created,updated,pinned,(SELECT COUNT(*) FROM forum_likes WHERE post_id=p.id) likes,(SELECT COUNT(*) FROM forum_replies WHERE post_id=p.id AND hidden=0) replies','hidden=0'+(q?' AND (title LIKE ? OR body LIKE ?)':''),q?['%'+q+'%','%'+q+'%']:[],'pinned DESC,'+sort);
  }else if(route.startsWith('forum/')){
   const id=route.slice(6);const post=db.prepare('SELECT id,name,title,body,category,created,updated,pinned,locked FROM forum_posts WHERE id=? AND hidden=0').get(id);if(!post){send(res,404,{error:'帖子不存在'});return true;}
   value={post,replies:list('forum_replies','id,name,body,created,parent_id AS parentId','post_id=? AND hidden=0',[id],'created,id')};
  }else if(route==='blueprints'){
   const mc=url.searchParams.get('mc');value=list('blueprints','id,name,title,description,category,mc,loader,create_version,dependencies,cover,size,sha256,downloads,created,updated',"status='approved'"+(mc?' AND mc=?':''),mc?[mc]:[],'updated DESC,id');
  }else if(route==='shop'){const result=shop.catalog();value={...result,items:result.items.map(({id,title,description,price,stock,starts,ends,available})=>({id,title,description,price,stock,starts,ends,available}))};}
  else if(route==='leaderboard'){
   const game=url.searchParams.get('game');if(game){if(!games.some(g=>g.id===game))throw Error('小游戏不存在');value=points.gameBoard(game,undefined,url.searchParams.get('period'));}
   else if(url.searchParams.get('period')==='annual'){points.settle();const year=Number(url.searchParams.get('year')||new Date(Date.now()+8*3600000).getUTCFullYear());if(!Number.isInteger(year)||year<2020||year>9999)throw Error('年度无效');value={...list('points_annual','name,points','year=?',[year],'length(points) DESC,points DESC,uid'),year};value.items=value.items.map((p,i)=>({...p,rank:offset+i+1}));}
   else{points.settle();value={week:weekOf(),label:weekLabel(weekOf()),items:points.weeklyBoard(weekOf()).slice(0,10)};}
   // Public rankings expose display names, scores and positions, never wallet data.
   if(value.items)value.items=value.items.map(({uid,...entry})=>entry);delete value.self;
  }else{send(res,404,{error:'公开接口不存在'});return true;}
  send(res,200,value);return true;
 };
}
