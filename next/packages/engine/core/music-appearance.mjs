// Only a successful authenticated server response grants the archive appearance.
// Storage contains preferences and the one-time presentation receipt, never entitlement.
export function createMusicAppearanceGate({loadEffects,storage,onChange=(_value)=>{}}){
  const prefix='hxz.music-appearance.081:';
  let generation=0,disposed=false;
  let value={owner:'',connected:false,earned:false,classic:false,unlockPending:false};
  function preferences(owner){try{const saved=JSON.parse(storage?.getItem(prefix+owner)||'{}');return {classic:saved.classic===true,unlockSeen:saved.unlockSeen===true};}catch{return {classic:false,unlockSeen:false};}}
  function save(patch){if(value.owner)try{storage?.setItem(prefix+value.owner,JSON.stringify({...preferences(value.owner),...patch}));}catch{/* A preference failure must not interrupt playback. */}}
  function emit(patch){value={...value,...patch};onChange({...value});}
  async function refresh(){
    if(disposed||!value.owner||!value.connected)return;
    const run=++generation;
    try{
      const effects=await loadEffects();
      if(disposed||run!==generation)return;
      if(!Array.isArray(effects))throw Error('Invalid appearance list');
      const earned=effects.includes('music-archive');
      emit({earned,unlockPending:earned&&(value.unlockPending||!preferences(value.owner).unlockSeen)});
    }catch{if(!disposed&&run===generation)emit({earned:false,unlockPending:false});}
  }
  return {
    get snapshot(){return {...value};},
    setSession(owner,connected){
      if(disposed||value.owner===owner&&value.connected===connected)return;
      generation++;
      emit({owner,connected,earned:false,classic:preferences(owner).classic,unlockPending:false});
      if(owner&&connected)void refresh();
    },
    refresh,
    setArchive(archive){if(!value.earned||!value.connected)return;save({classic:!archive});emit({classic:!archive});},
    markUnlockShown(){if(value.earned&&value.unlockPending)save({unlockSeen:true});},
    dismissUnlock(){emit({unlockPending:false});},
    dispose(){disposed=true;generation++;}
  };
}
