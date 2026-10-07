import fs from 'node:fs/promises';
import path from 'node:path';
export async function copyCardLicenses(root,target){
 const output=path.join(target,'licenses');await fs.mkdir(output,{recursive:true});
 for(const file of ['LICENSE','NOTICE','UPSTREAM.md'])await fs.copyFile(path.join(root,'server/shared/contra',file),path.join(output,'ContraRun-'+file));
 for(const name of ['react-grid-layout','react-resizable','react-draggable','selfsigned','node-forge','@achingbrain/nat-port-mapper','@achingbrain/ssdp']){
  const folder=path.join(root,'node_modules',name);
  const file=(await fs.readdir(folder)).find(value=>/^licen[sc]e(?:\.|$)/i.test(value));
  const source=file?path.join(folder,file):path.join(root,'resources/licenses',name.replaceAll('/','-')+'-LICENSE.txt');
  await fs.copyFile(source,path.join(output,name.replaceAll('/','-')+'-LICENSE.txt'));
 }
}
