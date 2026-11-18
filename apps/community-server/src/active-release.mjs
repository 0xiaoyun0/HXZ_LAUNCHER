import fs from 'node:fs/promises';
import path from 'node:path';
import {updateManifest,newer} from './update-trust.mjs';

// Full-package upgrades must supersede an older downloaded active release.
export async function selectActiveRelease({base,data,log=()=>{}}){
 const active=path.join(data,'.updates/active.json');
 const installed=JSON.parse(await fs.readFile(path.join(base,'package.json'),'utf8'));
 let record;try{record=JSON.parse(await fs.readFile(active,'utf8'));}catch(error){if(error.code!=='ENOENT')log('更新目录记录无法读取，使用安装目录：'+error.message);return base;}
 try{
  const manifest=updateManifest(record.envelope),root=path.resolve(data,'.updates/releases')+path.sep,target=path.resolve(record.target);
  if(!target.startsWith(root))throw Error('更新目录不在数据目录内');
  if(!newer(manifest.version,installed.version)){log(`使用安装目录 ${installed.version}，覆盖旧更新指针 ${manifest.version}`);return base;}
  const pkg=JSON.parse(await fs.readFile(path.join(target,'package.json'),'utf8'));
  if(pkg.version!==manifest.version)throw Error('更新目录版本不匹配');
  await fs.access(path.join(target,'src/server.mjs'));return target;
 }catch(error){log('更新目录不可用，使用安装目录 '+installed.version+'：'+error.message);return base;}
}
