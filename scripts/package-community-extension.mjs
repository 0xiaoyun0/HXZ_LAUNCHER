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
const source='src/launcher/Social.tsx',entry=modules[source],core=closure('index.html');
if(!entry||core.has(entry.file))throw Error('社区仍被游戏入口直接依赖');
const exclusive=[...closure(source)].filter(file=>!core.has(file));
const payload=new Map();
for(const file of exclusive)payload.set(file,path.join(ui,file));
for(const file of await filesUnder('public/linking'))payload.set('linking/'+file.split(path.sep).join('/'),path.join('public/linking',file));
const name='HXZ-Community-Plugin-'+version+'.zip',out=path.resolve('release',version,'extensions');
await fs.mkdir(out,{recursive:true});
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
await fs.writeFile('.runtime/community-extension.json',JSON.stringify(definition));
for(const relative of exclusive)await fs.unlink(path.join(ui,relative));
await fs.unlink(manifestPath);
console.log('社区插件 '+name+' · '+payload.size+' 个文件 · '+definition.size+' 字节。基础桌面包独立。');
