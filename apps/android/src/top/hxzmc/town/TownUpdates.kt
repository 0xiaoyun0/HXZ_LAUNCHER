package top.hxzmc.town

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import com.tungsten.fcl.BuildConfig
import com.tungsten.fclcore.task.Task
import java.util.concurrent.atomic.AtomicBoolean

object TownUpdates {
    private const val PROJECT = "https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases"
    private val checking = AtomicBoolean(false)

    @JvmStatic fun check(context: Context, manual: Boolean): Task<*> = Task.runAsync {
        if (checking.compareAndSet(false, true)) {
            try {
                val json = readJson("https://api.github.com/repos/0xiaoyun0/HXZ_LAUNCHER/releases/latest")
                val tag = json.getString("tag_name")
                val version = tag.removePrefix("v")
                require(Regex("(0|[1-9][0-9]{0,2})\\.(0|[1-9][0-9]{0,2})\\.(0|[1-9][0-9]{0,2})").matches(version))
                val assets = json.getJSONArray("assets")
                val abi = android.os.Build.SUPPORTED_ABIS.firstOrNull { it == "arm64-v8a" || it == "x86_64" }
                val ready = (0 until assets.length()).any { assets.getJSONObject(it).optString("name") == "HXZ-FCL-" + version + "-" + abi + "-release.apk" }
                val current = BuildConfig.VERSION_NAME.split(".").map(String::toInt)
                val remote = version.split(".").map(String::toInt)
                val difference = remote.indices.firstOrNull { remote[it] != current[it] }
                val newer = ready && difference != null && remote[difference] > current[difference]
                Handler(Looper.getMainLooper()).post {
                    if (context is android.app.Activity && (context.isFinishing || context.isDestroyed)) return@post
                    if (newer) AlertDialog.Builder(context).setTitle("幻想镇 " + version)
                        .setMessage("可在官方发布页获取新版安卓安装包。")
                        .setNegativeButton("稍后", null)
                        .setPositiveButton("打开发布页") { _, _ -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(PROJECT + "/tag/" + tag))) }.show()
                    else if (manual) Toast.makeText(context, "当前 " + BuildConfig.VERSION_NAME + "，官方暂无更新的幻想镇安卓包。", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                if (manual) Handler(Looper.getMainLooper()).post { Toast.makeText(context, "无法检查官方发布，请稍后重试。", Toast.LENGTH_LONG).show() }
            } finally {
                checking.set(false)
            }
        }
    }
}
