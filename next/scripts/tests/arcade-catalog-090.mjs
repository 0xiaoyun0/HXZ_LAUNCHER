import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createArcadeCatalog,coverFor} from '../../server/shared/arcade-catalog.mjs';
import {GAMES} from '../../server/shared/arcade-engine.mjs';
import {BOARD_GAMES} from '../../server/shared/board-catalog.mjs';
import {WEREWOLF} from '../../packages/games/werewolf-ui.mjs';

test('0.9.0 arcade catalog has stable unique order and covers',()=>{
 const catalog=createArcadeCatalog(GAMES,BOARD_GAMES,WEREWOLF);
 assert.equal(new Set(catalog.map(item=>item.id)).size,catalog.length);
 assert.deepEqual(catalog.map(item=>item.number),catalog.map((_,index)=>index+1));
 assert.equal(catalog.at(-1).id,'werewolf');
 assert.match(coverFor('orbit'),/orbit\.webp$/);
 assert.match(coverFor('runner'),/runner\.webp$/);
});

test('0.9.0 catalogue ships one cover for every card',async()=>{
 const catalog=createArcadeCatalog(GAMES,BOARD_GAMES,WEREWOLF);
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 for(const item of catalog){
  const file=path.join(root,'public',coverFor(item.id).replace(/^\.\//,''));
  const info=await fs.stat(file);
  assert.ok(info.size>1000,`${item.id} cover is empty`);
 }
});
