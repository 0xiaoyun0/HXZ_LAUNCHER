import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const jdk=process.env.JAVA_HOME||'C:/Program Files/Java/jdk-21';
const out=path.resolve('.runtime/installer-classes'),src=path.resolve('resources/installer/src/up/hxz');
await fs.mkdir(out,{recursive:true});
const files=(await fs.readdir(src)).filter(f=>f.endsWith('.java')).map(f=>path.join(src,f));
execFileSync(path.join(jdk,'bin/javac.exe'),['--release','8','-encoding','UTF-8','-cp','resources/hxzup/updater-1.0.3.jar','-d',out,...files],{stdio:'inherit'});
execFileSync(path.join(jdk,'bin/jar.exe'),['cf','resources/installer/game-installer.jar','-C',out,'.'],{stdio:'inherit'});
// The embedded HXZUP has the same downloader and installer classes; update both
// entry points so the official-source preference survives the second stage.
execFileSync(path.join(jdk,'bin/jar.exe'),['uf','resources/hxzup/updater-launcher.jar','-C',out,'.'],{stdio:'inherit'});
console.log('Built Java 8 compatible installer helper');
