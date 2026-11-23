import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {exists,noLinks} from './io.mjs';
export async function dependencyStore(root,previous){
 await noLinks(root);
 try{await fs.mkdir(root,{recursive:true});const probe=path.join(root,'.write-'+randomUUID());await fs.writeFile(probe,'',{flag:'wx'});await fs.unlink(probe);}
 catch{throw Error('无法写入软件目录中的依赖缓存：'+root+'。请将启动器安装到当前用户可写目录。');}
 const old=path.join(previous,'runtime'),dest=path.join(root,'runtime');
 if(path.resolve(old)!==path.resolve(dest)&&await exists(old)&&!await exists(dest)){await noLinks(old);await fs.cp(old,dest,{recursive:true,errorOnExist:true,force:false});}
 return root;
}
