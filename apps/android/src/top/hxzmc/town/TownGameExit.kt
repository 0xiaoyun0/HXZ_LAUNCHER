package top.hxzmc.town

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Build
import android.os.Process
import org.json.JSONObject
import java.io.File

internal class TownGameExit(private val context: Context) {
    private val prefs = context.getSharedPreferences("town-active-game", Context.MODE_PRIVATE)

    fun started(target: TownJoin.Target, server: String, directory: File) {
        prefs.edit().putString("instance", target.instance).putString("server", server)
            .putString("directory", directory.absolutePath)
            .putBoolean("mobile",target.mobileGraphics).putBoolean("dynamicModels",target.dynamicModels)
            .putInt("pid", Process.myPid()).putLong("since", System.currentTimeMillis()).commit()
    }

    fun returned() {
        if (prefs.getInt("pid", 0) == Process.myPid()) prefs.edit().clear().apply()
    }

    fun previous(): JSONObject? {
        val pid = prefs.getInt("pid", 0)
        if (pid == 0 || pid == Process.myPid()) return null
        val since = prefs.getLong("since", 0)
        val instance = prefs.getString("instance", "").orEmpty()
        val server = prefs.getString("server", "").orEmpty()
        val mobile = prefs.getBoolean("mobile", false)
        val models = prefs.getBoolean("dynamicModels", false)
        val directory = prefs.getString("directory", null)
        prefs.edit().clear().apply()
        val graphics = directory != null && runCatching {
            val report = File(directory, "hs_err_pid${pid}.log")
            report.isFile && report.lastModified() >= since && report.bufferedReader().use { reader ->
                val header = CharArray(4096)
                val n = reader.read(header)
                n > 0 && TownGameError.graphicsCrash(String(header,0,n))
            }
        }.getOrDefault(false)
        if (graphics) return JSONObject().put("phase","error").put("server",server).put("instance",instance)
            .put("title","上次游戏的图形渲染器崩溃")
            .put("detail","「$instance」在绘制画面时退出。请从实例设置切换图形渲染器，再进入服务器。")
        if (Build.VERSION.SDK_INT < 30) return null
        val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val exit = runCatching { manager.getHistoricalProcessExitReasons(context.packageName, pid, 6)
            .firstOrNull { it.processName == context.packageName && it.timestamp >= since } }.getOrNull()
        if (exit?.reason != ApplicationExitInfo.REASON_LOW_MEMORY) return null
        val action = when {
            !mobile -> "可以打开实例设置，改用手机画质后重试。"
            !models -> "已经使用手机画质。若整合包支持，可在实例设置中试用按需加载模型。"
            else -> "已经使用手机画质和按需加载模型。请先关闭其他占用运存的应用；若仍然退出，可请服主提供适合手机的整合包。"
        }
        return JSONObject().put("phase","error").put("server",server).put("instance",instance).put("title","上次游戏因手机内存不足退出")
            .put("detail","安卓在运行「$instance」时回收了游戏。"+action)
    }
}
