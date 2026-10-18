import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createAssetExporter} from '../core/asset-export.mjs';
test('asset export streams ordered chunks, keeps existing file until complete, aborts incomplete transfers',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-asset-')),target=path.join(root,'图片.png');let clock=100;const exp=createAssetExporter({choose:async()=>target,now:()=>clock});
 try{await fs.writeFile(target,'previous');const a=await exp.invoke({action:'begin',name:'图片.png',mime:'image/png',size:6});await exp.invoke({action:'chunk',id:a.id,index:0,data:Buffer.from('abc').toString('base64')});await assert.rejects(exp.invoke({action:'chunk',id:a.id,index:0,data:'YWJj'}),/分段/);await assert.rejects(exp.invoke({action:'finish',id:a.id}),/完整/);assert.equal(await fs.readFile(target,'utf8'),'previous');await exp.invoke({action:'chunk',id:a.id,index:1,data:'ZGVm'});await exp.invoke({action:'finish',id:a.id});assert.equal(await fs.readFile(target,'utf8'),'abcdef');
 const b=await exp.invoke({action:'begin',name:'图片.png',mime:'image/png',size:6});await assert.rejects(exp.invoke({action:'chunk',id:b.id,index:0,data:'YWJjZGVmZw=='}),/大小/);await exp.invoke({action:'abort',id:b.id});assert.deepEqual(await fs.readdir(root),['图片.png']);
 const c=await exp.invoke({action:'begin',name:'图片.png',mime:'image/png',size:6});clock+=600001;await assert.rejects(exp.invoke({action:'chunk',id:c.id,index:0,data:'YWJj'}),/结束/);assert.deepEqual(await fs.readdir(root),['图片.png']);
 await assert.rejects(exp.invoke({action:'begin',mime:'text/html',size:6}),/类型/);
 }finally{await exp.close();await fs.rm(root,{recursive:true,force:true});}
});
