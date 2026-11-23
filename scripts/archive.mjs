import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import yazl from 'yazl';

export async function filesUnder(directory, relative='') {
  const files=[];
  for(const entry of await fs.readdir(path.join(directory,relative),{withFileTypes:true})) {
    const file=path.join(relative,entry.name);
    if(entry.isDirectory())files.push(...await filesUnder(directory,file));
    else if(entry.isFile())files.push(file);
  }
  return files.sort();
}
export async function archive(directory,target,entries) {
  const zip=new yazl.ZipFile(), writing=pipeline(zip.outputStream,createWriteStream(target));
  const files=[];
  if(entries){for(const entry of entries){const stat=await fs.stat(path.join(directory,entry));if(stat.isDirectory())files.push(...await filesUnder(directory,entry));else files.push(entry);}}
  else files.push(...await filesUnder(directory));
  for(const file of files)zip.addFile(path.join(directory,file),file.split(path.sep).join('/'));
  zip.end();await writing;
}
