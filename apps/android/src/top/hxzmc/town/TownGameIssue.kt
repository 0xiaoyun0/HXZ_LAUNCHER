package top.hxzmc.town

import com.tungsten.fclcore.mod.ModpackCompletionException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.nio.file.AccessDeniedException
import java.nio.file.FileSystemException
import java.util.zip.ZipException
import javax.net.ssl.SSLHandshakeException

internal data class TownGameIssue(val title: String, val detail: String) {
    companion object {
        fun from(error: Exception, stage: String, hxzup: Boolean): TownGameIssue {
            val causes = generateSequence<Throwable>(error) { it.cause }.take(10).toList()
            val login = causes.filterIsInstance<TownJoin.LoginIssue>().firstOrNull()
            if (login != null) return TownGameIssue("皮肤站角色验证失败", login.message ?: "请点社区顶部的角色头像重新登录。")
            if (causes.any { it is AccessDeniedException || it is SecurityException }) {
                return TownGameIssue("游戏目录无法访问", "请确认原游戏目录仍在设备上且当前应用有权读取。也可以从游戏库将整合包导入应用目录。")
            }
            if (causes.any { it is FileSystemException && it.reason.orEmpty().contains("ENOSPC", ignoreCase = true) ||
                        it is android.system.ErrnoException && it.errno == android.system.OsConstants.ENOSPC }) {
                return TownGameIssue("设备存储空间不足", "请释放设备空间，然后重试刚才的游戏任务。")
            }
            if (causes.any { it is SSLHandshakeException }) {
                return TownGameIssue("无法验证服务器证书", "请先确认设备日期和时间正确。若同一服务器持续报错，请联系服务器管理员。")
            }
            if (causes.any { it is ModpackCompletionException }) {
                return TownGameIssue("整合包还有文件待下载", if (hxzup)
                    "请检查网络后重试。启动器会继续补全这个实例。若同一文件始终无法下载，请联系服主检查 HXZUP 下载源。"
                    else "请检查网络后重新安装。若同一文件始终无法下载，请联系整合包作者检查下载源。")
            }
            if (causes.any { it is UnknownHostException || it is ConnectException || it is SocketTimeoutException }) {
                return TownGameIssue("连接游戏服务超时或不可达", "请检查网络后重试。若只有这个服务器无法连接，请联系该服管理员。")
            }
            if (causes.any { it is ZipException }) {
                return TownGameIssue("整合包无法解压", "请重新下载或选择完整的整合包文件后重试。")
            }
            // Only relay player-facing checks authored by the app. Dependency messages may contain URLs or private file paths.
            val local = causes.firstOrNull {
                (it is IllegalArgumentException || it is IllegalStateException) &&
                    it.stackTrace.firstOrNull()?.className?.startsWith("top.hxzmc.town.") == true
            }?.message?.takeIf { it.length in 1..220 && it.none(Char::isISOControl) && it.any { c -> c in '\u4e00'..'\u9fff' } && "://" !in it }
            if (local != null) return TownGameIssue("需要处理后再继续", local)
            return TownGameIssue("游戏启动器遇到内部错误", "发生在「${stage.ifBlank { "准备游戏" }}」。请重试；如果再次出现，请把这个步骤和启动器版本告诉管理员。")
        }
    }
}
