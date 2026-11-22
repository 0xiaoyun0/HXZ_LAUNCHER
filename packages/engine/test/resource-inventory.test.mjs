import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import yazl from 'yazl';
import {createResourceInventory,localRelease} from '../core/resource-inventory.mjs';
import {hash} from '../core/io.mjs';

async function archive(file,name,body){
  await fs.mkdir(path.dirname(file),{recursive:true});
  const zip=new yazl.ZipFile(),done=pipeline(zip.outputStream,createWriteStream(file));
  zip.addBuffer(Buffer.from(JSON.stringify(body)),name);zip.end();await done;
}
test('search keeps renamed, disabled, different-version and shared files identifiable offline',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-resource-search-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true,maxRetries:3}));
  const settings={gameRoot:root,instanceSettings:{shared:{isolated:false}}},data=path.join(root,'cache');
  for(const id of ['alpha','other','shared']){
    await fs.mkdir(path.join(root,'versions',id),{recursive:true});await fs.writeFile(path.join(root,'versions',id,id+'.json'),JSON.stringify({id}));
  }
  const base=path.join(root,'versions','alpha'),a=path.join(base,'mods','renamed.jar'),b=path.join(base,'mods','old.jar.disabled');
  await archive(a,'fabric.mod.json',{id:'starlight',name:'Starlight',version:'2.0'});
  await archive(b,'fabric.mod.json',{id:'starlight',name:'Starlight',version:'1.0'});
  await fs.copyFile(a,path.join(base,'mods','copy.jar'));
  const one=await hash(a,'sha512'),two=await hash(b,'sha512');
  let calls=0;
  const index=createResourceInventory(data,async(route,payload)=>{
    assert.equal(route,'/version_files');assert.deepEqual(new Set(payload.hashes),new Set([one,two]));assert.equal(payload.algorithm,'sha512');calls++;
    return Object.fromEntries([[one,'2.0'],[two,'1.0']].map(([digest,version])=>[digest,{project_id:'project',id:'release-'+version,version_number:version}]));
  });
  const local=await index.scan(settings,'alpha','mod');assert.equal(calls,0);assert.equal(local.items.length,3);
  assert.ok(local.items.every(row=>row.slug==='starlight'));assert.equal(local.items.find(row=>row.digest===two).enabled,false);
  await index.identify(settings,'alpha','mod');assert.equal(calls,1);
  const offline=createResourceInventory(data,()=>{throw Error('offline');});
  const rows=(await offline.scan(settings,'alpha','mod')).items;
  assert.equal(localRelease(rows,'project',two).state,'disabled');assert.equal(localRelease(rows,'project',one).state,'installed');
  assert.equal(localRelease(rows,'project','new-file').state,'other');assert.equal((await offline.scan(settings,'other','mod')).items.length,0);
  for(const [kind,folder] of [['resourcepack','resourcepacks'],['shader','shaderpacks']]){
    const packed=path.join(root,folder,'my-rename.zip');await archive(packed,'pack.mcmeta',{pack:{description:'Moonlight'}});
    const view=await offline.scan(settings,'shared',kind);assert.equal(view.shared,true);assert.equal(view.items[0].title,'Moonlight');
    assert.equal(view.items[0].digest,await hash(packed,'sha512'));assert.equal((await offline.scan(settings,'alpha',kind)).items.length,0);
  }
});

