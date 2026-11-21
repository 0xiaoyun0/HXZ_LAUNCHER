package top.hxzmc.town

import android.content.Context
import com.tungsten.fclcore.util.StringUtils
import java.io.File

/** ModernFix supports this property on its own command line; the pack's config stays editable. */
internal class TownModelLoading(context: Context, directory: File, javaArgs: String) {
    private val prefs = context.getSharedPreferences("town-model-loading", Context.MODE_PRIVATE)
    private val key = directory.canonicalPath
    private val config = File(directory, "config/modernfix-mixins.properties")
    val enabled get() = prefs.getBoolean(key, false)
    val available: Boolean by lazy {
        !StringUtils.tokenize(javaArgs).any { it.startsWith("-Dmodernfix.config.mixin.perf.dynamic_resources=") } &&
            config.isFile && config.length() <= 262144 && config.useLines { lines ->
                lines.any { it.trimStart('#', ' ').startsWith("mixin.perf.dynamic_resources=") }
            }
    }
    fun save(value: Boolean) {
        check(!value || available) { "这个实例没有提供可切换的 ModernFix 模型加载选项。" }
        check(prefs.edit().putBoolean(key, value).commit()) { "无法保存模型加载方式，请重试。" }
    }
}
