import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import yazl from 'yazl';
import yauzl from 'yauzl';

const root=path.resolve('release'),version=JSON.parse(await fs.readFile('package.json','utf8')).version,sums=[];
for(const arch of ['x64','ia32']){
 const folder=path.join(root,`HXZ-NEXT-${version}-win-${arch}`),name=`HXZ-NEXT-${version}-windows-${arch}-portable.zip`,target=path.join(root,name),temp=target+'.building';
 const zip=new yazl.ZipFile();
 const writing=pipeline(zip.outputStream,createWriteStream(temp));
 async function add(directory,relative=''){
  for(const entry of (await fs.readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   if(entry.isSymbolicLink())throw Error('Release contains a symbolic link: '+entry.name);
   if(/^(profile|\.runtime|\.git|Cache|logs)$/i.test(entry.name))throw Error('Release contains a data directory: '+entry.name);
   const source=path.join(directory,entry.name),key=relative+entry.name;
   if(entry.isDirectory()){
    if(entry.name==='launcher-cache'){if((await fs.readdir(source)).length)throw Error('Release launcher-cache must be empty');continue;}
    await add(source,key+'/');
   }else zip.addFile(source,key);
  }
 }
 await add(folder);zip.end();await writing;
 const names=await new Promise((resolve,reject)=>yauzl.open(temp,{lazyEntries:true},(error,archive)=>{
  if(error)return reject(error);const files=[];
  archive.on('error',reject);archive.on('entry',entry=>{files.push(entry.fileName);archive.readEntry();});archive.on('end',()=>resolve(files));archive.readEntry();
 }));
 if(!names.includes('幻想镇 NEXT.exe')||!names.includes('使用说明.txt')||!names.includes('resources/app.asar'))throw Error('Archive is missing required UTF-8 entries');
 await fs.rename(temp,target);
 const hash=createHash('sha256');for await(const chunk of createReadStream(target))hash.update(chunk);
 sums.push(`${hash.digest('hex')}  ${name}`);
 console.log(`${name}: ${(await fs.stat(target)).size} bytes, ${names.length} files, UTF-8 names verified, no personal data`);
}
await fs.writeFile(path.join(root,`${version}-SHA256SUMS.txt`),sums.join('\n')+'\n');
const extension=`HXZ-NEXT-${version}-community-direct-lobby.zip`,hash=createHash('sha256');
for await(const chunk of createReadStream(path.join(root,extension)))hash.update(chunk);
await fs.appendFile(path.join(root,`${version}-SHA256SUMS.txt`),`${hash.digest('hex')}  ${extension}\n`);
