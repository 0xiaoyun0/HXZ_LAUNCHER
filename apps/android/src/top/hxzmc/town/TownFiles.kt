package top.hxzmc.town

import android.util.Base64
import com.tungsten.fcl.setting.Profiles
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URL
import java.nio.file.Files
import java.security.MessageDigest
import java.util.UUID
import javax.net.ssl.HttpsURLConnection

/** All methods run on the activity's serial IO executor. A caller never supplies a filesystem path. */
class TownFiles(private val cache: File) {
    data class Document(val file: File, val name: String, val mime: String)
    private data class Export(val id: String, val document: Document, val limit: Int, var next: Int = 0)
    private var current: Export? = null

    private fun instancesWithCreate(): Map<String, File> {
        val repo = Profiles.getSelectedProfile().repository
        return repo.versions.associate { it.id to repo.getRunDirectory(it.id) }.filterValues { game ->
            File(game, "mods").listFiles()?.any { it.isFile && Regex("(?i)^create(?:-|_).*\\.jar$").matches(it.name) } == true
        }
    }
    fun instances() = JSONArray().apply {
        for (id in instancesWithCreate().keys.sorted()) put(JSONObject().put("id",id).put("name",id))
    }

    fun blueprint(input: JSONObject, token: String): Pair<Document, File?> {
        val id = input.getString("id")
        require(id.matches(Regex("[A-Za-z0-9_-]{1,64}")))
        val path = TownSession.COMMUNITY + "/api/blueprints/" + id
        val meta = readJson(path, bearer = token)
        val size = meta.getLong("size")
        val digest = meta.getString("sha256")
        require(size in 1..8388608 && digest.matches(Regex("[0-9a-f]{64}"))) { "蓝图文件信息无效。" }
        val choice = input.optString("instance")
        val game = if (choice.isEmpty()) null else instancesWithCreate()[choice] ?: error("实例已移除或缺少机械动力。")
        val original = meta.optString("filename","blueprint.nbt").substringBeforeLast('.', "blueprint").take(90)
        val name = original.map { if (it.isLetterOrDigit() || it in " -_") it else '_' }.joinToString("").trim().ifBlank { "blueprint" } + ".nbt"
        val file = File.createTempFile("town-blueprint-", ".nbt", cache)
        try {
            val hash = MessageDigest.getInstance("SHA-256")
            val connection = URL(path + "/file").openConnection() as HttpsURLConnection
            try {
                connection.instanceFollowRedirects=false; connection.connectTimeout=10000; connection.readTimeout=25000
                connection.setRequestProperty("Authorization", "Bearer " + token)
                check(connection.responseCode == 200) { "蓝图下载失败，请重试。" }
                file.outputStream().use { output -> connection.inputStream.use { data ->
                    val buffer = ByteArray(32768); var count=0L
                    while (true) {
                        val n=data.read(buffer); if(n<0) break
                        count+=n; check(count<=size); output.write(buffer,0,n); hash.update(buffer,0,n)
                    }
                    check(count==size)
                } }
                check(hash.digest().joinToString("") { "%02x".format(it) } == digest) { "蓝图完整性校验失败。" }
            } finally { connection.disconnect() }
            val document = Document(file,name,"application/octet-stream")
            if (game==null) return document to null
            val folder=File(game,"schematics"); folder.mkdirs()
            for (i in 0..999) {
                val target=File(folder,if(i==0) name else name.removeSuffix(".nbt")+" ("+i+").nbt")
                try { Files.copy(file.toPath(),target.toPath()); file.delete(); return document to target }
                catch (_:java.nio.file.FileAlreadyExistsException) { }
            }
            error("同名蓝图过多。")
        } catch(e:Exception) { file.delete(); throw e }
    }
    fun world(input: JSONObject, token: String): Document {
        val id = input.getString("record")
        require(id.matches(Regex("[A-Za-z0-9_-]{1,80}")))
        val record = readJson(TownSession.COMMUNITY + "/api/hub/records/" + id, bearer = token)
        check(record.optString("kind") == "world" && record.optString("status") == "published") { "这个世界已撤下。" }
        check(record.getLong("revision") == input.getLong("revision")) { "世界已更新，请重新打开详情。" }
        val data = record.getJSONObject("data")
        val digest = data.getString("sha256").lowercase()
        require(digest.matches(Regex("[0-9a-f]{64}")))
        var url = URL(data.getString("source"))
        val file = File.createTempFile("town-world-", ".zip", cache)
        try {
            for (redirect in 0..4) {
                require(url.protocol == "https" && url.userInfo == null) { "世界下载地址需要支持 HTTPS。" }
                val connection = url.openConnection() as HttpsURLConnection
                try {
                    connection.instanceFollowRedirects = false
                    connection.connectTimeout = 12000
                    connection.readTimeout = 30000
                    val code = connection.responseCode
                    if (code in listOf(301,302,303,307,308)) {
                        url = URL(url, connection.getHeaderField("Location") ?: error("下载地址已变更。"))
                        continue
                    }
                    check(code == 200) { "无法读取世界文件，请联系作者检查下载地址。" }
                    val limit = minOf(512L * 1024 * 1024, (cache.usableSpace - 32L * 1024 * 1024).coerceAtLeast(0))
                    check(connection.contentLengthLong <= limit && limit > 0) { "文件超过可用空间或单次 512 MB 限制。" }
                    val hash = MessageDigest.getInstance("SHA-256")
                    var total = 0L
                    connection.inputStream.use { stream -> file.outputStream().use { output ->
                        val buffer = ByteArray(65536)
                        while (true) {
                            val count = stream.read(buffer)
                            if (count < 0) break
                            total += count
                            check(total <= limit) { "文件过大，已停止下载。" }
                            hash.update(buffer, 0, count)
                            output.write(buffer, 0, count)
                        }
                    } }
                    check(total > 0 && hash.digest().joinToString("") { "%02x".format(it) } == digest) { "文件校验失败，请让作者核对世界版本。" }
                    val name = record.optString("title").filter { it.isLetterOrDigit() || it in " -_" }.trim().take(80).ifBlank { "幻想镇世界" }
                    val ext = if (data.optString("packageType") == "modpack" && url.path.endsWith(".mrpack", true)) ".mrpack" else ".zip"
                    return Document(file, name + ext, "application/zip")
                } finally {
                    connection.disconnect()
                }
            }
            error("下载地址跳转过多。")
        } catch (error: Exception) {
            file.delete()
            throw error
        }
    }

    fun begin(input: JSONObject): JSONObject {
        check(current==null) { "已有文件正在保存。" }
        val size=input.getInt("size"); require(size in 0..67108864)
        val mime=input.getString("mime")
        require(mime in setOf("image/png","image/jpeg","image/webp","video/webm","video/mp4"))
        val name=File(input.getString("name")).name.take(120).ifBlank { "town-media" }
        val id=UUID.randomUUID().toString()
        current=Export(id,Document(File.createTempFile("town-media-",".tmp",cache),name,mime),size)
        return JSONObject().put("id",id)
    }
    fun chunk(input: JSONObject) {
        val item=current?:error("保存任务已结束。")
        check(item.id==input.getString("id") && item.next==input.getInt("index"))
        val str=input.getString("data"); require(str.length<=262144)
        val bytes=Base64.decode(str,Base64.DEFAULT)
        require(item.document.file.length()+bytes.size<=item.limit)
        item.document.file.appendBytes(bytes);item.next++
    }
    fun finish(id:String):Document {
        val item=current?:error("保存任务已结束。")
        check(item.id==id && item.limit.toLong()==item.document.file.length())
        current=null
        return item.document
    }
    fun abort(id:String?=null) {
        val item=current?:return
        if(id==null||item.id==id){item.document.file.delete();current=null}
    }
}
