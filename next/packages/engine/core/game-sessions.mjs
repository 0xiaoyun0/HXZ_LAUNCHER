import {randomUUID} from 'node:crypto';

export function gameSessions(onChange=()=>{}){
 const sessions=new Map();
 const list=()=>[...sessions.values()].map(({key,instance,pid,started,root})=>({key,instance,pid,started,root}));
 const publish=()=>onChange({type:'game-sessions',running:sessions.size>0,sessions:list()});
 return {
  get size(){return sessions.size;},list,
  hasInstance:(id,root)=>[...sessions.values()].some(s=>s.instance===id&&s.root===root),
  add(child,{instance,root,cleanup=()=>{}}){
   const session={key:randomUUID(),instance,root,pid:child.pid,started:Date.now(),child,stopped:false};
   sessions.set(session.key,session);publish();
   let finished=false;session.finish=()=>{if(finished)return;finished=true;sessions.delete(session.key);Promise.resolve().then(cleanup).catch(()=>{});publish();};
   return session;
  },
  stop(key){const targets=key?[sessions.get(key)].filter(Boolean):[...sessions.values()];for(const session of targets){session.stopped=true;session.child.kill();}return targets.length;}
 };
}
