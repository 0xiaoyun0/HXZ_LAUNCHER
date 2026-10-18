import {fail,choice,integer,string} from './common.mjs';
import {personalDesk} from './desk.mjs';

// Read model only: all decisions still use their domain's permissioned action.
export function createWorkbench(ctx,{clients}){
 const {db,manager,now}=ctx;
 const sources={
  content:`SELECT 'content' category,r.id,r.title,m.name,r.created,r.kind section,'/community/hub?section='||r.kind||'&item='||r.id target FROM hub_records r JOIN members m ON m.uid=r.owner WHERE r.status='review'`,
  proof:`SELECT 'proof' category,s.record||':'||s.checkpoint||':'||s.uid id,r.title||' · '||c.title title,m.name,s.updated created,'event' section,'/community/hub?section=event&item='||s.record target FROM hub_stamps s JOIN hub_records r ON r.id=s.record JOIN hub_checkpoints c ON c.id=s.checkpoint JOIN members m ON m.uid=s.uid WHERE s.status='review'`,
  world:`SELECT 'world' category,s.id,r.title,m.name,s.created,'world' section,'/community/hub?section=world&item='||s.record target FROM hub_world_snapshots s JOIN hub_records r ON r.id=s.record JOIN members m ON m.uid=s.uid WHERE s.status='review'`,
  feedback:`SELECT 'feedback' category,id,title,name,created,'feedback' section,'/settings?feedback='||id target FROM feedback WHERE status IN ('open','working')`,
  blueprint:`SELECT 'blueprint' category,id,title,name,created,'blueprint' section,'/workshop/blueprints?item='||id target FROM blueprints WHERE status='pending'`,
  guild:`SELECT 'guild' category,id,title,name,created,'guild' section,'/guild?task='||id target FROM guild_tasks WHERE status='review'`,
  linking:`SELECT 'linking' category,CAST(s.id AS TEXT) id,COALESCE(json_extract(c.live,'$.title'),json_extract(c.draft,'$.title'),'LINKING')||' · 手记' title,s.name,s.created,'linking' section,'/linking' target FROM linking_submissions s LEFT JOIN linking_chapters c ON c.id=s.chapter WHERE s.status='pending'`,
 };
 function route(user,p,method,input,search){
  if(p==='desk'&&method==='GET')return personalDesk(db,user,search);
  if(p!=='workbench'||method!=='GET')return undefined;if(!manager(user))fail('需要社区管理员权限',403);
  const category=choice(search.get('category')||'all',['all',...Object.keys(sources)],'队列分类'),query=string(search.get('q')||'',80,'查询',true),offset=integer(Number(search.get('offset')||0),0,100000,'页码');
  const selected=category==='all'?Object.values(sources).join(' UNION ALL '):sources[category],where=" WHERE instr(lower(title),lower(?))>0 OR instr(lower(name),lower(?))>0";
  const counts=Object.fromEntries(Object.entries(sources).map(([key,sql])=>[key,db.prepare('SELECT COUNT(*) n FROM ('+sql+')').get().n]));
  return {generated:now(),counts,items:db.prepare('SELECT * FROM ('+selected+')'+where+' ORDER BY created,category,id LIMIT 24 OFFSET ?').all(query,query,offset),total:db.prepare('SELECT COUNT(*) n FROM ('+selected+')'+where).get(query,query).n,
   stats:{online:new Set([...clients.values()].map(c=>c.user.uid)).size,teams:db.prepare('SELECT COUNT(*) n FROM hub_teams').get().n,publishedWeek:db.prepare("SELECT COUNT(*) n FROM hub_records WHERE status='published' AND updated>=?").get(now()-7*86400000).n},
   audit:db.prepare('SELECT a.action,a.target,a.detail,a.created,COALESCE(m.name,\'网页管理员\') name FROM hub_audit a LEFT JOIN members m ON m.uid=a.uid ORDER BY a.id DESC LIMIT 30').all()};
 }
 return {route};
}
