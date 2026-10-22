import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../..'),output=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-playtime-java-'));
const home=process.env.HXZ_TEST_JAVA_HOME||'C:/Program Files/Java/jdk-21',json=path.join(root,'.runtime/review084/lobby/json.jar');
const exe=name=>path.join(home,'bin',name+(process.platform==='win32'?'.exe':''));
try{
 execFileSync(exe('javac'),['--release','8','-encoding','UTF-8','-cp',json,'-d',output,...['mobile/runtime/src/main/java/top/hxzmc/runtime/RuntimeFiles.java','mobile/runtime/src/main/java/top/hxzmc/runtime/GamePlaytime.java','mobile/runtime/test/GamePlaytimeTest.java'].map(v=>path.join(root,v))],{windowsHide:true,stdio:'pipe'});
 console.log(execFileSync(exe('java'),['-cp',output+path.delimiter+json,'GamePlaytimeTest',output],{windowsHide:true,encoding:'utf8',stdio:'pipe'}).trim());
}finally{await fs.rm(output,{recursive:true,force:true});}
