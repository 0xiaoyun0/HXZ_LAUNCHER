package top.hxzmc.town

import android.content.Context
import com.mio.JavaManager
import com.mio.manager.RendererManager
import com.mio.util.getSystemDnsServerAddresses
import com.tungsten.fcl.setting.ConfigHolder
import com.tungsten.fcl.setting.Controllers
import com.tungsten.fcl.setting.Profile
import com.tungsten.fcl.setting.Profiles
import com.tungsten.fcl.util.RuntimeUtils
import com.tungsten.fclauncher.utils.FCLPath
import com.tungsten.fclcore.util.Logging
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.ensureActive
import java.io.File
import java.nio.file.Paths
import kotlin.coroutines.coroutineContext

internal object TownRuntime {
    private var logging = false
    @Synchronized fun profile(context: Context): Profile {
        TownSession.initialize(context)
        if (!logging) {
            Logging.start(Paths.get(FCLPath.LOG_DIR))
            logging = true
        }
        ConfigHolder.init()
        val selected = Profiles.getSelectedProfile()
        val dir = selected.gameDir.canonicalFile
        val appRoots = listOfNotNull(context.getExternalFilesDir(null), context.filesDir)
        val accessible = FCLPath.canUseSharedStorage(context) || appRoots.any { dir.toPath().startsWith(it.canonicalFile.toPath()) }
        if (accessible && dir.isDirectory && dir.canRead() && dir.canWrite()) return selected
        val own = Profiles.profiles.firstOrNull { it.gameDir.absolutePath == FCLPath.PRIVATE_COMMON_DIR }
        check(own != null && own.gameDir.canWrite()) { "游戏目录无法写入，请检查设备可用空间。" }
        Profiles.setSelectedProfile(own)
        return own
    }
    suspend fun prepare(context: Context, progress: (String,Int,Int)->Unit) = withContext(Dispatchers.IO) {
        val components = listOf(
            Triple("图形运行库", FCLPath.LWJGL_DIR, "lwjgl"), Triple("界面运行库", FCLPath.CACIOCAVALLO_8_DIR, "caciocavallo"),
            Triple("界面运行库 17", FCLPath.CACIOCAVALLO_17_DIR, "caciocavallo17"), Triple("系统接口", FCLPath.JNA_PATH, "jna"),
            Triple("Java 8", FCLPath.JAVA_8_PATH,"java/jre8"), Triple("Java 17", FCLPath.JAVA_17_PATH,"java/jre17"),
            Triple("Java 21", FCLPath.JAVA_21_PATH,"java/jre21"), Triple("Java 25", FCLPath.JAVA_25_PATH,"java/jre25")
        )
        for ((index, component) in components.withIndex()) {
            coroutineContext.ensureActive()
            val (label, path, key) = component
            val asset = "app_runtime/" + key
            val latest = if (key == "lwjgl") listOf("3.3.3","3.4.1").all {
                RuntimeUtils.isLatest(path + "/" + it, "/assets/" + asset + "/" + it)
            } else runCatching { RuntimeUtils.isLatest(path, "/assets/" + asset) }.getOrDefault(false)
            if (latest) continue
            progress(label, index, components.size)
            when {
                key.startsWith("java/") -> RuntimeUtils.installJava(context, path, asset)
                key == "jna" -> RuntimeUtils.installJna(context, path, asset)
                else -> RuntimeUtils.install(context, path, asset)
            }
        }
        val dns = getSystemDnsServerAddresses()?.filterNot { it.contains(':') }.orEmpty()
        if (dns.isNotEmpty()) File(FCLPath.JAVA_PATH, "resolv.conf").writeText(dns.joinToString("\n") { "nameserver " + it })
        RendererManager.init(context)
        JavaManager.init()
        Controllers.init()
    }
}
