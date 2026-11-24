package top.hxzmc.town

import android.app.AlertDialog
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Uri
import android.os.Environment
import android.provider.Settings
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import com.tungsten.fcl.BuildConfig
import com.tungsten.fcl.util.LegalAgreement
import com.tungsten.fclcore.task.Task
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File

/** The community activity owns update prompts. Downloads belong to Android and survive process death. */
internal class TownAppUpdates(private val host: TownCommunityActivity) {
    private val prefs = host.getSharedPreferences("town-app-update", Context.MODE_PRIVATE)
    private val downloads = host.getSystemService(DownloadManager::class.java)
    private val dir get() = File(host.cacheDir, "town-app-update")
    private val id get() = prefs.getLong("download", -1)
    private val auto get() = prefs.getBoolean("unmetered", true)
    private val foreground get() = !host.isFinishing && host.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)
    private var working = false
    private var manualPending = false
    private var lastAttempt = 0L
    private var monitor: Job? = null
    private var dialog: AlertDialog? = null
    private var prompted = 0

    fun options(enabled: Boolean? = null): JSONObject {
        if (enabled != null) {
            prefs.edit().putBoolean("unmetered", enabled).apply()
            if (!enabled && prefs.getBoolean("automaticTask", false) && id >= 0) forgetDownload()
        }
        return JSONObject().put("unmetered", auto).put("version", BuildConfig.VERSION_NAME).put("official", host.packageName == RELEASE_PACKAGE)
    }

    fun resume() {
        monitor?.cancel()
        monitor = host.lifecycleScope.launch {
            // onResume precedes the lifecycle's RESUMED event.
            delay(300)
            while (foreground) {
                if (LegalAgreement.isAccepted(host) && host.packageName == RELEASE_PACKAGE) check(false)
                delay(if (id >= 0) 3000L else 60_000L)
            }
        }
    }

    fun pause() { monitor?.cancel() }

    fun check(manual: Boolean) {
        if (host.packageName != RELEASE_PACKAGE) {
            if (manual) toast("当前是独立测试包。正式版通过 GitHub 更新。")
            return
        }
        if (!LegalAgreement.isAccepted(host)) return
        manualPending = manualPending || manual
        if (working || !foreground) return
        val now = System.currentTimeMillis()
        val due = now - prefs.getLong("checked", 0) !in 0L until 6 * 3600_000L
        val fetch = manualPending || (due && now - lastAttempt !in 0L until 5 * 60_000L)
        if (!fetch && id < 0 && !manualPending && prefs.getInt("target", 0) <= BuildConfig.VERSION_CODE) return
        working = true
        host.lifecycleScope.launch {
            try {
                var raw = prefs.getString("manifest", null)
                if (fetch) {
                    lastAttempt = now
                    val fresh = withContext(Dispatchers.IO) { runCatching { TownUpdateRelease.fetch(host) }.getOrNull() }
                    if (fresh != null) {
                        val candidate = TownUpdateRelease.verify(host, fresh.first)
                        if (candidate.code >= prefs.getInt("target", 0) || raw == null) {
                            if (candidate.code != prefs.getInt("target", 0)) forgetDownload()
                            raw = fresh.first
                            prefs.edit().putString("manifest", raw).putString("prefix", fresh.second).putInt("target", candidate.code).apply()
                        }
                        prefs.edit().putLong("checked", now).apply()
                    } else if (raw == null || prefs.getInt("target", 0) <= BuildConfig.VERSION_CODE) {
                        if (manualPending && foreground) problem("暂时连不上更新源，请检查网络后重试。")
                        return@launch
                    }
                }
                val release = raw?.let { TownUpdateRelease.verify(host, it) } ?: return@launch
                if (release.code <= BuildConfig.VERSION_CODE) {
                    forgetDownload()
                    dir.listFiles()?.filter { it.isFile }?.forEach { it.delete() }
                    if (manualPending && foreground) toast("当前已是最新版本 " + BuildConfig.VERSION_NAME)
                } else if (foreground) handle(release)
            } catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (_: Exception) {
                if (manualPending && foreground) problem("无法读取这次更新，请稍后重试。")
            } finally { working = false; manualPending = false }
        }
    }

    private suspend fun handle(release: TownUpdateRelease) {
        val file = File(dir, release.filename)
        if (file.isFile) {
            if (prefs.getBoolean("installPermission", false)) {
                prefs.edit().remove("installPermission").apply()
                if (host.packageManager.canRequestPackageInstalls()) { install(release, file); return }
            }
            if (manualPending || prompted != release.code) {
                prompted = release.code
                show("幻想镇 " + release.version, "更新已下载，可覆盖安装并保留应用数据。", "安装更新") { install(release, file) }
            }
            return
        }
        val current = id
        if (current >= 0) {
            val status = withContext(Dispatchers.IO) {
                downloads.query(DownloadManager.Query().setFilterById(current))?.use { cursor ->
                    if (cursor.moveToFirst()) cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) else null
                }
            }
            if (id != current) return
            when (status) {
                DownloadManager.STATUS_SUCCESSFUL -> {
                    val ok = withContext(Dispatchers.IO) {
                        val part = File(dir, release.filename + ".part.apk")
                        try {
                            dir.mkdirs()
                            val uri = requireNotNull(downloads.getUriForDownloadedFile(current))
                            requireNotNull(host.contentResolver.openInputStream(uri)).use { input ->
                                part.outputStream().use { output ->
                                    val buffer = ByteArray(131072); var copied = 0L
                                    while (true) {
                                        val n = input.read(buffer); if (n < 0) break
                                        copied += n; require(copied <= release.size)
                                        output.write(buffer, 0, n)
                                    }
                                }
                            }
                            release.verifyApk(host, part)
                            part.renameTo(file)
                        } catch (_: Exception) { false } finally { part.delete() }
                    }
                    forgetDownload()
                    if (!ok) { failed(release, "安装包校验未通过，或手机空间不足。请腾出空间后重新下载。"); return }
                    prompted = 0
                    if (foreground) handle(release)
                }
                DownloadManager.STATUS_PENDING, DownloadManager.STATUS_RUNNING, DownloadManager.STATUS_PAUSED ->
                    if (manualPending && foreground) show("正在下载 " + release.version, "可以离开此页，系统会在网络可用时继续。", "暂停下载") {
                        prefs.edit().putInt("hold", release.code).apply(); forgetDownload()
                    }
                else -> { forgetDownload(); failed(release, "下载中断，请检查网络和可用空间后重试。") }
            }
            return
        }
        if (!foreground || dialog?.isShowing == true) return
        val held = prefs.getInt("hold", 0) == release.code
        val unmetered = !host.getSystemService(ConnectivityManager::class.java).isActiveNetworkMetered
        if (auto && !held && unmetered) { enqueue(release, true); return }
        if (manualPending || (!held && prompted != release.code)) {
            prompted = release.code
            show("发现幻想镇 " + release.version, "安装包约 ${(release.size + 1048575) / 1048576} MiB，将使用当前网络下载。", "下载更新") { enqueue(release, false) }
        }
    }

    private fun enqueue(release: TownUpdateRelease, automatic: Boolean) {
        if (id >= 0) return
        try {
            val prefix = if (prefs.getBoolean("alternate", false)) UPDATE_MIRROR else prefs.getString("prefix", "").orEmpty()
            val request = DownloadManager.Request(Uri.parse(prefix + release.url))
                .setTitle("幻想镇 " + release.version).setDescription("下载应用更新")
                .setMimeType("application/vnd.android.package-archive")
                .setAllowedOverMetered(!automatic).setAllowedOverRoaming(!automatic)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationInExternalFilesDir(host, Environment.DIRECTORY_DOWNLOADS, release.filename)
            val job = downloads.enqueue(request)
            prefs.edit().putLong("download", job).putBoolean("automaticTask", automatic).remove("hold").apply()
            if (!automatic || manualPending) toast("已开始下载，可在「我的 → 应用更新」查看。")
            resume()
        } catch (_: Exception) { failed(release, "系统下载服务暂不可用，可重试或从正式发布页下载。") }
    }

    private fun forgetDownload() {
        if (id >= 0) runCatching { downloads.remove(id) }
        prefs.edit().remove("download").remove("automaticTask").apply()
    }

    private fun failed(release: TownUpdateRelease, message: String) {
        prefs.edit().putInt("hold", release.code).putBoolean("alternate", !prefs.getBoolean("alternate", false)).apply()
        prompted = release.code
        if (foreground) problem(message)
    }

    private fun install(release: TownUpdateRelease, file: File) {
        host.lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) { release.verifyApk(host, file) }
            } catch (_: Exception) {
                file.delete(); failed(release, "安装包未通过验证，请重新下载。"); return@launch
            }
            if (!foreground) return@launch
            try {
                if (!host.packageManager.canRequestPackageInstalls()) {
                    prefs.edit().putBoolean("installPermission", true).apply()
                    host.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + host.packageName)))
                } else {
                    val uri = FileProvider.getUriForFile(host, host.packageName + ".provider", file)
                    host.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
                }
            } catch (_: Exception) { problem("系统安装界面未能打开，可从发布页下载后覆盖安装。") }
        }
    }

    private fun show(title: String, message: String, action: String, run: () -> Unit) {
        if (!foreground) return
        dialog?.dismiss()
        dialog = AlertDialog.Builder(host).setTitle(title).setMessage(message).setNegativeButton("稍后", null)
            .setPositiveButton(action) { _, _ -> run() }.create().also { it.show() }
    }

    private fun problem(message: String) {
        show("应用更新", message, "打开发布页") {
            runCatching { host.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(TOWN_RELEASES + "/latest"))) }
                .onFailure { toast("请用浏览器打开幻想镇 GitHub 发布页。") }
        }
    }
    private fun toast(text: String) = Toast.makeText(host, text, Toast.LENGTH_LONG).show()
}

object TownUpdates {
    @JvmStatic fun check(context: Context, manual: Boolean): Task<*> = Task.runAsync {
        if (manual) context.startActivity(Intent(context, TownCommunityActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            .putExtra("town-check-update", true))
    }
}
