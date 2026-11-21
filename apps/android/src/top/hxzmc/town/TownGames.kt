package top.hxzmc.town

import android.content.Context
import android.net.Uri
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.withResumed
import com.mio.plugin.DriverPlugin
import com.mio.device.VulkanCheckManager
import com.mio.device.VulkanEnsureResult
import com.mio.device.normalizeMcVersion
import com.mio.device.supportFor
import com.mio.util.DisplayUtil
import com.tungsten.fcl.game.LauncherHelper
import com.tungsten.fcl.game.ModpackHelper
import com.tungsten.fcl.setting.Profile
import com.tungsten.fcl.setting.DownloadProviders
import com.tungsten.fclcore.download.LibraryAnalyzer
import com.tungsten.fclcore.game.GameComponentType
import com.tungsten.fclcore.mod.LocalModFile
import com.tungsten.fclcore.mod.modrinth.ModrinthCompletionTask
import com.tungsten.fclcore.mod.modrinth.ModrinthManifest
import com.tungsten.fclcore.util.gson.JsonUtils
import com.tungsten.fclcore.task.Task
import com.tungsten.fclcore.task.TaskExecutor
import com.tungsten.fclcore.task.TaskListener
import com.tungsten.fcllibrary.component.theme.ThemeEngine
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** A player request owns the instance choice, install task and authenticated game launch. */
class TownGames(private val activity: TownCommunityActivity, private val directory: TownDirectory,
                private val changed: () -> Unit) : TownLaunchUi {
    private val prefs = activity.getSharedPreferences("town-world-choices", Context.MODE_PRIVATE)
    private var job: Job? = null
    private var answer: CompletableDeferred<String>? = null
    private var values = emptyList<String>()
    private var ticket = ""
    private var turn = 0
    private var serverId = ""
    private var player = ""
    private val lastGame = TownGameExit(activity)
    private val optionLock = Mutex()
    @Volatile private var current = lastGame.previous() ?: JSONObject().put("phase","idle")
    private val io = Dispatchers.IO
    fun status(): JSONObject = current
    private fun publish(phase: String, title: String, detail: String = "", options: List<Pair<String,String>> = emptyList(), done: Int = 0, total: Int = 0) {
        current = JSONObject().put("phase",phase).put("title",title).put("detail",detail).put("ticket",ticket)
            .put("step",turn).put("server",serverId).put("done",done).put("total",total)
            .put("options", JSONArray(options.map { JSONObject().put("value",it.first).put("label",it.second) }))
        changed()
    }
    private suspend fun choose(title: String, detail: String, opts: List<Pair<String,String>>): String = withContext(Dispatchers.Main.immediate) {
        val wait = CompletableDeferred<String>()
        turn++
        answer = wait
        values = opts.map { it.first }
        publish("choice",title,detail,opts)
        try { wait.await() } finally { if (answer === wait) { answer = null; values = emptyList() } }
    }
    override suspend fun confirm(message: String, labels: List<String>): Int =
        choose("启动前检查",message,labels.mapIndexed { i,s -> i.toString() to s }).toInt()
    override suspend fun prepareClientMods(mods: List<LocalModFile>) {
        val inputMods=mods.filter { it.isActive && !it.isOld && it.id in setOf("imblocker","ingameime","inputmethodblocker") }
            .distinctBy { it.file }
        if(inputMods.isEmpty()) return
        choose("这个实例使用了桌面输入法模组",
            inputMods.joinToString("、") { it.name }+" 会与安卓输入法冲突。停用后仍保留原始模组文件，其他实例继续使用自己的配置。",
            listOf("disable" to "在此实例停用并继续"))
        verifyPlayer()
        withContext(io) {
            for(mod in inputMods) {
                val path=mod.file
                val disabled=path.resolveSibling(path.fileName.toString()+".disabled")
                check(!java.nio.file.Files.exists(disabled)) { "实例中已经有同名的停用副本，请先在游戏目录核对这两个模组文件。" }
                mod.isActive=false
                check(!java.nio.file.Files.exists(path) && java.nio.file.Files.isRegularFile(disabled)) { "无法停用桌面输入法模组，请检查实例目录的写入权限。" }
            }
        }
    }
    override fun stage(id: String) {
        val label = when (id.substringAfterLast('.')) {
            "version" -> "正在读取实例"; "mods" -> "正在检查模组"; "java" -> "正在匹配 Java"
            "dependencies" -> "正在校验和补全游戏文件"; "logging_in" -> "正在验证皮肤站角色"; else -> "正在启动 Minecraft"
        }
        publish("working",label)
    }
    override suspend fun beforeGame(target: TownJoin.Target, runDirectory: File) {
        activity.lifecycle.withResumed {
            verifyPlayer()
            lastGame.started(target, serverId, runDirectory)
            TownMemory.started(activity, target)
        }
    }
    fun returned() = lastGame.returned()
    private fun verifyPlayer() {
        check(player.isNotEmpty() && TownSession.identity().optString("uid") == player) { "角色已经切换，请回到社区重新进入。" }
    }
    fun respond(input: JSONObject) {
        check(input.optString("ticket")==ticket && input.optInt("step")==turn && input.optString("value") in values && answer?.complete(input.getString("value"))==true) { "这一步已经结束，请查看当前进度。" }
    }
    fun cancel(input: JSONObject) {
        if (input.optString("ticket")==ticket) job?.cancel()
    }

    suspend fun library(): JSONArray = withContext(io) {
        val p=TownRuntime.profile(activity)
        p.repository.refreshVersions()
        JSONArray(p.repository.versions.map { it.id }.distinct().sorted())
    }
    suspend fun options(input: JSONObject, save: Boolean): JSONObject = optionLock.withLock {
        if (save) check(job?.isActive != true) { "请先完成或取消正在进行的游戏任务。" }
        withContext(io) {
            val p = TownRuntime.profile(activity)
            val name = input.getString("instance")
            check(p.repository.hasVersion(name)) { "这个实例已移除，请刷新游戏库。" }
            val root = p.repository.getVersionRoot(name)
            val dir = p.repository.getRunDirectory(name)
            val isolated = dir.canonicalFile == root.canonicalFile
            val args = p.getVersionSetting(name).javaArgs.orEmpty()
            val graphics = TownMobileGraphics(activity, dir)
            val models = TownModelLoading(activity, root, args)
            if (save) when (input.optString("option")) {
                "swap" -> {
                    val enabled = input.opt("enabled") as? Boolean ?: error("内存选项无效。")
                    TownMemory.save(activity, root, args, enabled)
                }
                "graphics" -> {
                    check(isolated) { "这个实例与其他实例共用画质文件。请在游戏设置中调整画质。" }
                    val enabled = input.opt("enabled") as? Boolean ?: error("画质选项无效。")
                    graphics.select(enabled)
                }
                "models" -> {
                    val enabled = input.opt("enabled") as? Boolean ?: error("模型选项无效。")
                    check(!enabled || isolated) { "请在独立实例中启用按需模型加载。" }
                    models.save(enabled)
                }
                "renderer" -> TownRenderer.save(activity, root, input.optString("renderer"))
                "tier" -> TownMemory.saveTier(activity, root, input.optString("tier"))
                else -> error("请选择一个有效的实例选项。")
            }
            TownMemory.status(activity, root, args).put("isolated", isolated)
                .put("mobileGraphics", isolated && graphics.mode == "mobile")
                .put("modelsEnabled", models.enabled).put("modelsAvailable", isolated && models.available)
                .put("renderer", TownRenderer.selection(activity,root)).put("supportsZink", TownRenderer.supportsZink(activity))
        }
    }
    suspend fun versions(): JSONArray = withContext(io) {
        val rows = readJson("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",limit=2*1024*1024).getJSONArray("versions")
        val ids=(0 until rows.length()).map { rows.getJSONObject(it) }.filter { it.optString("type")=="release" }.map { it.getString("id") }
        availableVersions=ids.toSet()
        JSONArray(ids)
    }

    fun begin(action: String, input: JSONObject) {
        check(job?.isActive!=true) { "已有游戏任务进行中，请先查看当前进度。" }
        val uid=TownSession.identity().optString("uid")
        check(uid.isNotBlank() && uid==input.optString("uid")) { "请先在社区登录皮肤站角色。" }
        val server = if (action=="android.join") directory.server(input.getString("server")) else null
        check(server?.enabled!=false) { "这个服务器暂未开放。" }
        ticket = UUID.randomUUID().toString(); turn=0; serverId=server?.id.orEmpty(); player=uid
        publish("working",if (server==null) "正在读取游戏库" else "正在匹配" + server.name)
        job=activity.lifecycleScope.launch {
            try {
                val profile=withContext(io) { TownRuntime.profile(activity).also { it.repository.refreshVersions() } }
                when(action) {
                    "android.join" -> join(profile, requireNotNull(server))
                    "android.game.play" -> {
                        val name=input.getString("instance")
                        check(profile.repository.hasVersion(name) && !unfinished(profile,name)) { "这个实例尚未安装完整。" }
                        launch(profile,name,null)
                    }
                    "android.game.download" -> {
                        val version=input.getString("version")
                        if (availableVersions.isEmpty()) versions()
                        check(version in availableVersions && version.matches(Regex("[a-zA-Z0-9._-]{1,40}"))) { "请选择版本列表中的游戏版本。" }
                        val name=install(profile,null,JSONObject().put("version",version),"download")
                        publish("done","游戏已安装",name)
                    }
                    "android.game.import" -> {
                        val name=install(profile,null,JSONObject(),"import")
                        publish("done","整合包已导入",name)
                    }
                }
            } catch (e: CancellationException) { publish("idle","") }
            catch (e: Exception) {
                val issue = TownGameIssue.from(e, current.optString("title"), server?.source=="hxzup")
                publish("error", issue.title, issue.detail)
            }
        }
    }
    @Volatile private var availableVersions: Set<String> = emptySet()
    private fun mark(p: Profile, name: String) = "pack:" + p.gameDir.canonicalPath + ":" + name
    private fun unfinished(p: Profile, name: String) = prefs.getString(mark(p,name), null)=="installing"
    private fun resumable(p: Profile, base:String, index:JSONObject): String? {
        return p.repository.versions.map {it.id}.firstOrNull { name ->
            (name==base || name.startsWith(base+"-")) && unfinished(p,name) && runCatching {
                val file=File(p.repository.getVersionRoot(name),"modrinth.index.json")
                file.isFile && file.length()<=12*1024*1024 &&
                    JSONObject(file.readText()).getString("versionId")==index.getString("versionId")
            }.getOrDefault(false)
        }
    }
    private suspend fun matches(p: Profile,s: TownDirectory.Server,spec: JSONObject): List<String> = withContext(io) {
        val version=spec.optString("version");val loader=spec.optString("loader");val build=spec.optString("loaderVersion")
        val expected=s.id+":"+spec.optString("revision",s.packageHash)
        p.repository.versions.map {it.id}.distinct().filter { name ->
            val owner=prefs.getString(mark(p,name),null)
            when {
                s.source=="hxzup" && owner!=expected -> false
                owner!=null && owner!=expected -> false
                version.isEmpty() -> owner==expected
                else -> runCatching {
                    val resolved=p.repository.getResolvedPreservingPatchesVersion(name)
                    val mc=p.repository.getGameVersion(resolved).orElse("")
                    mc==version && LibraryAnalyzer.analyze(resolved,mc).let { a ->
                        if (loader.isBlank() || loader=="vanilla") a.modLoaders.isEmpty()
                        else a.getVersion(loader).map { build.isEmpty() || build==it }.orElse(false)
                    }
                }.getOrDefault(false)
            }
        }.sorted()
    }
    private suspend fun join(p: Profile,s: TownDirectory.Server) {
        val spec=withContext(io){directory.requirement(s)}
        val key=s.id+":"+p.gameDir.canonicalPath
        val options=matches(p,s,spec)
        val desc=listOf(spec.optString("version"),spec.optString("loader"),spec.optString("loaderVersion")).filter(String::isNotBlank).joinToString(" · ")
        val name = when {
            options.isEmpty() -> {
                val method=choose(s.name+"需要安装游戏",desc,listOf("download" to "安装并进入","import" to "导入本地整合包"))
                val installed=install(p,s,spec,method)
                withContext(io){p.repository.refreshVersions()}
                check(installed in matches(p,s,spec)) { "这个整合包与服务器要求的游戏或加载器版本不匹配。请核对后重试。" }
                if(s.source=="hxzup") {
                    val latest=withContext(io){directory.requirement(s)}
                    check(latest.optString("revision")==spec.optString("revision")) { "安装期间服主发布了新整合包。请重新进入服务器，获取新的 HXZUP 版本。" }
                }
                installed
            }
            options.size==1 -> options.first()
            else -> {
                val last=prefs.getString(key,null)
                choose("选择进入"+s.name+"的实例",desc,options.sortedBy { if(it==last) 0 else 1 }.map { it to (if(it==last) it+" · 上次使用" else it) })
            }
        }
        prefs.edit().putString(key,name).apply()
        launch(p,name,s)
    }
    private suspend fun install(p:Profile, s:TownDirectory.Server?, spec:JSONObject, method:String):String {
        verifyPlayer()
        var file:File?=null
        var name=""
        try{
            publish("working",if(method=="import") "选择本地整合包" else "正在读取安装清单")
            val index=if(s?.source=="hxzup") runInterruptible(io){TownPack.index(s,spec)} else null
            if(method=="import"){
                val uri=activity.takePack() ?: throw CancellationException()
                file=runInterruptible(io){ activity.cacheDir.resolve("town-install").mkdirs(); val f=File.createTempFile("import-",".zip",activity.cacheDir.resolve("town-install"))
                    try{activity.contentResolver.openInputStream(uri)!!.use { input -> f.outputStream().use { out -> input.copyTo(out) } }; f}catch(e:Exception){ f.delete();throw e }
                }
            }else if(s!=null && s.source in setOf("hxzup","package"))file=runInterruptible(io){TownPack.prepare(activity,s,index)}
            val archive=file
            val mod=if(archive==null)null else withContext(io){ModpackHelper.readModpackManifest(archive.toPath(), Charsets.UTF_8)}
            val base=s?.id ?: mod?.name?.replace(Regex("[^\\p{L}\\p{N}._-]+"),"-")?.trim('-','.')?.take(60)?.ifBlank { "整合包" } ?: spec.getString("version")
            val resume=if(method=="download" && index!=null)withContext(io){resumable(p,base,index)} else null
            name=resume ?: generateSequence(1){it+1}.map{if(it==1)base else base+"-"+it}.first{!p.repository.getVersionRoot(it).exists()&&!p.repository.versionIdConflicts(it)}
            prefs.edit().putString(mark(p,name),"installing").apply()
            prepareRuntime()
            publish("working",if(resume!=null)"正在继续安装 "+name else "正在安装 "+name)
            val task=if(resume!=null) withContext(io){
                val manifest=JsonUtils.GSON.fromJson(requireNotNull(index).toString(),ModrinthManifest::class.java)
                ModrinthCompletionTask(p.getDependency(),name,manifest)
            }
            else if(archive!=null && mod!=null) withContext(io){ModpackHelper.getInstallTask(p,archive,name,mod)} else {
                val version=spec.getString("version")
                val builder=p.getDependency().gameBuilder().name(name).gameVersion(version)
                val loader=spec.optString("loader")
                if(loader.isNotEmpty() && loader!="vanilla"){
                    val build=spec.optString("loaderVersion").ifBlank {
                        val list=DownloadProviders.getDownloadProvider().getVersionList(GameComponentType.fromPatchId(loader))
                        runTask(list.refreshAsync(version))
                        list.getVersions(version).firstOrNull()?.selfVersion ?: error("暂时读不到匹配的加载器版本。")
                    }
                    builder.version(loader,build)
                }
                builder.buildAsync()
            }
            runTask(task)
            withContext(io){p.repository.refreshVersions()}
            check(p.repository.hasVersion(name)) { "安装没有完成，请重试。" }
            if(index!=null){
                val title="正在核对 HXZUP 整合包"
                publish("working",title)
                runInterruptible(io){TownPack.verifyInstall(p.repository.getRunDirectory(name),index){done,total->
                    publish("working",title,"已核对 "+done+" / "+total+" 个游戏文件",done=done,total=total)
                }}
            }
            prefs.edit().apply { if(s==null)remove(mark(p,name)) else putString(mark(p,name),s.id+":"+spec.optString("revision",s.packageHash)) }.apply()
            return name
        }finally{file?.delete()}
    }
    override fun observe(executor: TaskExecutor) {
        val owner=ticket
        val stage=current.optString("title")
        val files=java.util.concurrent.ConcurrentHashMap.newKeySet<Task<*>>()
        val done=java.util.concurrent.atomic.AtomicInteger()
        val last=java.util.concurrent.atomic.AtomicLong()
        executor.addTaskListener(object:TaskListener(){
            private fun render() {
                val now=android.os.SystemClock.elapsedRealtime()
                val previous=last.get()
                if (owner!=ticket || current.optString("phase")!="working" || current.optString("title")!=stage ||
                    now-previous<400 || !last.compareAndSet(previous,now)) return
                publish("working",stage,"已完成 " + done.get() + " 个文件，已发现 " + files.size + " 个文件。",done=done.get(),total=files.size)
            }
            override fun onReady(task:Task<*>) { if(task is com.tungsten.fclcore.task.FileDownloadTask && files.add(task))render() }
            override fun onFinished(task:Task<*>) { if(task in files){done.incrementAndGet();render()} }
            override fun onFailed(task:Task<*>, failure:Throwable) {}
        })
    }
    private suspend fun runTask(task: Task<*>) = suspendCancellableCoroutine<Unit> { continuation ->
        val executor=task.executor(object:TaskListener(){
            override fun onStop(success:Boolean, executor:TaskExecutor){
                if(!continuation.isActive)return
                if(success)continuation.resume(Unit) else if(executor.exception!=null)continuation.resumeWithException(executor.exception!!) else continuation.cancel()
            }
        })
        observe(executor)
        executor.start()
        continuation.invokeOnCancellation {runCatching { executor.cancel() }}
    }
    private suspend fun graphicsOverride(profile: Profile, instance: String): String? {
        val version = withContext(io) { profile.repository.getGameVersion(instance).orElse(null) } ?: return null
        val setting = profile.getVersionSetting(instance)
        if (!VulkanCheckManager.hasVulkanBackend(version) || setting.isNotCheckVulkan || setting.graphicsBackend == "opengl") return null
        publish("working", "正在检查图形驱动")
        val driver = if (setting.isVKDriverSystem) null else DriverPlugin.selected
        val supported = when (VulkanCheckManager.ensureSupported(version, driver != null, driver)) {
            VulkanEnsureResult.SUPPORTED -> true
            VulkanEnsureResult.UNSUPPORTED -> false
            VulkanEnsureResult.NEED_CHECK -> VulkanCheckManager.check(driver != null, driver)?.supportFor(normalizeMcVersion(version))?.isSupported == true
        }
        if (supported) return null
        val choice = choose("选择图形后端", "当前驱动未通过 Minecraft " + version + " 的 Vulkan 检查。",
            listOf("opengl" to "本次使用 OpenGL", "continue" to "继续使用当前驱动"))
        return if (choice == "opengl") choice else null
    }
    private suspend fun launch(p: Profile, name: String, s: TownDirectory.Server?) {
        verifyPlayer()
        val account=TownSession.selected() ?: error("请重新登录皮肤站。")
        prepareRuntime()
        withContext(io) { TownServers.prepare(activity,p.repository.getRunDirectory(name)) }
        val drivers=DriverPlugin.driverList
        if(drivers.isNotEmpty())DriverPlugin.selected=drivers.firstOrNull { it.driver==p.getVersionSetting(name).driver } ?: drivers.first()
        publish("working", "正在准备游戏画面")
        // The community host does not inherit FCLActivity, which normally initializes this before reading window metrics.
        ThemeEngine.setupThemeEngine(activity)
        DisplayUtil.updateWindowSize(activity)
        val metrics = DisplayUtil.currentDisplayMetrics
        DisplayUtil.screenWidth = maxOf(metrics.widthPixels, metrics.heightPixels)
        DisplayUtil.screenHeight = minOf(metrics.widthPixels, metrics.heightPixels)
        val graphics = graphicsOverride(p, name)
        val dir = p.repository.getRunDirectory(name)
        val preset = TownMobileGraphics(activity, dir)
        val isolated = withContext(io) { dir.canonicalFile == p.repository.getVersionRoot(name).canonicalFile }
        if (isolated && preset.mode in setOf("applying","restoring")) withContext(io) { preset.select(preset.mode == "applying") }
        if (isolated && preset.mode.isEmpty() && s?.source == "hxzup" && withContext(io) { TownMemory.physicalMiB(activity) in 1..8192L }) {
            val mode = choose("选择这个实例的画质","手机画质会降低渲染分辨率和视距，并关闭光影。可在游戏库的实例设置中恢复。",
                listOf("mobile" to "使用手机画质", "original" to "使用整合包原画质"))
            withContext(io) { preset.select(mode == "mobile") }
        }
        val address = s?.let { publish("working","正在读取服务器连接地址"); TownServerAddress.resolve(it.address) }
        val dynamicModels = isolated && withContext(io) {
            val models = TownModelLoading(activity, p.repository.getVersionRoot(name), p.getVersionSetting(name).javaArgs.orEmpty())
            models.enabled && models.available
        }
        val renderer = withContext(io) { TownRenderer.selectedId(activity, p.repository.getVersionRoot(name)) }
        LauncherHelper(activity,p,account,name).launchFromCommunity(TownJoin.Target(name,address,player,graphics,isolated && preset.mode == "mobile",dynamicModels,renderer),this)
        publish("done","已启动 Minecraft",name)
    }
    private suspend fun prepareRuntime() {
        TownRuntime.prepare(activity){ label,done,total -> publish("working","正在准备游戏运行环境",label,done=done,total=total) }
    }
}
