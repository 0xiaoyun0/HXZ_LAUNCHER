import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const groups=JSON.parse(await fs.readFile(new URL('shared-files.json',import.meta.url),'utf8'));
for(const {source,target,files} of groups){
 for(const relative of files){
   const from=path.join(root,source,relative),to=path.join(root,target,relative);
   const bytes=await fs.readFile(from),existing=await fs.readFile(to).catch(()=>null);
   if(existing?.equals(bytes))continue;
   await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(from,to);
 }
}
