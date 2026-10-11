import fs from 'node:fs/promises';import path from 'node:path';
// Only disposable build inputs may be reset. Never reset a delivered portable/profile.
export async function freshStaging(root,directory){
 const runtime=await fs.realpath(path.resolve(root,'.runtime')),target=path.resolve(directory),relative=path.relative(path.resolve(root,'.runtime'),target).replaceAll('\\','/');
 if(!['package','package-ia32','installers/x64/app','installers/ia32/app'].includes(relative))throw Error('Unexpected build staging directory');
 const actual=await fs.realpath(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(actual){if(!actual.toLowerCase().startsWith(runtime.toLowerCase()+path.sep))throw Error('Build staging escapes workspace');await fs.rm(target,{recursive:true,force:true});}
 await fs.mkdir(target,{recursive:true});
}
