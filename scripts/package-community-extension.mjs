import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import yazl from 'yazl';
import {filesUnder} from './archive.mjs';
import './ensure-linking.mjs';

const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const ui=path.resolve('apps/desktop/dist'),manifestPath=path.join(ui,'.vite/manifest.json');
const modules=JSON.parse(await fs.readFile(manifestPath,'utf8'));
function closure(entry){
  const visited=new Set(),files=new Set();
  function visit(key){
    if(visited.has(key))return;visited.add(key);
    const chunk=modules[key];if(!chunk)throw Error('Missing build entry '+key);
    for(const file of [chunk.file,...chunk.css||[],...chunk.assets||[]])files.add(file);
    for(const other of [...chunk.imports||[],...chunk.dynamicImports||[]])visit(other);
  }
  visit(entry);return files;
}
const core=closure('index.html'),removeFromBase=new Set(),catalog={};
const out=path.resolve('release',version,'extensions');
await fs.mkdir(out,{recursive:true});
for(const [id,label,source] of [
  ['community','Community','src/launcher/Social.tsx'],['music','Music','src/launcher/music-extension.ts'],['arcade','Arcade','src/launcher/arcade-extension.ts']
]){
  const entry=modules[source];
  if(!entry||core.has(entry.file))throw Error(id+' 被基础界面直接依赖');
  const payload=new Map();
  for(const file of closure(source))if(!core.has(file)){payload.set(file,path.join(ui,file));removeFromBase.add(file);}
  if(id==='community')for(const file of await filesUnder('public/linking'))payload.set('linking/'+file.split(path.sep).join('/'),path.join('public/linking',file));
  if(id==='arcade')for(const file of await filesUnder('public/media/games')){
    const key='media/games/'+file.split(path.sep).join('/');
    payload.set(key,path.join(ui,key));removeFromBase.add(key);
  }
  const name='HXZ-'+label+'-Plugin-'+version+'.zip';
  const zip=new yazl.ZipFile(),temp=path.join(out,name+'.tmp'),written=pipeline(zip.outputStream,createWriteStream(temp));
  const files={};
  for(const [relative,sourceFile] of [...payload].sort(([a],[b])=>a<b?-1:a>b?1:0)){
    const data=await fs.readFile(sourceFile);
    files[relative]=createHash('sha256').update(data).digest('hex');
    zip.addBuffer(data,relative,{mtime:new Date('2000-01-01T00:00:00Z'),mode:0o100644});
  }
  zip.end();await written;
  const hash=createHash('sha256');for await(const bytes of createReadStream(temp))hash.update(bytes);
  const definition={version,name,entry:entry.file,css:entry.css||[],size:(await fs.stat(temp)).size,sha256:hash.digest('hex'),url:'https://www.hxzmc.top/api/release-file/'+name,files};
  await fs.rename(temp,path.join(out,name));
  catalog[id]=definition;
  console.log(id+' · '+name+' · '+definition.size+' 字节');
}
await fs.writeFile('.runtime/community-extension.json',JSON.stringify(catalog.community));
await fs.writeFile('.runtime/official-extensions.json',JSON.stringify(catalog));
for(const file of removeFromBase)await fs.unlink(path.join(ui,file));
await fs.unlink(manifestPath);
