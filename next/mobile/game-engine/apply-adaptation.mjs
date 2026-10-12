// Idempotent follow-up to prepare-source.mjs. Run against the maintained HXZ fork.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const fork=path.resolve(process.argv[2]||'.runtime/fcl-source/FoldCraftLauncher-efe4dcc5dbc78c55be177c330239e12845ae7ccf');
const java=path.join(fork,'FCL/src/main/java');
const gradleFile=path.join(fork,'FCL/build.gradle.kts');
await fs.writeFile(gradleFile,(await fs.readFile(gradleFile,'utf8')).replace('versionCode = 70000','versionCode = 70001'));
await fs.cp(path.join(here,'src'),java,{recursive:true});
await fs.cp(path.join(here,'assets'),path.join(fork,'FCL/src/main/assets'),{recursive:true});
const manifestFile=path.join(fork,'FCL/src/main/AndroidManifest.xml');let manifest=await fs.readFile(manifestFile,'utf8');if(!manifest.includes('com.tungsten.fcl.hxz.HxzInstallService')){manifest=manifest.replace('    <application','    <application').replace('        <activity','        <service android:name="com.tungsten.fcl.hxz.HxzInstallService" android:exported="false" android:foregroundServiceType="dataSync" />\n        <activity');await fs.writeFile(manifestFile,manifest);}
async function patch(relative,changes){const file=path.join(java,relative);let s=await fs.readFile(file,'utf8');for(const [before,after] of changes){if(after&&s.includes(after))continue;if(!s.includes(before)){if(!after)continue;throw Error('Patch anchor absent: '+relative+' / '+before.slice(0,70));}s=s.replace(before,after);}await fs.writeFile(file,s);}
for(const file of ['neoforge/NeoForgeOldInstallTask.java','forge/ForgeNewInstallTask.java']) {
 await patch('com/tungsten/fclcore/download/'+file,[
  ['runJVMProcess(processor, command, 8, step);','runJVMProcess(processor, command, up.hxz.InstallerRuntime.select(profile.getMinecraft(), jar), step);']
 ]);
 const f=path.join(java,'com/tungsten/fclcore/download',file);let s=await fs.readFile(f,'utf8');
 s=s.replace(/if \(exitCode != 0\) \{\s*if \(java == 8\) \{[\s\S]*?throw new IOException\("Game processor exited abnormally with code " \+ exitCode\);\s*\}\s*\}/,`if (exitCode != 0) {
            throw new IOException("安装处理器 " + processor.getJar().getFileName() + " 未完成（Java " + java + "，退出码 " + exitCode + "）。已下载的文件会保留，可重新安装继续。\\n" + buildInstallerMessage());
        }`);
 await fs.writeFile(f,s);
}
await patch('com/tungsten/fclcore/download/ProcessService.kt',[
 ['Environment.getExternalStorageDirectory().absolutePath + "/FCL/log"','FCLPath.LOG_DIR'],
 ['val jre = "jre$java"',`val jre = "jre$java"
        val memory = android.app.ActivityManager.MemoryInfo()
        (getSystemService(ACTIVITY_SERVICE) as android.app.ActivityManager).getMemoryInfo(memory)
        val boundedCommand = up.hxz.InstallerRuntime.arguments((command ?: emptyArray()).toList(), java, memory.availMem, Runtime.getRuntime().availableProcessors()).toTypedArray()`],
 ['            command ?: emptyArray()','            boundedCommand']
]);
await patch('com/tungsten/fclcore/download/InstallerProcessRunner.kt',[
 ['var consumedChars = 0','val incrementalLog = up.hxz.InstallerLogReader()'],
 ['val (lines, newConsumed) = readNewLogLines(logFile, consumedChars)','val lines = incrementalLog.read(logFile, false)'],
 ['                consumedChars = newConsumed\n',''],
 ['                    exitCodeFile.delete()\n                    Logging.LOG.info','                    incrementalLog.read(logFile, true).takeIf { it.isNotEmpty() }?.let { onLog.accept(it.joinToString("\\n")) }\n                    exitCodeFile.delete()\n                    Logging.LOG.info'],
 ['PROCESS_MAX_RETRIES = 1','PROCESS_MAX_RETRIES = 1'],
 ['info.processName == packageName || info.processName.startsWith("$packageName:")','info.processName == "$packageName:jvm"']
]);
// Resuming a cancelled coroutine must not leave a background JVM with a stale session.
const runner=path.join(java,'com/tungsten/fclcore/download/InstallerProcessRunner.kt');let code=await fs.readFile(runner,'utf8');
if(!code.includes('HXZ_CANCEL_CLEANUP'))code=code.replace('        } finally {\n            exitCodeFile.delete()',`        } catch (e: kotlinx.coroutines.CancellationException) {
            // HXZ_CANCEL_CLEANUP
            killRemainingProcesses(activityManager, context.packageName)
            throw e
        } catch (e: InterruptedException) {
            killRemainingProcesses(activityManager, context.packageName)
            Thread.currentThread().interrupt()
            throw e
        } finally {
            exitCodeFile.delete()`);
// Remove the old quadratic reader; all live reads now go through InstallerLogReader.
code=code.replace(/    private fun readNewLogLines\([\s\S]*?\n    \}\n\}/,'}');
await fs.writeFile(runner,code);
await patch('com/tungsten/fclcore/task/FetchTask.java',[
 ['private long downloadedBytes = 0;','protected volatile long downloadedBytes = 0;'],
 ['private long totalBytes = -1;','protected volatile long totalBytes = -1;'],
 ['private static void updateDownloadSpeed(int speed)','protected static void updateDownloadSpeed(int speed)']
]);
await patch('com/tungsten/fclcore/download/DefaultGameBuilder.java',[
 ['    private final DefaultDependencyManager dependencyManager;','    private final DefaultDependencyManager dependencyManager;\n    private boolean preserveFilesOnFailure;\n    public void setPreserveFilesOnFailure(boolean value) { preserveFilesOnFailure = value; }'],
 ['            if (exception != null)\n                dependencyManager','            if (exception != null && !preserveFilesOnFailure)\n                dependencyManager']
]);
await patch('com/tungsten/fclcore/task/FileDownloadTask.java',[
 ['this(urls, file, integrityCheck, 3);','this(urls, file, integrityCheck, 5);'],
 ['    @Override\n    protected EnumCheckETag shouldCheckETag()',`    @Override
    public void execute() throws Exception {
        if (integrityCheck == null || !"SHA-1".equalsIgnoreCase(integrityCheck.getAlgorithm())) { super.execute(); return; }
        if (shouldCheckETag() == EnumCheckETag.CACHED) return;
        java.util.List<String> sources = new java.util.ArrayList<>();
        for (URL url : urls) sources.add(url.toString());
        Path cache = java.nio.file.Paths.get(com.tungsten.fclauncher.utils.FCLPath.CACHE_DIR, "hxz-downloads", "staging");
        Path staged = null;
        try {
            staged = up.hxz.AndroidDownloads.download(sources, cache, integrityCheck.getChecksum(), (done, total, received) -> {
                downloadedBytes = done; totalBytes = total;
                if (total > 0) updateProgress(Math.min(done, total), total);
                if (received > 0) updateDownloadSpeed(received);
            });
            if (isCancelled()) throw new java.util.concurrent.CancellationException();
            for (IntegrityCheckHandler handler : integrityCheckHandlers) handler.checkIntegrity(staged, file.toPath());
            Files.createDirectories(file.toPath().toAbsolutePath().getParent());
            try { Files.move(staged, file.toPath(), java.nio.file.StandardCopyOption.ATOMIC_MOVE, java.nio.file.StandardCopyOption.REPLACE_EXISTING); }
            catch (java.nio.file.AtomicMoveNotSupportedException e) { Files.move(staged, file.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING); }
            if (caching) repository.cacheFile(file.toPath(), integrityCheck.getAlgorithm(), integrityCheck.getChecksum());
        } finally { if (staged != null) Files.deleteIfExists(staged); }
    }

    @Override
    protected EnumCheckETag shouldCheckETag()`],
 ['                Files.deleteIfExists(file.toPath());','                if (integrityCheck != null) integrityCheck.performCheck(digest);'],
 ['                // Integrity check\n                if (integrityCheck != null) {\n                    integrityCheck.performCheck(digest);\n                }','                // Integrity was verified before the destination was replaced.']
]);
// Keep the shared PC transport unchanged; this observer is only in the Android copy.
await patch('up/hxz/Network.java',[
 ['private static final ExecutorService SOURCES=Executors.newFixedThreadPool(128,r->{Thread t=new Thread(null,r,"hxz-download-source",256*1024);t.setDaemon(true);return t;});',`private static final ExecutorService SOURCES=downloadPool();
    private static ExecutorService downloadPool(){ThreadPoolExecutor pool=(ThreadPoolExecutor)Executors.newFixedThreadPool(64,r->{Thread t=new Thread(null,r,"hxz-download-source",256*1024);t.setDaemon(true);return t;});pool.setKeepAliveTime(30,TimeUnit.SECONDS);pool.allowCoreThreadTimeOut(true);return pool;}`],
 ['        final AtomicLong bytes=new AtomicLong();','        final AtomicLong bytes=new AtomicLong();\n        final AndroidDownloads.Observer observer=AndroidDownloads.currentObserver();\n        void report(int n){if(observer!=null)observer.update(bytes.get(),expected,n);}'],
 ['long advertised=c.getContentLengthLong();if(expected>=0','long advertised=c.getContentLengthLong();if(state.expected<0&&advertised>=0)state.expected=advertised+offset;state.bytes.set(offset);state.report(0);if(expected>=0'],
 ['received.addAndGet(n);state.bytes.set(count);','received.addAndGet(n);state.bytes.set(count);state.report(n);'],
 ['received.addAndGet(n);state.bytes.addAndGet(n);','received.addAndGet(n);state.bytes.addAndGet(n);state.report(n);'],
 ['pace.add(n,expected-count-n);','pace.add(n,state.expected-count-n);'],
 ['if(expected>=0&&count!=expected)throw new IOException("下载不完整");','if((expected>=0&&count!=expected)||(advertised>=0&&count!=advertised+offset))throw new IOException("下载不完整");']
]);
await patch('up/hxz/Updater.java',[
 ['entries=AndroidPaths.manifest(entries);','entries=AndroidCompatibility.filter(AndroidPaths.manifest(entries));'],
 ['||IO.bool(config,"repairGameFiles",false))manifest=', '||IO.bool(config,"repairGameFiles",false)||AndroidCompatibility.requiresRefresh(oldVersion))manifest='],
 ['            stageMetadata(changes,stage,"local-manifest.json",manifest);','            for(Change c:changes)if(c.file!=null&&c.staged!=null)AndroidCompatibility.checkStaged(c.staged,c.file);\n            AndroidCompatibility.stamp(version);\n            stageMetadata(changes,stage,"local-manifest.json",manifest);']
]);
console.log('Applied Android install/download adaptation');
await patch('com/tungsten/fcl/ui/TaskDialog.java',[
 ['    private TaskExecutor executor;','    private TaskExecutor executor;\n    private int bindingGeneration;'],
 ['        setOnDismissListener(dialog -> {','        setOnDismissListener(dialog -> {\n            bindingGeneration++;'],
 ['        this.executor = executor;',`        bindingGeneration++;
        final int generation = bindingGeneration;
        messageListeners.forEach((task, listener) -> task.messageProperty().removeListener(listener));
        messageListeners.clear();
        if (this.executor != null) {
            if (autoCloseListener != null) this.executor.removeTaskListener(autoCloseListener);
            if (messageUpdateListener != null) this.executor.removeTaskListener(messageUpdateListener);
        }
        if (taskListPane != null) taskListPane.release();
        autoCloseListener = null; messageUpdateListener = null; logTask = null;
        this.executor = executor;`],
 ['                        ChangeListener<String> listener = (observable, oldValue, newValue) -> {','                        if (generation != bindingGeneration || !isShowing()) return;\n                        ChangeListener<String> listener = (observable, oldValue, newValue) -> {'],
 ['                        removeMessageListener(task);','                        if (generation != bindingGeneration) return;\n                        removeMessageListener(task);'],
 ['Schedulers.androidUIThread().execute(() -> dismiss());','Schedulers.androidUIThread().execute(() -> { if (generation == bindingGeneration) dismiss(); });']
]);
