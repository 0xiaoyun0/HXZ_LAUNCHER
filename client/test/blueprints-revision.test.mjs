import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import yazl from 'yazl';
import {createServices} from '../src-electron/core/services.mjs';

test('blueprint download through launcher service writes selected Chinese instance and save-as',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-blueprint-flow-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const bytes=Buffer.from('blueprint fixture'),item={id:'approved-fixture',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),filename:'中文机械.nbt'};
 const server=http.createServer((req,res)=>{if(req.url==='/api/blueprints/'+item.id+'/file'){res.end(bytes);}else if(req.url==='/api/blueprints/'+item.id){res.setHeader('content-type','application/json');res.end(JSON.stringify(item));}else{res.setHeader('content-type','application/json');res.end('{}');}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>server.close());
 const gameRoot=path.join(root,'.minecraft'),dir=path.join(gameRoot,'versions','中文实例');await fs.mkdir(path.join(dir,'mods'),{recursive:true});
 // A renamed version without recognized Java metadata is still a valid blueprint target.
 await fs.writeFile(path.join(dir,'中文实例.json'),JSON.stringify({id:'中文实例',mainClass:'test',libraries:[]}));
 const zip=new yazl.ZipFile();zip.addBuffer(Buffer.from('[[mods]]\nmodId="create"\nversion="6.0"\n'),'META-INF/neoforge.mods.toml');zip.end();await pipeline(zip.outputStream,createWriteStream(path.join(dir,'mods','create-6.0.jar')));
 const data=path.join(root,'profile');await fs.mkdir(data);await fs.writeFile(path.join(data,'settings.json'),JSON.stringify({gameRoot,communityUrl:'http://127.0.0.1:'+server.address().port}));
 const saved=path.join(root,'另存.nbt');let dialogs=0;
 const service=await createServices({data,resources:root,safeStorage:{isEncryptionAvailable:()=>false},emit:()=>{},window:()=>null,dialog:{showSaveDialog:async()=>{dialogs++;return {filePath:saved,canceled:false};}}});t.after(()=>service.dispose());
 assert.equal((await service.invoke('blueprints.instances'))[0]?.id,'中文实例');
 for(const id of ['HXZ-survival','HXZ-mod-1','HXZ-mod-2']){
  const preset=(await service.invoke('state')).instances.find(i=>i.id===id);
  assert.ok(preset,'Default server must remain visible: '+id);
  for(const mode of ['logical','physical'])await assert.rejects(service.invoke('instance.delete',{id,mode,confirmed:true}),/默认服务器/);
 }
 const result=await service.invoke('blueprints.download',{id:item.id,instance:'中文实例'});
 assert.equal(result.ok,true);assert.deepEqual(await fs.readFile(path.join(dir,'schematics','中文机械.nbt')),bytes);assert.equal(dialogs,0);
 assert.equal((await service.invoke('blueprints.download',{id:item.id,instance:''})).ok,true);assert.deepEqual(await fs.readFile(saved),bytes);
});
