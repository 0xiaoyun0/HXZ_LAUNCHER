package top.hxzmc.town

import com.tungsten.fclcore.auth.Account
import com.tungsten.fclcore.auth.AuthInfo
import com.tungsten.fclcore.auth.CredentialExpiredException

interface TownLaunchUi {
    fun stage(id: String)
    fun observe(executor: com.tungsten.fclcore.task.TaskExecutor)
    suspend fun confirm(message: String, labels: List<String>): Int
    suspend fun beforeGame()
}

object TownJoin {
    data class Target(val instance: String, val address: String?, val uid: String, val graphicsBackend: String? = null)
    fun authenticate(account: Account, target: Target): AuthInfo {
        val selected = TownSession.selected()
        check(selected != null && selected === account && TownSession.identity().optString("uid") == target.uid) { "当前角色已改变，请回到社区重新进服。" }
        return try { selected.logInToTownServer() }
        catch (e: CredentialExpiredException) { throw LoginIssue("皮肤站登录已过期。请回到社区，点角色头像重新登录。", e) }
        catch (e: Exception) { throw LoginIssue("暂时无法验证皮肤站角色，请检查网络后重试。", e) }
    }

    /** Explicit join options win for this launch and never change the saved instance arguments. */
    @JvmStatic fun gameArguments(args: List<String>, address: String?): List<String> {
        if (address == null) return args
        val join = setOf("--server", "--port", "--quickPlayMultiplayer", "--quickPlayRealms", "--quickPlaySingleplayer")
        val result = mutableListOf<String>()
        var i = 0
        while (i < args.size) {
            val token = args[i++]
            if (token.substringBefore('=') in join) {
                if (!token.contains('=') && i < args.size && !args[i].startsWith("--")) i++
            } else result.add(token)
        }
        return result
    }
    class LoginIssue(message: String, cause: Throwable) : Exception(message, cause)
}
