import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [installer,host,activity]=await Promise.all([
  'mobile/runtime/src/main/java/top/hxzmc/runtime/InstallerPlan.java',
  'mobile/android/app/src/main/java/top/hxzmc/community/game/AndroidEngineHost.java',
  'mobile/android/app/src/main/java/top/hxzmc/community/game/GameRuntimeActivity.java',
].map(file=>fs.readFile(path.join(root,file),'utf8')));
const job=installer.slice(installer.indexOf('new EngineHost.JavaJob('),installer.indexOf('host.runJava(job,'));
assert.ok(job.includes('"-Dnet.neoforged.progressmanager.enabled=true"'),'Installer JVM arguments must enable NeoForge progress reporting');
const report=host.slice(host.indexOf('private void reportProcessor('),host.indexOf('String processorDiagnostic('));
const reader=host.slice(host.indexOf('class ProcessorLogReader'),host.indexOf('private static String tail('));
const liveUi=activity.slice(activity.indexOf('private void update('),activity.indexOf('private void recordDiagnosticPhase('));
assert.ok(host.includes('new ProcessorProgress(job.mainClass,')&&reader.includes('status.accept(')
  &&report.includes('reader.read(status,now)')&&report.includes('status.snapshot(now)')
  &&/progress\.update\("processor-progress",\s*message,\s*snapshot\.completed,\s*snapshot\.total\)/.test(report)
  &&liveUi.includes('phase.equals("processor-progress")')&&liveUi.includes('diagnosticButton.setVisibility(View.VISIBLE)'),
  'Live processor logs must feed parsed counts to the progress UI with diagnostics visible before failure');
const javaHome=process.env.HXZ_TEST_JAVA_HOME||process.env.JAVA_HOME||(process.platform==='win32'?'C:/Program Files/Java/jdk-21':null);
const executable=name=>javaHome?path.join(javaHome,'bin',name+(process.platform==='win32'?'.exe':'')):name;
const output=await fs.mkdtemp(path.join(os.tmpdir(),'hxz-processor-progress-'));
execFileSync(executable('javac'),['-encoding','UTF-8','--release','8','-d',output,
  path.join(root,'mobile/runtime/src/main/java/top/hxzmc/runtime/ProcessorProgress.java'),
  path.join(root,'mobile/runtime/test/ProcessorProgressTest.java')],{windowsHide:true,stdio:'pipe',timeout:30000});
const result=execFileSync(executable('java'),['-Dfile.encoding=UTF-8','-cp',output,'top.hxzmc.runtime.ProcessorProgressTest'],{windowsHide:true,encoding:'utf8',stdio:'pipe',timeout:10000}).trim();
assert.match(result,/^PASS ProcessorProgress \d+ checks$/);
console.log(JSON.stringify({result,integrationChecks:2,scope:'Actual processor protocol parser plus narrow installer/host/UI wiring assertions. No Android device or game execution.'}));
