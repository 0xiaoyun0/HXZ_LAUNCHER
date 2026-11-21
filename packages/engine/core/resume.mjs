export function resumeTarget(instances,settings,choice=null){
 const usable=(g)=>g&&!g.placeholder&&!g.error;
 const previous=settings.lastPlayed;
 if(choice&&choice.root===settings.gameRoot&&choice.id===settings.selectedInstance){
   const game=instances.find(item=>item.id===choice.id);
   if(usable(game))return {game,reason:previous?.root===choice.root&&previous.id===choice.id&&game.installed?'last':'selected'};
 }
 if(previous?.root===settings.gameRoot){
   const played=instances.find(g=>g.id===previous.id);
   if(usable(played)&&played.installed)return {game:played,reason:'last'};
 }
 const selected=instances.find(g=>g.id===settings.selectedInstance);
 if(usable(selected))return {game:selected,reason:'selected'};
 return null;
}
