// Window restoration is an optional presentation effect. A destroyed window or
// an overlay failure must never escape a game process' exit callback.
export function gameEventDelivery({mainWindow,companion,wake,diagnostic}){
 const report=(label,error)=>{try{Promise.resolve(diagnostic(label+': '+(error?.stack||error))).catch(()=>{});}catch{}};
 return value=>{
  const window=mainWindow();if(!window||window.isDestroyed()||window.webContents.isDestroyed())return;
  if(value.type==='task'&&value.running===false){try{wake();}catch(error){report('game-exit/wake',error);}}
  try{window.webContents.send('next:event',value);}catch(error){report('game-event/delivery',error);}
  if(value.type==='task'&&typeof value.running==='boolean'){
   try{companion()?.game(value.running);}catch(error){report('game-window/restore',error);}
  }
 };
}
