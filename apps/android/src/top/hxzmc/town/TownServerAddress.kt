package top.hxzmc.town

import android.net.DnsResolver
import android.os.Build
import android.os.CancellationSignal
import androidx.annotation.RequiresApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.net.URI
import java.util.concurrent.Executor
import java.util.concurrent.ThreadLocalRandom
import kotlin.coroutines.resume

internal object TownServerAddress {
    @RequiresApi(29)
    private suspend fun native(question: String): List<TownSrv>? = suspendCancellableCoroutine { continuation ->
        val cancel = CancellationSignal()
        continuation.invokeOnCancellation { cancel.cancel() }
        DnsResolver.getInstance().rawQuery(null, question, DnsResolver.CLASS_IN, 33, DnsResolver.FLAG_EMPTY,
            Executor { it.run() }, cancel, object : DnsResolver.Callback<ByteArray> {
                override fun onAnswer(answer: ByteArray, rcode: Int) {
                    val result = if (rcode == 0) runCatching { TownSrv.parse(answer, question) }.getOrNull()
                        else if (rcode == 3) emptyList() else null
                    continuation.resume(result)
                }
                override fun onError(error: DnsResolver.DnsException) { continuation.resume(null) }
            })
    }

    // Only the public Fantasy Town directory names may use the external fallback.
    private fun publicRecords(question: String): List<TownSrv>? {
        val result = readJson("https://dns.alidns.com/resolve?name=$question&type=SRV", limit=65536, connectMs=2500, readMs=2500)
        if (result.optInt("Status") == 3) return emptyList()
        if (result.optInt("Status", -1) != 0) return null
        val answers = result.optJSONArray("Answer") ?: return emptyList()
        return buildList {
            for (i in 0 until answers.length()) {
                val rr = answers.getJSONObject(i)
                if (rr.optInt("type") != 33 || !rr.optString("name").trimEnd('.').equals(question,true)) continue
                val fields = rr.optString("data").trim().split(Regex("\\s+"))
                if (fields.size != 4) continue
                val (priority, weight, port) = fields.take(3).map { it.toIntOrNull()?.takeIf { n -> n in 0..65535 } }
                val raw = fields[3]
                val host = raw.trimEnd('.')
                if (priority != null && weight != null && port != null && (raw == "." || host.matches(Regex("[a-zA-Z0-9.-]{1,253}"))))
                    add(TownSrv(priority, weight, port, if(raw==".") "." else host))
            }
        }
    }

    suspend fun resolve(address: String): String = withContext(Dispatchers.IO) {
        val uri = URI("minecraft://$address")
        val host = uri.host.orEmpty().trimEnd('.')
        if (uri.port >= 0 || host.contains(':') || host.matches(Regex("[0-9.]+")) || !host.contains('.')) return@withContext address
        val question = "_minecraft._tcp.$host"
        var records = if (Build.VERSION.SDK_INT >= 29) withTimeoutOrNull(2800) { native(question) } else null
        if (records.isNullOrEmpty() && host.endsWith(".hxzmc.top",true)) {
            val fallback = runCatching { publicRecords(question) }.getOrNull()
            if (records == null && fallback == null) error("无法读取服务器公布的连接端口，请检查网络后重新进服。")
            if (fallback != null) records = fallback
        }
        val route = TownSrv.choose(records.orEmpty(), ThreadLocalRandom.current()) ?: return@withContext address
        check(route.host != ".") { "服务器目前暂停接受连接，请稍后再试。" }
        "${route.host}:${route.port}"
    }
}
