import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {analyseBoard} from '../src/board-engine.mjs';import {createBoard,playMove} from '../shared/board-games.mjs';
test('slow subprocess startup does not consume the chess search budget',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-engine-cold-')),preload=path.join(dir,'cold.cjs');
 await fs.writeFile(preload,'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,1000);');t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const state=createBoard('gomoku');for(const to of [112,0,113,1,114,2,115,3])Object.assign(state,playMove(state,{to}));
 const previous=process.env.NODE_OPTIONS;let job;try{process.env.NODE_OPTIONS=(previous?previous+' ':'')+'--require="'+preload.replaceAll('\\','/')+'"';job=analyseBoard(state,1);}finally{if(previous===undefined)delete process.env.NODE_OPTIONS;else process.env.NODE_OPTIONS=previous;}
 assert.equal(playMove(state,await job.promise).winner,'a');
});
