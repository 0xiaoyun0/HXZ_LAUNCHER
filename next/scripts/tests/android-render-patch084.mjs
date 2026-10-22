import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-render-patch-')),json=path.join(root,'.runtime/review084/lobby/json.jar');
const home=process.env.HXZ_TEST_JAVA_HOME||'C:/Program Files/Java/jdk-21';
const sources=['EngineHost.java','RuntimeFiles.java','ClientRenderPatch.java'].map(p=>path.join(root,'mobile/runtime/src/main/java/top/hxzmc/runtime',p));
execFileSync(path.join(home,'bin/javac.exe'),['-encoding','UTF-8','-cp',json,'-d',out,...sources,path.join(root,'mobile/runtime/test/ClientRenderPatchTest.java')],{windowsHide:true,stdio:'pipe'});
const artifact=process.env.HXZ_TEST_CORE_MOD||'D:/PCL/.minecraft/versions/HXZ-mod-1/mods/hello_new_generation_core-0.0.34.jar';
console.log(execFileSync(path.join(home,'bin/java.exe'),['-cp',out+path.delimiter+json,'top.hxzmc.runtime.ClientRenderPatchTest',artifact,path.join(out,'fixtures')],{windowsHide:true,encoding:'utf8',stdio:'pipe'}).trim());
