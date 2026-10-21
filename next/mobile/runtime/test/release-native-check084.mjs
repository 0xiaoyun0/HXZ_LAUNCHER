import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';

const root=path.resolve('mobile/runtime/test');
const source=path.resolve('mobile/android/app/src/main/java/top/hxzmc/community/game');
const javac=process.env.HXZ_JAVAC||'C:/Program Files/Java/jdk-22/bin/javac.exe';
const sdk=process.env.ANDROID_SDK_ROOT||process.env.ANDROID_HOME||'C:/Users/admin/AppData/Local/Android/Sdk';
const androidJar=path.join(sdk,'platforms/android-35/android.jar');
const output=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-java-host-'));
for(const test of ['hxz-glfw-abi084.mjs','hxz-native-ipc084.mjs'])execFileSync(process.execPath,[path.join(root,test)],{stdio:'inherit'});
execFileSync(javac,['--release','17','-cp',androidJar,'-sourcepath','mobile/runtime/src/main/java;mobile/android/app/src/main/java','-d',output,
  ...['AndroidEngineHost.java','GameControlsView.java','GameRuntimeActivity.java','NativeRuntime.java'].map(name=>path.join(source,name))],{stdio:'inherit'});
const apk=process.argv[2];
if(apk)execFileSync(process.env.HXZ_PYTHON||'python',[path.join(root,'apk-native-check084.py'),apk],{stdio:'inherit'});
else console.log('Source/ABI/Java host checks passed; pass a built APK path to check packaged executable and ELF dependencies.');
