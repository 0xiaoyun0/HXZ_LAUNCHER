export function resumeTarget(instances,settings){
 const usable=(g)=>g&&!g.placeholder&&!g.error;
 const previous=settings.lastPlayed;
 if(previous?.root===settings.gameRoot){
   const played=instances.find(g=>g.id===previous.id);
   if(usable(played)&&played.installed)return {game:played,reason:'last'};
 }
 const selected=instances.find(g=>g.id===settings.selectedInstance);
 if(usable(selected))return {game:selected,reason:'selected'};
 return null;
}
