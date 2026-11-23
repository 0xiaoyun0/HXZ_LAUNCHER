import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const app=path.dirname(fileURLToPath(import.meta.url));
const tmp=mkdtempSync(path.join(os.tmpdir(),'town-runtime-test-'));
const jdk=process.env.JAVA_HOME;
const bin=tool=>jdk?path.join(jdk,'bin',tool):tool;
const src=path.join(app,'src/top/hxzmc/town');
try{
  execFileSync(bin('javac'),['-encoding','UTF-8','-d',tmp,...['TownMemoryBudget.java','TownSrv.java','TownItemSearch.java'].map(file=>path.join(src,file)),path.join(app,'tests/TownRuntimePolicyTest.java')],{stdio:'inherit',windowsHide:true});
  execFileSync(bin('java'),['-ea','-cp',tmp,'top.hxzmc.town.TownRuntimePolicyTest'],{stdio:'inherit',windowsHide:true});
}finally{rmSync(tmp,{recursive:true,force:true});}
