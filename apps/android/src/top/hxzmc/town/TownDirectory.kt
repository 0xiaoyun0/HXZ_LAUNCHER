package top.hxzmc.town

import android.content.Context
import java.net.URI
import org.json.JSONArray
import org.json.JSONObject

/** The web page selects a public server ID. Only the native directory resolves an address. */
class TownDirectory(context: Context) {
    private val cache = context.getSharedPreferences("town-directory", Context.MODE_PRIVATE)
    private val defaults = JSONArray(context.assets.open("town/server-presets.json").bufferedReader().use { it.readText() })
    private val allowed = (0 until defaults.length()).associate { i -> defaults.getJSONObject(i).let { it.getString("id") to it } }

    data class Server(val id: String, val group: String, val name: String, val address: String, val version: String,
                      val loader: String, val loaderVersion: String, val enabled: Boolean, val source: String,
                      val updates: List<String>, val required: Boolean, val packageUrl: String, val packageHash: String) {
        fun display() = JSONObject().put("id", id).put("group", group).put("name", name).put("address", address)
            .put("version", version).put("loader", loader).put("loaderVersion", loaderVersion).put("enabled", enabled)
    }

    private fun parse(row: JSONObject): Server {
        val id = row.getString("id")
        val base = allowed.getValue(id)
        val address = row.optString("address").trim().ifEmpty { base.getString("address") }
        val uri = URI("minecraft://" + address)
        require(!uri.host.isNullOrBlank() && uri.rawUserInfo == null && uri.rawPath.isNullOrEmpty() &&
            uri.query == null && uri.fragment == null && (uri.port == -1 || uri.port in 1..65535))
        val updates = row.optJSONArray("updateUrls") ?: JSONArray()
        val urls = (0 until updates.length()).map { updates.getString(it).trimEnd('/') }.filter {
            val u = URI(it)
            u.scheme == "https" && u.host != null && u.userInfo == null && u.query == null && u.fragment == null
        }
        return Server(id, base.getString("group"), row.getString("name").take(50), address, row.optString("version"),
            row.optString("loader"), row.optString("loaderVersion"), row.optBoolean("enabled", true),
            row.optString("profileSource","manual"), urls, row.optBoolean("updateRequired"),
            row.optString("packageUrl"), row.optString("packageSha256"))
    }

    private fun catalog(): List<Server> {
        val saved = cache.getString("servers", null)?.let { runCatching { JSONArray(it) }.getOrNull() }
        return allowed.map { (id, fallback) ->
            val row = saved?.let { rows -> (0 until rows.length()).map { rows.getJSONObject(it) }.find { it.optString("id") == id } }
            runCatching { parse(row ?: fallback) }.getOrElse { parse(fallback) }
        }
    }
    fun server(id: String) = catalog().firstOrNull { it.id == id } ?: error("找不到这个社区服务器。")
    fun listing() = JSONArray(catalog().map { it.display() })

    fun refresh(): JSONArray {
        val incoming = readJson(TownSession.COMMUNITY + "/api/server-presets").getJSONArray("servers")
        require(incoming.length() == allowed.size)
        val parsed = (0 until incoming.length()).map { parse(incoming.getJSONObject(it)) }
        require(parsed.map { it.id }.toSet() == allowed.keys)
        // The server response also has relay settings. Keep only the public game fields used here.
        val safe = JSONArray(parsed.map { it.display().put("profileSource", it.source)
            .put("updateUrls", JSONArray(it.updates)).put("updateRequired", it.required)
            .put("packageUrl", it.packageUrl).put("packageSha256", it.packageHash) })
        cache.edit().putString("servers", safe.toString()).apply()
        return listing()
    }

    fun news(fresh: Boolean): JSONArray {
        if (!fresh) return JSONArray(cache.getString("notices", "[]"))
        val incoming = readJson(TownSession.COMMUNITY + "/api/public/v1/notices?limit=6").getJSONArray("items")
        val items = JSONArray()
        for (i in 0 until minOf(6, incoming.length())) {
            val row = incoming.getJSONObject(i)
            val server = allowed.values.firstOrNull { it.getString("group") == row.optString("groupId") } ?: continue
            items.put(JSONObject().put("id", row.getString("id")).put("serverId", server.getString("id"))
                .put("title", row.getString("title").take(180)).put("body", row.optString("body").take(12000)))
        }
        cache.edit().putString("notices", items.toString()).apply()
        return items
    }

    fun topics(fresh: Boolean): JSONArray {
        if (!fresh) return JSONArray(cache.getString("topics", "[]"))
        val rows = readJson(TownSession.COMMUNITY + "/api/public/v1/forum?sort=active&limit=4").getJSONArray("items")
        val items = JSONArray()
        for (i in 0 until minOf(4, rows.length())) {
            val row = rows.getJSONObject(i)
            val id = row.getString("id")
            if (id.length !in 1..100) continue
            items.put(JSONObject().put("id", id).put("title", row.getString("title").take(180))
                .put("name", row.optString("name").take(60)).put("replies", row.optInt("replies").coerceAtLeast(0)))
        }
        cache.edit().putString("topics", items.toString()).apply()
        return items
    }

    fun requirement(server: Server): JSONObject {
        check(server.enabled) { "这个服务器暂未开放。" }
        val base = server.display()
        if (server.source != "hxzup" && !server.required) return base
        // Scope the cached requirements to this server and its current publishers.
        val key = "profile:" + server.id + ":" + server.updates.joinToString("|")
        for (url in server.updates) {
            val status = runCatching { readJson(url + "/version.json") }.getOrNull() ?: continue
            check(!status.optBoolean("maintenance")) { server.name + "正在维护，请稍后再进入。" }
            if (server.source != "hxzup") return base
            val revision = status.optString("version")
            if (revision.isEmpty()) continue
            val profile = runCatching { readJson(url + "/game-profile.json?version=" + android.net.Uri.encode(revision)) }.getOrNull() ?: continue
            val version = profile.optString("gameVersion").trim()
            if (version.isBlank()) continue
            val loader = profile.optJSONObject("loader")
            val req = JSONObject().put("version", version).put("loader", loader?.optString("type") ?: "")
                .put("loaderVersion", loader?.optString("version") ?: "").put("publisher", url).put("revision", revision)
            cache.edit().putString(key, req.toString()).apply()
            return base.put("version", version).put("loader", req.getString("loader")).put("loaderVersion", req.getString("loaderVersion"))
                .put("publisher", url).put("revision", revision)
        }
        if (!server.required) {
            cache.getString(key, null)?.let { raw ->
                val saved = JSONObject(raw)
                return base.put("version", saved.getString("version")).put("loader", saved.getString("loader"))
                    .put("loaderVersion", saved.getString("loaderVersion")).put("publisher", saved.optString("publisher"))
                    .put("revision", saved.optString("revision"))
            }
            if (server.version.isNotBlank()) return base
        }
        error("暂时读不到" + server.name + "的整合包要求。请检查网络后重试。")
    }
}
