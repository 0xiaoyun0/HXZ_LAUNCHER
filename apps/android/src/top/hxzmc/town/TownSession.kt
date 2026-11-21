package top.hxzmc.town

import android.content.Context
import com.tungsten.fclauncher.utils.FCLPath
import com.tungsten.fcl.setting.ConfigHolder
import com.tungsten.fclcore.auth.Account
import com.tungsten.fcl.setting.Accounts
import com.tungsten.fclcore.auth.authlibinjector.AuthlibInjectorAccount
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import org.json.JSONObject

internal fun readJson(url: String, post: JSONObject? = null, bearer: String? = null, limit: Int = 262144): JSONObject {
    val connection = URL(url).openConnection() as HttpsURLConnection
    try {
        connection.connectTimeout = 10000
        connection.readTimeout = 18000
        connection.instanceFollowRedirects = false
        connection.setRequestProperty("Accept", "application/json")
        if(bearer!=null)connection.setRequestProperty("Authorization","Bearer " + bearer)
        if (post != null) {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { it.write(post.toString().toByteArray(Charsets.UTF_8)) }
        }
        when (connection.responseCode) {
            401, 403 -> error("角色登录已过期，请在社区顶部重新登录皮肤站。")
            429 -> error("请求过于频繁，请稍后重试。")
            in 200..299 -> Unit
            else -> error("服务暂时不可用，请稍后重试。")
        }
        connection.inputStream.bufferedReader(Charsets.UTF_8).use { reader ->
            val body = StringBuilder()
            val buffer = CharArray(4096)
            while (true) {
                val count = reader.read(buffer)
                if (count < 0) break
                require(body.length + count <= limit) { "服务响应过大。" }
                body.append(buffer, 0, count)
            }
            return JSONObject(body.toString())
        }
    } finally {
        connection.disconnect()
    }
}

object TownSession {
    const val SKIN = "https://skin.hxzmc.top/api/yggdrasil"
    const val COMMUNITY = "https://qqbot.hxzmc.top"

    @Synchronized fun initialize(context: Context) {
        if (FCLPath.FILES_DIR == null) FCLPath.loadPaths(context.applicationContext)
        ConfigHolder.initTownAccounts()
    }

    fun isTown(account: Account?) = account is AuthlibInjectorAccount && account.server.url.trimEnd('/') == SKIN
    fun saved() = Accounts.getAccounts().filterIsInstance<AuthlibInjectorAccount>().filter(::isTown)
    fun remember(context: Context) {
        val uid = identity().optString("uid")
        if (uid.isNotEmpty()) context.getSharedPreferences("town-player", Context.MODE_PRIVATE).edit().putString("uid", uid).apply()
    }
    fun restore(context: Context): JSONObject {
        if (selected() == null) {
            val uid = context.getSharedPreferences("town-player", Context.MODE_PRIVATE).getString("uid", null)
            val known = saved()
            val previous = known.firstOrNull { it.uuid.toString().replace("-", "") == uid } ?: known.singleOrNull()
            if (previous != null) Accounts.setSelectedAccount(previous)
        }
        remember(context)
        return identity()
    }

    fun selected(): AuthlibInjectorAccount? {
        val account = Accounts.getSelectedAccount() as? AuthlibInjectorAccount
        return account?.takeIf { it.server.url.trimEnd('/') == SKIN }
    }

    fun identity(): JSONObject {
        val account = selected() ?: return JSONObject()
        return JSONObject().put("name", account.character).put("uid", account.uuid.toString().replace("-", ""))
    }

    fun connect(): JSONObject {
        val account = selected() ?: error("请在社区顶部登录幻想镇皮肤站。")
        synchronized(account) {
            val data = account.toStorage()
            val access = data["accessToken"] as? String ?: error("请重新登录幻想镇角色。")
            val client = data["clientToken"] as? String ?: error("请重新登录幻想镇角色。")
            val response = readJson(COMMUNITY + "/api/session", JSONObject().put("accessToken", access).put("clientToken", client))
            val user = response.getJSONObject("user")
            check(user.getString("uid").replace("-", "").equals(account.uuid.toString().replace("-", ""), true)) { "社区返回了不同角色，请重新登录。" }
            val credentials = response.getJSONObject("credentials")
            account.acceptTownRefresh(access, credentials.getString("accessToken"), credentials.getString("clientToken"))
            check(selected() === account) { "角色已经切换，请重新进入社区。" }
            return JSONObject().put("token", response.getString("token")).put("base", COMMUNITY).put("user", user)
        }
    }
}
