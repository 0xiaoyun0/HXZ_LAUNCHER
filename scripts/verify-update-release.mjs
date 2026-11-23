import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyRelease,RELEASE_ROOT} from '../packages/engine/core/update-sources.mjs';

export async function verifyUpdateRelease(dir,version){
  for(const arch of ['x64','ia32']){
    const feed=arch==='x64'?'latest.json':'latest-ia32.json';
    const envelope=JSON.parse(await fs.readFile(path.join(dir,'updates',feed),'utf8'));
    const release=verifyRelease(envelope,undefined,arch);
    assert.equal(release.version,version,feed);
    const [file]=JSON.parse(Buffer.from(envelope.payload,'base64')).files;
    for(const name of [path.join('updates',file.url),'HXZ-3rd-'+version+'-setup-'+arch+'.exe']){
      const absolute=path.join(dir,name),a=createHash('sha512'),b=createHash('sha256');
      assert.equal((await fs.stat(absolute)).size,file.size,name);
      for await(const bytes of createReadStream(absolute)){a.update(bytes);b.update(bytes);}
      assert.equal(a.digest('base64'),file.sha512,name);assert.equal(b.digest('hex'),file.sha256,name);
    }
  }
  const catalog=JSON.parse(await fs.readFile('.runtime/official-extensions.json','utf8'));
  for(const id of ['community','music','arcade']){
    const asset=catalog[id];assert.equal(asset.version,version,id);
    assert.equal(asset.url,RELEASE_ROOT+'/download/v'+version+'/'+asset.name,id+' 发布地址');
    await assert.rejects(fs.access(path.join('apps/desktop/dist',asset.entry)),{code:'ENOENT'});
    const filename=path.join(dir,'extensions',asset.name),digest=createHash('sha256');
    assert.equal((await fs.stat(filename)).size,asset.size,id);
    for await(const bytes of createReadStream(filename))digest.update(bytes);
    assert.equal(digest.digest('hex'),asset.sha256,id);
  }
}
