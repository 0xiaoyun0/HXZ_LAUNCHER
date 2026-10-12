// Idempotent follow-up to prepare-source.mjs. Run against the maintained HXZ fork.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const fork=path.resolve(process.argv[2]||'.runtime/fcl-source/FoldCraftLauncher-efe4dcc5dbc78c55be177c330239e12845ae7ccf');
const java=path.join(fork,'FCL/src/main/java');
const gradleFile=path.join(fork,'FCL/build.gradle.kts');
await fs.writeFile(gradleFile,(await fs.readFile(gradleFile,'utf8')).replace(/versionCode = 7000[0-3]/,'versionCode = 70003'));
let build=await fs.readFile(gradleFile,'utf8');if(!build.includes('implementation("com.squareup.okhttp3:okhttp:4.12.0")')){build=build.replace('dependencies {','dependencies {\n    implementation("com.squareup.okhttp3:okhttp:4.12.0")');await fs.writeFile(gradleFile,build);}
build=build.replace('implementation("com.squareup.okhttp3:okhttp:4.12.0")\n','implementation("com.squareup.okhttp3:okhttp:4.12.0") { exclude(group = "org.jetbrains.kotlin") }\n');await fs.writeFile(gradleFile,build);
await fs.cp(path.join(here,'src'),java,{recursive:true});
await fs.cp(path.join(here,'assets'),path.join(fork,'FCL/src/main/assets'),{recursive:true});
const manifestFile=path.join(fork,'FCL/src/main/AndroidManifest.xml');let manifest=await fs.readFile(manifestFile,'utf8');if(!manifest.includes('com.tungsten.fcl.hxz.HxzInstallService')){manifest=manifest.replace('    <application','    <application').replace('        <activity','        <service android:name="com.tungsten.fcl.hxz.HxzInstallService" android:exported="false" android:foregroundServiceType="dataSync" />\n        <activity');await fs.writeFile(manifestFile,manifest);}
if(!manifest.includes('top.hxzmc.community.permission.GAME_ACCOUNT')){
 manifest=manifest.replace('    <application','    <uses-permission android:name="top.hxzmc.community.permission.GAME_ACCOUNT" />\n    <queries><package android:name="top.hxzmc.community" /></queries>\n    <application');
 await fs.writeFile(manifestFile,manifest);
}
if(!manifest.includes('com.tungsten.fcl.hxz.HxzGraphicsProbeService')){
 manifest=manifest.replace('        <service','        <service android:name="com.tungsten.fcl.hxz.HxzGraphicsProbeService" android:exported="false" android:process=":hxz_graphics" />\n        <service');
 await fs.writeFile(manifestFile,manifest);
}
async function patch(relative,changes){const file=path.join(java,relative);let s=await fs.readFile(file,'utf8');for(const [before,after] of changes){if(after&&s.includes(after))continue;if(!s.includes(before)){if(!after)continue;throw Error('Patch anchor absent: '+relative+' / '+before.slice(0,70));}s=s.replace(before,after);}await fs.writeFile(file,s);}
await patch('com/tungsten/fclcore/download/DownloadProvider.java',[
 ['return Collections.singletonList(NetworkUtils.toURL(injectURL(baseURL)));','return up.hxz.AndroidDownloadSources.candidates(injectURL(baseURL), baseURL);']
]);
await patch('com/tungsten/fclcore/auth/authlibinjector/AuthlibInjectorProvider.java',[
 ['this.apiRoot = apiRoot;', 'this.apiRoot = apiRoot.replaceAll("/+$", "") + "/";']
]);
await patch('com/tungsten/fclcore/auth/authlibinjector/AuthlibInjectorServer.java',[
 ['    public static AuthlibInjectorServer locateServer(String url) throws IOException {','    public static AuthlibInjectorServer locateServer(String url) throws IOException {\n        String normalized = com.tungsten.fcl.hxz.HxzSkinNetwork.canonicalServer(url);\n        if (com.tungsten.fcl.hxz.HxzSkinNetwork.supports(normalized)) {\n            AuthlibInjectorServer server = new AuthlibInjectorServer(normalized);\n            server.refreshMetadata();\n            return server;\n        }'],
 ['        this.url = url;\n        this.yggdrasilService = new YggdrasilService(new AuthlibInjectorProvider(url));','        this.url = com.tungsten.fcl.hxz.HxzSkinNetwork.canonicalServer(url);\n        this.yggdrasilService = new YggdrasilService(new AuthlibInjectorProvider(this.url));'],
 ['        refreshMetadata(HttpRequest.GET(url).getString());','        refreshMetadata(com.tungsten.fcl.hxz.HxzSkinNetwork.supports(url) ? com.tungsten.fcl.hxz.HxzSkinNetwork.request(url, null) : HttpRequest.GET(url).getString());']
]);
await patch('com/tungsten/fclcore/auth/yggdrasil/YggdrasilService.java',[
 ['    private static String request(URL url, Object payload) throws AuthenticationException {\n        try {','    private static String request(URL url, Object payload) throws AuthenticationException {\n        try {\n            if (com.tungsten.fcl.hxz.HxzSkinNetwork.supports(url.toString())) return com.tungsten.fcl.hxz.HxzSkinNetwork.request(url.toString(), payload == null ? null : payload instanceof String ? (String) payload : GSON.toJson(payload));']
]);
await patch('com/tungsten/fcl/FCLApp.java',[
 ['        super.onCreate();','        super.onCreate();\n        com.tungsten.fclauncher.utils.FCLPath.loadPaths(this);']
]);
await patch('com/tungsten/fcl/activity/MainActivity.kt',[
 ['        _uiManager?.onResume()', '        _uiManager?.onResume()\n        if (_uiManager != null) com.tungsten.fcl.hxz.HxzCommunityAccounts.sync(this)']
]);
await patch('com/tungsten/fcl/game/LauncherHelper.java',[
 ['    public void launch() {\n        LOG.info', `    public void launch() {
        if (com.tungsten.fcl.hxz.HxzLaunch.intercept(context, profile, account, selectedVersion)) return;
        launchPrepared();
    }

    public void launchPrepared() {
        LOG.info`]
]);
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
