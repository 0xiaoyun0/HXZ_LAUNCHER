import fs from 'node:fs/promises';
// Canonical rules and renderer shared with the community server and mobile app.
for(const target of ['apps/community-server/shared','packages/mobile-ui/server/shared']){
 await fs.mkdir(target,{recursive:true});for(const f of await fs.readdir('server/shared'))if(f.startsWith('arcade-')||f==='contra')await fs.cp('server/shared/'+f,target+'/'+f,{recursive:true});
}
for(const name of ['tank-room-ui.mjs','tank-room.css','arcade-controller.mjs','arcade-classics-renderer.mjs','arcade-renderer.mjs','arcade-expanded-renderer.mjs','arcade-new-renderer.mjs','game-controls.mjs','game-controls.css','game-gestures.mjs','werewolf-ui.mjs','werewolf.css']){
 let code=await fs.readFile('packages/games/'+name,'utf8');code=code.replaceAll('../../server/shared/','../../../server/shared/');await fs.writeFile('packages/mobile-ui/client/src/lib/'+name,code);
}
