package top.hxzmc.town

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import org.json.JSONObject
import java.io.File
import java.net.URL
import java.security.MessageDigest
import java.security.Signature
import java.security.cert.CertificateFactory
import java.util.zip.ZipFile
import javax.net.ssl.HttpsURLConnection

internal const val TOWN_RELEASES = "https://github.com/0xiaoyun0/HXZ_LAUNCHER/releases"
internal const val UPDATE_MIRROR = "https://gh-proxy.org/"
internal const val RELEASE_PACKAGE = "top.hxzmc.community"
private const val MAX_FEED = 32 * 1024

internal data class TownUpdateRelease(val version: String, val build: Int?, val code: Int, val tag: String, val abi: String, val size: Long, val sha256: String) {
    val versionName get() = if (build == null) version else "$version+$build"
    val label get() = versionName.replace("+", " · 构建 ")
    val filename get() = "HXZ-FCL-" + (if (build == null) version else "$version-build.$build") + "-$abi-release.apk"
    val url get() = "$TOWN_RELEASES/download/$tag/$filename"

    companion object {
        private val productVersion = Regex("(0|[1-9][0-9]{0,3})\\.(0|[1-9][0-9]?)\\.(0|[1-9][0-9]?)")

        @Suppress("DEPRECATION")
        fun verify(context: Context, raw: String): TownUpdateRelease {
            require(raw.length <= MAX_FEED && context.packageName == RELEASE_PACKAGE)
            val envelope = JSONObject(raw)
            val payload = Base64.decode(envelope.getString("payload"), Base64.DEFAULT)
            val signature = Base64.decode(envelope.getString("signature"), Base64.DEFAULT)
            val installed = context.packageManager.getPackageInfo(RELEASE_PACKAGE, PackageManager.GET_SIGNATURES)
            val cert = CertificateFactory.getInstance("X.509").generateCertificate(installed.signatures!!.single().toByteArray().inputStream())
            val signed = Signature.getInstance("SHA256withRSA").apply { initVerify(cert); update(payload) }
            require(signed.verify(signature)) { "更新清单签名不匹配。" }
            val manifest = JSONObject(payload.toString(Charsets.UTF_8))
            require(manifest.getString("package") == RELEASE_PACKAGE)
            val version = manifest.getString("version")
            require(productVersion.matches(version))
            val code = positiveInt(manifest, "versionCode")
            val build: Int?
            val tag: String
            when (manifest.getString("format")) {
                "hxz-fcl-update-v2" -> {
                    build = positiveInt(manifest, "build")
                    tag = manifest.getString("tag")
                    // A combined release can have its own desktop version.
                    require(tag == "v$version-build.$build" || (tag.startsWith('v') && productVersion.matches(tag.substring(1))))
                }
                "hxz-fcl-update-v1" -> {
                    val (major, minor, patch) = version.split('.').map(String::toLong)
                    require(code.toLong() == major * 1_000_000 + minor * 10_000 + patch * 100)
                    build = null
                    tag = "v$version"
                }
                else -> error("无法识别的更新清单。")
            }
            val abi = Build.SUPPORTED_ABIS.first { it == "arm64-v8a" || it == "x86_64" }
            val asset = manifest.getJSONObject("assets").getJSONObject(abi)
            val size = asset.getLong("size")
            val hash = asset.getString("sha256")
            require(size in 1L..512L * 1024 * 1024 && Regex("[0-9a-f]{64}").matches(hash))
            return TownUpdateRelease(version, build, code, tag, abi, size, hash)
        }

        private fun positiveInt(manifest: JSONObject, key: String): Int {
            val value = manifest.get(key)
            require(value is Int || value is Long)
            val number = (value as Number).toLong()
            require(number in 1L..2_100_000_000L)
            return number.toInt()
        }

        fun fetch(context: Context): Pair<String, String> {
            for (prefix in listOf("", UPDATE_MIRROR)) {
                try {
                    val url = URL(prefix + TOWN_RELEASES + "/latest/download/android-build-latest.json?t=" + System.currentTimeMillis() / 60000)
                    val connection = url.openConnection() as HttpsURLConnection
                    val raw = try {
                        connection.connectTimeout = 5000
                        connection.readTimeout = 7000
                        connection.setRequestProperty("Cache-Control", "no-cache")
                        require(connection.responseCode == 200)
                        connection.inputStream.bufferedReader(Charsets.UTF_8).use { reader ->
                            val buffer = CharArray(2048)
                            buildString {
                                while (true) {
                                    val n = reader.read(buffer)
                                    if (n == -1) break
                                    require(length + n <= MAX_FEED)
                                    append(buffer, 0, n)
                                }
                            }
                        }
                    } finally { connection.disconnect() }
                    verify(context, raw)
                    return raw to prefix
                } catch (_: Exception) { /* Try the other transport with the same signing key. */ }
            }
            error("暂时无法取得已签名的更新清单，请检查网络后重试。")
        }
    }

    @Suppress("DEPRECATION")
    fun verifyApk(context: Context, file: File) {
        require(file.isFile && file.length() == size)
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().buffered().use { input ->
            val buffer = ByteArray(131072)
            while (true) {
                val n = input.read(buffer)
                if (n == -1) break
                digest.update(buffer, 0, n)
            }
        }
        require(digest.digest().joinToString("") { "%02x".format(it) } == sha256)
        val pm = context.packageManager
        val archive = requireNotNull(pm.getPackageArchiveInfo(file.path, PackageManager.GET_SIGNATURES))
        val installed = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES)
        require(archive.packageName == RELEASE_PACKAGE && archive.versionName == versionName && archive.versionCode == code && code > installed.versionCode)
        require(archive.signatures!!.single() == installed.signatures!!.single())
        ZipFile(file).use { require(it.getEntry("lib/$abi/libfcl.so") != null) }
    }
}
