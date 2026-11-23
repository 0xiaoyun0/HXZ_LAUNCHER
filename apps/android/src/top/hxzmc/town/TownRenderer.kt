package top.hxzmc.town

import android.os.Build
import android.content.Context
import android.content.pm.PackageManager
import com.mio.data.Renderer
import java.io.File

object TownRenderer {
    fun initial(): String {
        val emulator = Build.HARDWARE == "ranchu" || Build.HARDWARE == "goldfish"
        return if (emulator && Build.SUPPORTED_ABIS.firstOrNull() == "x86_64") Renderer.ID_GL4ES else Renderer.ID_NGGL4ES
    }
    fun supportsZink(context: Context) = context.packageManager.hasSystemFeature(PackageManager.FEATURE_VULKAN_HARDWARE_LEVEL)
    private fun prefs(context: Context) = context.getSharedPreferences("town-instance-renderer", Context.MODE_PRIVATE)
    fun selection(context: Context, instance: File): String = prefs(context).getString(instance.canonicalPath, "default") ?: "default"
    fun save(context: Context, instance: File, name: String) {
        check(name in setOf("default","mobileglues") || name == "zink" && supportsZink(context)) { "当前设备未提供这个渲染器。" }
        check(prefs(context).edit().putString(instance.canonicalPath, name).commit()) { "无法保存实例渲染器，请重试。" }
    }
    fun selectedId(context: Context, instance: File): String? = when(selection(context, instance)) {
        "zink" -> Renderer.ID_ZINK.takeIf { supportsZink(context) }
        "mobileglues" -> Renderer.ID_MOBILEGLUES
        else -> null
    }
}
