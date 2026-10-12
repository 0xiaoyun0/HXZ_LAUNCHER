import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd(),fork=path.resolve('.runtime/fcl-source/FoldCraftLauncher-efe4dcc5dbc78c55be177c330239e12845ae7ccf/FCL/src/main/java/up/hxz');
const dir=await fs.mkdtemp(path.resolve('.runtime/android-maven-check-')),gson=path.resolve('.runtime/build-tools/gradle-8.14.4/lib/gson-2.10.jar'),jdk='C:/Program Files/Java/jdk-21/bin/';
try{
 const java=(await fs.readdir(fork)).filter(f=>f.endsWith('.java')).map(f=>path.join(fork,f));
 execFileSync(jdk+'javac.exe',['--release','8','-encoding','UTF-8','-cp',gson,'-d',dir,...java,path.resolve('scripts/tests/fixtures/AndroidMavenFallbackCheck.java')],{windowsHide:true,stdio:'pipe'});
 const result=execFileSync(jdk+'java.exe',['-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-Dstderr.encoding=UTF-8','-cp',dir+path.delimiter+gson,'up.hxz.AndroidMavenFallbackCheck',path.join(dir,'cache')],{windowsHide:true,encoding:'utf8',timeout:20000});console.log(result.trim());
}finally{if(!path.resolve(dir).startsWith(path.resolve(root,'.runtime')+path.sep+'android-maven-check-'))throw Error('Invalid test cleanup');await fs.rm(dir,{recursive:true,force:true});}
