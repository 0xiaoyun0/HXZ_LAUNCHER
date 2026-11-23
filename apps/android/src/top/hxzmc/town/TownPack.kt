package top.hxzmc.town

import android.content.Context
import java.io.File
import java.net.URL
import java.security.MessageDigest
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import javax.net.ssl.HttpsURLConnection
import org.json.JSONObject

internal object TownPack {
    fun index(server: TownDirectory.Server, spec: JSONObject): JSONObject {
        val base = spec.optString("publisher")
        val revision = spec.optString("revision")
        check(base in server.updates && revision.matches(Regex("[A-Za-z0-9._-]{1,120}"))) { "请连网读取这个服务器当前的整合包。" }
        val suffix = "?version=" + revision
        val files = readJson(base + "/manifest.json" + suffix, limit = 8 * 1024 * 1024)
        val actions = readJson(base + "/action.json" + suffix)
        val index = TownPackIndex.build(server.name, base, revision, spec, files, actions)
        val status = readJson(base + "/version.json")
        check(!status.optBoolean("maintenance") && status.getString("version") == revision) { "服务器刚更新了整合包，请重新进入获取最新版本。" }
        return index
    }

    fun prepare(context: Context, server: TownDirectory.Server, index: JSONObject?): File {
        val dir = File(context.cacheDir, "town-install").apply { mkdirs() }
        if (server.source == "package") return archive(dir, server)
        requireNotNull(index) { "请重新读取 HXZUP 整合包清单。" }
        val file = File.createTempFile("server-", ".mrpack", dir)
        try {
            ZipOutputStream(file.outputStream().buffered()).use {
                it.putNextEntry(ZipEntry("modrinth.index.json"))
                it.write(index.toString().toByteArray(Charsets.UTF_8))
                it.closeEntry()
            }
            return file
        } catch (e: Exception) { file.delete(); throw e }
    }

    fun verifyInstall(runDirectory: File, index: JSONObject, progress: (Int,Int)->Unit) {
        val root = runDirectory.canonicalFile.toPath()
        val files = index.getJSONArray("files")
        val buffer = ByteArray(64 * 1024)
        for (i in 0 until files.length()) {
            val row = files.getJSONObject(i)
            val relative = row.getString("path")
            val file = root.resolve(relative).toFile().canonicalFile
            check(file.toPath().startsWith(root) && file.isFile && file.length() == row.getLong("fileSize")) {
                "实例缺少与 HXZUP 清单一致的文件：" + relative.take(100) + "。请重新安装服务器整合包。"
            }
            val digest = MessageDigest.getInstance("SHA-1")
            file.inputStream().buffered().use { input ->
                while (true) {
                    if (Thread.currentThread().isInterrupted) throw java.io.InterruptedIOException()
                    val read = input.read(buffer)
                    if (read < 0) break
                    digest.update(buffer,0,read)
                }
            }
            val expected = row.getJSONObject("hashes").getString("sha1")
            check(digest.digest().contentEquals(expected.chunked(2).map { it.toInt(16).toByte() }.toByteArray())) {
                "实例文件与 HXZUP 清单不符：" + relative.take(100) + "。请使用该服当前发布的整合包。"
            }
            if (i % 32 == 0 || i+1 == files.length()) progress(i+1,files.length())
        }
    }

    private fun archive(dir: File, server: TownDirectory.Server): File {
        val checksum = server.packageHash.lowercase()
        check(checksum.matches(Regex("[0-9a-f]{64}"))) { "服主还没有提供整合包的 SHA-256 校验信息。" }
        var url = URL(server.packageUrl)
        repeat(5) {
            check(url.protocol == "https" && url.host.isNotEmpty() && url.userInfo == null) { "请使用服主发布的 HTTPS 整合包。" }
            val connection = url.openConnection() as HttpsURLConnection
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 10000
            connection.readTimeout = 30000
            try {
                if (connection.responseCode in listOf(301,302,303,307,308)) {
                    url = URL(url, connection.getHeaderField("Location") ?: error("整合包下载地址已失效。"))
                } else {
                    check(connection.responseCode == 200) { "暂时无法下载服务器整合包，请稍后重试。" }
                    val file = File.createTempFile("server-", if (url.path.endsWith(".mrpack", true)) ".mrpack" else ".zip", dir)
                    try {
                        val digest = MessageDigest.getInstance("SHA-256")
                        file.outputStream().buffered().use { out -> connection.inputStream.use { input ->
                            val buf = ByteArray(64 * 1024)
                            var total = 0L
                            while (true) {
                                if (Thread.currentThread().isInterrupted) throw java.io.InterruptedIOException()
                                val n = input.read(buf)
                                if (n < 0) break
                                total += n
                                check(total <= 4L * 1024 * 1024 * 1024) { "整合包超过手机端下载大小限制，请从本地导入。" }
                                out.write(buf,0,n)
                                digest.update(buf,0,n)
                            }
                        } }
                        check(digest.digest().joinToString("") { "%02x".format(it) } == checksum) { "整合包校验失败，请重新下载或联系服主。" }
                        return file
                    } catch (e: Exception) { file.delete(); throw e }
                }
            } finally { connection.disconnect() }
        }
        error("整合包下载地址重定向次数过多。")
    }
}
